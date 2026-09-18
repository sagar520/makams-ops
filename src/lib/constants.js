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
  { value: 'sales', label: 'Sales Rep (VSO / ASO)' },
  { value: 'asm', label: 'Sales Manager (ASM / DRSM)' },
  { value: 'rsm', label: 'Regional Manager (RSM / AGM)' },
  { value: 'head_office', label: 'Head Office' },
]

export const salesRoleLabel = (v) =>
  ({ sales: 'Sales Rep', asm: 'Sales Manager', rsm: 'Regional Manager', head_office: 'Head Office' }[v] || v || '—')

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

// Each stage gets its own hue so the sheet reads at a glance:
// blue → indigo → violet → orange → green, with red for rejected.
// The dropdown carries the strongest version of the colour.
export const PROSPECTIVE_STATUS_CLS = {
  new: 'border-blue-500 bg-blue-200 text-blue-950 font-semibold',
  contacted: 'border-indigo-500 bg-indigo-200 text-indigo-950 font-semibold',
  interested: 'border-violet-500 bg-violet-200 text-violet-950 font-semibold',
  interview_scheduled: 'border-orange-500 bg-orange-200 text-orange-950 font-semibold',
  offer_letter_sent: 'border-emerald-500 bg-emerald-200 text-emerald-950 font-semibold',
  joined: 'border-emerald-700 bg-emerald-600 text-white font-semibold',
  rejected: 'border-red-500 bg-red-200 text-red-950 font-semibold',
}

// row tint — the same hues a couple of shades lighter, a bold stripe
// down the left edge, and the row's own text in the matching colour
export const PROSPECTIVE_ROW_CLS = {
  new: 'border-l-4 border-l-blue-600 bg-blue-100 text-blue-950 hover:bg-blue-200',
  contacted: 'border-l-4 border-l-indigo-600 bg-indigo-100 text-indigo-950 hover:bg-indigo-200',
  interested: 'border-l-4 border-l-violet-600 bg-violet-100 text-violet-950 hover:bg-violet-200',
  interview_scheduled: 'border-l-4 border-l-orange-600 bg-orange-100 text-orange-950 hover:bg-orange-200',
  offer_letter_sent: 'border-l-4 border-l-emerald-600 bg-emerald-100 text-emerald-950 hover:bg-emerald-200',
  joined: 'border-l-4 border-l-emerald-800 bg-emerald-200 text-emerald-950 hover:bg-emerald-300',
  rejected: 'border-l-4 border-l-red-600 bg-red-100 text-red-950 hover:bg-red-200',
}

export const PROSPECTIVE_DEPARTMENTS = ['Sales', 'PMT', 'Marketing', 'Doctor', 'Other HO Functions', 'Other']

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
