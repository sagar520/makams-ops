import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, callFunction } from '../../lib/supabase'
import { PageHeader, Card, Button, Input, Select, Textarea, Field, FullPageSpinner, useToast } from '../../components/ui'
import { PEOPLE_STATUS } from '../../lib/constants'

const EMPTY = {
  full_name: '', emp_code: '', status: 'candidate', department: '', designation: '', location: '',
  employment_type: '', date_of_join: '', date_of_exit: '', exit_reason: '',
  personal_email: '', work_email: '', phone: '', alt_phone: '',
  date_of_birth: '', gender: '', blood_group: '',
  address: '', city: '', state: '', pincode: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  pan_number: '', aadhaar_number: '', uan_number: '', esic_number: '',
  bank_name: '', bank_account: '', bank_ifsc: '',
  monthly_gross: '', notes: '',
}

export default function PersonForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['person', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase.from('people').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (existing) {
      const next = { ...EMPTY }
      for (const k of Object.keys(EMPTY)) next[k] = existing[k] ?? ''
      setForm(next)
    }
  }, [existing])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.full_name.trim()) return toast('Name is required', 'error')
    setSaving(true)
    try {
      const payload = {}
      for (const [k, v] of Object.entries(form)) payload[k] = v === '' ? null : v
      if (payload.monthly_gross != null) payload.monthly_gross = Number(payload.monthly_gross)

      let personId = id
      if (isEdit) {
        const { error } = await supabase.from('people').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('people').insert(payload).select('id').single()
        if (error) throw error
        personId = data.id
      }
      qc.invalidateQueries({ queryKey: ['people'] })
      qc.invalidateQueries({ queryKey: ['person', personId] })
      toast(isEdit ? 'Saved' : 'Person added')
      callFunction('sync-sheet', {}).catch(() => {}) // keep the Google Sheet current; ignore failures here
      navigate(`/people/${personId}`)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && isLoading) return <FullPageSpinner />

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEdit ? `Edit ${existing?.full_name || ''}` : 'Add person'}
        sub={isEdit ? undefined : 'Add a candidate or an employee. You can send them a link later to fill in the rest themselves.'}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button onClick={save} loading={saving}>{isEdit ? 'Save changes' : 'Add person'}</Button>
          </>
        }
      />

      <div className="space-y-4">
        <Card title="Basics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" required><Input value={form.full_name} onChange={set('full_name')} /></Field>
            <Field label="Employee code"><Input value={form.emp_code} onChange={set('emp_code')} placeholder="e.g. MKM-014" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={set('status')}>
                {PEOPLE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Employment type">
              <Select value={form.employment_type} onChange={set('employment_type')}>
                <option value="">—</option>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </Select>
            </Field>
            <Field label="Department"><Input value={form.department} onChange={set('department')} /></Field>
            <Field label="Designation"><Input value={form.designation} onChange={set('designation')} /></Field>
            <Field label="Work location"><Input value={form.location} onChange={set('location')} /></Field>
            <Field label="Date of joining"><Input type="date" value={form.date_of_join || ''} onChange={set('date_of_join')} /></Field>
            {form.status === 'exited' && (
              <>
                <Field label="Date of exit"><Input type="date" value={form.date_of_exit || ''} onChange={set('date_of_exit')} /></Field>
                <Field label="Exit reason"><Input value={form.exit_reason} onChange={set('exit_reason')} /></Field>
              </>
            )}
          </div>
        </Card>

        <Card title="Contact">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Personal email"><Input type="email" value={form.personal_email} onChange={set('personal_email')} /></Field>
            <Field label="Work email"><Input type="email" value={form.work_email} onChange={set('work_email')} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Alternate phone"><Input value={form.alt_phone} onChange={set('alt_phone')} /></Field>
            <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={form.address} onChange={set('address')} /></Field>
            <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
            <Field label="State"><Input value={form.state} onChange={set('state')} /></Field>
            <Field label="PIN code"><Input value={form.pincode} onChange={set('pincode')} /></Field>
            <Field label="Emergency contact name"><Input value={form.emergency_contact_name} onChange={set('emergency_contact_name')} /></Field>
            <Field label="Emergency contact phone"><Input value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} /></Field>
          </div>
        </Card>

        <Card title="Personal">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Date of birth"><Input type="date" value={form.date_of_birth || ''} onChange={set('date_of_birth')} /></Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={set('gender')}>
                <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
              </Select>
            </Field>
            <Field label="Blood group"><Input value={form.blood_group} onChange={set('blood_group')} placeholder="e.g. B+" /></Field>
          </div>
        </Card>

        <Card title="Statutory & bank">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="PAN"><Input value={form.pan_number} onChange={set('pan_number')} /></Field>
            <Field label="Aadhaar"><Input value={form.aadhaar_number} onChange={set('aadhaar_number')} /></Field>
            <Field label="UAN (PF)"><Input value={form.uan_number} onChange={set('uan_number')} /></Field>
            <Field label="ESIC"><Input value={form.esic_number} onChange={set('esic_number')} /></Field>
            <Field label="Bank name"><Input value={form.bank_name} onChange={set('bank_name')} /></Field>
            <Field label="Account number"><Input value={form.bank_account} onChange={set('bank_account')} /></Field>
            <Field label="IFSC"><Input value={form.bank_ifsc} onChange={set('bank_ifsc')} /></Field>
          </div>
        </Card>

        <Card title="Compensation & notes">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monthly gross (₹)"><Input type="number" min="0" value={form.monthly_gross ?? ''} onChange={set('monthly_gross')} /></Field>
            <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes} onChange={set('notes')} /></Field>
          </div>
        </Card>

        <div className="flex justify-end gap-2 pb-8">
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={save} loading={saving}>{isEdit ? 'Save changes' : 'Add person'}</Button>
        </div>
      </div>
    </div>
  )
}
