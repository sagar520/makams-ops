-- ============================================================
-- Makams Ops — UPGRADE: candidates come from a Google Sheet
-- Retires the candidate-intake form kind and records where the
-- candidate sheet lives. Paste into the SQL Editor and Run.
-- Safe to re-run. Run AFTER upgrade-hr-v3.sql.
-- ============================================================

do $$ begin
  if to_regclass('public.prospectives') is null then
    raise exception 'Run upgrade-hr-v3.sql first — this upgrade builds on it.';
  end if;
end $$;

-- ============================================================
-- Makams Ops — 0012: candidates come from a Google Sheet
--   * the candidate-intake form kind is retired; the Candidates DB
--     is filled from a sheet tab (and from referral links)
--   * where that sheet lives is a setting, not a secret
-- ============================================================

insert into public.app_settings (key, value)
values ('candidate_sheet', jsonb_build_object(
  'sheet_id', '1LjZIDyXeDG2pEiS2KGSj8l2Ts-GMwNGAJ1eoFON3Kzc',
  'tab', 'Master Sheet'
))
on conflict (key) do nothing;

-- retire candidate_intake: existing forms become plain general forms
update public.form_templates set kind = 'general' where kind = 'candidate_intake';

alter table public.form_templates drop constraint if exists form_templates_kind_check;
alter table public.form_templates add constraint form_templates_kind_check
  check (kind in ('referral','general'));

select 'Candidate sheet set: ' || (value ->> 'tab') || ' — intake forms retired' as result
  from public.app_settings where key = 'candidate_sheet';

-- make the API layer re-read the schema straight away
notify pgrst, 'reload schema';
