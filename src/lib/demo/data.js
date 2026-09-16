// Seed data for demo mode (VITE_DEMO=1). Everything lives in memory for this tab only.

const DAY = 86400000
const iso = (daysAgo, hour = 10) => {
  const d = new Date(Date.now() - daysAgo * DAY)
  d.setHours(hour, 15, 0, 0)
  return d.toISOString()
}
const dateStr = (daysFromNow) => new Date(Date.now() + daysFromNow * DAY).toISOString().slice(0, 10)

export const DEMO_AUTH_ID = 'demo-auth-aakash'

export function buildSeedStore() {
  const app_users = [
    { id: 'u-aakash', auth_id: DEMO_AUTH_ID, email: 'aakash@makams.com', full_name: 'Aakash Agarwal', roles: ['admin', 'hr', 'purchase', 'approver'], active: true, created_at: iso(90) },
    { id: 'u-sagar', auth_id: 'auth-sagar', email: 'sagar@makams.com', full_name: 'Sagar Sharma', roles: ['purchase', 'approver'], active: true, created_at: iso(85) },
    { id: 'u-priya', auth_id: 'auth-priya', email: 'priya@makams.com', full_name: 'Priya Nair', roles: ['hr'], active: true, created_at: iso(80) },
    { id: 'u-rohit', auth_id: null, email: 'rohit@makams.com', full_name: 'Rohit Bansal', roles: ['approver'], active: true, created_at: iso(20) },
  ]

  const app_settings = [
    {
      key: 'company',
      value: {
        name: 'Makams', address: 'Plot 14, Industrial Area Phase 2', city: 'Ludhiana', state: 'Punjab',
        pincode: '141010', gstin: '03AAACM1234F1Z5', phone: '+91 98765 43210', email: 'ops@makams.com',
        po_prefix: 'PO',
        po_terms: '1. Please quote the PO number on all invoices, challans and correspondence.\n2. Goods to be delivered to the address mentioned above.\n3. Prices are inclusive of packing unless stated otherwise.\n4. Payment terms as agreed.',
      },
      updated_at: iso(30),
    },
  ]

  const people = [
    { id: 'p-01', emp_code: 'MKM-001', full_name: 'Deepak Verma', status: 'active', department: 'Production', designation: 'Production Supervisor', employment_type: 'full_time', date_of_join: '2023-04-10', personal_email: 'deepak.v@gmail.com', phone: '98110 22331', city: 'Ludhiana', state: 'Punjab', learnapp_user_id: 'lu-01', learnapp_email: 'deepak.v@gmail.com', learnapp_status: 'active', monthly_gross: 42000, pan_number: 'BQFPV3391K', created_at: iso(88) },
    { id: 'p-02', emp_code: 'MKM-002', full_name: 'Sunita Kaur', status: 'active', department: 'Quality', designation: 'QC Executive', employment_type: 'full_time', date_of_join: '2023-08-01', personal_email: 'sunita.k@gmail.com', phone: '98220 11445', city: 'Ludhiana', state: 'Punjab', learnapp_user_id: 'lu-02', learnapp_email: 'sunita.k@gmail.com', learnapp_status: 'active', monthly_gross: 38000, created_at: iso(88) },
    { id: 'p-03', emp_code: 'MKM-003', full_name: 'Manpreet Singh', status: 'active', department: 'Warehouse', designation: 'Store Incharge', employment_type: 'full_time', date_of_join: '2024-01-15', phone: '97790 55662', learnapp_user_id: 'lu-03', learnapp_status: 'active', monthly_gross: 30000, created_at: iso(80) },
    { id: 'p-04', emp_code: 'MKM-004', full_name: 'Kavita Joshi', status: 'active', department: 'Accounts', designation: 'Accounts Executive', employment_type: 'full_time', date_of_join: '2024-06-03', personal_email: 'kavita.j@yahoo.com', phone: '98330 77881', monthly_gross: 35000, created_at: iso(75) },
    { id: 'p-05', emp_code: 'MKM-005', full_name: 'Arvind Kumar', status: 'active', department: 'Production', designation: 'Machine Operator', employment_type: 'full_time', date_of_join: '2024-09-20', phone: '96540 33217', learnapp_user_id: 'lu-05', learnapp_status: 'active', monthly_gross: 22000, created_at: iso(70) },
    { id: 'p-06', emp_code: 'MKM-006', full_name: 'Ritu Sharma', status: 'active', department: 'Sales', designation: 'Sales Executive', employment_type: 'full_time', date_of_join: '2025-02-11', personal_email: 'ritu.s@gmail.com', phone: '99530 88112', monthly_gross: 32000, created_at: iso(60) },
    { id: 'p-07', emp_code: 'MKM-007', full_name: 'Gurpreet Gill', status: 'active', department: 'Production', designation: 'Helper', employment_type: 'contract', date_of_join: '2025-07-01', phone: '98761 44990', monthly_gross: 16000, created_at: iso(50) },
    { id: 'p-08', emp_code: 'MKM-008', full_name: 'Meena Devi', status: 'active', department: 'Housekeeping', designation: 'Housekeeping Staff', employment_type: 'contract', date_of_join: '2025-08-18', phone: '97800 12034', monthly_gross: 14000, created_at: iso(45) },
    // joined recently — onboarding in progress
    { id: 'p-09', emp_code: 'MKM-009', full_name: 'Vikram Rathi', status: 'active', department: 'Quality', designation: 'Lab Chemist', employment_type: 'full_time', date_of_join: dateStr(-6), personal_email: 'vikram.rathi@gmail.com', phone: '98995 66778', monthly_gross: 36000, created_at: iso(12) },
    // candidates
    { id: 'p-10', emp_code: null, full_name: 'Neha Malhotra', status: 'candidate', department: 'Accounts', designation: 'Junior Accountant', personal_email: 'neha.malhotra11@gmail.com', phone: '98111 90233', notes: 'Offer accepted, joining 1st Oct. Documents received via link.', created_at: iso(9) },
    { id: 'p-11', emp_code: null, full_name: 'Arjun Mehta', status: 'candidate', department: 'Sales', designation: 'Area Sales Manager', personal_email: 'arjun.mehta@outlook.com', phone: '99100 44556', notes: 'Final round cleared. Docs pending.', created_at: iso(4) },
    // exited
    { id: 'p-12', emp_code: 'MKM-000', full_name: 'Suresh Pillai', status: 'exited', department: 'Warehouse', designation: 'Store Assistant', date_of_join: '2022-11-01', date_of_exit: dateStr(-40), exit_reason: 'Relocated to Kochi', learnapp_user_id: 'lu-12', learnapp_status: 'disabled', created_at: iso(89) },
  ]

  const person_documents = [
    { id: 'd-01', person_id: 'p-10', doc_type: 'pan', file_path: null, file_name: 'PAN_Neha.pdf', mime_type: 'application/pdf', status: 'verified', source: 'employee', link_id: 'l-01', uploaded_at: iso(6), verified_by: 'u-priya', verified_at: iso(5), created_at: iso(6) },
    { id: 'd-02', person_id: 'p-10', doc_type: 'aadhaar', file_path: null, file_name: 'Aadhaar_Neha.pdf', mime_type: 'application/pdf', status: 'uploaded', source: 'employee', link_id: 'l-01', uploaded_at: iso(6), created_at: iso(6) },
    { id: 'd-03', person_id: 'p-10', doc_type: 'bank_proof', file_path: null, file_name: 'cancelled_cheque.jpg', mime_type: 'image/jpeg', status: 'uploaded', source: 'employee', link_id: 'l-01', uploaded_at: iso(5), created_at: iso(5) },
    { id: 'd-04', person_id: 'p-09', doc_type: 'offer_letter', file_path: null, file_name: 'Offer_Vikram_signed.pdf', mime_type: 'application/pdf', status: 'verified', source: 'hr', uploaded_at: iso(11), verified_by: 'u-priya', verified_at: iso(11), created_at: iso(11) },
    { id: 'd-05', person_id: 'p-01', doc_type: 'pan', file_path: null, file_name: 'PAN_Deepak.pdf', mime_type: 'application/pdf', status: 'verified', source: 'hr', uploaded_at: iso(80), verified_at: iso(80), created_at: iso(80) },
  ]

  const upload_links = [
    { id: 'l-01', person_id: 'p-10', token: 'demo-neha', doc_types: ['pan', 'aadhaar', 'bank_proof', 'photo'], profile_fields: ['personal_email', 'phone', 'address', 'bank_name', 'bank_account', 'bank_ifsc', 'emergency_contact_name', 'emergency_contact_phone'], message: 'Welcome to Makams! Please share these before your joining date.', expires_at: iso(-8), created_by: 'u-priya', created_at: iso(8), last_used_at: iso(5), submitted_at: iso(5), revoked_at: null },
    { id: 'l-02', person_id: 'p-11', token: 'demo-arjun', doc_types: ['pan', 'aadhaar', 'photo', 'experience', 'salary_slips'], profile_fields: ['personal_email', 'phone', 'date_of_birth', 'address', 'city', 'state', 'pincode', 'bank_name', 'bank_account', 'bank_ifsc'], message: 'Hi Arjun, please submit your documents so we can prepare your offer rollout.', expires_at: iso(-10), created_by: 'u-priya', created_at: iso(3), last_used_at: null, submitted_at: null, revoked_at: null },
  ]

  const checklist_templates = [
    { id: 't-onb', kind: 'onboarding', name: 'Standard onboarding', active: true, created_at: iso(90) },
    { id: 't-exit', kind: 'exit', name: 'Standard exit', active: true, created_at: iso(90) },
  ]

  const onbItems = [
    ['Offer letter signed', 'Collect the signed offer letter', 'offer_letter', 3],
    ['Documents collected', 'PAN, Aadhaar, photo, bank proof — send an upload link from the Documents tab', null, 7],
    ['Bank details verified', 'Match bank proof with payroll entry', null, 7],
    ['Employee code assigned', null, null, 3],
    ['Added to payroll', null, null, 10],
    ['Work email created', null, null, 3],
    ['Learnapp account created', "Use the Learnapp tab on the person's page", null, 5],
    ['Added to the employee Google Sheet', 'Runs automatically via sheet sync — verify the row appeared', null, 5],
    ['Induction / training done', null, null, 15],
    ['Probation terms communicated', null, null, 7],
  ]
  const exitItems = [
    ['Resignation letter received', null, 'resignation', 2],
    ['Exit date confirmed', 'Update date of exit on the profile', null, 2],
    ['Handover completed', null, null, 15],
    ['Company assets returned', 'Laptop, phone, ID card, keys', null, 15],
    ['Learnapp access disabled', "Use the Learnapp tab on the person's page", null, 1],
    ['Work email deactivated', null, null, 1],
    ['Final settlement processed', null, null, 45],
    ['Experience letter issued', null, null, 30],
  ]

  const checklist_template_items = [
    ...onbItems.map(([title, description, doc_type, due_days], i) => ({ id: `ti-onb-${i + 1}`, template_id: 't-onb', position: i + 1, title, description, owner_role: 'hr', doc_type, due_days })),
    ...exitItems.map(([title, description, doc_type, due_days], i) => ({ id: `ti-exit-${i + 1}`, template_id: 't-exit', position: i + 1, title, description, owner_role: 'hr', doc_type, due_days })),
  ]

  // Vikram's onboarding — in progress
  const person_checklists = [
    { id: 'cl-01', person_id: 'p-09', template_id: 't-onb', kind: 'onboarding', name: 'Standard onboarding', status: 'in_progress', started_at: iso(11), completed_at: null, created_by: 'u-priya' },
    { id: 'cl-02', person_id: 'p-12', template_id: 't-exit', kind: 'exit', name: 'Standard exit', status: 'completed', started_at: iso(55), completed_at: iso(38), created_by: 'u-priya' },
  ]

  const person_checklist_items = [
    ...onbItems.map(([title, description, , due_days], i) => ({
      id: `ci-01-${i + 1}`, checklist_id: 'cl-01', position: i + 1, title, description, owner_role: 'hr',
      doc_type: null, due_date: dateStr(due_days - 11),
      status: i < 5 ? 'done' : 'pending',
      done_by: i < 5 ? 'u-priya' : null, done_at: i < 5 ? iso(10 - i) : null, note: null,
    })),
    ...exitItems.map(([title, description, , ], i) => ({
      id: `ci-02-${i + 1}`, checklist_id: 'cl-02', position: i + 1, title, description, owner_role: 'hr',
      doc_type: null, due_date: null, status: 'done', done_by: 'u-priya', done_at: iso(40), note: null,
    })),
  ]

  const learnapp_actions = [
    { id: 'la-01', person_id: 'p-09', action: 'invite', status: 'error', detail: 'Invite failed: rate limit — retried OK next day (demo sample)', created_by: 'u-priya', created_at: iso(10) },
    { id: 'la-02', person_id: 'p-12', action: 'disable', status: 'ok', detail: 'suresh.p@gmail.com', created_by: 'u-priya', created_at: iso(40) },
    { id: 'la-03', person_id: 'p-05', action: 'create', status: 'ok', detail: 'arvind.k@gmail.com (lu-05)', created_by: 'u-priya', created_at: iso(69) },
  ]

  const sheet_sync_log = [
    { id: 'ss-01', status: 'ok', rows: 12, detail: null, created_by: 'u-priya', created_at: iso(2, 18) },
    { id: 'ss-02', status: 'ok', rows: 12, detail: null, created_by: 'u-aakash', created_at: iso(6, 12) },
  ]

  const po_types = [
    { id: 'pt-raw', name: 'Raw material', active: true, created_at: iso(90) },
    { id: 'pt-pack', name: 'Packaging', active: true, created_at: iso(90) },
    { id: 'pt-cons', name: 'Consumables', active: true, created_at: iso(90) },
    { id: 'pt-capex', name: 'Capex / Equipment', active: true, created_at: iso(90) },
    { id: 'pt-serv', name: 'Services', active: true, created_at: iso(90) },
  ]

  const delivery_locations = [
    { id: 'loc-ho', name: 'Head Office — Ludhiana', address: 'Plot 14, Industrial Area Phase 2, Ludhiana 141010', state: 'Punjab', gstin: '03AAACM1234F1Z5', active: true, created_at: iso(90) },
    { id: 'loc-fac', name: 'Factory — Baddi', address: 'Khasra 88/2, EPIP Phase 1, Baddi, HP 173205', state: 'Himachal Pradesh', gstin: '02AAACM1234F2Z1', active: true, created_at: iso(90) },
  ]

  const vendors = [
    { id: 'v-01', name: 'Herbo Roots Agro LLP', contact_name: 'Naresh Jain', email: 'sales@herboroots.in', phone: '98150 22110', gstin: '03AAFFH8899Q1ZC', address: 'GT Road, Khanna', city: 'Khanna', state: 'Punjab', pincode: '141401', payment_terms: '30 days from invoice', active: true, created_at: iso(85), updated_at: iso(85) },
    { id: 'v-02', name: 'Shakti Packagers', contact_name: 'Ravi Gupta', email: 'ravi@shaktipack.com', phone: '98720 66554', gstin: '03ABBPS4321L1ZP', address: 'Focal Point Phase 5', city: 'Ludhiana', state: 'Punjab', pincode: '141010', payment_terms: '15 days', active: true, created_at: iso(84), updated_at: iso(84) },
    { id: 'v-03', name: 'Phyto Extracts India Pvt Ltd', contact_name: 'Dr. S. Reddy', email: 'orders@phytoextracts.co.in', phone: '90000 12345', gstin: '36AAACP9988K1Z2', address: 'IDA Jeedimetla', city: 'Hyderabad', state: 'Telangana', pincode: '500055', payment_terms: '50% advance, 50% on delivery', active: true, created_at: iso(70), updated_at: iso(70) },
    { id: 'v-04', name: 'LabCare Instruments', contact_name: 'Mohit Arora', email: 'mohit@labcare.in', phone: '98100 77332', gstin: '07AABCL5566M1ZN', address: 'Wazirpur Industrial Area', city: 'New Delhi', state: 'Delhi', pincode: '110052', payment_terms: '100% against proforma', active: true, created_at: iso(60), updated_at: iso(60) },
    { id: 'v-05', name: 'Om Logistics & Services', contact_name: 'Baljit Singh', email: 'baljit@omlogistics.example', phone: '97810 22446', gstin: '03AACCO7788B1ZF', address: 'Transport Nagar', city: 'Ludhiana', state: 'Punjab', pincode: '141003', payment_terms: 'Monthly billing', active: true, created_at: iso(55), updated_at: iso(55) },
  ]

  const approval_rules = [
    { id: 'r-small', name: 'Routine purchases (up to ₹50,000)', priority: 10, active: true, po_type_ids: [], location_ids: [], min_amount: 0, max_amount: 50000, created_at: iso(80) },
    { id: 'r-big', name: 'Above ₹50,000 — two-step', priority: 20, active: true, po_type_ids: [], location_ids: [], min_amount: 50000, max_amount: null, created_at: iso(80) },
    { id: 'r-capex', name: 'All Capex — Sagar then Aakash', priority: 5, active: true, po_type_ids: ['pt-capex'], location_ids: [], min_amount: 0, max_amount: null, created_at: iso(80) },
  ]

  const approval_rule_steps = [
    { id: 'rs-01', rule_id: 'r-small', position: 1, approver_id: 'u-sagar' },
    { id: 'rs-02', rule_id: 'r-big', position: 1, approver_id: 'u-sagar' },
    { id: 'rs-03', rule_id: 'r-big', position: 2, approver_id: 'u-aakash' },
    { id: 'rs-04', rule_id: 'r-capex', position: 1, approver_id: 'u-sagar' },
    { id: 'rs-05', rule_id: 'r-capex', position: 2, approver_id: 'u-aakash' },
  ]

  const purchase_orders = [
    // 1 — draft
    { id: 'po-01', po_number: null, status: 'draft', vendor_id: 'v-02', po_type_id: 'pt-pack', location_id: 'loc-ho', order_date: dateStr(0), expected_date: dateStr(10), reference: 'Quote SP/2026/118', tax_mode: 'cgst_sgst', terms: app_settings[0].value.po_terms, notes: 'Rate negotiated ₹2 lower than last time', current_step: null, submitted_at: null, approved_at: null, sent_count: 0, last_sent_at: null, received_status: 'none', duplicated_from: null, created_by: 'u-sagar', created_at: iso(0, 9), updated_at: iso(0, 9) },
    // 2 — pending step 1 (Sagar)
    { id: 'po-02', po_number: 'PO/26-27/0006', status: 'pending_approval', vendor_id: 'v-03', po_type_id: 'pt-raw', location_id: 'loc-fac', order_date: dateStr(-1), expected_date: dateStr(14), reference: 'Indent PR-0042', tax_mode: 'igst', terms: app_settings[0].value.po_terms, notes: null, current_step: 1, submitted_at: iso(1, 16), approved_at: null, sent_count: 0, last_sent_at: null, received_status: 'none', duplicated_from: null, created_by: 'u-sagar', created_at: iso(1, 15), updated_at: iso(1, 16) },
    // 3 — pending step 2 (Aakash) — shows in your inbox
    { id: 'po-03', po_number: 'PO/26-27/0005', status: 'pending_approval', vendor_id: 'v-04', po_type_id: 'pt-capex', location_id: 'loc-fac', order_date: dateStr(-2), expected_date: dateStr(21), reference: 'Moisture analyzer quote LC-889', tax_mode: 'igst', terms: app_settings[0].value.po_terms, notes: 'Needed before Diwali production ramp', current_step: 2, submitted_at: iso(2, 11), approved_at: null, sent_count: 0, last_sent_at: null, received_status: 'none', duplicated_from: null, created_by: 'u-sagar', created_at: iso(2, 10), updated_at: iso(1, 9) },
    // 4 — approved, sent, partially received
    { id: 'po-04', po_number: 'PO/26-27/0004', status: 'approved', vendor_id: 'v-01', po_type_id: 'pt-raw', location_id: 'loc-ho', order_date: dateStr(-9), expected_date: dateStr(-2), reference: null, tax_mode: 'cgst_sgst', terms: app_settings[0].value.po_terms, notes: null, current_step: null, submitted_at: iso(9, 12), approved_at: iso(8, 10), sent_count: 2, last_sent_at: iso(4, 17), received_status: 'partial', duplicated_from: null, created_by: 'u-sagar', created_at: iso(9, 11), updated_at: iso(2, 12) },
    // 5 — approved (auto single approver), not sent yet
    { id: 'po-05', po_number: 'PO/26-27/0003', status: 'approved', vendor_id: 'v-05', po_type_id: 'pt-serv', location_id: 'loc-ho', order_date: dateStr(-5), expected_date: null, reference: 'September transport contract', tax_mode: 'none', terms: 'As per annual rate contract.', notes: null, current_step: null, submitted_at: iso(5, 10), approved_at: iso(5, 12), sent_count: 0, last_sent_at: null, received_status: 'none', duplicated_from: null, created_by: 'u-aakash', created_at: iso(5, 9), updated_at: iso(5, 12) },
    // 6 — rejected
    { id: 'po-06', po_number: 'PO/26-27/0002', status: 'rejected', vendor_id: 'v-04', po_type_id: 'pt-capex', location_id: 'loc-ho', order_date: dateStr(-12), expected_date: null, reference: 'HPLC upgrade', tax_mode: 'igst', terms: app_settings[0].value.po_terms, notes: null, current_step: null, submitted_at: iso(12, 10), approved_at: null, sent_count: 0, last_sent_at: null, received_status: 'none', duplicated_from: null, created_by: 'u-sagar', created_at: iso(12, 9), updated_at: iso(11, 15) },
    // 7 — closed, fully received
    { id: 'po-07', po_number: 'PO/26-27/0001', status: 'closed', vendor_id: 'v-02', po_type_id: 'pt-pack', location_id: 'loc-ho', order_date: dateStr(-25), expected_date: dateStr(-15), reference: null, tax_mode: 'cgst_sgst', terms: app_settings[0].value.po_terms, notes: null, current_step: null, submitted_at: iso(25, 10), approved_at: iso(24, 9), sent_count: 1, last_sent_at: iso(24, 11), received_status: 'full', duplicated_from: null, created_by: 'u-sagar', created_at: iso(25, 9), updated_at: iso(14, 16) },
  ]

  const po_items = [
    { id: 'i-01a', po_id: 'po-01', position: 1, description: 'Printed mono cartons — Ashwagandha 60 caps (350gsm, matt lam)', hsn_code: '4819', qty: 5000, unit: 'nos', unit_price: 9.5, tax_pct: 18, received_qty: 0 },
    { id: 'i-01b', po_id: 'po-01', position: 2, description: 'Shipper boxes 5-ply (400×300×300mm)', hsn_code: '4819', qty: 300, unit: 'nos', unit_price: 42, tax_pct: 18, received_qty: 0 },

    { id: 'i-02a', po_id: 'po-02', position: 1, description: 'Ashwagandha root extract 5% withanolides (KSM grade)', hsn_code: '1302', qty: 200, unit: 'kg', unit_price: 2350, tax_pct: 18, received_qty: 0 },
    { id: 'i-02b', po_id: 'po-02', position: 2, description: 'Turmeric extract 95% curcuminoids', hsn_code: '1302', qty: 50, unit: 'kg', unit_price: 4100, tax_pct: 18, received_qty: 0 },

    { id: 'i-03a', po_id: 'po-03', position: 1, description: 'Halogen moisture analyzer MA-160 with dust cover', hsn_code: '9027', qty: 1, unit: 'nos', unit_price: 185000, tax_pct: 18, received_qty: 0 },
    { id: 'i-03b', po_id: 'po-03', position: 2, description: 'Calibration weights set (certified)', hsn_code: '9016', qty: 1, unit: 'set', unit_price: 12500, tax_pct: 18, received_qty: 0 },

    { id: 'i-04a', po_id: 'po-04', position: 1, description: 'Moringa leaf powder (food grade, 60 mesh)', hsn_code: '1211', qty: 500, unit: 'kg', unit_price: 310, tax_pct: 5, received_qty: 300 },
    { id: 'i-04b', po_id: 'po-04', position: 2, description: 'Amla powder (spray dried)', hsn_code: '1106', qty: 200, unit: 'kg', unit_price: 265, tax_pct: 5, received_qty: 200 },

    { id: 'i-05a', po_id: 'po-05', position: 1, description: 'Dedicated vehicle — Ludhiana ↔ Baddi, September (as per contract)', hsn_code: '9965', qty: 1, unit: 'service', unit_price: 38000, tax_pct: 0, received_qty: 0 },

    { id: 'i-06a', po_id: 'po-06', position: 1, description: 'HPLC column + autosampler upgrade kit', hsn_code: '9027', qty: 1, unit: 'set', unit_price: 264000, tax_pct: 18, received_qty: 0 },

    { id: 'i-07a', po_id: 'po-07', position: 1, description: 'HDPE jars 200cc with CRC caps (white)', hsn_code: '3923', qty: 10000, unit: 'nos', unit_price: 6.8, tax_pct: 18, received_qty: 10000 },
    { id: 'i-07b', po_id: 'po-07', position: 2, description: 'Induction sealing wads 63mm', hsn_code: '3923', qty: 10000, unit: 'nos', unit_price: 0.9, tax_pct: 18, received_qty: 10000 },
  ]

  const po_approval_steps = [
    { id: 's-02-1', po_id: 'po-02', position: 1, approver_id: 'u-sagar', status: 'pending', is_current: true, comment: null, acted_at: null },
    { id: 's-02-2', po_id: 'po-02', position: 2, approver_id: 'u-aakash', status: 'pending', is_current: false, comment: null, acted_at: null },

    { id: 's-03-1', po_id: 'po-03', position: 1, approver_id: 'u-sagar', status: 'approved', is_current: false, comment: 'Specs verified with QC', acted_at: iso(1, 9) },
    { id: 's-03-2', po_id: 'po-03', position: 2, approver_id: 'u-aakash', status: 'pending', is_current: true, comment: null, acted_at: null },

    { id: 's-04-1', po_id: 'po-04', position: 1, approver_id: 'u-sagar', status: 'approved', is_current: false, comment: null, acted_at: iso(8, 9) },
    { id: 's-04-2', po_id: 'po-04', position: 2, approver_id: 'u-aakash', status: 'approved', is_current: false, comment: 'Go ahead', acted_at: iso(8, 10) },

    { id: 's-05-1', po_id: 'po-05', position: 1, approver_id: 'u-sagar', status: 'approved', is_current: false, comment: null, acted_at: iso(5, 12) },

    { id: 's-06-1', po_id: 'po-06', position: 1, approver_id: 'u-sagar', status: 'approved', is_current: false, comment: null, acted_at: iso(12, 11) },
    { id: 's-06-2', po_id: 'po-06', position: 2, approver_id: 'u-aakash', status: 'rejected', is_current: false, comment: 'Defer to Q4 — cash flow. Re-quote after Diwali.', acted_at: iso(11, 15) },

    { id: 's-07-1', po_id: 'po-07', position: 1, approver_id: 'u-sagar', status: 'approved', is_current: false, comment: null, acted_at: iso(24, 9) },
  ]

  const po_events = [
    { id: 'e-01a', po_id: 'po-01', kind: 'created', actor_id: 'u-sagar', detail: {}, created_at: iso(0, 9) },

    { id: 'e-02a', po_id: 'po-02', kind: 'created', actor_id: 'u-sagar', detail: {}, created_at: iso(1, 15) },
    { id: 'e-02b', po_id: 'po-02', kind: 'submitted', actor_id: 'u-sagar', detail: { rule: 'Above ₹50,000 — two-step', steps: 2 }, created_at: iso(1, 16) },

    { id: 'e-03a', po_id: 'po-03', kind: 'created', actor_id: 'u-sagar', detail: {}, created_at: iso(2, 10) },
    { id: 'e-03b', po_id: 'po-03', kind: 'submitted', actor_id: 'u-sagar', detail: { rule: 'All Capex — Sagar then Aakash', steps: 2 }, created_at: iso(2, 11) },
    { id: 'e-03c', po_id: 'po-03', kind: 'approved_step', actor_id: 'u-sagar', detail: { step: 1, comment: 'Specs verified with QC' }, created_at: iso(1, 9) },

    { id: 'e-04a', po_id: 'po-04', kind: 'created', actor_id: 'u-sagar', detail: {}, created_at: iso(9, 11) },
    { id: 'e-04b', po_id: 'po-04', kind: 'submitted', actor_id: 'u-sagar', detail: { rule: 'Above ₹50,000 — two-step', steps: 2 }, created_at: iso(9, 12) },
    { id: 'e-04c', po_id: 'po-04', kind: 'approved_step', actor_id: 'u-sagar', detail: { step: 1 }, created_at: iso(8, 9) },
    { id: 'e-04d', po_id: 'po-04', kind: 'approved', actor_id: 'u-aakash', detail: { comment: 'Go ahead' }, created_at: iso(8, 10) },
    { id: 'e-04e', po_id: 'po-04', kind: 'sent', actor_id: 'u-sagar', detail: { to: 'sales@herboroots.in', subject: 'Purchase Order PO/26-27/0004 — Makams' }, created_at: iso(8, 11) },
    { id: 'e-04f', po_id: 'po-04', kind: 'sent', actor_id: 'u-sagar', detail: { to: 'sales@herboroots.in', cc: 'naresh.jain@herboroots.in', subject: 'Reminder: PO/26-27/0004' }, created_at: iso(4, 17) },
    { id: 'e-04g', po_id: 'po-04', kind: 'received', actor_id: 'u-priya', detail: { receipt_id: 'rc-01', invoice: 'HR/1129', lines: 2 }, created_at: iso(2, 12) },

    { id: 'e-05a', po_id: 'po-05', kind: 'created', actor_id: 'u-aakash', detail: {}, created_at: iso(5, 9) },
    { id: 'e-05b', po_id: 'po-05', kind: 'submitted', actor_id: 'u-aakash', detail: { rule: 'Routine purchases (up to ₹50,000)', steps: 1 }, created_at: iso(5, 10) },
    { id: 'e-05c', po_id: 'po-05', kind: 'approved', actor_id: 'u-sagar', detail: {}, created_at: iso(5, 12) },

    { id: 'e-06a', po_id: 'po-06', kind: 'created', actor_id: 'u-sagar', detail: {}, created_at: iso(12, 9) },
    { id: 'e-06b', po_id: 'po-06', kind: 'submitted', actor_id: 'u-sagar', detail: { rule: 'All Capex — Sagar then Aakash', steps: 2 }, created_at: iso(12, 10) },
    { id: 'e-06c', po_id: 'po-06', kind: 'approved_step', actor_id: 'u-sagar', detail: { step: 1 }, created_at: iso(12, 11) },
    { id: 'e-06d', po_id: 'po-06', kind: 'rejected', actor_id: 'u-aakash', detail: { step: 2, comment: 'Defer to Q4 — cash flow. Re-quote after Diwali.' }, created_at: iso(11, 15) },

    { id: 'e-07a', po_id: 'po-07', kind: 'created', actor_id: 'u-sagar', detail: {}, created_at: iso(25, 9) },
    { id: 'e-07b', po_id: 'po-07', kind: 'submitted', actor_id: 'u-sagar', detail: { rule: 'Above ₹50,000 — two-step', steps: 1 }, created_at: iso(25, 10) },
    { id: 'e-07c', po_id: 'po-07', kind: 'approved', actor_id: 'u-sagar', detail: {}, created_at: iso(24, 9) },
    { id: 'e-07d', po_id: 'po-07', kind: 'sent', actor_id: 'u-sagar', detail: { to: 'ravi@shaktipack.com', subject: 'Purchase Order PO/26-27/0001 — Makams' }, created_at: iso(24, 11) },
    { id: 'e-07e', po_id: 'po-07', kind: 'received', actor_id: 'u-priya', detail: { receipt_id: 'rc-02', invoice: 'SP/2201', lines: 2 }, created_at: iso(15, 12) },
    { id: 'e-07f', po_id: 'po-07', kind: 'closed', actor_id: 'u-sagar', detail: {}, created_at: iso(14, 16) },
  ]

  const receipts = [
    { id: 'rc-01', po_id: 'po-04', received_date: dateStr(-2), invoice_number: 'HR/1129', invoice_date: dateStr(-3), notes: 'Balance moringa expected next week', created_by: 'u-priya', created_at: iso(2, 12) },
    { id: 'rc-02', po_id: 'po-07', received_date: dateStr(-15), invoice_number: 'SP/2201', invoice_date: dateStr(-16), notes: null, created_by: 'u-priya', created_at: iso(15, 12) },
  ]

  const receipt_items = [
    { id: 'ri-01a', receipt_id: 'rc-01', po_item_id: 'i-04a', qty: 300, remarks: null },
    { id: 'ri-01b', receipt_id: 'rc-01', po_item_id: 'i-04b', qty: 200, remarks: '2 bags slightly damp — accepted after QC check' },
    { id: 'ri-02a', receipt_id: 'rc-02', po_item_id: 'i-07a', qty: 10000, remarks: null },
    { id: 'ri-02b', receipt_id: 'rc-02', po_item_id: 'i-07b', qty: 10000, remarks: null },
  ]

  return {
    app_users, app_settings, people, person_documents, upload_links,
    checklist_templates, checklist_template_items, person_checklists, person_checklist_items,
    learnapp_actions, sheet_sync_log,
    po_types, delivery_locations, vendors, approval_rules, approval_rule_steps,
    purchase_orders, po_items, po_approval_steps, po_events, receipts, receipt_items,
    _po_counter: 7,
  }
}
