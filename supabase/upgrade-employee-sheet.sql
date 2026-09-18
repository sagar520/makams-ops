-- ============================================================
-- Makams Ops — UPGRADE: the HR Google Sheet is the employee roster
--   * SBU Head joins HQ / ASM / RSM on the employee record
--   * records where the roster sheet lives
--   * retires the outbound sync (the app never writes to the sheet)
-- Paste into the SQL Editor and Run. Safe to re-run.
-- Run AFTER upgrade-hr-v3.sql.
-- ============================================================

do $$ begin
  if to_regclass('public.people') is null then
    raise exception 'Run the core migrations first — there is no people table yet.';
  end if;
end $$;

-- retire the candidate-intake form kind (candidates come from referral links)
update public.form_templates set kind = 'general' where kind = 'candidate_intake';
alter table public.form_templates drop constraint if exists form_templates_kind_check;
alter table public.form_templates add constraint form_templates_kind_check
  check (kind in ('referral','general'));

-- ============================================================
-- Makams Ops — 0013: the HR Google Sheet is the employee roster
--   * SBU Head joins the HQ / ASM / RSM hierarchy
--   * the sheet feeds the app; the app never writes back, so the
--     outbound sync and its log are retired
-- ============================================================

alter table public.people add column if not exists sbu_head_name text;

-- where the roster lives (Master Sheet tab of the HR spreadsheet)
insert into public.app_settings (key, value)
values ('employee_sheet', jsonb_build_object(
  'sheet_id', '1LjZIDyXeDG2pEiS2KGSj8l2Ts-GMwNGAJ1eoFON3Kzc',
  'tab', 'Master Sheet'
))
on conflict (key) do nothing;

-- the candidate sheet idea is superseded: candidates come from referral links
delete from public.app_settings where key = 'candidate_sheet';

-- outbound sync is gone
drop table if exists public.sheet_sync_log;

select 'Employee sheet set: ' || (value ->> 'tab')
       || ' — outbound sync retired, SBU Head added'
  as result
  from public.app_settings where key = 'employee_sheet';

-- make the API layer re-read the schema straight away
notify pgrst, 'reload schema';
