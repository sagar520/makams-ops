-- Minimal Supabase environment stub so migrations can be validated locally.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text,
  public boolean default false,
  file_size_limit bigint
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid
);
alter table storage.objects enable row level security;

-- Supabase blocks direct deletes against storage tables (protect_delete).
-- Mirrored here so local tests fail the same way the real project does.
create or replace function storage.protect_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
    using errcode = '42501', hint = 'This prevents accidental data loss from orphaned objects.';
end $$;
drop trigger if exists protect_delete on storage.objects;
create trigger protect_delete before delete on storage.objects
  for each statement execute function storage.protect_delete();
