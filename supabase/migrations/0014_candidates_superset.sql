-- ============================================================
-- Makams Ops — 0014: the Candidates DB holds everyone
--   * a new employee is mirrored into the Candidates DB
--   * a new prospective is too (the sheet is sales-only by design)
--   * both land tagged Current company CRIL / Referred by CRIL HR
-- Nothing is ever duplicated: a matching phone (last 10 digits) or an
-- identical name already in the DB means the row is left alone.
-- ============================================================

-- last ten digits of a phone, for matching regardless of formatting
create or replace function public.phone_key(p text)
returns text language sql immutable as $$
  select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10), '')
$$;

create index if not exists candidates_phone_key_idx on public.candidates (public.phone_key(phone));
create index if not exists candidates_name_lower_idx on public.candidates (lower(full_name));

/**
 * Add someone to the Candidates DB unless they are already in it.
 * Returns the candidate id either way.
 */
create or replace function public.ensure_candidate(
  p_full_name       text,
  p_phone           text default null,
  p_designation     text default null,
  p_area            text default null,
  p_current_company text default 'CRIL',
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
     coalesce(p_current_company, 'CRIL'), coalesce(p_referred_by, 'CRIL HR'),
     coalesce(p_source, 'Makams Ops'), public.current_app_user_id())
  returning id into v_id;

  return v_id;
end $$;

-- ---------- employees ----------

create or replace function public.tg_employee_to_candidate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_candidate(
    new.full_name, new.phone, new.designation, new.hq_name,
    'CRIL', 'CRIL HR', 'Employee'
  );
  return new;
end $$;

drop trigger if exists employee_to_candidate on public.people;
create trigger employee_to_candidate after insert on public.people
  for each row execute function public.tg_employee_to_candidate();

-- ---------- prospectives ----------

create or replace function public.tg_prospective_to_candidate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- rows pushed across FROM the Candidates DB are already there
  if new.candidate_id is not null then return new; end if;

  perform public.ensure_candidate(
    new.full_name, new.contact, new.designation, new.area,
    'CRIL', 'CRIL HR', 'Prospective'
  );
  return new;
end $$;

drop trigger if exists prospective_to_candidate on public.prospectives;
create trigger prospective_to_candidate after insert on public.prospectives
  for each row execute function public.tg_prospective_to_candidate();
