-- ============================================================
-- Makams Ops — diagnose "Could not find the 'referrer_emp_id'
-- column of 'form_links' in the schema cache"
--
-- Paste this whole file into the Supabase SQL Editor and Run.
-- It tells you what is missing, adds anything that is, and then
-- forces PostgREST to reload its schema cache.
-- Safe to run any number of times.
-- ============================================================

-- 1. what does the database actually have right now?
select 'form_links columns present: ' ||
       coalesce(string_agg(column_name, ', ' order by column_name), '(none of them)') as before
  from information_schema.columns
 where table_schema = 'public' and table_name = 'form_links'
   and column_name in ('referrer_name', 'referrer_emp_id', 'referrer_phone');

-- 2. add whatever is missing (no-op if the upgrade already ran)
alter table public.form_links add column if not exists referrer_name   text;
alter table public.form_links add column if not exists referrer_emp_id text;
alter table public.form_links add column if not exists referrer_phone  text;
alter table public.form_links alter column expires_at set default (now() + interval '7 days');

-- 3. confirm
select 'form_links columns now: ' ||
       coalesce(string_agg(column_name, ', ' order by column_name), '(still missing!)') as after
  from information_schema.columns
 where table_schema = 'public' and table_name = 'form_links'
   and column_name in ('referrer_name', 'referrer_emp_id', 'referrer_phone');

-- 4. and did the rest of the upgrade land?
select 'search_candidates: ' || case when to_regprocedure('public.search_candidates(text,int)') is null then 'MISSING — run upgrade-referral-rules.sql' else 'ok' end
union all
select 'save_candidate: '    || case when to_regprocedure('public.save_candidate(uuid,jsonb)')   is null then 'MISSING — run upgrade-referral-rules.sql' else 'ok' end
union all
select 'prospective resume: '|| case when to_regclass('public.prospectives') is null then 'no prospectives table'
                                     when exists (select 1 from information_schema.columns
                                                   where table_name='prospectives' and column_name='resume_path')
                                     then 'ok' else 'MISSING — run upgrade-prospective-resume.sql' end;

-- 5. tell the API layer to re-read the schema (this is what clears the
--    "schema cache" error without waiting or clicking anything)
notify pgrst, 'reload schema';

select 'Schema cache reload signalled. Hard-refresh the app (Cmd+Shift+R) and try again.' as result;
