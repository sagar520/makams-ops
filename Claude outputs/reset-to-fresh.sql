-- ============================================================
-- Makams Ops — FRESH START
-- Wipes every business record so the app can take real data.
-- THIS CANNOT BE UNDONE. Take a backup first if you want one
-- (Supabase Dashboard → Database → Backups).
--
-- DELETED: employees, candidates, prospectives, referral submissions
--          and links, purchase orders, receipts, vendors, documents,
--          checklists, learnapp actions, PO numbering, the three
--          dummy staff accounts, the dummy company profile, the
--          dummy delivery location, and the dummy approval rules.
-- KEPT:    your own login and anyone who has actually signed in,
--          the referral form, checklist templates, PO types, the
--          employee sheet setting, company name / PO prefix / PO terms,
--          and one catch-all approval rule pointing at you.
-- ============================================================

begin;

-- ---------- purchase ----------
delete from public.receipt_items;
delete from public.receipts;
delete from public.po_events;
delete from public.po_approval_steps;
delete from public.po_items;
delete from public.purchase_orders;
delete from public.po_counters;
delete from public.vendors;

-- ---------- HR ----------
delete from public.person_checklist_items;
delete from public.person_checklists;
delete from public.person_documents;
delete from public.upload_links;
delete from public.learnapp_actions;

update public.form_responses set candidate_id = null;
delete from public.referral_submissions;
delete from public.prospectives;
delete from public.candidates;
delete from public.form_responses;
delete from public.form_links;
delete from public.people;

-- ---------- uploaded files ----------
-- Resumes, employee documents and form uploads that belonged to the rows above.
-- If you would rather do this by hand, comment this out and empty the three
-- buckets under Dashboard → Storage instead.
delete from storage.objects
 where bucket_id in ('employee-docs', 'form-uploads', 'prospective-resumes');

-- ---------- people who can sign in ----------
-- Keeps the admin and anyone who has genuinely logged in at least once.
-- Everything else (the seeded staff, unused invites) goes.
delete from public.approval_rule_steps;
delete from public.approval_rules;

delete from public.app_users
 where auth_id is null
   and email <> 'sagar@makams.com';

-- ---------- one working approval rule ----------
-- Without a rule, a submitted PO has nobody to route to. This catch-all
-- sends every PO to you; replace it under Settings → Purchase setup.
insert into public.approval_rules (id, name, priority, min_amount, max_amount, po_type_ids)
values (gen_random_uuid(), 'All purchases — Sagar', 100, 0, null, '{}');

insert into public.approval_rule_steps (rule_id, position, approver_id)
select r.id, 1, u.id
  from public.approval_rules r
  cross join public.app_users u
 where r.name = 'All purchases — Sagar'
   and u.email = 'sagar@makams.com';

-- ---------- company profile ----------
-- Clears the seeded Ludhiana address and the fake GSTIN so they can never
-- reach a real purchase order. Name, PO prefix and PO terms are kept.
update public.app_settings
   set value = value - 'address' - 'city' - 'state' - 'pincode' - 'gstin' - 'phone' - 'email'
 where key = 'company';

-- ---------- delivery locations ----------
delete from public.delivery_locations where name = 'Factory — Baddi';
update public.delivery_locations
   set address = null, state = null, gstin = null
 where name = 'Head Office';

commit;

select 'Fresh start done. employees=' || (select count(*) from public.people)
  || ', candidates=' || (select count(*) from public.candidates)
  || ', prospectives=' || (select count(*) from public.prospectives)
  || ', vendors=' || (select count(*) from public.vendors)
  || ', POs=' || (select count(*) from public.purchase_orders)
  || ', logins kept=' || (select count(*) from public.app_users)
  || ', approval rules=' || (select count(*) from public.approval_rules) as result;
