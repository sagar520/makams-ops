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
