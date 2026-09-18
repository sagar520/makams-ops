-- ============================================================
-- Makams Ops — UPGRADE: everything the Prospectives sheet needs,
-- in the right order, in one file.
--   1. division + department additions + CV numbers
--   2. the full prospective record (contacts, stages, money, joining)
--   3. CV numbers widened to MI + 5 digits
-- Paste into the SQL Editor and Run. Safe to re-run.
-- Run this BEFORE supabase/import-prospectives.sql.
-- ============================================================

-- ---------- 1 of 3 ----------
-- ============================================================
-- Makams Ops — 0020: prospectives get a division and a CV number
--   * division: Poultry · Cattle · HO · Manufacturing (optional)
--   * department gains QC and Manufacturing
--   * cv_no: a unique running ID, MI0001 upwards, assigned on
--     insert by a trigger so every path gets one (manual entry,
--     the Candidates DB pick, anything added later)
-- ============================================================

-- ---------- division ----------

alter table public.prospectives add column if not exists division text;

alter table public.prospectives drop constraint if exists prospectives_division_check;
alter table public.prospectives add constraint prospectives_division_check
  check (division is null or division in ('Poultry', 'Cattle', 'HO', 'Manufacturing'));

create index if not exists prospectives_division_idx on public.prospectives (division);

-- ---------- department: two more ----------

alter table public.prospectives drop constraint if exists prospectives_department_check;
alter table public.prospectives add constraint prospectives_department_check
  check (department in ('Sales', 'PMT', 'Marketing', 'Doctor', 'QC', 'Manufacturing',
                        'Other HO Functions', 'Other'));

-- ---------- CV number ----------

alter table public.prospectives add column if not exists cv_no text;

create sequence if not exists public.prospective_cv_seq as bigint start with 1 increment by 1;

create or replace function public.next_cv_no()
returns text language sql volatile set search_path = public as $$
  select 'MI' || lpad(nextval('public.prospective_cv_seq')::text, 4, '0')
$$;

create or replace function public.tg_prospective_cv_no()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.cv_no is null or btrim(new.cv_no) = '' then
    new.cv_no := public.next_cv_no();
  end if;
  return new;
end $$;

drop trigger if exists set_cv_no on public.prospectives;
create trigger set_cv_no before insert on public.prospectives
  for each row execute function public.tg_prospective_cv_no();

-- backfill the rows that are already on the sheet, oldest first,
-- then push the sequence past whatever was handed out.
do $$
declare r record; n bigint := 0;
begin
  for r in select id from public.prospectives where cv_no is null order by created_at, id loop
    n := nextval('public.prospective_cv_seq');
    update public.prospectives set cv_no = 'MI' || lpad(n::text, 4, '0') where id = r.id;
  end loop;
end $$;

create unique index if not exists prospectives_cv_no_key on public.prospectives (cv_no);
alter table public.prospectives alter column cv_no set not null;

-- ---------- 2 of 3 ----------
-- ============================================================
-- Makams Ops — 0021: the full prospective record
--   The sheet keeps its short list of columns; everything below
--   lives on the row and is edited when HR opens it.
--   Contact/designation/area (Location) already existed.
-- ============================================================

alter table public.prospectives
  add column if not exists contact2         text,          -- additional contact
  add column if not exists email            text,
  add column if not exists reference        text,          -- who / what pointed them here
  add column if not exists test_score       text,          -- free text: "18/25", "Pass", …
  add column if not exists stage_mail       text,          -- invitation mail
  add column if not exists stage_manager    text,          -- manager / RSM round
  add column if not exists stage_hr         text,          -- HR round
  add column if not exists stage_final      text,          -- final round
  add column if not exists comment          text,
  add column if not exists last_salary      numeric(14,2), -- last withdrawn
  add column if not exists expected_inhand  numeric(14,2),
  add column if not exists old_inhand       numeric(14,2),
  add column if not exists inhand_monthly   numeric(14,2),
  add column if not exists gross_monthly    numeric(14,2),
  add column if not exists ctc_annual       numeric(14,2),
  add column if not exists doj              date,          -- set once status = joined
  add column if not exists emp_code         text;

-- The interview stages are deliberately unconstrained: the wording of the
-- rounds is still settling, and a check constraint would mean a migration
-- every time a label changes. The app offers a fixed list in the dropdown.

create index if not exists prospectives_emp_code_idx on public.prospectives (emp_code)
  where emp_code is not null;

-- ---------- 3 of 3 ----------
-- ============================================================
-- Makams Ops — 0022: CV numbers are MI + 5 digits
--   The HR workbook already runs MI00001 … MI00466, so the app
--   has to speak the same format and carry on from the top of
--   whatever is in the table.
-- ============================================================

create or replace function public.next_cv_no()
returns text language sql volatile set search_path = public as $$
  select 'MI' || lpad(nextval('public.prospective_cv_seq')::text, 5, '0')
$$;

-- widen any 4-digit numbers the app handed out before this change,
-- then park the sequence above the highest number on the table.
update public.prospectives
   set cv_no = 'MI' || lpad(regexp_replace(cv_no, '\D', '', 'g'), 5, '0')
 where cv_no ~ '^MI\d{1,4}$';

select setval('public.prospective_cv_seq',
  greatest((select coalesce(max(nullif(regexp_replace(cv_no, '\D', '', 'g'), ''))::bigint, 0)
              from public.prospectives), 1), true);

select 'Prospectives ready. columns=' || (select count(*) from information_schema.columns
                                           where table_schema='public' and table_name='prospectives')
       || ', rows=' || (select count(*) from public.prospectives)
       || ', next CV no. = MI' || lpad((last_value + 1)::text, 5, '0') as result
  from public.prospective_cv_seq;

notify pgrst, 'reload schema';
