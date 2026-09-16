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
