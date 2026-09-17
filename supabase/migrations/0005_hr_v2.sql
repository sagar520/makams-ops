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
