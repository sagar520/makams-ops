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
  { value: 'new', label: 'New', tone: 'gray' },
  { value: 'contacted', label: 'Contacted', tone: 'indigo' },
  { value: 'interested', label: 'Interested', tone: 'violet' },
  { value: 'interview_scheduled', label: 'Interview Scheduled', tone: 'red' },
  { value: 'offer_letter_sent', label: 'Offer Letter Sent', tone: 'red' },
  { value: 'joined', label: 'Joined', tone: 'blue' },
  { value: 'rejected', label: 'Rejected', tone: 'gray' },
]

export const prospectiveStatusMeta = (v) => PROSPECTIVE_STATUS.find((s) => s.value === v) || { label: v, tone: 'gray' }

// The pipeline reads as a ramp: neutral at the start, deepening red as it
// warms up, black once they've joined, and faded out when rejected.
export const PROSPECTIVE_STATUS_CLS = {
  new: 'border-slate-300 bg-white text-slate-700',
  contacted: 'border-red-200 bg-red-50 text-red-800',
  interested: 'border-red-300 bg-red-100 text-red-900',
  interview_scheduled: 'border-red-400 bg-red-200 text-red-900',
  offer_letter_sent: 'border-red-600 bg-red-600 text-white',
  joined: 'border-slate-900 bg-slate-900 text-white',
  rejected: 'border-slate-200 bg-slate-100 text-slate-400',
}

// row tint — the same ramp, a few shades lighter
export const PROSPECTIVE_ROW_CLS = {
  new: 'bg-white hover:bg-slate-50',
  contacted: 'bg-red-50/50 hover:bg-red-50',
  interested: 'bg-red-50 hover:bg-red-100/70',
  interview_scheduled: 'bg-red-100/70 hover:bg-red-100',
  offer_letter_sent: 'bg-red-100 hover:bg-red-200/70',
  joined: 'bg-slate-100 hover:bg-slate-200/70',
  rejected: 'bg-slate-50/70 hover:bg-slate-100',
}

export const PROSPECTIVE_SOURCES = ['LI / Indeed', 'Internal Referral', 'Other']

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
