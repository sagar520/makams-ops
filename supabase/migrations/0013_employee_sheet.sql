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
