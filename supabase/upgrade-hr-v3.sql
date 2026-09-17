-- ============================================================
-- Makams Ops — UPGRADE for your live project (run once)
-- Applies migrations 0006 + 0007 and refreshes the dummy data.
-- Your existing rows are kept (candidate columns are renamed in place).
-- Run this ONCE — if it has already been applied, it stops with a
-- clear message and changes nothing.
-- ============================================================

do $$ begin
  if to_regclass('public.prospectives') is not null then
    raise exception 'Already applied — this upgrade has run before. Skip this file; nothing was changed.';
  end if;
end $$;

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
       'Share your details once, then add as many candidates as you like below.',
       'referral',
       '[]'::jsonb
where not exists (select 1 from public.form_templates where kind = 'referral');

-- ============================================================
-- Makams Ops — 0007: employees follow the learnapp users framework
--   * sales-only workforce: level (sales / ASM / RSM / head office)
--   * HQ + ASM/RSM hierarchy names, same shape as the learnapp
--   * emp_code doubles as the learnapp Employee ID (their login)
-- ============================================================

alter table public.people add column sales_role text not null default 'sales'
  check (sales_role in ('sales','asm','rsm','head_office'));
alter table public.people add column hq_name text;
alter table public.people add column asm_name text;
alter table public.people add column rsm_name text;

-- everyone in this app is sales
update public.people set department = 'Sales';
alter table public.people alter column department set default 'Sales';

-- default was still the pre-rename value
alter table public.people alter column status set default 'joining';

create index people_hq_idx on public.people (hq_name);

-- ============================================================
-- Dummy-data top-up for HR v3 (safe to skip once you load real data;
-- reset-dummy-data.sql removes all of it)
-- ============================================================

-- make the dummy workforce look like the sales org
update public.people set sales_role = 'sales',
  hq_name = coalesce(hq_name, (array['Ludhiana','Jalandhar','Amritsar','Patiala','Khanna','Bathinda'])[1 + (abs(hashtext(id::text)) % 6)]);
update public.people set sales_role = 'asm', asm_name = null where emp_code in ('MKM-001','MKM-002');
update public.people set asm_name = case when hq_name in ('Ludhiana','Khanna','Patiala') then 'Deepak Verma' else 'Sunita Kaur' end where sales_role = 'sales';
update public.people set rsm_name = 'Deepak Verma' where sales_role in ('sales','asm');

-- candidates: referral attribution
update public.candidates set referred_by_name = coalesce(referred_by_name, source);
update public.candidates set referrer_emp_id = 'MKM-001'
 where referred_by_name ilike 'Referral%' and referrer_emp_id is null;

-- point existing source links at the referral form
update public.form_links
   set form_id = (select id from public.form_templates where kind = 'referral' limit 1)
 where exists (select 1 from public.form_templates where kind = 'referral');

-- prospectives sheet: pick up a few referrals + some standalone rows
insert into public.prospectives (full_name, designation, area, contact, status, candidate_id, created_at)
select full_name, designation, area, phone,
       (array['new','contacted','interested','interview_scheduled','offer_letter_sent'])[1 + (abs(hashtext(id::text)) % 5)],
       id, created_at + interval '2 days'
  from public.candidates
 order by created_at
 limit 5;

update public.candidates c
   set picked_at = now(), prospective_id = p.id
  from public.prospectives p
 where p.candidate_id = c.id;

insert into public.prospectives (full_name, designation, area, contact, status) values
  ('Sandeep Walia', 'Sales Rep', 'Bathinda', '98552 10394', 'contacted'),
  ('Jaspreet Brar', 'Sales Rep', 'Moga', '97806 44121', 'new'),
  ('Sahil Chopra', 'Sales Rep', 'Ludhiana', '99145 87230', 'rejected');

select 'Upgrade done: ' || (select count(*) from public.prospectives) || ' prospectives, ' || (select count(*) from public.candidates) || ' candidates, referral form ready' as result;
