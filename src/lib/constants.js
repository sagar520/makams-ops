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

export const PEOPLE_STATUS = [
  { value: 'candidate', label: 'Candidate', tone: 'blue' },
  { value: 'active', label: 'Active', tone: 'green' },
  { value: 'exited', label: 'Exited', tone: 'gray' },
  { value: 'not_joined', label: 'Not joined', tone: 'amber' },
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
