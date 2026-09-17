export const ROLES = [
  { value: 'admin', label: 'Admin', hint: 'Everything, including settings' },
  { value: 'hr', label: 'HR', hint: 'Employees, documents, checklists, learnapp' },
  { value: 'purchase', label: 'Purchase', hint: 'Vendors, POs, receiving' },
  { value: 'approver', label: 'Approver', hint: 'Can approve POs assigned to them' },
]

export const DOC_TYPES = [
  { value: 'photo', label: 'Passport photo' },
  { value: 'aadhaar', label: 'Aadhaar card' },
  { value: 'pan', label: 'PAN card' },
  { value: 'bank_proof', label: 'Bank proof (cancelled cheque / passbook)' },
  { value: 'education', label: 'Education certificates' },
  { value: 'experience', label: 'Experience / relieving letter' },
  { value: 'salary_slips', label: 'Previous salary slips' },
  { value: 'address_proof', label: 'Address proof' },
  { value: 'offer_letter', label: 'Signed offer letter' },
  { value: 'resignation', label: 'Resignation letter' },
  { value: 'other', label: 'Other' },
]

export const docTypeLabel = (v) => DOC_TYPES.find((d) => d.value === v)?.label || v

export const PROFILE_FIELDS = [
  { value: 'personal_email', label: 'Personal email' },
  { value: 'phone', label: 'Phone' },
  { value: 'alt_phone', label: 'Alternate phone' },
  { value: 'date_of_birth', label: 'Date of birth', type: 'date' },
  { value: 'blood_group', label: 'Blood group' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'pincode', label: 'PIN code' },
  { value: 'emergency_contact_name', label: 'Emergency contact name' },
  { value: 'emergency_contact_phone', label: 'Emergency contact phone' },
  { value: 'pan_number', label: 'PAN number' },
  { value: 'aadhaar_number', label: 'Aadhaar number' },
  { value: 'uan_number', label: 'UAN (PF) number' },
  { value: 'bank_name', label: 'Bank name' },
  { value: 'bank_account', label: 'Bank account number' },
  { value: 'bank_ifsc', label: 'Bank IFSC' },
]

export const profileFieldLabel = (v) => PROFILE_FIELDS.find((f) => f.value === v)?.label || v

export const SALES_ROLES = [
  { value: 'sales', label: 'Sales Rep' },
  { value: 'asm', label: 'ASM (Area Sales Manager)' },
  { value: 'rsm', label: 'RSM (Regional Sales Manager)' },
  { value: 'head_office', label: 'Head Office' },
]

export const salesRoleLabel = (v) => ({ sales: 'Sales Rep', asm: 'ASM', rsm: 'RSM', head_office: 'Head Office' }[v] || v || '—')

export const PEOPLE_STATUS = [
  { value: 'joining', label: 'Joining soon', tone: 'blue' },
  { value: 'active', label: 'Active', tone: 'green' },
  { value: 'exited', label: 'Exited', tone: 'gray' },
  { value: 'not_joined', label: 'Not joined', tone: 'amber' },
]

export const PROSPECTIVE_STATUS = [
  { value: 'new', label: 'New', tone: 'blue' },
  { value: 'contacted', label: 'Contacted', tone: 'indigo' },
  { value: 'interested', label: 'Interested', tone: 'violet' },
  { value: 'interview_scheduled', label: 'Interview Scheduled', tone: 'amber' },
  { value: 'offer_letter_sent', label: 'Offer Letter Sent', tone: 'green' },
  { value: 'joined', label: 'Joined', tone: 'green' },
  { value: 'rejected', label: 'Rejected', tone: 'red' },
]

export const prospectiveStatusMeta = (v) => PROSPECTIVE_STATUS.find((s) => s.value === v) || { label: v, tone: 'gray' }

export const CANDIDATE_STATUS = [
  { value: 'new', label: 'New', tone: 'blue' },
  { value: 'screening', label: 'Screening', tone: 'indigo' },
  { value: 'interview', label: 'Interview', tone: 'violet' },
  { value: 'offer', label: 'Offer', tone: 'amber' },
  { value: 'hired', label: 'Hired', tone: 'green' },
  { value: 'rejected', label: 'Rejected', tone: 'red' },
  { value: 'on_hold', label: 'On hold', tone: 'gray' },
]

export const candidateStatusMeta = (v) => CANDIDATE_STATUS.find((s) => s.value === v) || { label: v, tone: 'gray' }

export const FORM_FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Paragraph' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'file', label: 'File upload' },
]

export const FORM_MAP_TO = [
  { value: '', label: 'Nothing (stored with the response only)' },
  { value: 'full_name', label: 'Candidate name' },
  { value: 'title', label: 'Title / role' },
  { value: 'organization', label: 'Organisation' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'location', label: 'Location' },
  { value: 'notes', label: 'Notes' },
  { value: 'resume', label: 'Resume (file fields only)' },
]

export const peopleStatusMeta = (v) => PEOPLE_STATUS.find((s) => s.value === v) || { label: v, tone: 'gray' }

export const PO_STATUS = {
  draft: { label: 'Draft', tone: 'gray' },
  pending_approval: { label: 'Pending approval', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
  closed: { label: 'Closed', tone: 'slate' },
}

export const RECEIVED_STATUS = {
  none: { label: 'Not received', tone: 'gray' },
  partial: { label: 'Partially received', tone: 'amber' },
  full: { label: 'Received in full', tone: 'green' },
}

export const UNITS = ['nos', 'kg', 'g', 'mt', 'ltr', 'ml', 'box', 'pkt', 'roll', 'set', 'pair', 'mtr', 'sqft', 'hrs', 'service']

export const GST_RATES = [0, 5, 12, 18, 28]
