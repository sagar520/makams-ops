-- ============================================================
-- Makams Ops — 0001 core: staff users, settings, helpers
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- staff accounts (invite-based) ----------
-- A row is created by an admin with an email; on first Google sign-in the
-- matching auth user "claims" it (auth_id gets set). All FKs elsewhere point
-- at app_users.id, which never changes.

create table public.app_users (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid unique references auth.users (id) on delete set null,
  email       text not null,
  full_name   text,
  roles       text[] not null default '{}',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint app_users_roles_valid check (roles <@ array['admin','hr','purchase','approver']::text[])
);

create unique index app_users_email_key on public.app_users (lower(email));

-- ---------- helpers ----------

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger set_updated_at before update on public.app_users
  for each row execute function public.tg_set_updated_at();

-- Current staff row id (stable id, not auth uid)
create or replace function public.current_app_user_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.app_users where auth_id = auth.uid() and active limit 1
$$;

-- Is the caller an invited, active staff member?
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_users where auth_id = auth.uid() and active)
$$;

-- Role check. 'admin' implies every other role.
create or replace function public.has_role(r text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_users
    where auth_id = auth.uid() and active
      and (r = any(roles) or 'admin' = any(roles))
  )
$$;

revoke all on function public.current_app_user_id() from anon;
revoke all on function public.is_staff() from anon;
revoke all on function public.has_role(text) from anon;

-- First sign-in: attach auth identity to the invited row with the same email.
create or replace function public.claim_app_user()
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_claimed int;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return false;
  end if;

  update public.app_users
     set auth_id = auth.uid(), updated_at = now()
   where auth_id is null
     and active
     and lower(email) = lower(v_email)
     and not exists (select 1 from public.app_users au2 where au2.auth_id = auth.uid());

  get diagnostics v_claimed = row_count;
  return v_claimed > 0;
end $$;

grant execute on function public.claim_app_user() to authenticated;

-- ---------- RLS ----------

alter table public.app_users enable row level security;

create policy app_users_select on public.app_users
  for select to authenticated using (public.is_staff());

create policy app_users_insert on public.app_users
  for insert to authenticated with check (public.has_role('admin'));

create policy app_users_update on public.app_users
  for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy app_users_delete on public.app_users
  for delete to authenticated using (public.has_role('admin'));

-- ---------- app settings (company profile etc.) ----------

create table public.app_settings (
  key         text primary key,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create trigger set_updated_at before update on public.app_settings
  for each row execute function public.tg_set_updated_at();

alter table public.app_settings enable row level security;

create policy app_settings_select on public.app_settings
  for select to authenticated using (public.is_staff());

create policy app_settings_write on public.app_settings
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
