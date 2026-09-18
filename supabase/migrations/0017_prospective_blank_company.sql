-- ============================================================
-- Makams Ops — 0017: prospectives arrive with no current company
-- A prospective does not work at CRIL — that is the point of them —
-- so only employees are stamped with it. The column is left blank
-- for HR to fill in.
-- ============================================================

-- ensure_candidate no longer forces CRIL: an explicit null stays null
create or replace function public.ensure_candidate(
  p_full_name       text,
  p_phone           text default null,
  p_designation     text default null,
  p_area            text default null,
  p_current_company text default null,
  p_referred_by     text default 'CRIL HR',
  p_source          text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id  uuid;
  v_key text := public.phone_key(p_phone);
begin
  if coalesce(btrim(p_full_name), '') = '' then return null; end if;

  select id into v_id
    from public.candidates
   where (v_key is not null and public.phone_key(phone) = v_key)
      or lower(full_name) = lower(btrim(p_full_name))
   limit 1;
  if found then return v_id; end if;

  insert into public.candidates
    (full_name, phone, designation, area, current_company, referred_by_name, source, created_by)
  values
    (btrim(p_full_name), p_phone, p_designation, p_area,
     p_current_company, coalesce(p_referred_by, 'CRIL HR'),
     coalesce(p_source, 'Makams Ops'), public.current_app_user_id())
  returning id into v_id;

  return v_id;
end $$;

-- employees still carry CRIL
create or replace function public.tg_employee_to_candidate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_candidate(
    new.full_name, new.phone, new.designation, new.hq_name,
    'CRIL', 'CRIL HR', 'Employee'
  );
  return new;
end $$;

-- prospectives do not
create or replace function public.tg_prospective_to_candidate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.candidate_id is not null then return new; end if;
  if coalesce(new.department, 'Sales') <> 'Sales' then return new; end if;

  perform public.ensure_candidate(
    new.full_name, new.contact, new.designation, new.area,
    null, 'CRIL HR', 'Prospective'
  );
  return new;
end $$;

-- clear the ones already mirrored across
update public.candidates
   set current_company = null
 where source = 'Prospective' and current_company = 'CRIL';
