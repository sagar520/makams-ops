-- ============================================================
-- Makams Ops — UPGRADE: optional resume on a prospective
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.
-- Run AFTER upgrade-hr-v3.sql.
-- ============================================================

do $$ begin
  if to_regclass('public.prospectives') is null then
    raise exception 'Run upgrade-hr-v3.sql first — this upgrade builds on it.';
  end if;
end $$;

-- ============================================================
-- Makams Ops — 0011: optional resume on a prospective
-- ============================================================

alter table public.prospectives add column if not exists resume_path text;
alter table public.prospectives add column if not exists resume_name text;

-- private bucket, HR only (15 MB cap, same as the other upload buckets)
insert into storage.buckets (id, name, public, file_size_limit)
values ('prospective-resumes', 'prospective-resumes', false, 15728640)
on conflict (id) do nothing;

drop policy if exists "prospective resumes hr read"   on storage.objects;
drop policy if exists "prospective resumes hr write"  on storage.objects;
drop policy if exists "prospective resumes hr delete" on storage.objects;

create policy "prospective resumes hr read" on storage.objects
  for select to authenticated using (bucket_id = 'prospective-resumes' and public.has_role('hr'));
create policy "prospective resumes hr write" on storage.objects
  for insert to authenticated with check (bucket_id = 'prospective-resumes' and public.has_role('hr'));
create policy "prospective resumes hr delete" on storage.objects
  for delete to authenticated using (bucket_id = 'prospective-resumes' and public.has_role('hr'));

select 'Resume field installed on '
       || count(*) || ' prospectives (bucket: prospective-resumes)' as result
  from public.prospectives;
