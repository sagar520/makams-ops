-- ============================================================
-- Makams Ops — DUMMY DATA (~3 months of moderate usage)
-- Generated 2026-09-17. Paste into the Supabase SQL Editor and Run once.
-- Remove later with reset-dummy-data.sql
-- ============================================================

do $$ begin
  if exists (select 1 from public.people) or exists (select 1 from public.purchase_orders) then
    raise exception 'Data already present — aborting so nothing is duplicated. Run reset-dummy-data.sql first if you want a clean reload.';
  end if;
end $$;

-- extra staff (dummy — deactivate or edit under Settings → Users)
insert into public.app_users (id, email, full_name, roles, created_at) values
  ('10000000-0000-4000-8000-000000000001', 'priya.hr@makams.com', 'Priya Nair', array['hr'], '2026-06-21 10:15:00+05:30'),
  ('10000000-0000-4000-8000-000000000002', 'rohit.finance@makams.com', 'Rohit Bansal', array['approver','purchase'], '2026-06-24 10:15:00+05:30'),
  ('10000000-0000-4000-8000-000000000003', 'kavita.purchase@makams.com', 'Kavita Joshi', array['purchase'], '2026-06-29 10:15:00+05:30');

update public.app_settings set value = value || jsonb_build_object(
  'address', 'Plot 14, Industrial Area Phase 2', 'city', 'Ludhiana', 'state', 'Punjab',
  'pincode', '141010', 'gstin', '03AAACM1234F1Z5', 'phone', '+91 98765 43210', 'email', 'ops@makams.com')
where key = 'company';

insert into public.people (id, emp_code, full_name, status, department, designation, employment_type, date_of_join, date_of_exit, exit_reason, personal_email, phone, monthly_gross, learnapp_status, learnapp_user_id, learnapp_email, city, state, created_by, created_at) values
  ('20000000-0000-4000-8000-000000000004', 'MKM-001', 'Deepak Verma', 'active', 'Production', 'Production Supervisor', 'full_time', '2024-04-10', null, null, 'deepak.v@gmail.com', '98110 22331', 42000, 'active', '21000000-0000-4000-8000-000000000005', 'deepak.v@gmail.com', 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-06-21 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000006', 'MKM-002', 'Sunita Kaur', 'active', 'Quality', 'QC Executive', 'full_time', '2024-08-28', null, null, 'sunita.k@gmail.com', '98220 11445', 38000, 'active', '21000000-0000-4000-8000-000000000007', 'sunita.k@gmail.com', 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-06-22 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000008', 'MKM-003', 'Manpreet Singh', 'active', 'Warehouse', 'Store Incharge', 'full_time', '2025-01-15', null, null, null, '97790 55662', 30000, 'active', '21000000-0000-4000-8000-000000000009', null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-06-23 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000010', 'MKM-004', 'Arvind Kumar', 'active', 'Production', 'Machine Operator', 'full_time', '2025-03-26', null, null, null, '96540 33217', 22000, 'active', '21000000-0000-4000-8000-000000000011', null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-06-24 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000012', 'MKM-005', 'Ritu Sharma', 'active', 'Sales', 'Sales Executive', 'full_time', '2025-08-13', null, null, 'ritu.s@gmail.com', '99530 88112', 32000, null, null, null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-06-25 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000013', 'MKM-006', 'Gurpreet Gill', 'active', 'Production', 'Helper', 'contract', '2025-11-11', null, null, null, '98761 44990', 16000, null, null, null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-06-26 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000014', 'MKM-007', 'Meena Devi', 'active', 'Housekeeping', 'Housekeeping Staff', 'contract', '2025-12-11', null, null, null, '97800 12034', 14000, null, null, null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-06-27 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000015', 'MKM-008', 'Vikas Chawla', 'active', 'Accounts', 'Accounts Executive', 'full_time', '2026-03-01', null, null, 'vikas.ch@yahoo.com', '98330 77881', 35000, 'active', '21000000-0000-4000-8000-000000000016', 'vikas.ch@yahoo.com', 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-06-28 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000017', 'MKM-009', 'Simran Bedi', 'active', 'Quality', 'Lab Chemist', 'full_time', '2026-07-04', null, null, 'simran.bedi@gmail.com', '98995 66778', 36000, 'active', '21000000-0000-4000-8000-000000000018', 'simran.bedi@gmail.com', 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-07-02 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000019', 'MKM-010', 'Rajat Khanna', 'active', 'Warehouse', 'Store Assistant', 'full_time', '2026-08-03', null, null, null, '96520 44112', 20000, null, null, null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-08-01 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000020', 'MKM-011', 'Anita Rani', 'active', 'Production', 'Packing Operator', 'contract', '2026-08-18', null, null, null, '98140 90876', 17000, null, null, null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-08-16 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000021', 'MKM-012', 'Karan Mehra', 'active', 'Sales', 'Area Sales Executive', 'full_time', '2026-08-28', null, null, 'karan.mehra@gmail.com', '99100 22334', 30000, null, null, null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-08-26 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000022', null, 'Neha Malhotra', 'joining', 'Accounts', 'Junior Accountant', 'full_time', '2026-10-01', null, null, 'neha.malhotra11@gmail.com', '98111 90233', 28000, null, null, null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-09-05 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000023', null, 'Tarun Sethi', 'joining', 'Production', 'Shift Supervisor', 'full_time', '2026-09-24', null, null, 'tarun.sethi@outlook.com', '99887 66554', 34000, null, null, null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-09-05 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000024', 'MKM-000', 'Suresh Pillai', 'exited', 'Warehouse', 'Store Assistant', 'full_time', '2023-11-02', '2026-08-08', 'Relocated to Kochi', 'suresh.p@gmail.com', '98470 11223', 21000, 'disabled', '21000000-0000-4000-8000-000000000025', 'suresh.p@gmail.com', 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-07-05 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000026', 'MKM-00X', 'Pankaj Arora', 'exited', 'Sales', 'Sales Executive', 'full_time', '2024-07-09', '2026-07-04', 'Better offer — competitor', null, '98722 33445', 29000, 'disabled', '21000000-0000-4000-8000-000000000027', null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-07-06 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000028', null, 'Rahul Dutta', 'not_joined', 'Production', 'Machine Operator', 'full_time', null, null, null, null, '97653 21098', null, null, null, null, 'Ludhiana', 'Punjab', (select id from public.app_users where email = 'sagar@makams.com'), '2026-07-07 10:15:00+05:30');

insert into public.person_documents (person_id, doc_type, file_name, status, source, uploaded_at, verified_at, created_at) values
  ('20000000-0000-4000-8000-000000000022', 'pan', 'PAN_Neha.pdf', 'verified', 'employee', '2026-09-07 10:15:00+05:30', '2026-09-08 10:15:00+05:30', '2026-09-07 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000022', 'aadhaar', 'Aadhaar_Neha.pdf', 'uploaded', 'employee', '2026-09-07 10:15:00+05:30', null, '2026-09-07 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000022', 'bank_proof', 'cancelled_cheque.jpg', 'uploaded', 'employee', '2026-09-08 10:15:00+05:30', null, '2026-09-08 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000023', 'offer_letter', 'Offer_Tarun_signed.pdf', 'verified', 'hr', '2026-09-12 10:15:00+05:30', '2026-09-13 10:15:00+05:30', '2026-09-12 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000017', 'education', 'MSc_Chemistry_Simran.pdf', 'verified', 'hr', '2026-07-09 10:15:00+05:30', '2026-07-10 10:15:00+05:30', '2026-07-09 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000019', 'pan', 'PAN_Rajat.pdf', 'uploaded', 'hr', '2026-08-08 10:15:00+05:30', null, '2026-08-08 10:15:00+05:30');

insert into public.upload_links (person_id, token, doc_types, profile_fields, message, expires_at, created_by, created_at, last_used_at, submitted_at) values
  ('20000000-0000-4000-8000-000000000022', 'dummy-neha-0917', '{pan,aadhaar,bank_proof,photo}', '{personal_email,phone,address,bank_name,bank_account,bank_ifsc}', 'Welcome to Makams! Please share these before joining.', '2026-09-23 10:15:00+05:30', '10000000-0000-4000-8000-000000000001', '2026-09-06 10:15:00+05:30', '2026-09-07 10:15:00+05:30', '2026-09-07 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000023', 'dummy-tarun-0917', '{pan,aadhaar,photo,education}', '{personal_email,phone,date_of_birth,address}', 'Hi Tarun, please submit your documents.', '2026-09-27 10:15:00+05:30', '10000000-0000-4000-8000-000000000001', '2026-09-13 10:15:00+05:30', null, null);

insert into public.person_checklists (id, person_id, template_id, kind, name, status, started_at, completed_at, created_by)
values ('25000000-0000-4000-8000-000000000029', '20000000-0000-4000-8000-000000000017', (select id from public.checklist_templates where kind = 'onboarding' limit 1), 'onboarding', (select name from public.checklist_templates where kind = 'onboarding' limit 1), 'completed', '2026-07-05 10:15:00+05:30', '2026-07-24 10:15:00+05:30', '10000000-0000-4000-8000-000000000001');
insert into public.person_checklist_items (checklist_id, position, title, description, owner_role, doc_type, due_date, status, done_by, done_at)
select '25000000-0000-4000-8000-000000000029', position, title, description, owner_role, doc_type,
       case when due_days is null then null else '2026-07-05'::date + due_days end,
       case when position <= 99 then 'done' else 'pending' end,
       case when position <= 99 then '10000000-0000-4000-8000-000000000001'::uuid else null end,
       case when position <= 99 then '2026-07-09 10:15:00+05:30'::timestamptz else null end
  from public.checklist_template_items where template_id = (select id from public.checklist_templates where kind = 'onboarding' limit 1) order by position;

insert into public.person_checklists (id, person_id, template_id, kind, name, status, started_at, completed_at, created_by)
values ('25000000-0000-4000-8000-000000000030', '20000000-0000-4000-8000-000000000023', (select id from public.checklist_templates where kind = 'onboarding' limit 1), 'onboarding', (select name from public.checklist_templates where kind = 'onboarding' limit 1), 'in_progress', '2026-09-11 10:15:00+05:30', null, '10000000-0000-4000-8000-000000000001');
insert into public.person_checklist_items (checklist_id, position, title, description, owner_role, doc_type, due_date, status, done_by, done_at)
select '25000000-0000-4000-8000-000000000030', position, title, description, owner_role, doc_type,
       case when due_days is null then null else '2026-09-11'::date + due_days end,
       case when position <= 4 then 'done' else 'pending' end,
       case when position <= 4 then '10000000-0000-4000-8000-000000000001'::uuid else null end,
       case when position <= 4 then '2026-09-15 10:15:00+05:30'::timestamptz else null end
  from public.checklist_template_items where template_id = (select id from public.checklist_templates where kind = 'onboarding' limit 1) order by position;

insert into public.person_checklists (id, person_id, template_id, kind, name, status, started_at, completed_at, created_by)
values ('25000000-0000-4000-8000-000000000031', '20000000-0000-4000-8000-000000000024', (select id from public.checklist_templates where kind = 'exit' limit 1), 'exit', (select name from public.checklist_templates where kind = 'exit' limit 1), 'completed', '2026-07-24 10:15:00+05:30', '2026-08-12 10:15:00+05:30', '10000000-0000-4000-8000-000000000001');
insert into public.person_checklist_items (checklist_id, position, title, description, owner_role, doc_type, due_date, status, done_by, done_at)
select '25000000-0000-4000-8000-000000000031', position, title, description, owner_role, doc_type,
       case when due_days is null then null else '2026-07-24'::date + due_days end,
       case when position <= 99 then 'done' else 'pending' end,
       case when position <= 99 then '10000000-0000-4000-8000-000000000001'::uuid else null end,
       case when position <= 99 then '2026-07-28 10:15:00+05:30'::timestamptz else null end
  from public.checklist_template_items where template_id = (select id from public.checklist_templates where kind = 'exit' limit 1) order by position;

insert into public.learnapp_actions (person_id, action, status, detail, created_by, created_at) values
  ('20000000-0000-4000-8000-000000000017', 'invite', 'ok', 'simran.bedi@gmail.com', '10000000-0000-4000-8000-000000000001', '2026-07-09 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000015', 'create', 'ok', 'vikas.ch@yahoo.com', '10000000-0000-4000-8000-000000000001', '2026-07-19 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000024', 'disable', 'ok', 'suresh.p@gmail.com', '10000000-0000-4000-8000-000000000001', '2026-08-08 10:15:00+05:30'),
  ('20000000-0000-4000-8000-000000000026', 'disable', 'ok', '', '10000000-0000-4000-8000-000000000001', '2026-07-04 10:15:00+05:30');

insert into public.sheet_sync_log (status, rows, detail, created_by, created_at) values
  ('ok', 12, null, '10000000-0000-4000-8000-000000000001', '2026-06-27 10:15:00+05:30'),
  ('ok', 13, null, '10000000-0000-4000-8000-000000000001', '2026-07-11 10:15:00+05:30'),
  ('ok', 14, null, '10000000-0000-4000-8000-000000000001', '2026-07-24 10:15:00+05:30'),
  ('ok', 15, null, '10000000-0000-4000-8000-000000000001', '2026-08-07 10:15:00+05:30'),
  ('ok', 16, null, '10000000-0000-4000-8000-000000000001', '2026-08-15 10:15:00+05:30'),
  ('ok', 17, null, '10000000-0000-4000-8000-000000000001', '2026-08-27 10:15:00+05:30'),
  ('ok', 18, null, '10000000-0000-4000-8000-000000000001', '2026-09-05 10:15:00+05:30'),
  ('ok', 19, null, '10000000-0000-4000-8000-000000000001', '2026-09-12 10:15:00+05:30');

insert into public.form_links (id, form_id, token, source_name, active, submission_count, created_by, created_at) values
  ('30000000-0000-4000-8000-000000000032', (select id from public.form_templates where kind='candidate_intake' limit 1), 'dummy-src-ramesh', 'Consultant Ramesh — TalentBridge', true, 5, '10000000-0000-4000-8000-000000000001', '2026-07-04 10:15:00+05:30'),
  ('30000000-0000-4000-8000-000000000033', (select id from public.form_templates where kind='candidate_intake' limit 1), 'dummy-src-campus', 'Campus cell — GNDU Amritsar', true, 1, '10000000-0000-4000-8000-000000000001', '2026-07-29 10:15:00+05:30');

insert into public.candidates (id, full_name, designation, current_company, email, phone, area, status, source, link_id, resume_name, hr_comment, created_by, created_at, updated_at) values
  ('31000000-0000-4000-8000-000000000034', 'Ankit Malhotra', 'QA Manager', 'Patanjali Foods', 'ankit.m@example.com', '98100 20000', 'Ludhiana', 'interview', 'Consultant Ramesh — TalentBridge', '30000000-0000-4000-8000-000000000032', 'Ankit_Malhotra_CV.pdf', 'Strong on GMP documentation.', '10000000-0000-4000-8000-000000000001', '2026-09-01 10:15:00+05:30', '2026-09-04 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000035', 'Shreya Iyer', 'R&D Executive — Nutraceuticals', 'Himalaya Wellness', 'shreya.i@example.com', '98101 20137', 'Ludhiana', 'screening', 'Consultant Ramesh — TalentBridge', '30000000-0000-4000-8000-000000000032', null, null, '10000000-0000-4000-8000-000000000001', '2026-09-05 10:15:00+05:30', '2026-09-08 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000036', 'Harjinder Pal', 'Production Head', 'Chandigarh Botanicals', 'harjinder.p@example.com', '98102 20274', 'Ludhiana', 'offer', 'Referral — Deepak Verma', null, 'Harjinder_profile.pdf', 'Negotiating notice-period buyout.', '10000000-0000-4000-8000-000000000001', '2026-08-23 10:15:00+05:30', '2026-08-26 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000037', 'Nikita Rao', 'Regulatory Affairs Associate', 'Arjuna Naturals', 'nikita.r@example.com', '98103 20411', 'Ludhiana', 'new', 'Naukri', null, null, null, '10000000-0000-4000-8000-000000000001', '2026-09-15 10:15:00+05:30', '2026-09-17 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000038', 'Mohit Saini', 'Boiler Operator', 'Local extraction unit', 'mohit.s@example.com', '98104 20548', 'Ludhiana', 'new', 'Consultant Ramesh — TalentBridge', '30000000-0000-4000-8000-000000000032', null, 'Available immediately', '10000000-0000-4000-8000-000000000001', '2026-09-11 10:15:00+05:30', '2026-09-14 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000039', 'Divya Kapoor', 'B2B Sales Manager', 'OmniActive Health', 'divya.k@example.com', '98105 20685', 'Ludhiana', 'hired', 'LinkedIn outreach', null, 'Divya_Kapoor_CV.pdf', 'Accepted — joining 1 Nov.', '10000000-0000-4000-8000-000000000001', '2026-07-24 10:15:00+05:30', '2026-07-27 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000040', 'Rakesh Yadav', 'Store Keeper', 'AmbeAgro', 'rakesh.y@example.com', '98106 20822', 'Ludhiana', 'rejected', 'Walk-in', null, null, 'Salary expectation above band.', '10000000-0000-4000-8000-000000000001', '2026-07-31 10:15:00+05:30', '2026-08-03 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000041', 'Pooja Bhatt', 'QC Chemist', 'NutraLab India', 'pooja.b@example.com', '98107 20959', 'Ludhiana', 'on_hold', 'Consultant Ramesh — TalentBridge', '30000000-0000-4000-8000-000000000032', 'Pooja_QC_resume.pdf', 'Revisit when second QC seat opens.', '10000000-0000-4000-8000-000000000001', '2026-08-08 10:15:00+05:30', '2026-08-11 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000042', 'Amandeep Sohal', 'Maintenance Fitter', 'Vardhman Textiles', 'amandeep.s@example.com', '98108 21096', 'Ludhiana', 'screening', 'Referral — Manpreet Singh', null, null, null, '10000000-0000-4000-8000-000000000001', '2026-09-08 10:15:00+05:30', '2026-09-11 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000043', 'Isha Talwar', 'HR Executive', 'Trident Group', 'isha.t@example.com', '98109 21233', 'Ludhiana', 'interview', 'Naukri', null, 'Isha_HR_CV.pdf', null, '10000000-0000-4000-8000-000000000001', '2026-08-28 10:15:00+05:30', '2026-08-31 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000044', 'Naveen Joshi', 'Dispatch Executive', 'SwiftCargo', 'naveen.j@example.com', '98110 21370', 'Ludhiana', 'rejected', 'Consultant Ramesh — TalentBridge', '30000000-0000-4000-8000-000000000032', null, 'Did not show for interview.', '10000000-0000-4000-8000-000000000001', '2026-08-13 10:15:00+05:30', '2026-08-16 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000045', 'Ravinder Kaur', 'Food Technologist (fresher)', 'GNDU Amritsar', 'ravinder.k@example.com', '98111 21507', 'Ludhiana', 'screening', 'Campus cell — GNDU Amritsar', '30000000-0000-4000-8000-000000000033', 'Ravinder_campus_CV.pdf', null, '10000000-0000-4000-8000-000000000001', '2026-09-02 10:15:00+05:30', '2026-09-05 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000046', 'Sanjay Bisht', 'Extraction Plant Operator', 'Ind-Swift Labs', 'sanjay.b@example.com', '98112 21644', 'Ludhiana', 'interview', 'Consultant Ramesh — TalentBridge', '30000000-0000-4000-8000-000000000032', null, null, '10000000-0000-4000-8000-000000000001', '2026-08-20 10:15:00+05:30', '2026-08-23 10:15:00+05:30'),
  ('31000000-0000-4000-8000-000000000047', 'Tanvi Deshmukh', 'Purchase Executive', 'Alchem International', 'tanvi.d@example.com', '98113 21781', 'Ludhiana', 'new', 'LinkedIn outreach', null, null, null, '10000000-0000-4000-8000-000000000001', '2026-09-13 10:15:00+05:30', '2026-09-16 10:15:00+05:30');

insert into public.form_responses (form_id, link_id, answers, candidate_id, created_at)
select (select id from public.form_templates where kind='candidate_intake' limit 1), c.link_id,
       jsonb_build_object('full_name', c.full_name, 'title', c.designation, 'organization', c.current_company, 'phone', c.phone, 'location', c.area),
       c.id, c.created_at
  from public.candidates c where c.link_id is not null;

insert into public.delivery_locations (id, name, address, state, gstin) values
  ('40000000-0000-4000-8000-000000000048', 'Factory — Baddi', 'Khasra 88/2, EPIP Phase 1, Baddi, HP 173205', 'Himachal Pradesh', '02AAACM1234F2Z1')
on conflict (id) do nothing;
update public.delivery_locations set address = 'Plot 14, Industrial Area Phase 2, Ludhiana 141010', state = 'Punjab', gstin = '03AAACM1234F1Z5' where name = 'Head Office';

insert into public.vendors (id, name, contact_name, email, phone, gstin, city, state, payment_terms, created_at, updated_at) values
  ('41000000-0000-4000-8000-000000000049', 'Herbo Roots Agro LLP', 'Naresh Jain', 'sales@herboroots.in', '98150 22110', '03AAFFH8899Q1ZC', 'Khanna', 'Punjab', '30 days from invoice', '2026-06-23 10:15:00+05:30', '2026-06-23 10:15:00+05:30'),
  ('41000000-0000-4000-8000-000000000050', 'Shakti Packagers', 'Ravi Gupta', 'ravi@shaktipack.com', '98720 66554', '03ABBPS4321L1ZP', 'Ludhiana', 'Punjab', '15 days', '2026-06-24 10:15:00+05:30', '2026-06-24 10:15:00+05:30'),
  ('41000000-0000-4000-8000-000000000051', 'Phyto Extracts India Pvt Ltd', 'Dr. S. Reddy', 'orders@phytoextracts.co.in', '90000 12345', '36AAACP9988K1Z2', 'Hyderabad', 'Telangana', '50% advance', '2026-06-25 10:15:00+05:30', '2026-06-25 10:15:00+05:30'),
  ('41000000-0000-4000-8000-000000000052', 'LabCare Instruments', 'Mohit Arora', 'mohit@labcare.in', '98100 77332', '07AABCL5566M1ZN', 'New Delhi', 'Delhi', '100% against proforma', '2026-06-26 10:15:00+05:30', '2026-06-26 10:15:00+05:30'),
  ('41000000-0000-4000-8000-000000000053', 'Om Logistics & Services', 'Baljit Singh', 'baljit@omlogistics.example', '97810 22446', '03AACCO7788B1ZF', 'Ludhiana', 'Punjab', 'Monthly billing', '2026-06-27 10:15:00+05:30', '2026-06-27 10:15:00+05:30'),
  ('41000000-0000-4000-8000-000000000054', 'GreenLeaf Botanics', 'Anu Thakur', 'anu@greenleafbot.in', '98160 55443', '02AAGCG1122H1Z9', 'Baddi', 'Himachal Pradesh', '30 days', '2026-06-28 10:15:00+05:30', '2026-06-28 10:15:00+05:30');

insert into public.approval_rules (id, name, priority, min_amount, max_amount, po_type_ids) values
  ('45000000-0000-4000-8000-000000000057', 'All Capex — Sagar', 5, 0, null, array[(select id from public.po_types where name = 'Capex / Equipment')]),
  ('45000000-0000-4000-8000-000000000055', 'Routine purchases (up to ₹50,000)', 10, 0, 50000, '{}'),
  ('45000000-0000-4000-8000-000000000056', 'Above ₹50,000 — two-step', 20, 50000, null, '{}');
insert into public.approval_rule_steps (rule_id, position, approver_id) values
  ('45000000-0000-4000-8000-000000000057', 1, (select id from public.app_users where email = 'sagar@makams.com')),
  ('45000000-0000-4000-8000-000000000055', 1, (select id from public.app_users where email = 'sagar@makams.com')),
  ('45000000-0000-4000-8000-000000000056', 1, '10000000-0000-4000-8000-000000000002'),
  ('45000000-0000-4000-8000-000000000056', 2, (select id from public.app_users where email = 'sagar@makams.com'));

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000058', 'PO/26-27/0001', 'closed', '41000000-0000-4000-8000-000000000050', (select id from public.po_types where name = 'Packaging'), (select id from public.delivery_locations where name = 'Head Office'), '2026-06-24', '2026-07-06', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-06-24 11:15:00+05:30', '2026-06-25 15:15:00+05:30', 1, '2026-06-25 17:15:00+05:30', 'full', '10000000-0000-4000-8000-000000000003', '2026-06-24 09:15:00+05:30', '2026-06-26 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000059', '50000000-0000-4000-8000-000000000058', 1, 'HDPE jars 200cc with CRC caps', '3923', 10000, 'nos', 6.8, 18, 10000),
  ('51000000-0000-4000-8000-000000000060', '50000000-0000-4000-8000-000000000058', 2, 'Printed mono cartons 350gsm', '4819', 5000, 'nos', 9.5, 18, 5000);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000058', 1, '10000000-0000-4000-8000-000000000002', 'approved', false, '2026-06-25 15:15:00+05:30');
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000058', 2, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-06-25 16:15:00+05:30');
insert into public.receipts (id, po_id, received_date, invoice_number, invoice_date, created_by, created_at) values ('55000000-0000-4000-8000-000000000061', '50000000-0000-4000-8000-000000000058', '2026-06-29', 'INV-2201', '2026-06-30', '10000000-0000-4000-8000-000000000003', '2026-06-29 12:15:00+05:30');
insert into public.receipt_items (receipt_id, po_item_id, qty) select '55000000-0000-4000-8000-000000000061', id, received_qty from public.po_items where po_id = '50000000-0000-4000-8000-000000000058' and received_qty > 0;
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000058', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Above ₹50,000 — two-step', 'steps', 2), '2026-06-24 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000058', 'approved_step', '10000000-0000-4000-8000-000000000002', jsonb_build_object('step', 1), '2026-06-25 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000058', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-06-25 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000058', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'ravi@shaktipack.com', 'subject', 'Purchase Order PO/26-27/0001 — Makams'), '2026-06-25 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000058', 'received', '10000000-0000-4000-8000-000000000003', jsonb_build_object('receipt_id', '55000000-0000-4000-8000-000000000061', 'invoice', 'INV-2201', 'lines', 2), '2026-06-29 12:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000058', 'closed', '10000000-0000-4000-8000-000000000003', '{}'::jsonb, '2026-06-28 13:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000062', 'PO/26-27/0002', 'closed', '41000000-0000-4000-8000-000000000049', (select id from public.po_types where name = 'Raw material'), (select id from public.delivery_locations where name = 'Head Office'), '2026-06-29', '2026-07-11', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-06-29 11:15:00+05:30', '2026-06-30 15:15:00+05:30', 1, '2026-06-30 17:15:00+05:30', 'full', '10000000-0000-4000-8000-000000000003', '2026-06-29 09:15:00+05:30', '2026-07-01 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000063', '50000000-0000-4000-8000-000000000062', 1, 'Moringa leaf powder (60 mesh)', '1211', 400, 'kg', 310, 5, 400),
  ('51000000-0000-4000-8000-000000000064', '50000000-0000-4000-8000-000000000062', 2, 'Amla powder (spray dried)', '1106', 150, 'kg', 265, 5, 150);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000062', 1, '10000000-0000-4000-8000-000000000002', 'approved', false, '2026-06-30 15:15:00+05:30');
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000062', 2, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-06-30 16:15:00+05:30');
insert into public.receipts (id, po_id, received_date, invoice_number, invoice_date, created_by, created_at) values ('55000000-0000-4000-8000-000000000065', '50000000-0000-4000-8000-000000000062', '2026-07-04', 'INV-2202', '2026-07-05', '10000000-0000-4000-8000-000000000003', '2026-07-04 12:15:00+05:30');
insert into public.receipt_items (receipt_id, po_item_id, qty) select '55000000-0000-4000-8000-000000000065', id, received_qty from public.po_items where po_id = '50000000-0000-4000-8000-000000000062' and received_qty > 0;
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000062', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Above ₹50,000 — two-step', 'steps', 2), '2026-06-29 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000062', 'approved_step', '10000000-0000-4000-8000-000000000002', jsonb_build_object('step', 1), '2026-06-30 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000062', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-06-30 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000062', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'sales@herboroots.in', 'subject', 'Purchase Order PO/26-27/0002 — Makams'), '2026-06-30 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000062', 'received', '10000000-0000-4000-8000-000000000003', jsonb_build_object('receipt_id', '55000000-0000-4000-8000-000000000065', 'invoice', 'INV-2202', 'lines', 2), '2026-07-04 12:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000062', 'closed', '10000000-0000-4000-8000-000000000003', '{}'::jsonb, '2026-07-03 13:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000066', 'PO/26-27/0003', 'closed', '41000000-0000-4000-8000-000000000051', (select id from public.po_types where name = 'Raw material'), '40000000-0000-4000-8000-000000000048', '2026-07-07', '2026-07-19', 'igst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-07-07 11:15:00+05:30', '2026-07-08 15:15:00+05:30', 2, '2026-07-08 17:15:00+05:30', 'full', '10000000-0000-4000-8000-000000000003', '2026-07-07 09:15:00+05:30', '2026-07-09 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000067', '50000000-0000-4000-8000-000000000066', 1, 'Ashwagandha extract 5% withanolides', '1302', 120, 'kg', 2350, 18, 120);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000066', 1, '10000000-0000-4000-8000-000000000002', 'approved', false, '2026-07-08 15:15:00+05:30');
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000066', 2, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-07-08 16:15:00+05:30');
insert into public.receipts (id, po_id, received_date, invoice_number, invoice_date, created_by, created_at) values ('55000000-0000-4000-8000-000000000068', '50000000-0000-4000-8000-000000000066', '2026-07-12', 'INV-2203', '2026-07-13', '10000000-0000-4000-8000-000000000003', '2026-07-12 12:15:00+05:30');
insert into public.receipt_items (receipt_id, po_item_id, qty) select '55000000-0000-4000-8000-000000000068', id, received_qty from public.po_items where po_id = '50000000-0000-4000-8000-000000000066' and received_qty > 0;
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000066', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Above ₹50,000 — two-step', 'steps', 2), '2026-07-07 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000066', 'approved_step', '10000000-0000-4000-8000-000000000002', jsonb_build_object('step', 1), '2026-07-08 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000066', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-07-08 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000066', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'orders@phytoextracts.co.in', 'subject', 'Purchase Order PO/26-27/0003 — Makams'), '2026-07-08 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000066', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'orders@phytoextracts.co.in', 'subject', 'Purchase Order PO/26-27/0003 — Makams'), '2026-07-09 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000066', 'received', '10000000-0000-4000-8000-000000000003', jsonb_build_object('receipt_id', '55000000-0000-4000-8000-000000000068', 'invoice', 'INV-2203', 'lines', 1), '2026-07-12 12:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000066', 'closed', '10000000-0000-4000-8000-000000000003', '{}'::jsonb, '2026-07-11 13:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000069', 'PO/26-27/0004', 'cancelled', '41000000-0000-4000-8000-000000000052', (select id from public.po_types where name = 'Capex / Equipment'), '40000000-0000-4000-8000-000000000048', '2026-07-14', '2026-07-26', 'igst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-07-14 11:15:00+05:30', null, 0, null, 'none', '10000000-0000-4000-8000-000000000003', '2026-07-14 09:15:00+05:30', '2026-07-16 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000070', '50000000-0000-4000-8000-000000000069', 1, 'pH meter benchtop with electrodes', '9027', 2, 'nos', 28500, 18, 0);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000069', 1, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-07-15 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000069', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'All Capex — Sagar', 'steps', 1), '2026-07-14 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000069', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-07-15 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000069', 'cancelled', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-07-16 12:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000071', 'PO/26-27/0005', 'closed', '41000000-0000-4000-8000-000000000053', (select id from public.po_types where name = 'Services'), (select id from public.delivery_locations where name = 'Head Office'), '2026-07-21', '2026-08-02', 'none', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-07-21 11:15:00+05:30', '2026-07-22 15:15:00+05:30', 1, '2026-07-22 17:15:00+05:30', 'full', '10000000-0000-4000-8000-000000000003', '2026-07-21 09:15:00+05:30', '2026-07-23 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000072', '50000000-0000-4000-8000-000000000071', 1, 'Dedicated vehicle Ludhiana–Baddi (monthly)', '9965', 1, 'service', 38000, 0, 1);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000071', 1, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-07-22 15:15:00+05:30');
insert into public.receipts (id, po_id, received_date, invoice_number, invoice_date, created_by, created_at) values ('55000000-0000-4000-8000-000000000073', '50000000-0000-4000-8000-000000000071', '2026-07-26', 'INV-2205', '2026-07-27', '10000000-0000-4000-8000-000000000003', '2026-07-26 12:15:00+05:30');
insert into public.receipt_items (receipt_id, po_item_id, qty) select '55000000-0000-4000-8000-000000000073', id, received_qty from public.po_items where po_id = '50000000-0000-4000-8000-000000000071' and received_qty > 0;
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000071', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Routine purchases (up to ₹50,000)', 'steps', 1), '2026-07-21 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000071', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-07-22 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000071', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'baljit@omlogistics.example', 'subject', 'Purchase Order PO/26-27/0005 — Makams'), '2026-07-22 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000071', 'received', '10000000-0000-4000-8000-000000000003', jsonb_build_object('receipt_id', '55000000-0000-4000-8000-000000000073', 'invoice', 'INV-2205', 'lines', 1), '2026-07-26 12:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000071', 'closed', '10000000-0000-4000-8000-000000000003', '{}'::jsonb, '2026-07-25 13:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000074', 'PO/26-27/0006', 'closed', '41000000-0000-4000-8000-000000000050', (select id from public.po_types where name = 'Packaging'), (select id from public.delivery_locations where name = 'Head Office'), '2026-07-27', '2026-08-08', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-07-27 11:15:00+05:30', '2026-07-28 15:15:00+05:30', 1, '2026-07-28 17:15:00+05:30', 'full', '10000000-0000-4000-8000-000000000003', '2026-07-27 09:15:00+05:30', '2026-07-29 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000075', '50000000-0000-4000-8000-000000000074', 1, 'Shipper boxes 5-ply', '4819', 400, 'nos', 42, 18, 400);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000074', 1, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-07-28 15:15:00+05:30');
insert into public.receipts (id, po_id, received_date, invoice_number, invoice_date, created_by, created_at) values ('55000000-0000-4000-8000-000000000076', '50000000-0000-4000-8000-000000000074', '2026-08-01', 'INV-2206', '2026-08-02', '10000000-0000-4000-8000-000000000003', '2026-08-01 12:15:00+05:30');
insert into public.receipt_items (receipt_id, po_item_id, qty) select '55000000-0000-4000-8000-000000000076', id, received_qty from public.po_items where po_id = '50000000-0000-4000-8000-000000000074' and received_qty > 0;
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000074', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Routine purchases (up to ₹50,000)', 'steps', 1), '2026-07-27 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000074', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-07-28 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000074', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'ravi@shaktipack.com', 'subject', 'Purchase Order PO/26-27/0006 — Makams'), '2026-07-28 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000074', 'received', '10000000-0000-4000-8000-000000000003', jsonb_build_object('receipt_id', '55000000-0000-4000-8000-000000000076', 'invoice', 'INV-2206', 'lines', 1), '2026-08-01 12:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000074', 'closed', '10000000-0000-4000-8000-000000000003', '{}'::jsonb, '2026-07-31 13:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000077', 'PO/26-27/0007', 'closed', '41000000-0000-4000-8000-000000000049', (select id from public.po_types where name = 'Raw material'), (select id from public.delivery_locations where name = 'Head Office'), '2026-08-03', '2026-08-15', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-08-03 11:15:00+05:30', '2026-08-04 15:15:00+05:30', 1, '2026-08-04 17:15:00+05:30', 'full', '10000000-0000-4000-8000-000000000003', '2026-08-03 09:15:00+05:30', '2026-08-05 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000078', '50000000-0000-4000-8000-000000000077', 1, 'Ashwagandha root (raw, sorted)', '1211', 250, 'kg', 480, 5, 250),
  ('51000000-0000-4000-8000-000000000079', '50000000-0000-4000-8000-000000000077', 2, 'Moringa leaf powder (60 mesh)', '1211', 200, 'kg', 310, 5, 200);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000077', 1, '10000000-0000-4000-8000-000000000002', 'approved', false, '2026-08-04 15:15:00+05:30');
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000077', 2, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-08-04 16:15:00+05:30');
insert into public.receipts (id, po_id, received_date, invoice_number, invoice_date, created_by, created_at) values ('55000000-0000-4000-8000-000000000080', '50000000-0000-4000-8000-000000000077', '2026-08-08', 'INV-2207', '2026-08-09', '10000000-0000-4000-8000-000000000003', '2026-08-08 12:15:00+05:30');
insert into public.receipt_items (receipt_id, po_item_id, qty) select '55000000-0000-4000-8000-000000000080', id, received_qty from public.po_items where po_id = '50000000-0000-4000-8000-000000000077' and received_qty > 0;
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000077', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Above ₹50,000 — two-step', 'steps', 2), '2026-08-03 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000077', 'approved_step', '10000000-0000-4000-8000-000000000002', jsonb_build_object('step', 1), '2026-08-04 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000077', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-08-04 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000077', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'sales@herboroots.in', 'subject', 'Purchase Order PO/26-27/0007 — Makams'), '2026-08-04 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000077', 'received', '10000000-0000-4000-8000-000000000003', jsonb_build_object('receipt_id', '55000000-0000-4000-8000-000000000080', 'invoice', 'INV-2207', 'lines', 2), '2026-08-08 12:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000077', 'closed', '10000000-0000-4000-8000-000000000003', '{}'::jsonb, '2026-08-07 13:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000081', 'PO/26-27/0008', 'approved', '41000000-0000-4000-8000-000000000054', (select id from public.po_types where name = 'Raw material'), '40000000-0000-4000-8000-000000000048', '2026-08-10', '2026-08-22', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-08-10 11:15:00+05:30', '2026-08-11 15:15:00+05:30', 1, '2026-08-11 17:15:00+05:30', 'full', '10000000-0000-4000-8000-000000000003', '2026-08-10 09:15:00+05:30', '2026-08-12 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000082', '50000000-0000-4000-8000-000000000081', 1, 'Tulsi leaves dried (grade A)', '1211', 300, 'kg', 210, 5, 300),
  ('51000000-0000-4000-8000-000000000083', '50000000-0000-4000-8000-000000000081', 2, 'Brahmi whole plant dried', '1211', 150, 'kg', 260, 5, 150);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000081', 1, '10000000-0000-4000-8000-000000000002', 'approved', false, '2026-08-11 15:15:00+05:30');
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000081', 2, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-08-11 16:15:00+05:30');
insert into public.receipts (id, po_id, received_date, invoice_number, invoice_date, created_by, created_at) values ('55000000-0000-4000-8000-000000000084', '50000000-0000-4000-8000-000000000081', '2026-08-15', 'INV-2208', '2026-08-16', '10000000-0000-4000-8000-000000000003', '2026-08-15 12:15:00+05:30');
insert into public.receipt_items (receipt_id, po_item_id, qty) select '55000000-0000-4000-8000-000000000084', id, received_qty from public.po_items where po_id = '50000000-0000-4000-8000-000000000081' and received_qty > 0;
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000081', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Above ₹50,000 — two-step', 'steps', 2), '2026-08-10 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000081', 'approved_step', '10000000-0000-4000-8000-000000000002', jsonb_build_object('step', 1), '2026-08-11 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000081', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-08-11 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000081', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'anu@greenleafbot.in', 'subject', 'Purchase Order PO/26-27/0008 — Makams'), '2026-08-11 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000081', 'received', '10000000-0000-4000-8000-000000000003', jsonb_build_object('receipt_id', '55000000-0000-4000-8000-000000000084', 'invoice', 'INV-2208', 'lines', 2), '2026-08-15 12:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000085', 'PO/26-27/0009', 'closed', '41000000-0000-4000-8000-000000000050', (select id from public.po_types where name = 'Packaging'), (select id from public.delivery_locations where name = 'Head Office'), '2026-08-18', '2026-08-30', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-08-18 11:15:00+05:30', '2026-08-19 15:15:00+05:30', 1, '2026-08-19 17:15:00+05:30', 'full', '10000000-0000-4000-8000-000000000003', '2026-08-18 09:15:00+05:30', '2026-08-20 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000086', '50000000-0000-4000-8000-000000000085', 1, 'HDPE jars 200cc with CRC caps', '3923', 15000, 'nos', 6.8, 18, 15000);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000085', 1, '10000000-0000-4000-8000-000000000002', 'approved', false, '2026-08-19 15:15:00+05:30');
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000085', 2, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-08-19 16:15:00+05:30');
insert into public.receipts (id, po_id, received_date, invoice_number, invoice_date, created_by, created_at) values ('55000000-0000-4000-8000-000000000087', '50000000-0000-4000-8000-000000000085', '2026-08-23', 'INV-2209', '2026-08-24', '10000000-0000-4000-8000-000000000003', '2026-08-23 12:15:00+05:30');
insert into public.receipt_items (receipt_id, po_item_id, qty) select '55000000-0000-4000-8000-000000000087', id, received_qty from public.po_items where po_id = '50000000-0000-4000-8000-000000000085' and received_qty > 0;
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000085', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Above ₹50,000 — two-step', 'steps', 2), '2026-08-18 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000085', 'approved_step', '10000000-0000-4000-8000-000000000002', jsonb_build_object('step', 1), '2026-08-19 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000085', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-08-19 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000085', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'ravi@shaktipack.com', 'subject', 'Purchase Order PO/26-27/0009 — Makams'), '2026-08-19 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000085', 'received', '10000000-0000-4000-8000-000000000003', jsonb_build_object('receipt_id', '55000000-0000-4000-8000-000000000087', 'invoice', 'INV-2209', 'lines', 1), '2026-08-23 12:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000085', 'closed', '10000000-0000-4000-8000-000000000003', '{}'::jsonb, '2026-08-22 13:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000088', 'PO/26-27/0010', 'rejected', '41000000-0000-4000-8000-000000000052', (select id from public.po_types where name = 'Capex / Equipment'), '40000000-0000-4000-8000-000000000048', '2026-08-24', '2026-09-05', 'igst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-08-24 11:15:00+05:30', null, 0, null, 'none', '10000000-0000-4000-8000-000000000003', '2026-08-24 09:15:00+05:30', '2026-08-26 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000089', '50000000-0000-4000-8000-000000000088', 1, 'Halogen moisture analyzer MA-160', '9027', 1, 'nos', 185000, 18, 0);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, comment, acted_at) values ('50000000-0000-4000-8000-000000000088', 1, (select id from public.app_users where email = 'sagar@makams.com'), 'rejected', false, 'Defer — cash flow. Re-quote after Diwali.', '2026-08-25 16:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000088', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'All Capex — Sagar', 'steps', 1), '2026-08-24 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000088', 'rejected', (select id from public.app_users where email = 'sagar@makams.com'), jsonb_build_object('step', 1, 'comment', 'Defer — cash flow. Re-quote after Diwali.'), '2026-08-25 16:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000090', 'PO/26-27/0011', 'approved', '41000000-0000-4000-8000-000000000049', (select id from public.po_types where name = 'Raw material'), (select id from public.delivery_locations where name = 'Head Office'), '2026-08-30', '2026-09-11', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-08-30 11:15:00+05:30', '2026-08-31 15:15:00+05:30', 1, '2026-08-31 17:15:00+05:30', 'partial', '10000000-0000-4000-8000-000000000003', '2026-08-30 09:15:00+05:30', '2026-09-01 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000091', '50000000-0000-4000-8000-000000000090', 1, 'Moringa leaf powder (60 mesh)', '1211', 500, 'kg', 310, 5, 300.0),
  ('51000000-0000-4000-8000-000000000092', '50000000-0000-4000-8000-000000000090', 2, 'Amla powder (spray dried)', '1106', 200, 'kg', 265, 5, 120.0);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000090', 1, '10000000-0000-4000-8000-000000000002', 'approved', false, '2026-08-31 15:15:00+05:30');
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000090', 2, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-08-31 16:15:00+05:30');
insert into public.receipts (id, po_id, received_date, invoice_number, invoice_date, created_by, created_at) values ('55000000-0000-4000-8000-000000000093', '50000000-0000-4000-8000-000000000090', '2026-09-04', 'INV-2211', '2026-09-05', '10000000-0000-4000-8000-000000000003', '2026-09-04 12:15:00+05:30');
insert into public.receipt_items (receipt_id, po_item_id, qty) select '55000000-0000-4000-8000-000000000093', id, received_qty from public.po_items where po_id = '50000000-0000-4000-8000-000000000090' and received_qty > 0;
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000090', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Above ₹50,000 — two-step', 'steps', 2), '2026-08-30 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000090', 'approved_step', '10000000-0000-4000-8000-000000000002', jsonb_build_object('step', 1), '2026-08-31 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000090', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-08-31 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000090', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'sales@herboroots.in', 'subject', 'Purchase Order PO/26-27/0011 — Makams'), '2026-08-31 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000090', 'received', '10000000-0000-4000-8000-000000000003', jsonb_build_object('receipt_id', '55000000-0000-4000-8000-000000000093', 'invoice', 'INV-2211', 'lines', 2), '2026-09-04 12:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000094', 'PO/26-27/0012', 'approved', '41000000-0000-4000-8000-000000000051', (select id from public.po_types where name = 'Raw material'), '40000000-0000-4000-8000-000000000048', '2026-09-03', '2026-09-15', 'igst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-09-03 11:15:00+05:30', '2026-09-04 15:15:00+05:30', 1, '2026-09-04 17:15:00+05:30', 'none', '10000000-0000-4000-8000-000000000003', '2026-09-03 09:15:00+05:30', '2026-09-05 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000095', '50000000-0000-4000-8000-000000000094', 1, 'Turmeric extract 95% curcuminoids', '1302', 40, 'kg', 4100, 18, 0);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000094', 1, '10000000-0000-4000-8000-000000000002', 'approved', false, '2026-09-04 15:15:00+05:30');
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000094', 2, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-09-04 16:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000094', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Above ₹50,000 — two-step', 'steps', 2), '2026-09-03 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000094', 'approved_step', '10000000-0000-4000-8000-000000000002', jsonb_build_object('step', 1), '2026-09-04 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000094', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-09-04 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000094', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'orders@phytoextracts.co.in', 'subject', 'Purchase Order PO/26-27/0012 — Makams'), '2026-09-04 17:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000096', 'PO/26-27/0013', 'approved', '41000000-0000-4000-8000-000000000050', (select id from public.po_types where name = 'Packaging'), (select id from public.delivery_locations where name = 'Head Office'), '2026-09-07', '2026-09-19', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-09-07 11:15:00+05:30', '2026-09-08 15:15:00+05:30', 1, '2026-09-08 17:15:00+05:30', 'partial', '10000000-0000-4000-8000-000000000003', '2026-09-07 09:15:00+05:30', '2026-09-09 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000097', '50000000-0000-4000-8000-000000000096', 1, 'Printed mono cartons 350gsm', '4819', 8000, 'nos', 9.5, 18, 4000.0),
  ('51000000-0000-4000-8000-000000000098', '50000000-0000-4000-8000-000000000096', 2, 'Shipper boxes 5-ply', '4819', 300, 'nos', 42, 18, 150.0);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000096', 1, '10000000-0000-4000-8000-000000000002', 'approved', false, '2026-09-08 15:15:00+05:30');
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000096', 2, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-09-08 16:15:00+05:30');
insert into public.receipts (id, po_id, received_date, invoice_number, invoice_date, created_by, created_at) values ('55000000-0000-4000-8000-000000000099', '50000000-0000-4000-8000-000000000096', '2026-09-12', 'INV-2213', '2026-09-13', '10000000-0000-4000-8000-000000000003', '2026-09-12 12:15:00+05:30');
insert into public.receipt_items (receipt_id, po_item_id, qty) select '55000000-0000-4000-8000-000000000099', id, received_qty from public.po_items where po_id = '50000000-0000-4000-8000-000000000096' and received_qty > 0;
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000096', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Above ₹50,000 — two-step', 'steps', 2), '2026-09-07 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000096', 'approved_step', '10000000-0000-4000-8000-000000000002', jsonb_build_object('step', 1), '2026-09-08 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000096', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-09-08 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000096', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'ravi@shaktipack.com', 'subject', 'Purchase Order PO/26-27/0013 — Makams'), '2026-09-08 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000096', 'received', '10000000-0000-4000-8000-000000000003', jsonb_build_object('receipt_id', '55000000-0000-4000-8000-000000000099', 'invoice', 'INV-2213', 'lines', 2), '2026-09-12 12:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000100', 'PO/26-27/0014', 'approved', '41000000-0000-4000-8000-000000000053', (select id from public.po_types where name = 'Services'), (select id from public.delivery_locations where name = 'Head Office'), '2026-09-11', '2026-09-23', 'none', (select value->>'po_terms' from public.app_settings where key='company'), null, '2026-09-11 11:15:00+05:30', '2026-09-12 15:15:00+05:30', 2, '2026-09-12 17:15:00+05:30', 'none', '10000000-0000-4000-8000-000000000003', '2026-09-11 09:15:00+05:30', '2026-09-13 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000101', '50000000-0000-4000-8000-000000000100', 1, 'Dedicated vehicle Ludhiana–Baddi (monthly)', '9965', 1, 'service', 38000, 0, 0);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current, acted_at) values ('50000000-0000-4000-8000-000000000100', 1, (select id from public.app_users where email = 'sagar@makams.com'), 'approved', false, '2026-09-12 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000100', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Routine purchases (up to ₹50,000)', 'steps', 1), '2026-09-11 11:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000100', 'approved', (select id from public.app_users where email = 'sagar@makams.com'), '{}'::jsonb, '2026-09-12 15:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000100', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'baljit@omlogistics.example', 'subject', 'Purchase Order PO/26-27/0014 — Makams'), '2026-09-12 17:15:00+05:30');
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000100', 'sent', '10000000-0000-4000-8000-000000000003', jsonb_build_object('to', 'baljit@omlogistics.example', 'subject', 'Purchase Order PO/26-27/0014 — Makams'), '2026-09-13 17:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000102', 'PO/26-27/0015', 'pending_approval', '41000000-0000-4000-8000-000000000051', (select id from public.po_types where name = 'Raw material'), '40000000-0000-4000-8000-000000000048', '2026-09-14', '2026-09-26', 'igst', (select value->>'po_terms' from public.app_settings where key='company'), 1, '2026-09-14 11:15:00+05:30', null, 0, null, 'none', '10000000-0000-4000-8000-000000000003', '2026-09-14 09:15:00+05:30', '2026-09-16 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000103', '50000000-0000-4000-8000-000000000102', 1, 'Ashwagandha extract 5% withanolides', '1302', 80, 'kg', 2350, 18, 0),
  ('51000000-0000-4000-8000-000000000104', '50000000-0000-4000-8000-000000000102', 2, 'Boswellia extract 65%', '1302', 30, 'kg', 2900, 18, 0);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current) values ('50000000-0000-4000-8000-000000000102', 1, '10000000-0000-4000-8000-000000000002', 'pending', true);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current) values ('50000000-0000-4000-8000-000000000102', 2, (select id from public.app_users where email = 'sagar@makams.com'), 'pending', false);
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000102', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Above ₹50,000 — two-step', 'steps', 2), '2026-09-14 11:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000105', 'PO/26-27/0016', 'pending_approval', '41000000-0000-4000-8000-000000000050', (select id from public.po_types where name = 'Consumables'), (select id from public.delivery_locations where name = 'Head Office'), '2026-09-16', '2026-09-27', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), 1, '2026-09-16 11:15:00+05:30', null, 0, null, 'none', '10000000-0000-4000-8000-000000000003', '2026-09-16 09:15:00+05:30', '2026-09-17 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000106', '50000000-0000-4000-8000-000000000105', 1, 'Shipper boxes 5-ply', '4819', 200, 'nos', 42, 18, 0);
insert into public.po_approval_steps (po_id, position, approver_id, status, is_current) values ('50000000-0000-4000-8000-000000000105', 1, (select id from public.app_users where email = 'sagar@makams.com'), 'pending', true);
insert into public.po_events (po_id, kind, actor_id, detail, created_at) values ('50000000-0000-4000-8000-000000000105', 'submitted', '10000000-0000-4000-8000-000000000003', jsonb_build_object('rule', 'Routine purchases (up to ₹50,000)', 'steps', 1), '2026-09-16 11:15:00+05:30');

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000107', null, 'draft', '41000000-0000-4000-8000-000000000050', (select id from public.po_types where name = 'Packaging'), (select id from public.delivery_locations where name = 'Head Office'), '2026-09-15', '2026-09-27', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), null, null, null, 0, null, 'none', '10000000-0000-4000-8000-000000000003', '2026-09-15 09:15:00+05:30', '2026-09-17 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000108', '50000000-0000-4000-8000-000000000107', 1, 'Printed mono cartons 350gsm', '4819', 6000, 'nos', 9.5, 18, 0);

insert into public.purchase_orders (id, po_number, status, vendor_id, po_type_id, location_id, order_date, expected_date, tax_mode, terms, current_step, submitted_at, approved_at, sent_count, last_sent_at, received_status, created_by, created_at, updated_at) values
  ('50000000-0000-4000-8000-000000000109', null, 'draft', '41000000-0000-4000-8000-000000000054', (select id from public.po_types where name = 'Raw material'), '40000000-0000-4000-8000-000000000048', '2026-09-17', '2026-09-27', 'cgst_sgst', (select value->>'po_terms' from public.app_settings where key='company'), null, null, null, 0, null, 'none', '10000000-0000-4000-8000-000000000003', '2026-09-17 09:15:00+05:30', '2026-09-17 10:15:00+05:30');
insert into public.po_items (id, po_id, position, description, hsn_code, qty, unit, unit_price, tax_pct, received_qty) values
  ('51000000-0000-4000-8000-000000000110', '50000000-0000-4000-8000-000000000109', 1, 'Brahmi whole plant dried', '1211', 100, 'kg', 260, 5, 0);

-- align the auto 'created' events and the PO number counter
update public.po_events e set actor_id = p.created_by, created_at = p.created_at from public.purchase_orders p where e.po_id = p.id and e.kind = 'created';
insert into public.po_counters (fy, last_n) values ('26-27', 16) on conflict (fy) do update set last_n = 16;


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

insert into public.referral_submissions
  (source, referred_by_name, referrer_emp_id, referrer_phone, full_name, designation, area, current_company, phone)
values
  ('Consultant Ramesh — TalentBridge', 'Ramesh Kumar (TalentBridge)', null, '98150 00110', 'Gaurav Nanda', 'Sales Officer', 'Patiala', 'Dabur (distributor)', '98700 45612'),
  ('Consultant Ramesh — TalentBridge', 'Ramesh Kumar (TalentBridge)', null, '98150 00110', 'Simarjit Dhillon', 'Sales Rep', 'Moga', 'Local FMCG stockist', '97910 33445');

select 'Dummy data loaded: '
  || (select count(*) from public.people) || ' people, '
  || (select count(*) from public.candidates) || ' candidates, '
  || (select count(*) from public.vendors) || ' vendors, '
  || (select count(*) from public.purchase_orders) || ' POs (' || (select count(*) from public.receipts) || ' receipts)' as result;
