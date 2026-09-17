-- ============================================================
-- Makams Ops — UPGRADE: referral rules & candidate access
--   * referral links carry the referrer and expire after 7 days
--   * the Candidates DB is no longer listable by HR — they pull
--     one area at a time (enforced in the database, not the UI)
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.
-- Run AFTER upgrade-hr-v3.sql and upgrade-referral-review.sql.
-- ============================================================

do $$ begin
  if to_regclass('public.prospectives') is null then
    raise exception 'Run upgrade-hr-v3.sql first — this upgrade builds on it.';
  end if;
  if to_regclass('public.referral_submissions') is null then
    raise exception 'Run upgrade-referral-review.sql first — this upgrade builds on it.';
  end if;
end $$;

-- ============================================================
-- Makams Ops — 0010: referral rules & candidate access
--   * referral links carry the referrer (auto-filled on the form)
--     and expire after 7 days
--   * HR can no longer browse the whole Candidates DB — they
--     search an area to pull the matching rows (enforced by RLS,
--     not just hidden in the UI). Admin still sees everything.
-- ============================================================

-- ---------- links: who is referring, and a 7-day life ----------

alter table public.form_links add column if not exists referrer_name    text;
alter table public.form_links add column if not exists referrer_emp_id  text;
alter table public.form_links add column if not exists referrer_phone   text;

alter table public.form_links alter column expires_at set default (now() + interval '7 days');

-- existing links had no expiry: give them the same 7-day window from now
update public.form_links set expires_at = now() + interval '7 days' where expires_at is null;

-- ---------- the form page needs the referrer + expiry ----------

create or replace function public.form_link_info(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_link public.form_links%rowtype;
  v_form public.form_templates%rowtype;
  v_company text;
begin
  select * into v_link from public.form_links where token = p_token;
  if not found then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if not v_link.active then return jsonb_build_object('ok', false, 'reason', 'revoked'); end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  select * into v_form from public.form_templates where id = v_link.form_id;
  if not found or not v_form.active then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  end if;

  select value->>'name' into v_company from public.app_settings where key = 'company';

  return jsonb_build_object(
    'ok', true,
    'company', coalesce(v_company, 'Makams'),
    'source_name', v_link.source_name,
    'expires_at', v_link.expires_at,
    'referrer', jsonb_build_object(
      'name', v_link.referrer_name,
      'emp_id', v_link.referrer_emp_id,
      'phone', v_link.referrer_phone,
      'locked', (v_link.referrer_name is not null)
    ),
    'form', jsonb_build_object(
      'name', v_form.name,
      'description', v_form.description,
      'kind', v_form.kind,
      'fields', v_form.fields
    )
  );
end $$;

grant execute on function public.form_link_info(text) to anon, authenticated;

-- ---------- candidates: no bulk browsing for HR ----------

drop policy if exists candidates_all on public.candidates;

-- admin sees the whole database
drop policy if exists candidates_read_admin on public.candidates;
create policy candidates_read_admin on public.candidates
  for select to authenticated using (public.has_role('admin'));

-- HR can add, edit (incl. HR comments) and remove rows, but cannot
-- list them: reads go through search_candidates(area) below.
drop policy if exists candidates_insert_hr on public.candidates;
create policy candidates_insert_hr on public.candidates
  for insert to authenticated with check (public.has_role('hr'));
drop policy if exists candidates_update_hr on public.candidates;
create policy candidates_update_hr on public.candidates
  for update to authenticated using (public.has_role('hr')) with check (public.has_role('hr'));
drop policy if exists candidates_delete_hr on public.candidates;
create policy candidates_delete_hr on public.candidates
  for delete to authenticated using (public.has_role('hr'));

create index if not exists candidates_area_idx on public.candidates (lower(area));

-- Fetch candidates for one area. HR's only way into the database.
create or replace function public.search_candidates(p_area text, p_limit int default 500)
returns setof public.candidates
language plpgsql stable security definer set search_path = public as $$
declare
  v_area text := btrim(coalesce(p_area, ''));
begin
  if not public.has_role('hr') then raise exception 'Not allowed'; end if;
  if length(v_area) < 2 then
    raise exception 'Type at least 2 characters of an area to search';
  end if;

  return query
    select * from public.candidates
     where area ilike '%' || v_area || '%'
     order by created_at desc
     limit least(greatest(coalesce(p_limit, 500), 1), 2000);
end $$;

grant execute on function public.search_candidates(text, int) to authenticated;

-- Headline count only (no rows) so the dashboard tile still works.
create or replace function public.candidates_count()
returns integer
language sql stable security definer set search_path = public as $$
  select case when public.has_role('hr')
              then (select count(*)::int from public.candidates)
              else 0 end
$$;

grant execute on function public.candidates_count() to authenticated;

-- List of areas HR can search, so the box can suggest without leaking rows.
create or replace function public.candidate_areas()
returns setof text
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('hr') then raise exception 'Not allowed'; end if;
  return query
    select distinct area from public.candidates
     where area is not null and btrim(area) <> ''
     order by area;
end $$;

grant execute on function public.candidate_areas() to authenticated;

-- ---------- writes go through RPCs ----------
-- Postgres applies SELECT policies to any UPDATE/DELETE with a WHERE clause,
-- so a role that cannot list the table cannot update it either. HR therefore
-- edits through these definer functions: one row at a time, by id.

create or replace function public.save_candidate(p_id uuid, p_patch jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_allowed text[] := array['full_name','designation','area','current_company','phone',
                            'referred_by_name','referrer_emp_id','hr_comment','source'];
  v jsonb := '{}'::jsonb;
  k text;
begin
  if not public.has_role('hr') then raise exception 'Not allowed'; end if;

  foreach k in array v_allowed loop
    if p_patch ? k then v := v || jsonb_build_object(k, p_patch -> k); end if;
  end loop;

  if p_id is null then
    if coalesce(btrim(v ->> 'full_name'), '') = '' then raise exception 'Candidate name is required'; end if;
    insert into public.candidates (full_name, designation, area, current_company, phone,
                                   referred_by_name, referrer_emp_id, hr_comment, source, created_by)
    values (v ->> 'full_name', v ->> 'designation', v ->> 'area', v ->> 'current_company', v ->> 'phone',
            v ->> 'referred_by_name', v ->> 'referrer_emp_id', v ->> 'hr_comment',
            coalesce(v ->> 'source', 'Manual entry'), public.current_app_user_id())
    returning id into v_id;
    return v_id;
  end if;

  update public.candidates c
     set full_name       = coalesce(v ->> 'full_name', c.full_name),
         designation     = case when v ? 'designation'     then v ->> 'designation'     else c.designation end,
         area            = case when v ? 'area'            then v ->> 'area'            else c.area end,
         current_company = case when v ? 'current_company' then v ->> 'current_company' else c.current_company end,
         phone           = case when v ? 'phone'           then v ->> 'phone'           else c.phone end,
         referred_by_name= case when v ? 'referred_by_name'then v ->> 'referred_by_name'else c.referred_by_name end,
         referrer_emp_id = case when v ? 'referrer_emp_id' then v ->> 'referrer_emp_id' else c.referrer_emp_id end,
         hr_comment      = case when v ? 'hr_comment'      then v ->> 'hr_comment'      else c.hr_comment end
   where c.id = p_id
  returning c.id into v_id;

  if v_id is null then raise exception 'Candidate not found'; end if;
  return v_id;
end $$;

grant execute on function public.save_candidate(uuid, jsonb) to authenticated;

create or replace function public.delete_candidate(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('hr') then raise exception 'Not allowed'; end if;
  delete from public.candidates where id = p_id;
end $$;

grant execute on function public.delete_candidate(uuid) to authenticated;

-- One click: copy a candidate onto the Prospectives sheet and flag the row.
create or replace function public.pick_candidate(p_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c public.candidates%rowtype;
  v_pros uuid;
begin
  if not public.has_role('hr') then raise exception 'Not allowed'; end if;

  select * into c from public.candidates where id = p_id for update;
  if not found then raise exception 'Candidate not found'; end if;
  if c.prospective_id is not null then raise exception 'Already on the Prospectives sheet'; end if;

  insert into public.prospectives (full_name, designation, area, contact, status, candidate_id, source, created_by)
  values (c.full_name, c.designation, c.area, c.phone, 'new', c.id,
          case when c.referrer_emp_id is not null then 'Internal Referral' else 'Other' end,
          public.current_app_user_id())
  returning id into v_pros;

  update public.candidates
     set picked_at = now(), prospective_id = v_pros
   where id = p_id;

  return v_pros;
end $$;

grant execute on function public.pick_candidate(uuid) to authenticated;

-- existing phone numbers: bring anything that is already a valid Indian
-- mobile into the canonical +91XXXXXXXXXX shape. Anything else is left
-- untouched for HR to fix by hand.
update public.candidates
   set phone = '+91' || right(regexp_replace(phone, '\D', '', 'g'), 10)
 where phone is not null
   and phone !~ '^\+91[6-9][0-9]{9}$'
   and right(regexp_replace(phone, '\D', '', 'g'), 10) ~ '^[6-9][0-9]{9}$'
   and length(regexp_replace(phone, '\D', '', 'g')) between 10 and 13;

update public.referral_submissions
   set phone = '+91' || right(regexp_replace(phone, '\D', '', 'g'), 10)
 where phone is not null
   and phone !~ '^\+91[6-9][0-9]{9}$'
   and right(regexp_replace(phone, '\D', '', 'g'), 10) ~ '^[6-9][0-9]{9}$'
   and length(regexp_replace(phone, '\D', '', 'g')) between 10 and 13;

select 'Referral rules installed: '
       || (select count(*) from public.form_links where expires_at > now()) || ' live links, '
       || (select count(*) from public.candidates where phone like '+91%') || ' phones normalised, '
       || 'HR now searches the DB by area'
  as result;

-- make the API layer re-read the schema straight away
notify pgrst, 'reload schema';
