import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Store } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Button, Table, Th, Td, Tr, Badge, SearchInput, Modal, Field, Input, Textarea, Checkbox, EmptyState, FullPageSpinner, useToast } from '../../components/ui'

const EMPTY = { name: '', contact_name: '', email: '', phone: '', gstin: '', address: '', city: '', state: '', pincode: '', payment_terms: '', notes: '', active: true }

export default function Vendors() {
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | vendor
  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('*').order('name')
      if (error) throw error
      return data
    },
  })

  const filtered = useMemo(() => {
    if (!q.trim()) return vendors || []
    const n = q.trim().toLowerCase()
    return (vendors || []).filter((v) => [v.name, v.contact_name, v.email, v.phone, v.gstin, v.city].filter(Boolean).some((x) => x.toLowerCase().includes(n)))
  }, [vendors, q])

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Vendors"
        actions={<Button icon={Plus} onClick={() => setEditing('new')}>Add vendor</Button>}
      />
      <div className="mb-4 flex justify-end">
        <SearchInput value={q} onChange={setQ} placeholder="Search vendors…" className="w-72" />
      </div>

      {!filtered.length ? (
        <EmptyState icon={Store} title={q ? 'No matches' : 'No vendors yet'} action={!q && <Button icon={Plus} onClick={() => setEditing('new')}>Add vendor</Button>} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th><Th>Contact</Th><Th>Phone / Email</Th><Th>GSTIN</Th><Th>State</Th><Th>Payment terms</Th><Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <Tr key={v.id} onClick={() => setEditing(v)}>
                <Td className="font-medium text-slate-900">{v.name} {!v.active && <Badge tone="gray" className="ml-1.5">Inactive</Badge>}</Td>
                <Td>{v.contact_name || '—'}</Td>
                <Td className="text-slate-500">{[v.phone, v.email].filter(Boolean).join(' · ') || '—'}</Td>
                <Td className="text-xs text-slate-500">{v.gstin || '—'}</Td>
                <Td>{v.state || '—'}</Td>
                <Td className="text-slate-500">{v.payment_terms || '—'}</Td>
                <Td right><span className="text-xs text-red-600">Edit</span></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && <VendorModal vendor={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

export function VendorModal({ vendor, onClose, onCreated }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [form, setForm] = useState(vendor ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, vendor[k] ?? EMPTY[k]])) } : EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async () => {
    if (!form.name.trim()) return toast('Vendor name is required', 'error')
    setSaving(true)
    try {
      const payload = { ...form }
      for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null
      if (vendor) {
        const { error } = await supabase.from('vendors').update(payload).eq('id', vendor.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('vendors').insert(payload).select('*').single()
        if (error) throw error
        onCreated?.(data)
      }
      qc.invalidateQueries({ queryKey: ['vendors'] })
      toast('Vendor saved')
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={vendor ? `Edit ${vendor.name}` : 'Add vendor'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save vendor</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vendor name" required className="sm:col-span-2"><Input value={form.name} onChange={set('name')} autoFocus /></Field>
        <Field label="Contact person"><Input value={form.contact_name} onChange={set('contact_name')} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Email" hint="POs are emailed here"><Input type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="GSTIN"><Input value={form.gstin} onChange={set('gstin')} /></Field>
        <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={form.address} onChange={set('address')} /></Field>
        <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
        <Field label="State" hint="Used to suggest CGST+SGST vs IGST"><Input value={form.state} onChange={set('state')} /></Field>
        <Field label="PIN code"><Input value={form.pincode} onChange={set('pincode')} /></Field>
        <Field label="Payment terms"><Input value={form.payment_terms} onChange={set('payment_terms')} placeholder="e.g. 30 days from invoice" /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={form.notes} onChange={set('notes')} /></Field>
        <Checkbox label="Active vendor" checked={!!form.active} onChange={set('active')} />
      </div>
    </Modal>
  )
}
