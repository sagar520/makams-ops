-- ============================================================
-- Makams Ops — upgrade: Prospectives source
-- Adds a Source field to the Prospectives sheet:
--   LI / Indeed · Internal Referral · Other
-- Paste this whole file into the Supabase SQL Editor and Run.
-- Safe to run more than once. Run AFTER upgrade-hr-v3.sql.
-- ============================================================

do $$ begin
  if to_regclass('public.prospectives') is null then
    raise exception 'Run upgrade-hr-v3.sql first — the prospectives table does not exist yet.';
  end if;
end $$;

alter table public.prospectives
  add column if not exists source text not null default 'Other'
    check (source in ('LI / Indeed', 'Internal Referral', 'Other'));

create index if not exists prospectives_source_idx on public.prospectives (source);

-- Backfill: rows pushed from the Candidates DB by an employee referral
-- become Internal Referral; everything else stays Other until HR edits it.
update public.prospectives p
   set source = 'Internal Referral'
  from public.candidates c
 where p.candidate_id = c.id
   and c.referrer_emp_id is not null
   and p.source = 'Other';

select 'Prospective source installed: '
       || count(*) filter (where source = 'Internal Referral') || ' internal referral, '
       || count(*) filter (where source = 'LI / Indeed')       || ' LI / Indeed, '
       || count(*) filter (where source = 'Other')             || ' other'
  as result
  from public.prospectives;
