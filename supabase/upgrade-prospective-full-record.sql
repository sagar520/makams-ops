-- ============================================================
-- Makams Ops — UPGRADE: full prospective record (contact 2, email,
-- reference, test score, interview stages, comment, compensation,
-- joining date and EMP code).
-- Paste into the SQL Editor and Run. Safe to re-run.
-- ============================================================

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

select 'Prospective record extended: ' || count(*) || ' columns on public.prospectives' as result
  from information_schema.columns where table_schema='public' and table_name='prospectives';

notify pgrst, 'reload schema';
