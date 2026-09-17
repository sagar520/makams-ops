-- ============================================================
-- Makams Ops — UPGRADE: referral review queue
-- Requires the previous upgrade (upgrade-hr-v3.sql) to be applied first.
-- Safe to run more than once — it skips anything already in place.
-- ============================================================

do $$ begin
  if to_regclass('public.prospectives') is null then
    raise exception 'Run upgrade-hr-v3.sql first — this upgrade builds on it.';
  end if;
end $$;

-- ============================================================
-- 0008: referral review queue
-- Form submissions no longer land straight in the Candidates DB.
-- They wait as pending entries that HR can edit, then approve
-- into the DB (or reject).
-- ============================================================

create table if not exists public.referral_submissions (
  id               uuid primary key default gen_random_uuid(),
  response_id      uuid references public.form_responses (id) on delete set null,
  link_id          uuid references public.form_links (id) on delete set null,
  source           text,
  referred_by_name text,
  referrer_emp_id  text,
  referrer_phone   text,
  full_name        text not null,
  designation      text,
  area             text,
  current_company  text,
  phone            text,
  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  candidate_id     uuid references public.candidates (id) on delete set null,
  reviewed_by      uuid references public.app_users (id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists referral_submissions_status_idx on public.referral_submissions (status);
create index if not exists referral_submissions_response_idx on public.referral_submissions (response_id);

drop trigger if exists set_updated_at on public.referral_submissions;
create trigger set_updated_at before update on public.referral_submissions
  for each row execute function public.tg_set_updated_at();

alter table public.referral_submissions enable row level security;
drop policy if exists referral_submissions_all on public.referral_submissions;
create policy referral_submissions_all on public.referral_submissions
  for all to authenticated using (public.has_role('hr')) with check (public.has_role('hr'));

-- Approve one entry into the Candidates DB (atomic).
create or replace function public.approve_referral_submission(p_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v public.referral_submissions%rowtype;
  v_cand uuid;
begin
  if not public.has_role('hr') then raise exception 'Not allowed'; end if;

  select * into v from public.referral_submissions where id = p_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if v.status <> 'pending' then raise exception 'Already reviewed'; end if;

  insert into public.candidates
    (full_name, designation, area, current_company, phone,
     referred_by_name, referrer_emp_id, source, link_id, response_id, created_by)
  values
    (v.full_name, v.designation, v.area, v.current_company, v.phone,
     v.referred_by_name, v.referrer_emp_id, v.source, v.link_id, v.response_id,
     public.current_app_user_id())
  returning id into v_cand;

  update public.referral_submissions
     set status = 'approved', candidate_id = v_cand,
         reviewed_by = public.current_app_user_id(), reviewed_at = now()
   where id = p_id;

  return v_cand;
end $$;

grant execute on function public.approve_referral_submission(uuid) to authenticated;

-- dummy top-up: a couple of pending submissions so the queue isn't empty.
-- Skipped entirely if the queue already has anything in it.
insert into public.referral_submissions
  (source, referred_by_name, referrer_emp_id, referrer_phone, full_name, designation, area, current_company, phone)
select * from (values
  ('Consultant Ramesh — TalentBridge', 'Ramesh Kumar (TalentBridge)', null::text, '98150 00110', 'Gaurav Nanda', 'Sales Officer', 'Patiala', 'Dabur (distributor)', '98700 45612'),
  ('Consultant Ramesh — TalentBridge', 'Ramesh Kumar (TalentBridge)', null::text, '98150 00110', 'Simarjit Dhillon', 'Sales Rep', 'Moga', 'Local FMCG stockist', '97910 33445')
) as v
where not exists (select 1 from public.referral_submissions);

select 'Review queue ready: ' || count(*) || ' pending submissions waiting' as result
  from public.referral_submissions where status = 'pending';

-- make the API layer re-read the schema straight away
notify pgrst, 'reload schema';
