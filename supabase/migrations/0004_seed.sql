-- ============================================================
-- Makams Ops — 0004 seed data
-- >>> EDIT THE FIRST ADMIN EMAIL BELOW BEFORE RUNNING <<<
-- ============================================================

-- First admin (claims this row on first Google sign-in with this email)
insert into public.app_users (email, full_name, roles)
values ('aakash@makams.com', 'Aakash Agarwal', array['admin','hr','purchase','approver'])
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
