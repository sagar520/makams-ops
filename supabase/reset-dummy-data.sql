-- ============================================================
-- Makams Ops — REMOVE ALL DUMMY / BUSINESS DATA
-- Run this before going live with real data (or to reload dummy data).
-- Keeps: signed-in users, checklist templates, form templates, company settings.
-- Deletes: people, candidates, vendors, POs, receipts, links, responses, logs,
--          approval rules, and the unclaimed dummy staff accounts.
-- ============================================================

begin;

delete from public.receipt_items;
delete from public.receipts;
delete from public.po_events;
delete from public.po_approval_steps;
delete from public.po_items;
delete from public.purchase_orders;
delete from public.approval_rule_steps;
delete from public.approval_rules;
delete from public.vendors;

delete from public.person_checklist_items;
delete from public.person_checklists;
delete from public.person_documents;
delete from public.upload_links;
delete from public.learnapp_actions;
delete from public.sheet_sync_log;

update public.form_responses set candidate_id = null;
delete from public.referral_submissions;
delete from public.prospectives;
delete from public.candidates;
delete from public.form_responses;
delete from public.form_links;
delete from public.people;

delete from public.po_counters;

-- dummy staff (only if they never actually signed in)
delete from public.app_users
 where email in ('priya.hr@makams.com', 'rohit.finance@makams.com', 'kavita.purchase@makams.com')
   and auth_id is null;

commit;

-- Note: company details under Settings → Company keep whatever was last saved —
-- review them there. The "Factory — Baddi" delivery location is kept; edit or
-- deactivate it under Settings → Purchase setup if it isn't real.

select 'Reset done. people=' || (select count(*) from public.people)
  || ', prospectives=' || (select count(*) from public.prospectives)
  || ', candidates=' || (select count(*) from public.candidates)
  || ', POs=' || (select count(*) from public.purchase_orders)
  || ', users kept=' || (select count(*) from public.app_users) as result;
