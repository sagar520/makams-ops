-- ============================================================
-- Makams Ops — OPTIONAL: read the HR sheet on a schedule
--
-- The app already re-reads the sheet whenever someone opens the
-- Employees page (throttled to once an hour), so you only need this
-- if you want the roster to stay current even when nobody logs in.
--
-- Before running, replace <SERVICE_ROLE_KEY> with the service_role key
-- from Dashboard → Settings → API. It is stored in Vault, not in this
-- file's history, but treat this script as sensitive all the same.
-- ============================================================

create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;

-- keep the key out of the job definition
select vault.create_secret('<SERVICE_ROLE_KEY>', 'makams_service_role_key', 'used by the nightly roster sync')
where not exists (select 1 from vault.decrypted_secrets where name = 'makams_service_role_key');

select cron.unschedule('makams-roster-sync')
where exists (select 1 from cron.job where jobname = 'makams-roster-sync');

-- 02:30 IST = 21:00 UTC the previous day
select cron.schedule(
  'makams-roster-sync',
  '0 21 * * *',
  $$
  select net.http_post(
    url     := 'https://wrrxpavejevhmkmtowup.supabase.co/functions/v1/import-employees',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'makams_service_role_key')
               ),
    body    := jsonb_build_object('auto', true, 'min_gap_minutes', 0)
  );
  $$
);

select 'Nightly roster sync scheduled for 02:30 IST' as result;
