-- ============================================================
-- Makams Ops — 0006 HR v3:
--   * Prospectives sheet (active hiring pipeline, sales)
--   * Candidates DB reshaped around referrals
--     (Referred by, EMP ID, Name, Area, Designation, Current Company,
--      Phone, HR Comment)
--   * Referral form kind: referrer details + multiple candidates
--   * Safe to run on a database that already has data
-- ============================================================

-- ---------- prospectives ----------

create table public.prospectives (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  designation  text,
  area         text,
  contact      text,
  status       text not null default 'new' check (status in
               ('new','contacted','interested','interview_scheduled','rejected','offer_letter_sent','joined')),
  candidate_id uuid references public.candidates (id) on delete set null,
  created_by   uuid references public.app_users (id) default public.current_app_user_id(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index prospectives_status_idx on public.prospectives (status);

create trigger set_updated_at before update on public.prospectives
  for each row execute function public.tg_set_updated_at();

alter table public.prospectives enable row level security;
create policy prospectives_all on public.prospectives
  for all to authenticated using (public.has_role('hr')) with check (public.has_role('hr'));

-- ---------- candidates: reshape to the referral DB ----------

alter table public.candidates rename column title to designation;
alter table public.candidates rename column organization to current_company;
alter table public.candidates rename column location to area;
alter table public.candidates rename column notes to hr_comment;

alter table public.candidates add column referred_by_name text;
alter table public.candidates add column referrer_emp_id text;
alter table public.candidates add column picked_at timestamptz;         -- set when copied to Prospectives
alter table public.candidates add column prospective_id uuid references public.prospectives (id) on delete set null;

-- old pipeline status no longer drives the DB; keep the column for history but relax nothing.
-- backfill: earlier rows carried the source as their only "referrer" signal
update public.candidates set referred_by_name = source where referred_by_name is null;

-- ---------- referral form kind ----------

alter table public.form_templates drop constraint form_templates_kind_check;
alter table public.form_templates add constraint form_templates_kind_check
  check (kind in ('candidate_intake','referral','general'));

-- seed the standard referral form (fixed layout rendered by the app:
-- referrer details once, then a table of candidates)
insert into public.form_templates (name, description, kind, fields)
select 'Candidate referral form',
       null,
       'referral',
       '[]'::jsonb
where not exists (select 1 from public.form_templates where kind = 'referral');
