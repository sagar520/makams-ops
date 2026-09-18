-- ============================================================
-- Makams Ops — fix: "No employee sheet set"
-- Reports what actually landed from upgrade-employee-sheet.sql and
-- repairs anything missing. Paste into the SQL Editor and Run.
-- Safe to run any number of times.
-- ============================================================

-- 1. what does the database have right now?
select 'employee_sheet setting: ' ||
       coalesce((select value::text from public.app_settings where key = 'employee_sheet'), 'MISSING') as before
union all
select 'people.sbu_head_name: ' ||
       case when exists (select 1 from information_schema.columns
                          where table_schema='public' and table_name='people' and column_name='sbu_head_name')
            then 'ok' else 'MISSING' end
union all
select 'old sheet_sync_log table: ' ||
       case when to_regclass('public.sheet_sync_log') is null then 'gone (good)' else 'still there' end;

-- 2. repair whatever is missing
alter table public.people add column if not exists sbu_head_name text;

insert into public.app_settings (key, value)
values ('employee_sheet', jsonb_build_object(
  'sheet_id', '1LjZIDyXeDG2pEiS2KGSj8l2Ts-GMwNGAJ1eoFON3Kzc',
  'tab', 'Master Sheet'
))
on conflict (key) do update
  set value = jsonb_build_object(
        'sheet_id', coalesce(nullif(public.app_settings.value ->> 'sheet_id', ''), '1LjZIDyXeDG2pEiS2KGSj8l2Ts-GMwNGAJ1eoFON3Kzc'),
        'tab',      coalesce(nullif(public.app_settings.value ->> 'tab', ''), 'Master Sheet')
      );

drop table if exists public.sheet_sync_log;

delete from public.app_settings where key = 'candidate_sheet';

-- 3. confirm
select 'employee_sheet is now: ' || (value ->> 'sheet_id') || ' / ' || (value ->> 'tab') as after
  from public.app_settings where key = 'employee_sheet';

-- 4. let the API layer see any new column straight away
notify pgrst, 'reload schema';
