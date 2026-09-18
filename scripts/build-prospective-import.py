#!/usr/bin/env python3
"""Turn the HR interview workbook into a SQL import for public.prospectives.

Run:  python3 scripts/build-prospective-import.py <workbook.xlsx> > supabase/import-prospectives.sql
"""
import sys, re, datetime, openpyxl

SRC = sys.argv[1]
wb = openpyxl.load_workbook(SRC, data_only=True)

def load(sheet, hrow):
    ws = wb[sheet]
    hdr = [str(ws.cell(hrow, c).value or '').replace('\n', ' ').strip() for c in range(1, ws.max_column + 1)]
    out = []
    for r in range(hrow + 1, ws.max_row + 1):
        vals = [ws.cell(r, c).value for c in range(1, ws.max_column + 1)]
        if not any(v not in (None, '') for v in vals):
            continue
        out.append(dict(zip(hdr, vals)))
    return out

def s(v):
    if v is None: return None
    t = str(v).strip()
    return t or None

def money(v):
    if v is None: return None
    t = str(v).replace(',', '').replace('₹', '').strip()
    if not t: return None
    try:
        n = float(t)
    except ValueError:
        return None
    return None if n <= 0 else round(n, 2)

def date(v):
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime('%Y-%m-%d')
    t = s(v)
    if not t: return None
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})', t)
    return m.group(0) if m else None

def month_start(v):
    """The Month column is a month marker: "May-26" lands as 2026-05-26."""
    d = date(v)
    if not d: return None
    y, m, _ = d.split('-')
    return f'{y}-{m}-01'

def cv(v):
    t = s(v)
    if not t: return None
    m = re.match(r'^[Mm][Ii]\s*0*(\d+)$', t.replace(' ', ''))
    return f'MI{int(m.group(1)):05d}' if m else t.upper()

# ---- vocabulary from the sheets -> the app's -------------------------------

STATUS = {
    'pipeline': 'new', 'pipe': 'new',
    'shortlist': 'contacted',
    'process': 'interview_scheduled',
    'hold': 'interested',
    'final': 'offer_letter_sent',      # promoted to joined when a DOJ is present
    'reject': 'rejected',
    'backout': 'rejected',             # the person walked; kept in the comment
}

DIVISION = {
    'cattle': 'Cattle', 'poultry': 'Poultry',
    'corporate': 'HO', 'export': 'HO', 'deport': 'HO',
    'bhiwadi': 'Manufacturing',
}

def department(desig):
    d = (desig or '').lower()
    if 'qc' in d: return 'QC'
    if 'pmt' in d or 'product' in d: return 'PMT'
    if 'hr ' in d or d.startswith('hr'): return 'Other HO Functions'
    if 'mis' in d or 'a/c' in d or 'account' in d or 'ex. exec' in d or 'export' in d: return 'Other HO Functions'
    if 'tech' in d or 'tehcno' in d: return 'Doctor'
    if any(k in d for k in ('vso', 'aso', 'asm', 'rsm', 'agm', 'sales', 'drsm')): return 'Sales'
    return 'Other'

DONE = {'done': True, 'ok': True, 'send': True, 'sent': True, 'complete': True, 'released': True, 'release': True}

def stage_mail(v):
    t = (s(v) or '').lower()
    if not t or t == 'na': return None
    return 'Sent' if DONE.get(t) else 'No response'

def stage_round(v):
    t = (s(v) or '').lower()
    if not t or t == 'na': return None
    if t.startswith('reject'): return 'Rejected'
    if DONE.get(t): return 'Cleared'
    return 'Pending'

def phone(v):
    t = s(v)
    if not t: return None
    digits = re.sub(r'\D', '', t)
    if len(digits) == 12 and digits.startswith('91'): digits = digits[2:]
    if len(digits) == 11 and digits.startswith('0'): digits = digits[1:]
    return f'+91{digits}' if len(digits) == 10 and digits[0] in '6789' else t

# ---- read the three sheets, newest first so it wins on a repeated CV no. ----

records = {}
order = []

def put(rec):
    key = rec['cv_no']
    if key in records:     # an earlier (newer) sheet already carried this person
        return
    records[key] = rec
    order.append(key)

def note(*parts):
    body = ' · '.join(p for p in parts if p)
    return body or None

# --- Latest: the live pipeline ---
for r in load('Latest', 1):
    c = cv(r.get('CV No.'))
    if not c: continue
    raw_status = (s(r.get('Status')) or '').lower()
    doj = date(r.get('Date of Joining'))
    emp = s(r.get('EMP. Code'))
    st = STATUS.get(raw_status, 'new')
    if st == 'offer_letter_sent' and doj:
        st = 'joined'
    reason = s(r.get('If Reject Reason'))
    if reason and reason.upper() == 'NA': reason = None
    put({
        'cv_no': c,
        'full_name': s(r.get('Name')),
        'division': DIVISION.get((s(r.get('Division')) or '').lower()),
        'department': department(s(r.get('Designation'))),
        'designation': s(r.get('Designation')),
        'area': s(r.get('Location')),
        'contact': phone(r.get('Contact 1')),
        'contact2': phone(r.get('Contact 2')),
        'email': s(r.get('Mail')),
        'reference': s(r.get('Reference')),
        'test_score': s(r.get('TT')),
        'source': 'Other',
        'status': st,
        'stage_mail': stage_mail(r.get('Invitation Mail')),
        'stage_manager': stage_round(r.get('Stage 1-RSM')),
        'stage_hr': stage_round(r.get('Stage 2-HR')),
        'stage_final': stage_round(r.get('Final-Stage')) if (s(r.get('Final-Stage')) or '').lower() in ('na', 'done', 'ok', '') else 'Cleared',
        'comment': note(reason, 'Candidate backed out.' if raw_status == 'backout' else None),
        'last_salary': money(r.get('Last Withdrawn Salary')),
        'expected_inhand': money(r.get('Expectation Inhand')),
        'old_inhand': money(r.get('Old Remun. Inhand')),
        'inhand_monthly': money(r.get('Inhand Monthly')),
        'gross_monthly': money(r.get('Gross Monthly')),
        'ctc_annual': money(r.get('CTC Annual')),
        'doj': doj,
        'emp_code': emp,
        'created_at': month_start(r.get('Month')),
    })

# --- 2026 dashboard ---
for r in load('Dashboard candidate-26', 1):
    c = cv(r.get('CV No.'))
    if not c: continue
    raw_status = (s(r.get('Status')) or '').lower()
    doj = date(r.get('Date of Joining'))
    emp = s(r.get('EMP. Code'))
    st = STATUS.get(raw_status, 'new')
    if st == 'offer_letter_sent' and doj:
        st = 'joined'
    reason = s(r.get('If Reject Reason'))
    if reason and reason.upper() == 'NA': reason = None
    put({
        'cv_no': c,
        'full_name': s(r.get('Name')),
        'division': DIVISION.get((s(r.get('File')) or '').lower()),
        'department': department(s(r.get('Designation'))),
        'designation': s(r.get('Designation')),
        'area': s(r.get('Location')),
        'contact': phone(r.get('Contact 1')),
        'contact2': phone(r.get('Contact 2')),
        'email': s(r.get('Mail')),
        'reference': s(r.get('Reference')),
        'test_score': s(r.get('TT')),
        'source': 'Other',
        'status': st,
        'stage_mail': stage_mail(r.get('Welcome')),
        'stage_manager': stage_round(r.get('(1) Stage-RSM')),
        'stage_hr': stage_round(r.get('(2) Stage-HR')),
        'stage_final': stage_round(r.get('(3) Stage-Senior')),
        'comment': note(reason, 'Candidate backed out.' if raw_status == 'backout' else None),
        'last_salary': None,
        'expected_inhand': None,
        'old_inhand': None,
        'inhand_monthly': money(r.get('Inhand')),
        'gross_monthly': None,
        'ctc_annual': money(r.get('Annual CTC')),
        'doj': doj,
        'emp_code': emp,
        'created_at': month_start(r.get('Month')),
    })

# --- 2025 dashboard (header on row 2, fewer columns) ---
for r in load('Dashboard candidate-25', 2):
    c = cv(r.get('CV No.'))
    if not c: continue
    raw_status = (s(r.get('Status')) or '').lower()
    doj = date(r.get('Date of Joining'))
    st = STATUS.get(raw_status, 'new')
    if st == 'offer_letter_sent' and doj:
        st = 'joined'
    reason = s(r.get('Reason'))
    if reason and reason.upper() == 'NA': reason = None
    put({
        'cv_no': c,
        'full_name': s(r.get('Name')),
        'division': DIVISION.get((s(r.get('File')) or '').lower()),
        'department': department(s(r.get('Designation'))),
        'designation': s(r.get('Designation')),
        'area': s(r.get('Location')),
        'contact': phone(r.get('Contact')),
        'contact2': None,
        'email': None,
        'reference': s(r.get('Reference')),
        'test_score': s(r.get('Techincal Test')),
        'source': 'Other',
        'status': st,
        'stage_mail': stage_mail(r.get('Welcome')),
        'stage_manager': None,
        'stage_hr': stage_round(r.get('1 Round by HR')),
        'stage_final': stage_round(r.get('1 Round by Senior - Final')),
        'comment': note(reason, 'Candidate backed out.' if raw_status == 'backout' else None),
        'last_salary': None, 'expected_inhand': None, 'old_inhand': None,
        'inhand_monthly': None, 'gross_monthly': None,
        'ctc_annual': money(r.get('Annual CTC')),
        'doj': doj,
        'emp_code': None,
        'created_at': month_start(r.get('Month')),
    })

COLS = ['cv_no', 'full_name', 'division', 'department', 'designation', 'area', 'contact', 'contact2',
        'email', 'reference', 'test_score', 'source', 'status', 'stage_mail', 'stage_manager',
        'stage_hr', 'stage_final', 'comment', 'last_salary', 'expected_inhand', 'old_inhand',
        'inhand_monthly', 'gross_monthly', 'ctc_annual', 'doj', 'emp_code', 'created_at']

def lit(v):
    if v is None: return 'null'
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

rows = [records[k] for k in order if records[k].get('full_name')]

out = []
A = out.append
A('-- ============================================================')
A('-- Makams Ops — import the HR interview workbook into Prospectives')
A(f'-- {len(rows)} people, generated from "{SRC.split("/")[-1]}"')
A('-- Run supabase/upgrade-prospectives-all.sql first.')
A('-- Re-running is safe: a CV number that is already there is skipped.')
A('-- Plain statements, no transaction block and no temporary tables, so it')
A('-- behaves the same in the Supabase SQL Editor as in psql.')
A('-- ============================================================')
A('')
A('drop table if exists public.prospective_import_stage;')
A('')
A('create table public.prospective_import_stage (')
A('  ' + ',\n  '.join([
    'cv_no text', 'full_name text', 'division text', 'department text', 'designation text',
    'area text', 'contact text', 'contact2 text', 'email text', 'reference text',
    'test_score text', 'source text', 'status text', 'stage_mail text', 'stage_manager text',
    'stage_hr text', 'stage_final text', 'comment text', 'last_salary numeric',
    'expected_inhand numeric', 'old_inhand numeric', 'inhand_monthly numeric',
    'gross_monthly numeric', 'ctc_annual numeric', 'doj date', 'emp_code text', 'created_at date',
]))
A(');')
A('')
A('-- staging only, and dropped at the end; locked down in case a run stops early')
A('alter table public.prospective_import_stage enable row level security;')
A('')
A('insert into public.prospective_import_stage (' + ', '.join(COLS) + ') values')
A(',\n'.join('  (' + ', '.join(lit(r.get(c)) for c in COLS) + ')' for r in rows) + ';')
A('')
A('-- anyone whose CV number is already on the table is left alone')
A('insert into public.prospectives (' + ', '.join(COLS) + ')')
A('select ' + ', '.join('i.' + c for c in COLS) + ' from public.prospective_import_stage i')
A(' where not exists (select 1 from public.prospectives p where p.cv_no = i.cv_no);')
A('')
A('-- CV numbers that were already taken by somebody else — check these by hand')
A('select i.cv_no, i.full_name as in_the_workbook, p.full_name as already_in_the_app')
A('  from public.prospective_import_stage i')
A('  join public.prospectives p on p.cv_no = i.cv_no')
A(' where p.full_name is distinct from i.full_name')
A(' order by i.cv_no;')
A('')
A('-- carry on numbering after the highest CV number that now exists')
A("select setval('public.prospective_cv_seq',")
A("  greatest((select coalesce(max(nullif(regexp_replace(cv_no, '\\D', '', 'g'), ''))::bigint, 0) from public.prospectives), 1), true);")
A('')
A('drop table public.prospective_import_stage;')
A('')
A("select 'Imported. prospectives=' || (select count(*) from public.prospectives)")
A("  || ', candidates=' || (select count(*) from public.candidates)")
A("  || ', next CV no. = MI' || lpad((last_value + 1)::text, 5, '0') as result")
A('  from public.prospective_cv_seq;')
print('\n'.join(out))
