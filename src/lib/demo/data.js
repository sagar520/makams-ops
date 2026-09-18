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
      key: 'employee_sheet',
      value: { sheet_id: '1LjZIDyXeDG2pEiS2KGSj8l2Ts-GMwNGAJ1eoFON3Kzc', tab: 'Master Sheet' },
      updated_at: iso(1),
    },
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

  const sales = (o) => ({ department: 'Sales', state: 'Punjab', ...o })
  const people = [
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-01', emp_code: 'RM001', full_name: 'Deepak Verma', status: 'active', sales_role: 'rsm', hq_name: 'Ludhiana', asm_name: null, rsm_name: null, employment_type: 'full_time', date_of_join: '2023-04-10', personal_email: 'deepak.v@gmail.com', phone: '+919811022331', monthly_gross: 65000, learnapp_user_id: 'lu-01', learnapp_email: 'rm001@example.com', learnapp_status: 'active', created_at: iso(88) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-02', emp_code: 'ASM001', full_name: 'Sunita Kaur', status: 'active', sales_role: 'asm', hq_name: 'Ludhiana', asm_name: null, rsm_name: 'Deepak Verma', employment_type: 'full_time', date_of_join: '2023-08-01', personal_email: 'sunita.k@gmail.com', phone: '+919822011445', monthly_gross: 48000, learnapp_user_id: 'lu-02', learnapp_email: 'asm001@example.com', learnapp_status: 'active', created_at: iso(88) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-03', emp_code: 'ASM002', full_name: 'Manpreet Singh', status: 'active', sales_role: 'asm', hq_name: 'Jalandhar', asm_name: null, rsm_name: 'Deepak Verma', employment_type: 'full_time', date_of_join: '2024-01-15', phone: '+919779055662', monthly_gross: 45000, learnapp_user_id: 'lu-03', learnapp_status: 'active', created_at: iso(80) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-04', emp_code: 'SALES001', full_name: 'Arvind Kumar', status: 'active', sales_role: 'sales', hq_name: 'Ludhiana', asm_name: 'Sunita Kaur', rsm_name: 'Deepak Verma', employment_type: 'full_time', date_of_join: '2024-09-20', phone: '+919654033217', monthly_gross: 26000, learnapp_user_id: 'lu-05', learnapp_email: 'sales001@example.com', learnapp_status: 'active', created_at: iso(70) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-05', emp_code: 'SALES002', full_name: 'Ritu Sharma', status: 'active', sales_role: 'sales', hq_name: 'Khanna', asm_name: 'Sunita Kaur', rsm_name: 'Deepak Verma', employment_type: 'full_time', date_of_join: '2025-02-11', personal_email: 'ritu.s@gmail.com', phone: '+919953088112', monthly_gross: 25000, created_at: iso(60) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-06', emp_code: 'SALES003', full_name: 'Gurpreet Gill', status: 'active', sales_role: 'sales', hq_name: 'Jalandhar', asm_name: 'Manpreet Singh', rsm_name: 'Deepak Verma', employment_type: 'full_time', date_of_join: '2025-07-01', phone: '+919876144990', monthly_gross: 22000, created_at: iso(50) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-07', emp_code: 'SALES004', full_name: 'Karan Mehra', status: 'active', sales_role: 'sales', hq_name: 'Amritsar', asm_name: 'Manpreet Singh', rsm_name: 'Deepak Verma', employment_type: 'full_time', date_of_join: '2025-08-18', personal_email: 'karan.mehra@gmail.com', phone: '+919910022334', monthly_gross: 24000, created_at: iso(45) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-08', emp_code: 'SALES005', full_name: 'Meena Devi', status: 'active', sales_role: 'sales', hq_name: 'Patiala', asm_name: 'Sunita Kaur', rsm_name: 'Deepak Verma', employment_type: 'contract', date_of_join: '2025-11-03', phone: '+919780012034', monthly_gross: 20000, created_at: iso(42) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-09', emp_code: 'SALES006', full_name: 'Vikram Rathi', status: 'active', sales_role: 'sales', hq_name: 'Bathinda', asm_name: 'Sunita Kaur', rsm_name: 'Deepak Verma', employment_type: 'full_time', date_of_join: dateStr(-6), personal_email: 'vikram.rathi@gmail.com', phone: '+919899566778', monthly_gross: 24000, created_at: iso(12) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-10', emp_code: null, full_name: 'Neha Malhotra', status: 'joining', sales_role: 'sales', hq_name: 'Ludhiana', asm_name: 'Sunita Kaur', rsm_name: 'Deepak Verma', personal_email: 'neha.malhotra11@gmail.com', phone: '+919811190233', monthly_gross: 23000, notes: 'Offer accepted, joining 1st Oct.', created_at: iso(9) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-11', emp_code: null, full_name: 'Tarun Sethi', status: 'joining', sales_role: 'sales', hq_name: 'Jalandhar', asm_name: 'Manpreet Singh', rsm_name: 'Deepak Verma', personal_email: 'tarun.sethi@outlook.com', phone: '+919988766554', monthly_gross: 25000, notes: 'Final round cleared, docs pending.', created_at: iso(4) }),
    sales({ sbu_head_name: 'Aakash Agarwal', id: 'p-12', emp_code: 'SALES000', full_name: 'Suresh Pillai', status: 'exited', sales_role: 'sales', hq_name: 'Ludhiana', asm_name: 'Sunita Kaur', rsm_name: 'Deepak Verma', employment_type: 'full_time', date_of_join: '2022-11-01', date_of_exit: dateStr(-40), exit_reason: 'Relocated to Kochi', learnapp_user_id: 'lu-12', learnapp_email: 'sales000@example.com', learnapp_status: 'disabled', created_at: iso(89) }),
  ]

  const person_documents = [
    { id: 'd-01', person_id: 'p-10', doc_type: 'pan', file_path: null, file_name: 'PAN_Neha.pdf', mime_type: 'application/pdf', status: 'verified', source: 'employee', uploaded_at: iso(6), verified_by: 'u-priya', verified_at: iso(5), created_at: iso(6) },
    { id: 'd-02', person_id: 'p-10', doc_type: 'aadhaar', file_path: null, file_name: 'Aadhaar_Neha.pdf', mime_type: 'application/pdf', status: 'uploaded', source: 'employee', uploaded_at: iso(6), created_at: iso(6) },
    { id: 'd-03', person_id: 'p-10', doc_type: 'bank_proof', file_path: null, file_name: 'cancelled_cheque.jpg', mime_type: 'image/jpeg', status: 'uploaded', source: 'employee', uploaded_at: iso(5), created_at: iso(5) },
    { id: 'd-04', person_id: 'p-09', doc_type: 'offer_letter', file_path: null, file_name: 'Offer_Vikram_signed.pdf', mime_type: 'application/pdf', status: 'verified', source: 'hr', uploaded_at: iso(11), verified_by: 'u-priya', verified_at: iso(11), created_at: iso(11) },
    { id: 'd-05', person_id: 'p-01', doc_type: 'pan', file_path: null, file_name: 'PAN_Deepak.pdf', mime_type: 'application/pdf', status: 'verified', source: 'hr', uploaded_at: iso(80), verified_at: iso(80), created_at: iso(80) },
  ]

  const upload_links = []

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

  // ---------- candidate database & forms ----------

  const form_templates = [
    {
      id: 'ft-referral', name: 'Candidate referral form',
      description: null,
      kind: 'referral', active: true, created_at: iso(30), updated_at: iso(30), fields: [],
    },
    {
      id: 'ft-intake', name: 'Candidate intake form',
      description: 'Share this with industry sources to add candidates to the Makams talent pool.',
      kind: 'general', active: true, created_at: iso(20), updated_at: iso(20),
      fields: [
        { key: 'full_name', label: 'Candidate full name', type: 'text', required: true, options: [], map_to: 'full_name' },
        { key: 'title', label: 'Current title / role', type: 'text', required: false, options: [], map_to: 'title' },
        { key: 'organization', label: 'Current organisation', type: 'text', required: false, options: [], map_to: 'organization' },
        { key: 'email', label: 'Email', type: 'email', required: false, options: [], map_to: 'email' },
        { key: 'phone', label: 'Phone', type: 'phone', required: true, options: [], map_to: 'phone' },
        { key: 'location', label: 'Location', type: 'text', required: false, options: [], map_to: 'location' },
        { key: 'experience_years', label: 'Total experience (years)', type: 'number', required: false, options: [], map_to: null },
        { key: 'resume', label: 'Resume (PDF)', type: 'file', required: false, options: [], map_to: 'resume' },
        { key: 'notes', label: 'Anything we should know', type: 'textarea', required: false, options: [], map_to: 'notes' },
      ],
    },
    {
      id: 'ft-feedback', name: 'Interview feedback',
      description: 'Filled by the interviewer after each round.',
      kind: 'general', active: true, created_at: iso(15), updated_at: iso(15),
      fields: [
        { key: 'candidate_name', label: 'Candidate name', type: 'text', required: true, options: [], map_to: null },
        { key: 'interviewer', label: 'Interviewer', type: 'text', required: true, options: [], map_to: null },
        { key: 'round', label: 'Round', type: 'select', required: true, options: ['Screening call', 'Technical', 'Final'], map_to: null },
        { key: 'rating', label: 'Overall rating', type: 'select', required: true, options: ['1 - No', '2 - Weak', '3 - OK', '4 - Good', '5 - Strong hire'], map_to: null },
        { key: 'comments', label: 'Comments', type: 'textarea', required: false, options: [], map_to: null },
      ],
    },
  ]

  const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString()

  const form_links = [
    { id: 'fl-01', form_id: 'ft-referral', token: 'demo-source-ramesh', source_name: 'Ramesh Kumar (TalentBridge)', active: true, expires_at: inDays(5), referrer_name: 'Ramesh Kumar (TalentBridge)', referrer_emp_id: null, referrer_phone: '+919815000110', submission_count: 2, created_by: 'u-priya', created_at: iso(2) },
    { id: 'fl-02', form_id: 'ft-referral', token: 'demo-team-referrals', source_name: 'Deepak Verma', active: true, expires_at: inDays(6), referrer_name: 'Deepak Verma', referrer_emp_id: 'RM001', referrer_phone: '+919811022331', submission_count: 2, created_by: 'u-priya', created_at: iso(1) },
    { id: 'fl-03', form_id: 'ft-referral', token: 'demo-expired-link', source_name: 'Campus cell — GNDU Amritsar', active: true, expires_at: iso(3), referrer_name: null, referrer_emp_id: null, referrer_phone: null, submission_count: 1, created_by: 'u-priya', created_at: iso(10) },
  ]

  const form_responses = [
    // fr-03 appended below via form_responses_extra
    { id: 'fr-01', form_id: 'ft-referral', link_id: 'fl-01', answers: { referrer: { name: 'Ramesh Kumar (TalentBridge)', emp_id: null, phone: '+919815000110' }, candidates: [{ name: 'Ankit Malhotra', designation: 'Sales Officer', area: 'Ludhiana', current_company: 'Patanjali Foods', phone: '+919812344556' }, { name: 'Shreya Iyer', designation: 'Territory Manager', area: 'Chandigarh', current_company: 'Himalaya Wellness', phone: '+919988011223' }] }, files: [], candidate_id: 'c-01', created_at: iso(16) },
    { id: 'fr-02', form_id: 'ft-referral', link_id: 'fl-02', answers: { referrer: { name: 'Deepak Verma', emp_id: 'RM001', phone: '+919811022331' }, candidates: [{ name: 'Harjinder Pal', designation: 'Senior Sales Executive', area: 'Mohali', current_company: 'Chandigarh Botanicals', phone: '+919876120034' }, { name: 'Mohit Saini', designation: 'Field Sales Executive', area: 'Ludhiana', current_company: 'Local distributor', phone: '+919711088996' }] }, files: [], candidate_id: 'c-03', created_at: iso(25) },
  ]

  const candidates = [
    { id: 'c-01', full_name: 'Ankit Malhotra', designation: 'Sales Officer', area: 'Ludhiana', current_company: 'Patanjali Foods', phone: '+919812344556', email: null, referred_by_name: 'Ramesh Kumar (TalentBridge)', referrer_emp_id: null, source: 'Consultant Ramesh — TalentBridge', link_id: 'fl-01', response_id: 'fr-01', hr_comment: 'Strong FMCG channel experience. Call scheduled Friday.', picked_at: iso(3), prospective_id: 'pr-01', status: 'new', extra: {}, created_by: 'u-priya', created_at: iso(16), updated_at: iso(3) },
    { id: 'c-02', full_name: 'Shreya Iyer', designation: 'Territory Manager', area: 'Chandigarh', current_company: 'Himalaya Wellness', phone: '+919988011223', email: null, referred_by_name: 'Ramesh Kumar (TalentBridge)', referrer_emp_id: null, source: 'Consultant Ramesh — TalentBridge', link_id: 'fl-01', response_id: 'fr-01', hr_comment: null, picked_at: null, prospective_id: null, status: 'new', extra: {}, created_by: 'u-priya', created_at: iso(16), updated_at: iso(16) },
    { id: 'c-03', full_name: 'Harjinder Pal', designation: 'Senior Sales Executive', area: 'Mohali', current_company: 'Chandigarh Botanicals', phone: '+919876120034', email: null, referred_by_name: 'Deepak Verma', referrer_emp_id: 'RM001', source: 'Employee referral', link_id: 'fl-02', response_id: 'fr-02', hr_comment: 'Knows the ayurvedic distributor network well.', picked_at: iso(2), prospective_id: 'pr-02', status: 'new', extra: {}, created_by: 'u-priya', created_at: iso(25), updated_at: iso(2) },
    { id: 'c-04', full_name: 'Nikita Rao', designation: 'Sales Trainee', area: 'Patiala', current_company: 'Fresher (MBA)', phone: '+919008033445', email: null, referred_by_name: 'Campus cell — GNDU', referrer_emp_id: null, source: 'Campus cell — GNDU Amritsar', link_id: null, response_id: null, hr_comment: null, picked_at: null, prospective_id: null, status: 'new', extra: {}, created_by: 'u-priya', created_at: iso(2), updated_at: iso(2) },
    { id: 'c-05', full_name: 'Mohit Saini', designation: 'Field Sales Executive', area: 'Ludhiana', current_company: 'Local distributor', phone: '+919711088996', email: null, referred_by_name: 'Deepak Verma', referrer_emp_id: 'RM001', source: 'Employee referral', link_id: 'fl-02', response_id: 'fr-02', hr_comment: 'Available immediately', picked_at: null, prospective_id: null, status: 'new', extra: {}, created_by: 'u-priya', created_at: iso(25), updated_at: iso(6) },
    { id: 'c-06', full_name: 'Divya Kapoor', designation: 'Area Sales Manager', area: 'Amritsar', current_company: 'OmniActive Health', phone: '+919822055667', email: null, referred_by_name: 'LinkedIn outreach', referrer_emp_id: null, source: 'LinkedIn outreach', link_id: null, response_id: null, hr_comment: 'Too senior for current openings — keep warm.', picked_at: null, prospective_id: null, status: 'new', extra: {}, created_by: 'u-priya', created_at: iso(40), updated_at: iso(20) },
    { id: 'c-07', full_name: 'Rakesh Yadav', designation: 'Sales Executive', area: 'Jalandhar', current_company: 'AmbeAgro', phone: '+919650077881', email: null, referred_by_name: 'Manpreet Singh', referrer_emp_id: 'ASM002', source: 'Employee referral', link_id: 'fl-02', response_id: null, hr_comment: 'Salary expectation above band.', picked_at: null, prospective_id: null, status: 'new', extra: {}, created_by: 'u-priya', created_at: iso(30), updated_at: iso(22) },
    { id: 'c-08', full_name: 'Pooja Bhatt', designation: 'Sales Coordinator', area: 'Khanna', current_company: 'NutraLab India', phone: '+919899122110', email: null, referred_by_name: 'Ramesh Kumar (TalentBridge)', referrer_emp_id: null, source: 'Consultant Ramesh — TalentBridge', link_id: 'fl-01', response_id: null, hr_comment: 'Revisit when Khanna HQ opens.', picked_at: null, prospective_id: null, status: 'new', extra: {}, created_by: 'u-priya', created_at: iso(35), updated_at: iso(20) },
  ]

  const prospectives = [
    { id: 'pr-01', cv_no: 'MI0001', division: 'Cattle', full_name: 'Ankit Malhotra', designation: 'Sales Officer', area: 'Ludhiana', contact: '+919812344556', source: 'Internal Referral', resume_path: 'pr-01/seed_ankit_malhotra_cv.pdf', resume_name: 'Ankit_Malhotra_CV.pdf', department: 'Sales', contact2: '+919815001122', email: 'ankit.malhotra@example.com', reference: 'Deepak Verma (RM001)', test_score: '21/25', stage_mail: 'Sent', stage_manager: 'Cleared', stage_hr: 'Scheduled', stage_final: 'Pending', comment: 'Strong channel experience. HR round on Friday.', last_salary: 42000, expected_inhand: 52000, old_inhand: 40000, inhand_monthly: 48000, gross_monthly: 55000, ctc_annual: 720000, status: 'interview_scheduled', candidate_id: 'c-01', created_by: 'u-priya', created_at: iso(3), updated_at: iso(1) },
    { id: 'pr-02', cv_no: 'MI0002', division: 'Cattle', full_name: 'Harjinder Pal', designation: 'Senior Sales Executive', area: 'Mohali', contact: '+919876120034', source: 'Internal Referral', department: 'Sales', status: 'offer_letter_sent', candidate_id: 'c-03', created_by: 'u-priya', created_at: iso(2), updated_at: iso(1) },
    { id: 'pr-03', cv_no: 'MI0003', division: 'Poultry', full_name: 'Sandeep Walia', designation: 'Sales Rep', area: 'Bathinda', contact: '+919855210394', source: 'LI / Indeed', department: 'Sales', status: 'contacted', candidate_id: null, created_by: 'u-priya', created_at: iso(8), updated_at: iso(5) },
    { id: 'pr-04', cv_no: 'MI0004', division: 'Cattle', full_name: 'Jaspreet Brar', designation: 'Sales Rep', area: 'Moga', contact: '+919780644121', source: 'LI / Indeed', department: 'PMT', status: 'new', candidate_id: null, created_by: 'u-priya', created_at: iso(1), updated_at: iso(1) },
    { id: 'pr-05', cv_no: 'MI0005', division: 'HO', full_name: 'Ramanpreet Kaur', designation: 'Territory Manager', area: 'Amritsar', contact: 'raman.k@gmail.com', source: 'Other', department: 'Marketing', status: 'interested', candidate_id: null, created_by: 'u-priya', created_at: iso(12), updated_at: iso(6) },
    { id: 'pr-06', cv_no: 'MI0006', division: 'Poultry', full_name: 'Vikram Rathi', designation: 'Sales Rep', area: 'Bathinda', contact: '+919899566778', source: 'LI / Indeed', department: 'Sales', status: 'joined', doj: dateStr(-10), emp_code: 'VSO118', inhand_monthly: 38000, gross_monthly: 44000, ctc_annual: 560000, candidate_id: null, created_by: 'u-priya', created_at: iso(30), updated_at: iso(11) },
    { id: 'pr-07', cv_no: 'MI0007', division: 'Cattle', full_name: 'Sahil Chopra', designation: 'Sales Rep', area: 'Ludhiana', contact: '+919914587230', source: 'Other', department: 'Doctor', status: 'rejected', candidate_id: null, created_by: 'u-priya', created_at: iso(22), updated_at: iso(15) },
  ]

  const form_responses_extra = { id: 'fr-03', form_id: 'ft-referral', link_id: 'fl-01', answers: { referrer: { name: 'Ramesh Kumar (TalentBridge)', emp_id: null, phone: '+919815000110' }, candidates: [{ name: 'Gaurav Nanda', designation: 'Sales Officer', area: 'Patiala', current_company: 'Dabur (distributor)', phone: '+919870045612' }, { name: 'Simarjit Dhillon', designation: 'Sales Rep', area: 'Moga', current_company: 'Local FMCG stockist', phone: '+919791033445' }] }, files: [], candidate_id: null, created_at: iso(1) }

  const referral_submissions = [
    { id: 'rs-01', response_id: 'fr-03', link_id: 'fl-01', source: 'Consultant Ramesh — TalentBridge', referred_by_name: 'Ramesh Kumar (TalentBridge)', referrer_emp_id: null, referrer_phone: '+919815000110', full_name: 'Gaurav Nanda', designation: 'Sales Officer', area: 'Patiala', current_company: 'Dabur (distributor)', phone: '+919870045612', status: 'pending', candidate_id: null, reviewed_by: null, reviewed_at: null, created_at: iso(1), updated_at: iso(1) },
    { id: 'rs-02', response_id: 'fr-03', link_id: 'fl-01', source: 'Consultant Ramesh — TalentBridge', referred_by_name: 'Ramesh Kumar (TalentBridge)', referrer_emp_id: null, referrer_phone: '+919815000110', full_name: 'Simarjit Dhillon', designation: 'Sales Rep', area: 'Moga', current_company: 'Local FMCG stockist', phone: '+919791033445', status: 'pending', candidate_id: null, reviewed_by: null, reviewed_at: null, created_at: iso(1), updated_at: iso(1) },
    { id: 'rs-03', response_id: 'fr-02', link_id: 'fl-02', source: 'Employee referral', referred_by_name: 'Deepak Verma', referrer_emp_id: 'RM001', referrer_phone: '+919811022331', full_name: 'Harjinder Pal', designation: 'Senior Sales Executive', area: 'Mohali', current_company: 'Chandigarh Botanicals', phone: '+919876120034', status: 'approved', candidate_id: 'c-03', reviewed_by: 'u-priya', reviewed_at: iso(24), created_at: iso(25), updated_at: iso(24) },
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
    { id: 'v-01', name: 'Herbo Roots Agro LLP', contact_name: 'Naresh Jain', email: 'sales@herboroots.in', phone: '+919815022110', gstin: '03AAFFH8899Q1ZC', address: 'GT Road, Khanna', city: 'Khanna', state: 'Punjab', pincode: '141401', payment_terms: '30 days from invoice', active: true, created_at: iso(85), updated_at: iso(85) },
    { id: 'v-02', name: 'Shakti Packagers', contact_name: 'Ravi Gupta', email: 'ravi@shaktipack.com', phone: '+919872066554', gstin: '03ABBPS4321L1ZP', address: 'Focal Point Phase 5', city: 'Ludhiana', state: 'Punjab', pincode: '141010', payment_terms: '15 days', active: true, created_at: iso(84), updated_at: iso(84) },
    { id: 'v-03', name: 'Phyto Extracts India Pvt Ltd', contact_name: 'Dr. S. Reddy', email: 'orders@phytoextracts.co.in', phone: '+919000012345', gstin: '36AAACP9988K1Z2', address: 'IDA Jeedimetla', city: 'Hyderabad', state: 'Telangana', pincode: '500055', payment_terms: '50% advance, 50% on delivery', active: true, created_at: iso(70), updated_at: iso(70) },
    { id: 'v-04', name: 'LabCare Instruments', contact_name: 'Mohit Arora', email: 'mohit@labcare.in', phone: '+919810077332', gstin: '07AABCL5566M1ZN', address: 'Wazirpur Industrial Area', city: 'New Delhi', state: 'Delhi', pincode: '110052', payment_terms: '100% against proforma', active: true, created_at: iso(60), updated_at: iso(60) },
    { id: 'v-05', name: 'Om Logistics & Services', contact_name: 'Baljit Singh', email: 'baljit@omlogistics.example', phone: '+919781022446', gstin: '03AACCO7788B1ZF', address: 'Transport Nagar', city: 'Ludhiana', state: 'Punjab', pincode: '141003', payment_terms: 'Monthly billing', active: true, created_at: iso(55), updated_at: iso(55) },
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
    learnapp_actions,
    candidates, prospectives, form_templates, form_links,
    form_responses: [...form_responses, form_responses_extra],
    referral_submissions,
    po_types, delivery_locations, vendors, approval_rules, approval_rule_steps,
    purchase_orders, po_items, po_approval_steps, po_events, receipts, receipt_items,
    _po_counter: 7,
  }
}
