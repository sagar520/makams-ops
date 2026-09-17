-- Makams Ops — complete schema (migrations 0001–0007 combined)
-- Paste this whole file into the Supabase SQL Editor and Run once.


-- ======================= 0001_core.sql =======================
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

-- ======================= 0002_hr.sql =======================
-- ============================================================
-- Makams Ops — 0002 HR: people, documents, upload links,
-- checklists, learnapp + sheet-sync logs, storage
-- ============================================================

-- ---------- people (candidates, employees, exits) ----------

create table public.people (
  id            uuid primary key default gen_random_uuid(),
  emp_code      text unique,
  full_name     text not null,
  status        text not null default 'candidate'
                check (status in ('candidate','active','exited','not_joined')),

  -- contact
  personal_email text,
  work_email     text,
  phone          text,
  alt_phone      text,

  -- job
  department     text,
  designation    text,
  location       text,
  employment_type text check (employment_type is null or employment_type in ('full_time','part_time','contract','intern')),
  date_of_join   date,
  date_of_exit   date,
  exit_reason    text,

  -- personal
  date_of_birth  date,
  gender         text,
  blood_group    text,
  address        text,
  city           text,
  state          text,
  pincode        text,
  emergency_contact_name  text,
  emergency_contact_phone text,

  -- statutory & bank
  pan_number     text,
  aadhaar_number text,
  uan_number     text,
  esic_number    text,
  bank_name      text,
  bank_account   text,
  bank_ifsc      text,

  -- compensation
  monthly_gross  numeric,

  -- learnapp link
  learnapp_user_id uuid,
  learnapp_email   text,
  learnapp_status  text check (learnapp_status is null or learnapp_status in ('active','disabled')),

  notes          text,
  extra          jsonb not null default '{}',
  created_by     uuid references public.app_users (id) default public.current_app_user_id(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index people_status_idx on public.people (status);
create index people_name_idx on public.people (lower(full_name));

create trigger set_updated_at before update on public.people
  for each row execute function public.tg_set_updated_at();

-- ---------- employee documents ----------

create table public.person_documents (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.people (id) on delete cascade,
  doc_type     text not null,
  title        text,
  file_path    text,          -- storage path in bucket employee-docs
  file_name    text,
  mime_type    text,
  size_bytes   bigint,
  status       text not null default 'uploaded'
               check (status in ('uploaded','verified','rejected')),
  source       text not null default 'hr' check (source in ('hr','employee')),
  link_id      uuid,          -- upload link used, if any
  remarks      text,
  uploaded_at  timestamptz not null default now(),
  verified_by  uuid references public.app_users (id),
  verified_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index person_documents_person_idx on public.person_documents (person_id);

-- ---------- tokenised upload links (no login for employees) ----------

create table public.upload_links (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.people (id) on delete cascade,
  token          text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  doc_types      text[] not null default '{}',
  profile_fields text[] not null default '{}',
  message        text,
  expires_at     timestamptz not null default now() + interval '14 days',
  created_by     uuid references public.app_users (id) default public.current_app_user_id(),
  created_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  last_used_at   timestamptz,
  submitted_at   timestamptz
);

create index upload_links_person_idx on public.upload_links (person_id);

-- ---------- checklists ----------

create table public.checklist_templates (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('onboarding','exit')),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.checklist_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  position    int not null default 0,
  title       text not null,
  description text,
  owner_role  text not null default 'hr',
  doc_type    text,     -- optional: item tied to collecting a document
  due_days    int       -- days from checklist start
);

create index checklist_template_items_tpl_idx on public.checklist_template_items (template_id);

create table public.person_checklists (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.people (id) on delete cascade,
  template_id  uuid references public.checklist_templates (id),
  kind         text not null check (kind in ('onboarding','exit')),
  name         text not null,
  status       text not null default 'in_progress'
               check (status in ('in_progress','completed','cancelled')),
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  created_by   uuid references public.app_users (id)
);

create index person_checklists_person_idx on public.person_checklists (person_id);

create table public.person_checklist_items (
  id           uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.person_checklists (id) on delete cascade,
  position     int not null default 0,
  title        text not null,
  description  text,
  owner_role   text not null default 'hr',
  doc_type     text,
  due_date     date,
  status       text not null default 'pending' check (status in ('pending','done','na')),
  done_by      uuid references public.app_users (id),
  done_at      timestamptz,
  note         text
);

create index person_checklist_items_cl_idx on public.person_checklist_items (checklist_id);

-- auto-complete / reopen parent checklist
create or replace function public.tg_checklist_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_checklist uuid := coalesce(new.checklist_id, old.checklist_id);
  v_pending int;
begin
  select count(*) into v_pending
    from public.person_checklist_items
   where checklist_id = v_checklist and status = 'pending';

  if v_pending = 0 then
    update public.person_checklists
       set status = 'completed', completed_at = coalesce(completed_at, now())
     where id = v_checklist and status = 'in_progress';
  else
    update public.person_checklists
       set status = 'in_progress', completed_at = null
     where id = v_checklist and status = 'completed';
  end if;
  return null;
end $$;

create trigger checklist_progress
  after insert or update of status or delete on public.person_checklist_items
  for each row execute function public.tg_checklist_progress();

-- instantiate a checklist from a template
create or replace function public.start_checklist(p_person uuid, p_template uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_tpl public.checklist_templates%rowtype;
  v_id uuid;
begin
  if not public.has_role('hr') then
    raise exception 'Not allowed';
  end if;

  select * into v_tpl from public.checklist_templates where id = p_template and active;
  if not found then
    raise exception 'Template not found';
  end if;

  insert into public.person_checklists (person_id, template_id, kind, name, created_by)
  values (p_person, p_template, v_tpl.kind, v_tpl.name, public.current_app_user_id())
  returning id into v_id;

  insert into public.person_checklist_items
    (checklist_id, position, title, description, owner_role, doc_type, due_date)
  select v_id, position, title, description, owner_role, doc_type,
         case when due_days is null then null else current_date + due_days end
    from public.checklist_template_items
   where template_id = p_template
   order by position;

  return v_id;
end $$;

grant execute on function public.start_checklist(uuid, uuid) to authenticated;

-- ---------- integration logs ----------

create table public.learnapp_actions (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid references public.people (id) on delete set null,
  action     text not null check (action in ('invite','create','disable','enable')),
  status     text not null check (status in ('ok','error')),
  detail     text,
  created_by uuid references public.app_users (id),
  created_at timestamptz not null default now()
);

create table public.sheet_sync_log (
  id         uuid primary key default gen_random_uuid(),
  status     text not null check (status in ('ok','error')),
  rows       int,
  detail     text,
  created_by uuid references public.app_users (id),
  created_at timestamptz not null default now()
);

-- ---------- RLS: HR module is hr/admin only ----------

alter table public.people enable row level security;
alter table public.person_documents enable row level security;
alter table public.upload_links enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.person_checklists enable row level security;
alter table public.person_checklist_items enable row level security;
alter table public.learnapp_actions enable row level security;
alter table public.sheet_sync_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'people','person_documents','upload_links','checklist_templates',
    'checklist_template_items','person_checklists','person_checklist_items',
    'learnapp_actions','sheet_sync_log'
  ] loop
    execute format('create policy %I_hr_all on public.%I for all to authenticated using (public.has_role(''hr'')) with check (public.has_role(''hr''))', t, t);
  end loop;
end $$;

-- ---------- public (anon) RPCs for the employee portal ----------

-- Whitelist of profile fields an upload link may ever expose/update
create or replace function public.link_profile_whitelist()
returns text[] language sql immutable as $$
  select array[
    'personal_email','phone','alt_phone','date_of_birth','blood_group',
    'address','city','state','pincode',
    'emergency_contact_name','emergency_contact_phone',
    'pan_number','aadhaar_number','uan_number',
    'bank_name','bank_account','bank_ifsc'
  ]
$$;

create or replace function public.upload_link_info(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_link public.upload_links%rowtype;
  v_person public.people%rowtype;
  v_company text;
  v_docs jsonb;
  v_fields jsonb;
begin
  select * into v_link from public.upload_links where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if v_link.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  end if;
  if v_link.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  select * into v_person from public.people where id = v_link.person_id;
  select value->>'name' into v_company from public.app_settings where key = 'company';

  select coalesce(jsonb_agg(jsonb_build_object(
           'doc_type', dt,
           'uploaded', exists (
             select 1 from public.person_documents d
              where d.person_id = v_link.person_id and d.doc_type = dt and d.link_id = v_link.id
           )
         ) order by ord), '[]'::jsonb)
    into v_docs
    from unnest(v_link.doc_types) with ordinality as u(dt, ord);

  select coalesce(jsonb_object_agg(f, to_jsonb(
           case f
             when 'personal_email' then v_person.personal_email
             when 'phone' then v_person.phone
             when 'alt_phone' then v_person.alt_phone
             when 'date_of_birth' then v_person.date_of_birth::text
             when 'blood_group' then v_person.blood_group
             when 'address' then v_person.address
             when 'city' then v_person.city
             when 'state' then v_person.state
             when 'pincode' then v_person.pincode
             when 'emergency_contact_name' then v_person.emergency_contact_name
             when 'emergency_contact_phone' then v_person.emergency_contact_phone
             when 'pan_number' then v_person.pan_number
             when 'aadhaar_number' then v_person.aadhaar_number
             when 'uan_number' then v_person.uan_number
             when 'bank_name' then v_person.bank_name
             when 'bank_account' then v_person.bank_account
             when 'bank_ifsc' then v_person.bank_ifsc
           end)), '{}'::jsonb)
    into v_fields
    from unnest(v_link.profile_fields) as f
   where f = any (public.link_profile_whitelist());

  return jsonb_build_object(
    'ok', true,
    'company', coalesce(v_company, 'Makams'),
    'person_name', v_person.full_name,
    'message', v_link.message,
    'expires_at', v_link.expires_at,
    'doc_types', v_docs,
    'profile_fields', coalesce(to_jsonb(v_link.profile_fields), '[]'::jsonb),
    'profile_values', v_fields,
    'submitted_at', v_link.submitted_at
  );
end $$;

create or replace function public.submit_link_profile(p_token text, p_fields jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_link public.upload_links%rowtype;
  k text;
  v text;
begin
  select * into v_link from public.upload_links where token = p_token;
  if not found or v_link.revoked_at is not null or v_link.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  for k in select jsonb_object_keys(coalesce(p_fields, '{}'::jsonb)) loop
    if k = any (v_link.profile_fields) and k = any (public.link_profile_whitelist()) then
      v := p_fields->>k;
      if v is not null and length(v) > 500 then
        v := left(v, 500);
      end if;
      if k = 'date_of_birth' then
        execute 'update public.people set date_of_birth = nullif($1,'''')::date, updated_at = now() where id = $2'
          using v, v_link.person_id;
      else
        execute format('update public.people set %I = nullif($1,''''), updated_at = now() where id = $2', k)
          using v, v_link.person_id;
      end if;
    end if;
  end loop;

  update public.upload_links
     set last_used_at = now(), submitted_at = now()
   where id = v_link.id;

  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.upload_link_info(text) to anon, authenticated;
grant execute on function public.submit_link_profile(text, jsonb) to anon, authenticated;

-- ---------- storage bucket for employee documents ----------

insert into storage.buckets (id, name, public, file_size_limit)
values ('employee-docs', 'employee-docs', false, 15728640)
on conflict (id) do nothing;

create policy "employee docs hr read" on storage.objects
  for select to authenticated using (bucket_id = 'employee-docs' and public.has_role('hr'));

create policy "employee docs hr write" on storage.objects
  for insert to authenticated with check (bucket_id = 'employee-docs' and public.has_role('hr'));

create policy "employee docs hr update" on storage.objects
  for update to authenticated using (bucket_id = 'employee-docs' and public.has_role('hr'));

create policy "employee docs hr delete" on storage.objects
  for delete to authenticated using (bucket_id = 'employee-docs' and public.has_role('hr'));

-- ======================= 0003_purchase.sql =======================
-- ============================================================
-- Makams Ops — 0003 Purchase: vendors, PO types/locations,
-- approval rules, purchase orders, receiving, RPCs
-- ============================================================

-- ---------- lookups ----------

create table public.po_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.delivery_locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  address    text,
  state      text,
  gstin      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.vendors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  email         text,
  phone         text,
  gstin         text,
  address       text,
  city          text,
  state         text,
  pincode       text,
  payment_terms text,
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger set_updated_at before update on public.vendors
  for each row execute function public.tg_set_updated_at();

-- ---------- approval rules (matrix) ----------
-- Empty condition arrays mean "any". First matching rule by priority wins.

create table public.approval_rules (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  priority     int not null default 100,
  active       boolean not null default true,
  po_type_ids  uuid[] not null default '{}',
  location_ids uuid[] not null default '{}',
  min_amount   numeric not null default 0,
  max_amount   numeric,
  created_at   timestamptz not null default now()
);

create table public.approval_rule_steps (
  id          uuid primary key default gen_random_uuid(),
  rule_id     uuid not null references public.approval_rules (id) on delete cascade,
  position    int not null default 1,
  approver_id uuid not null references public.app_users (id)
);

create index approval_rule_steps_rule_idx on public.approval_rule_steps (rule_id);

-- ---------- purchase orders ----------

create table public.purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  po_number       text unique,
  status          text not null default 'draft'
                  check (status in ('draft','pending_approval','approved','rejected','cancelled','closed')),
  vendor_id       uuid references public.vendors (id),
  po_type_id      uuid references public.po_types (id),
  location_id     uuid references public.delivery_locations (id),
  order_date      date not null default current_date,
  expected_date   date,
  reference       text,          -- quotation / indent reference
  tax_mode        text not null default 'cgst_sgst' check (tax_mode in ('cgst_sgst','igst','none')),
  subtotal        numeric not null default 0,
  tax_total       numeric not null default 0,
  grand_total     numeric not null default 0,
  terms           text,
  notes           text,
  current_step    int,
  submitted_at    timestamptz,
  approved_at     timestamptz,
  sent_count      int not null default 0,
  last_sent_at    timestamptz,
  received_status text not null default 'none' check (received_status in ('none','partial','full')),
  duplicated_from uuid,
  created_by      uuid references public.app_users (id) default public.current_app_user_id(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index purchase_orders_status_idx on public.purchase_orders (status);
create index purchase_orders_vendor_idx on public.purchase_orders (vendor_id);

create trigger set_updated_at before update on public.purchase_orders
  for each row execute function public.tg_set_updated_at();

create table public.po_items (
  id           uuid primary key default gen_random_uuid(),
  po_id        uuid not null references public.purchase_orders (id) on delete cascade,
  position     int not null default 0,
  description  text not null,
  hsn_code     text,
  qty          numeric not null check (qty > 0),
  unit         text not null default 'nos',
  unit_price   numeric not null default 0,
  tax_pct      numeric not null default 18,
  received_qty numeric not null default 0,
  line_total   numeric generated always as (round(qty * unit_price, 2)) stored,
  tax_amount   numeric generated always as (round(qty * unit_price * tax_pct / 100, 2)) stored
);

create index po_items_po_idx on public.po_items (po_id);

create table public.po_approval_steps (
  id          uuid primary key default gen_random_uuid(),
  po_id       uuid not null references public.purchase_orders (id) on delete cascade,
  position    int not null,
  approver_id uuid not null references public.app_users (id),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_current  boolean not null default false,
  comment     text,
  acted_at    timestamptz,
  unique (po_id, position)
);

create index po_approval_steps_po_idx on public.po_approval_steps (po_id);
create index po_approval_steps_approver_idx on public.po_approval_steps (approver_id) where status = 'pending';

create table public.po_events (
  id         uuid primary key default gen_random_uuid(),
  po_id      uuid not null references public.purchase_orders (id) on delete cascade,
  kind       text not null check (kind in
             ('created','submitted','approved_step','approved','rejected','reopened',
              'cancelled','closed','sent','send_failed','received','receipt_deleted','duplicated')),
  actor_id   uuid references public.app_users (id),
  detail     jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index po_events_po_idx on public.po_events (po_id, created_at);

create table public.receipts (
  id             uuid primary key default gen_random_uuid(),
  po_id          uuid not null references public.purchase_orders (id) on delete cascade,
  received_date  date not null default current_date,
  invoice_number text,
  invoice_date   date,
  notes          text,
  created_by     uuid references public.app_users (id) default public.current_app_user_id(),
  created_at     timestamptz not null default now()
);

create index receipts_po_idx on public.receipts (po_id);

create table public.receipt_items (
  id         uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  po_item_id uuid not null references public.po_items (id) on delete cascade,
  qty        numeric not null check (qty > 0),
  remarks    text
);

create table public.po_counters (
  fy     text primary key,
  last_n int not null default 0
);

-- ---------- triggers ----------

-- keep PO totals in sync with items
create or replace function public.tg_po_items_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_po uuid := coalesce(new.po_id, old.po_id);
begin
  update public.purchase_orders p
     set subtotal = t.st, tax_total = t.tt, grand_total = t.st + t.tt
    from (
      select coalesce(sum(line_total), 0) as st, coalesce(sum(tax_amount), 0) as tt
        from public.po_items where po_id = v_po
    ) t
   where p.id = v_po;
  return null;
end $$;

create trigger po_items_totals
  after insert or update or delete on public.po_items
  for each row execute function public.tg_po_items_totals();

-- log creation
create or replace function public.tg_po_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.po_events (po_id, kind, actor_id, detail)
  values (new.id, 'created', new.created_by, '{}'::jsonb);
  return null;
end $$;

create trigger po_created after insert on public.purchase_orders
  for each row execute function public.tg_po_created();

-- ---------- RPCs ----------

create or replace function public.fy_code(d date default current_date)
returns text language sql stable as $$
  select case
    when extract(month from d) >= 4
      then to_char(d, 'YY') || '-' || to_char(d + interval '1 year', 'YY')
    else to_char(d - interval '1 year', 'YY') || '-' || to_char(d, 'YY')
  end
$$;

create or replace function public.next_po_number()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_fy text := public.fy_code();
  v_n int;
begin
  select coalesce(value->>'po_prefix', 'PO') into v_prefix from public.app_settings where key = 'company';
  v_prefix := coalesce(v_prefix, 'PO');

  insert into public.po_counters as c (fy, last_n) values (v_fy, 1)
  on conflict (fy) do update set last_n = c.last_n + 1
  returning last_n into v_n;

  return v_prefix || '/' || v_fy || '/' || lpad(v_n::text, 4, '0');
end $$;

-- Submit a draft PO: assigns number, matches an approval rule, creates steps.
create or replace function public.submit_po(p_po uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_po public.purchase_orders%rowtype;
  v_rule public.approval_rules%rowtype;
  v_steps int;
begin
  if not public.has_role('purchase') then
    raise exception 'Not allowed';
  end if;

  select * into v_po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'PO not found'; end if;
  if v_po.status <> 'draft' then raise exception 'Only draft POs can be submitted'; end if;
  if v_po.vendor_id is null then raise exception 'Select a vendor before submitting'; end if;
  if v_po.po_type_id is null then raise exception 'Select a PO type before submitting'; end if;
  if v_po.location_id is null then raise exception 'Select a delivery location before submitting'; end if;
  if not exists (select 1 from public.po_items where po_id = p_po) then
    raise exception 'Add at least one line item before submitting';
  end if;

  -- first matching rule by priority
  select r.* into v_rule
    from public.approval_rules r
   where r.active
     and (cardinality(r.po_type_ids) = 0 or v_po.po_type_id = any (r.po_type_ids))
     and (cardinality(r.location_ids) = 0 or v_po.location_id = any (r.location_ids))
     and v_po.grand_total >= coalesce(r.min_amount, 0)
     and (r.max_amount is null or v_po.grand_total <= r.max_amount)
   order by r.priority asc, r.created_at asc
   limit 1;

  if not found then
    raise exception 'No approval rule matches this PO (type / location / amount). Add one under Settings → Approval rules.';
  end if;

  if v_po.po_number is null then
    update public.purchase_orders set po_number = public.next_po_number() where id = p_po;
  end if;

  delete from public.po_approval_steps where po_id = p_po;

  insert into public.po_approval_steps (po_id, position, approver_id, is_current)
  select p_po, row_number() over (order by s.position), s.approver_id,
         row_number() over (order by s.position) = 1
    from public.approval_rule_steps s
   where s.rule_id = v_rule.id;

  get diagnostics v_steps = row_count;

  if v_steps = 0 then
    -- rule with no steps = auto-approve
    update public.purchase_orders
       set status = 'approved', submitted_at = now(), approved_at = now(), current_step = null
     where id = p_po;
    insert into public.po_events (po_id, kind, actor_id, detail)
    values (p_po, 'approved', public.current_app_user_id(),
            jsonb_build_object('auto', true, 'rule', v_rule.name));
  else
    update public.purchase_orders
       set status = 'pending_approval', submitted_at = now(), current_step = 1
     where id = p_po;
    insert into public.po_events (po_id, kind, actor_id, detail)
    values (p_po, 'submitted', public.current_app_user_id(),
            jsonb_build_object('rule', v_rule.name, 'steps', v_steps));
  end if;

  return jsonb_build_object('ok', true, 'steps', v_steps);
end $$;

-- Approve or reject the current step.
create or replace function public.act_on_po(p_po uuid, p_action text, p_comment text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_po public.purchase_orders%rowtype;
  v_step public.po_approval_steps%rowtype;
  v_me uuid := public.current_app_user_id();
  v_next int;
begin
  if p_action not in ('approve','reject') then raise exception 'Bad action'; end if;

  select * into v_po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'PO not found'; end if;
  if v_po.status <> 'pending_approval' then raise exception 'PO is not awaiting approval'; end if;

  select * into v_step from public.po_approval_steps
   where po_id = p_po and position = v_po.current_step and status = 'pending';
  if not found then raise exception 'No pending approval step'; end if;

  if v_step.approver_id <> v_me and not public.has_role('admin') then
    raise exception 'This step is assigned to someone else';
  end if;

  if p_action = 'approve' then
    update public.po_approval_steps
       set status = 'approved', is_current = false, comment = p_comment, acted_at = now()
     where id = v_step.id;

    select min(position) into v_next from public.po_approval_steps
     where po_id = p_po and status = 'pending';

    if v_next is null then
      update public.purchase_orders
         set status = 'approved', approved_at = now(), current_step = null
       where id = p_po;
      insert into public.po_events (po_id, kind, actor_id, detail)
      values (p_po, 'approved', v_me, jsonb_build_object('comment', p_comment));
    else
      update public.po_approval_steps set is_current = true
       where po_id = p_po and position = v_next;
      update public.purchase_orders set current_step = v_next where id = p_po;
      insert into public.po_events (po_id, kind, actor_id, detail)
      values (p_po, 'approved_step', v_me,
              jsonb_build_object('step', v_step.position, 'comment', p_comment));
    end if;
  else
    update public.po_approval_steps
       set status = 'rejected', is_current = false, comment = p_comment, acted_at = now()
     where id = v_step.id;
    update public.purchase_orders set status = 'rejected', current_step = null where id = p_po;
    insert into public.po_events (po_id, kind, actor_id, detail)
    values (p_po, 'rejected', v_me, jsonb_build_object('step', v_step.position, 'comment', p_comment));
  end if;

  return jsonb_build_object('ok', true);
end $$;

-- Pull a PO back to draft (after rejection, or withdraw while pending).
create or replace function public.reopen_po(p_po uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if not public.has_role('purchase') then raise exception 'Not allowed'; end if;
  select status into v_status from public.purchase_orders where id = p_po for update;
  if v_status is null then raise exception 'PO not found'; end if;
  if v_status not in ('rejected','pending_approval') then
    raise exception 'Only rejected or pending POs can be reopened';
  end if;
  delete from public.po_approval_steps where po_id = p_po;
  update public.purchase_orders
     set status = 'draft', current_step = null, submitted_at = null
   where id = p_po;
  insert into public.po_events (po_id, kind, actor_id)
  values (p_po, 'reopened', public.current_app_user_id());
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.cancel_po(p_po uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_po public.purchase_orders%rowtype;
begin
  if not public.has_role('purchase') then raise exception 'Not allowed'; end if;
  select * into v_po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'PO not found'; end if;
  if v_po.status not in ('draft','pending_approval','approved') or v_po.received_status <> 'none' then
    raise exception 'This PO cannot be cancelled (already received against or closed)';
  end if;
  delete from public.po_approval_steps where po_id = p_po and status = 'pending';
  update public.purchase_orders set status = 'cancelled', current_step = null where id = p_po;
  insert into public.po_events (po_id, kind, actor_id)
  values (p_po, 'cancelled', public.current_app_user_id());
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.close_po(p_po uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if not public.has_role('purchase') then raise exception 'Not allowed'; end if;
  select status into v_status from public.purchase_orders where id = p_po for update;
  if v_status <> 'approved' then raise exception 'Only approved POs can be closed'; end if;
  update public.purchase_orders set status = 'closed' where id = p_po;
  insert into public.po_events (po_id, kind, actor_id)
  values (p_po, 'closed', public.current_app_user_id());
  return jsonb_build_object('ok', true);
end $$;

-- Duplicate any PO into a fresh draft.
create or replace function public.duplicate_po(p_po uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_po public.purchase_orders%rowtype;
  v_new uuid;
begin
  if not public.has_role('purchase') then raise exception 'Not allowed'; end if;
  select * into v_po from public.purchase_orders where id = p_po;
  if not found then raise exception 'PO not found'; end if;

  insert into public.purchase_orders
    (vendor_id, po_type_id, location_id, expected_date, reference, tax_mode,
     terms, notes, duplicated_from, created_by)
  values
    (v_po.vendor_id, v_po.po_type_id, v_po.location_id, null, v_po.reference, v_po.tax_mode,
     v_po.terms, v_po.notes, v_po.id, public.current_app_user_id())
  returning id into v_new;

  insert into public.po_items (po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct)
  select v_new, position, description, hsn_code, qty, unit, unit_price, tax_pct
    from public.po_items where po_id = p_po order by position;

  insert into public.po_events (po_id, kind, actor_id, detail)
  values (v_new, 'duplicated', public.current_app_user_id(),
          jsonb_build_object('from_po', v_po.po_number, 'from_id', v_po.id));

  return v_new;
end $$;

-- recompute received status for a PO
create or replace function public.recompute_received(p_po uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_new text;
begin
  select case
           when count(*) filter (where received_qty > 0) = 0 then 'none'
           when count(*) filter (where received_qty < qty) = 0 then 'full'
           else 'partial'
         end
    into v_new
    from public.po_items where po_id = p_po;
  update public.purchase_orders set received_status = coalesce(v_new, 'none') where id = p_po;
end $$;

-- Record a goods receipt against an approved PO.
create or replace function public.add_receipt(
  p_po uuid,
  p_received_date date,
  p_invoice_number text,
  p_invoice_date date,
  p_notes text,
  p_items jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_po public.purchase_orders%rowtype;
  v_receipt uuid;
  v_item jsonb;
  v_po_item public.po_items%rowtype;
  v_count int := 0;
begin
  if not public.has_role('purchase') then raise exception 'Not allowed'; end if;

  select * into v_po from public.purchase_orders where id = p_po for update;
  if not found then raise exception 'PO not found'; end if;
  if v_po.status <> 'approved' then raise exception 'Receipts can only be recorded against approved POs'; end if;

  insert into public.receipts (po_id, received_date, invoice_number, invoice_date, notes, created_by)
  values (p_po, coalesce(p_received_date, current_date), nullif(p_invoice_number, ''), p_invoice_date,
          nullif(p_notes, ''), public.current_app_user_id())
  returning id into v_receipt;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if coalesce((v_item->>'qty')::numeric, 0) <= 0 then continue; end if;

    select * into v_po_item from public.po_items
     where id = (v_item->>'po_item_id')::uuid and po_id = p_po;
    if not found then raise exception 'Line item does not belong to this PO'; end if;

    insert into public.receipt_items (receipt_id, po_item_id, qty, remarks)
    values (v_receipt, v_po_item.id, (v_item->>'qty')::numeric, nullif(v_item->>'remarks', ''));

    update public.po_items
       set received_qty = received_qty + (v_item->>'qty')::numeric
     where id = v_po_item.id;

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then raise exception 'Enter a received quantity on at least one line'; end if;

  perform public.recompute_received(p_po);

  insert into public.po_events (po_id, kind, actor_id, detail)
  values (p_po, 'received', public.current_app_user_id(),
          jsonb_build_object('receipt_id', v_receipt, 'invoice', p_invoice_number, 'lines', v_count));

  return v_receipt;
end $$;

-- Undo a receipt entered by mistake.
create or replace function public.delete_receipt(p_receipt uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_po uuid;
  r record;
begin
  if not public.has_role('purchase') then raise exception 'Not allowed'; end if;
  select po_id into v_po from public.receipts where id = p_receipt;
  if v_po is null then raise exception 'Receipt not found'; end if;

  for r in select po_item_id, qty from public.receipt_items where receipt_id = p_receipt loop
    update public.po_items set received_qty = greatest(received_qty - r.qty, 0) where id = r.po_item_id;
  end loop;

  delete from public.receipts where id = p_receipt;
  perform public.recompute_received(v_po);

  insert into public.po_events (po_id, kind, actor_id, detail)
  values (v_po, 'receipt_deleted', public.current_app_user_id(), jsonb_build_object('receipt_id', p_receipt));

  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.submit_po(uuid) to authenticated;
grant execute on function public.act_on_po(uuid, text, text) to authenticated;
grant execute on function public.reopen_po(uuid) to authenticated;
grant execute on function public.cancel_po(uuid) to authenticated;
grant execute on function public.close_po(uuid) to authenticated;
grant execute on function public.duplicate_po(uuid) to authenticated;
grant execute on function public.add_receipt(uuid, date, text, date, text, jsonb) to authenticated;
grant execute on function public.delete_receipt(uuid) to authenticated;

-- ---------- RLS ----------

alter table public.po_types enable row level security;
alter table public.delivery_locations enable row level security;
alter table public.vendors enable row level security;
alter table public.approval_rules enable row level security;
alter table public.approval_rule_steps enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.po_items enable row level security;
alter table public.po_approval_steps enable row level security;
alter table public.po_events enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.po_counters enable row level security;  -- no policies: RPC-only

-- lookups: all staff can read, admin writes
create policy po_types_select on public.po_types
  for select to authenticated using (public.is_staff());
create policy po_types_write on public.po_types
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy delivery_locations_select on public.delivery_locations
  for select to authenticated using (public.is_staff());
create policy delivery_locations_write on public.delivery_locations
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy approval_rules_select on public.approval_rules
  for select to authenticated using (public.has_role('purchase') or public.has_role('approver'));
create policy approval_rules_write on public.approval_rules
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy approval_rule_steps_select on public.approval_rule_steps
  for select to authenticated using (public.has_role('purchase') or public.has_role('approver'));
create policy approval_rule_steps_write on public.approval_rule_steps
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

-- vendors: purchase writes, approvers can read
create policy vendors_select on public.vendors
  for select to authenticated using (public.has_role('purchase') or public.has_role('approver'));
create policy vendors_write on public.vendors
  for all to authenticated using (public.has_role('purchase')) with check (public.has_role('purchase'));

-- purchase orders: reads for purchase + approvers; direct writes only on drafts
create policy purchase_orders_select on public.purchase_orders
  for select to authenticated using (public.has_role('purchase') or public.has_role('approver'));
create policy purchase_orders_insert on public.purchase_orders
  for insert to authenticated with check (public.has_role('purchase') and status = 'draft');
create policy purchase_orders_update on public.purchase_orders
  for update to authenticated
  using (public.has_role('purchase') and status = 'draft')
  with check (public.has_role('purchase') and status = 'draft');
create policy purchase_orders_delete on public.purchase_orders
  for delete to authenticated using (public.has_role('purchase') and status = 'draft');

create policy po_items_select on public.po_items
  for select to authenticated using (public.has_role('purchase') or public.has_role('approver'));
create policy po_items_write on public.po_items
  for all to authenticated
  using (public.has_role('purchase') and exists (select 1 from public.purchase_orders p where p.id = po_id and p.status = 'draft'))
  with check (public.has_role('purchase') and exists (select 1 from public.purchase_orders p where p.id = po_id and p.status = 'draft'));

create policy po_approval_steps_select on public.po_approval_steps
  for select to authenticated using (public.has_role('purchase') or public.has_role('approver'));
-- no direct writes: managed by RPCs

create policy po_events_select on public.po_events
  for select to authenticated using (public.has_role('purchase') or public.has_role('approver'));
-- no direct writes: managed by triggers/RPCs/edge functions

create policy receipts_select on public.receipts
  for select to authenticated using (public.has_role('purchase') or public.has_role('approver'));
create policy receipt_items_select on public.receipt_items
  for select to authenticated using (public.has_role('purchase') or public.has_role('approver'));
-- receipts are written through add_receipt / delete_receipt RPCs only

-- ======================= 0004_seed.sql =======================
-- ============================================================
-- Makams Ops — 0004 seed data
-- >>> EDIT THE FIRST ADMIN EMAIL BELOW BEFORE RUNNING <<<
-- ============================================================

-- First admin (claims this row on first Google sign-in with this email)
insert into public.app_users (email, full_name, roles)
values ('sagar@makams.com', 'Sagar', array['admin','hr','purchase','approver'])
on conflict do nothing;

-- Company profile used on PO PDFs and the employee portal.
-- Edit in Settings → Company after first sign-in.
insert into public.app_settings (key, value) values
('company', jsonb_build_object(
  'name', 'Makams',
  'address', '',
  'city', '',
  'state', '',
  'pincode', '',
  'gstin', '',
  'phone', '',
  'email', '',
  'po_prefix', 'PO',
  'po_terms', E'1. Please quote the PO number on all invoices, challans and correspondence.\n2. Goods to be delivered to the address mentioned above.\n3. Prices are inclusive of packing unless stated otherwise.\n4. Payment terms as agreed.'
))
on conflict (key) do nothing;

-- PO types
insert into public.po_types (name) values
  ('Raw material'), ('Packaging'), ('Consumables'), ('Capex / Equipment'), ('Services')
on conflict do nothing;

-- Delivery locations (edit/add in Settings)
insert into public.delivery_locations (name, address, state) values
  ('Head Office', '', '')
on conflict do nothing;

-- ---------- checklist templates ----------

with tpl as (
  insert into public.checklist_templates (kind, name)
  values ('onboarding', 'Standard onboarding')
  returning id
)
insert into public.checklist_template_items (template_id, position, title, description, owner_role, doc_type, due_days)
select id, position, title, description, 'hr', doc_type, due_days from tpl, (values
  (1,  'Offer letter signed',                'Collect the signed offer letter', 'offer_letter', 3),
  (2,  'Documents collected',                'PAN, Aadhaar, photo, bank proof, education certificates — send an upload link from the person''s Documents tab', null, 7),
  (3,  'Bank details verified',              'Match bank proof with payroll entry', null, 7),
  (4,  'Employee code assigned',             null, null, 3),
  (5,  'Added to payroll',                   null, null, 10),
  (6,  'Work email created',                 null, null, 3),
  (7,  'Learnapp account created',           'Use the Learnapp tab on the person''s page', null, 5),
  (8,  'Added to the employee Google Sheet', 'Runs automatically via sheet sync — verify the row appeared', null, 5),
  (9,  'Induction / training done',          null, null, 15),
  (10, 'Probation terms communicated',       null, null, 7)
) as v(position, title, description, doc_type, due_days);

with tpl as (
  insert into public.checklist_templates (kind, name)
  values ('exit', 'Standard exit')
  returning id
)
insert into public.checklist_template_items (template_id, position, title, description, owner_role, doc_type, due_days)
select id, position, title, description, 'hr', doc_type, due_days from tpl, (values
  (1, 'Resignation letter received',   null, 'resignation', 2),
  (2, 'Exit date confirmed',           'Update date of exit on the profile', null, 2),
  (3, 'Handover completed',            null, null, 15),
  (4, 'Company assets returned',       'Laptop, phone, ID card, keys', null, 15),
  (5, 'Learnapp access disabled',      'Use the Learnapp tab on the person''s page', null, 1),
  (6, 'Work email deactivated',        null, null, 1),
  (7, 'Final settlement processed',    null, null, 45),
  (8, 'Experience letter issued',      null, null, 30)
) as v(position, title, description, doc_type, due_days);

-- ======================= 0005_hr_v2.sql =======================
-- ============================================================
-- Makams Ops — 0005 HR v2:
--   * candidate database (sourced pipeline, separate from employees)
--   * form builder (admin) + shareable source links + responses
--   * checklists & forms become admin-managed
--   * people status 'candidate' renamed to 'joining' (pre-joiners)
-- ============================================================

-- ---------- people: 'candidate' -> 'joining' ----------

alter table public.people drop constraint people_status_check;
update public.people set status = 'joining' where status = 'candidate';
alter table public.people add constraint people_status_check
  check (status in ('joining','active','exited','not_joined'));

-- ---------- checklist templates: admin writes, HR reads ----------

drop policy if exists checklist_templates_hr_all on public.checklist_templates;
drop policy if exists checklist_template_items_hr_all on public.checklist_template_items;

create policy checklist_templates_select on public.checklist_templates
  for select to authenticated using (public.has_role('hr'));
create policy checklist_templates_write on public.checklist_templates
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

create policy checklist_template_items_select on public.checklist_template_items
  for select to authenticated using (public.has_role('hr'));
create policy checklist_template_items_write on public.checklist_template_items
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

-- ---------- forms (built by admin, jotform-style) ----------
-- fields jsonb: [{ key, label, type, required, options[], map_to }]
--   type: text | textarea | email | phone | number | date | select | file
--   map_to (candidate_intake forms): full_name | title | organization | email |
--           phone | location | notes | resume | null

create table public.form_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  kind        text not null default 'general' check (kind in ('candidate_intake','general')),
  fields      jsonb not null default '[]',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger set_updated_at before update on public.form_templates
  for each row execute function public.tg_set_updated_at();

-- one shareable link per industry source ("Consultant Ramesh", "Campus cell")
create table public.form_links (
  id               uuid primary key default gen_random_uuid(),
  form_id          uuid not null references public.form_templates (id) on delete cascade,
  token            text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  source_name      text not null,
  active           boolean not null default true,
  expires_at       timestamptz,
  submission_count int not null default 0,
  created_by       uuid references public.app_users (id) default public.current_app_user_id(),
  created_at       timestamptz not null default now()
);

create index form_links_form_idx on public.form_links (form_id);

create table public.form_responses (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.form_templates (id) on delete cascade,
  link_id      uuid references public.form_links (id) on delete set null,
  answers      jsonb not null default '{}',
  files        jsonb not null default '[]',  -- [{key, path, name}]
  candidate_id uuid,
  created_at   timestamptz not null default now()
);

create index form_responses_form_idx on public.form_responses (form_id);

-- ---------- candidate database ----------

create table public.candidates (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  title        text,
  organization text,
  email        text,
  phone        text,
  location     text,
  status       text not null default 'new'
               check (status in ('new','screening','interview','offer','hired','rejected','on_hold')),
  resume_path  text,
  resume_name  text,
  source       text,                                   -- e.g. "Consultant Ramesh", "Manual"
  link_id      uuid references public.form_links (id) on delete set null,
  response_id  uuid references public.form_responses (id) on delete set null,
  notes        text,
  extra        jsonb not null default '{}',
  created_by   uuid references public.app_users (id) default public.current_app_user_id(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index candidates_status_idx on public.candidates (status);
create index candidates_name_idx on public.candidates (lower(full_name));

create trigger set_updated_at before update on public.candidates
  for each row execute function public.tg_set_updated_at();

alter table public.form_responses
  add constraint form_responses_candidate_fk
  foreign key (candidate_id) references public.candidates (id) on delete set null;

-- ---------- RLS ----------

alter table public.form_templates enable row level security;
alter table public.form_links enable row level security;
alter table public.form_responses enable row level security;
alter table public.candidates enable row level security;

-- forms: HR uses them, admin builds them
create policy form_templates_select on public.form_templates
  for select to authenticated using (public.has_role('hr'));
create policy form_templates_write on public.form_templates
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

-- links: HR creates and shares them
create policy form_links_all on public.form_links
  for all to authenticated using (public.has_role('hr')) with check (public.has_role('hr'));

-- responses: HR reads/cleans up; inserts come only from the public-form edge function
create policy form_responses_select on public.form_responses
  for select to authenticated using (public.has_role('hr'));
create policy form_responses_delete on public.form_responses
  for delete to authenticated using (public.has_role('hr'));

create policy candidates_all on public.candidates
  for all to authenticated using (public.has_role('hr')) with check (public.has_role('hr'));

-- ---------- public RPC for the form page ----------

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
    'form', jsonb_build_object(
      'name', v_form.name,
      'description', v_form.description,
      'kind', v_form.kind,
      'fields', v_form.fields
    )
  );
end $$;

grant execute on function public.form_link_info(text) to anon, authenticated;

-- ---------- storage for form uploads (resumes etc.) ----------

insert into storage.buckets (id, name, public, file_size_limit)
values ('form-uploads', 'form-uploads', false, 15728640)
on conflict (id) do nothing;

create policy "form uploads hr read" on storage.objects
  for select to authenticated using (bucket_id = 'form-uploads' and public.has_role('hr'));
create policy "form uploads hr delete" on storage.objects
  for delete to authenticated using (bucket_id = 'form-uploads' and public.has_role('hr'));

-- ---------- seed: default candidate intake form ----------

insert into public.form_templates (name, description, kind, fields) values (
  'Candidate intake form',
  'Share this with industry sources to add candidates to the Makams talent pool.',
  'candidate_intake',
  '[
    {"key":"full_name","label":"Candidate full name","type":"text","required":true,"map_to":"full_name"},
    {"key":"title","label":"Current title / role","type":"text","required":false,"map_to":"title"},
    {"key":"organization","label":"Current organisation","type":"text","required":false,"map_to":"organization"},
    {"key":"email","label":"Email","type":"email","required":false,"map_to":"email"},
    {"key":"phone","label":"Phone","type":"phone","required":true,"map_to":"phone"},
    {"key":"location","label":"Location","type":"text","required":false,"map_to":"location"},
    {"key":"experience_years","label":"Total experience (years)","type":"number","required":false,"map_to":null},
    {"key":"resume","label":"Resume (PDF)","type":"file","required":false,"map_to":"resume"},
    {"key":"notes","label":"Anything we should know","type":"textarea","required":false,"map_to":"notes"}
  ]'::jsonb
);

-- ======================= 0006_prospectives_referrals.sql =======================
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

-- ======================= 0007_sales_employees.sql =======================
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


-- ============ 0008: referral review queue ============
-- ============================================================
-- Makams Ops — 0008: referral review queue
-- Form submissions no longer land straight in the Candidates DB.
-- They wait as pending entries that HR can edit, then approve
-- into the DB (or reject).
-- ============================================================

create table public.referral_submissions (
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

create index referral_submissions_status_idx on public.referral_submissions (status);
create index referral_submissions_response_idx on public.referral_submissions (response_id);

create trigger set_updated_at before update on public.referral_submissions
  for each row execute function public.tg_set_updated_at();

alter table public.referral_submissions enable row level security;
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


-- ============ 0009: prospective source ============
-- ============================================================
-- Makams Ops — 0009: prospective source
-- Where the prospective came from: LI / Indeed, Internal
-- Referral, or Other.
-- ============================================================

alter table public.prospectives
  add column if not exists source text not null default 'Other'
    check (source in ('LI / Indeed', 'Internal Referral', 'Other'));

create index if not exists prospectives_source_idx on public.prospectives (source);


-- ============ 0010: referral rules & candidate access ============
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

select 'Makams Ops schema installed: ' || count(*) || ' tables, admin seeded for ' || (select email from public.app_users limit 1) as result from information_schema.tables where table_schema = 'public';
