import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Send, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Card, Button, Input, Select, Textarea, Field, FullPageSpinner, useToast, cx } from '../../components/ui'
import { UNITS, GST_RATES } from '../../lib/constants'
import { inr } from '../../lib/format'
import { VendorModal } from './Vendors'

let lineKey = 0
const newLine = () => ({ key: ++lineKey, description: '', hsn_code: '', qty: '', unit: 'nos', unit_price: '', tax_pct: 18 })

export default function POEditor() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()

  const [header, setHeader] = useState({
    vendor_id: '', po_type_id: '', location_id: '', order_date: new Date().toISOString().slice(0, 10),
    expected_date: '', reference: '', tax_mode: 'cgst_sgst', terms: '', notes: '',
  })
  const [taxModeTouched, setTaxModeTouched] = useState(false)
  const [lines, setLines] = useState([newLine()])
  const [saving, setSaving] = useState(false)
  const [vendorModal, setVendorModal] = useState(false)

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => (await supabase.from('vendors').select('*').order('name')).data || [],
  })
  const { data: poTypes = [] } = useQuery({
    queryKey: ['po-types'],
    queryFn: async () => (await supabase.from('po_types').select('*').eq('active', true).order('name')).data || [],
  })
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => (await supabase.from('delivery_locations').select('*').eq('active', true).order('name')).data || [],
  })
  const { data: company } = useQuery({
    queryKey: ['settings-company'],
    queryFn: async () => (await supabase.from('app_settings').select('value').eq('key', 'company').maybeSingle()).data?.value || {},
  })

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['po-edit', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase.from('purchase_orders').select('*, po_items(*)').eq('id', id).single()
      if (error) throw error
      return data
    },
  })

  // hydrate for edit
  useEffect(() => {
    if (!existing) return
    if (existing.status !== 'draft') {
      navigate(`/pos/${id}`, { replace: true })
      return
    }
    setHeader({
      vendor_id: existing.vendor_id || '', po_type_id: existing.po_type_id || '', location_id: existing.location_id || '',
      order_date: existing.order_date || '', expected_date: existing.expected_date || '', reference: existing.reference || '',
      tax_mode: existing.tax_mode, terms: existing.terms || '', notes: existing.notes || '',
    })
    setTaxModeTouched(true)
    setLines(
      existing.po_items.sort((a, b) => a.position - b.position).map((it) => ({
        key: ++lineKey, description: it.description, hsn_code: it.hsn_code || '',
        qty: String(it.qty), unit: it.unit, unit_price: String(it.unit_price), tax_pct: Number(it.tax_pct),
      }))
    )
  }, [existing]) // eslint-disable-line react-hooks/exhaustive-deps

  // default terms for new POs
  useEffect(() => {
    if (!isEdit && company && !header.terms) {
      setHeader((h) => ({ ...h, terms: company.po_terms || '' }))
    }
  }, [company]) // eslint-disable-line react-hooks/exhaustive-deps

  // suggest tax mode from vendor state vs delivery state
  useEffect(() => {
    if (taxModeTouched) return
    const v = vendors.find((x) => x.id === header.vendor_id)
    const l = locations.find((x) => x.id === header.location_id)
    const vs = (v?.state || '').trim().toLowerCase()
    const ls = (l?.state || company?.state || '').trim().toLowerCase()
    if (vs && ls) {
      setHeader((h) => ({ ...h, tax_mode: vs === ls ? 'cgst_sgst' : 'igst' }))
    }
  }, [header.vendor_id, header.location_id, vendors, locations, company, taxModeTouched])

  const setH = (k) => (e) => setHeader((h) => ({ ...h, [k]: e.target.value }))
  const setLine = (key, k, v) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [k]: v } : l)))

  const totals = useMemo(() => {
    let sub = 0, tax = 0
    for (const l of lines) {
      const amt = (Number(l.qty) || 0) * (Number(l.unit_price) || 0)
      sub += amt
      tax += amt * (Number(l.tax_pct) || 0) / 100
    }
    return { sub, tax, grand: sub + tax }
  }, [lines])

  const validLines = () => lines.filter((l) => l.description.trim() && Number(l.qty) > 0)

  const persist = async () => {
    const items = validLines()
    if (!items.length) throw new Error('Add at least one line with a description and quantity')
    const payload = { ...header }
    for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null

    let poId = id
    if (isEdit) {
      const { error } = await supabase.from('purchase_orders').update(payload).eq('id', id)
      if (error) throw error
      const { error: delErr } = await supabase.from('po_items').delete().eq('po_id', id)
      if (delErr) throw delErr
    } else {
      const { data, error } = await supabase.from('purchase_orders').insert(payload).select('id').single()
      if (error) throw error
      poId = data.id
    }

    const rows = items.map((l, i) => ({
      po_id: poId, position: i + 1, description: l.description.trim(), hsn_code: l.hsn_code || null,
      qty: Number(l.qty), unit: l.unit, unit_price: Number(l.unit_price) || 0,
      tax_pct: header.tax_mode === 'none' ? 0 : Number(l.tax_pct) || 0,
    }))
    const { error: itemErr } = await supabase.from('po_items').insert(rows)
    if (itemErr) throw itemErr

    qc.invalidateQueries({ queryKey: ['pos'] })
    qc.invalidateQueries({ queryKey: ['po', poId] })
    return poId
  }

  const saveDraft = async () => {
    setSaving(true)
    try {
      const poId = await persist()
      toast('Draft saved')
      navigate(`/pos/${poId}`)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveAndSubmit = async () => {
    if (!header.vendor_id) return toast('Select a vendor', 'error')
    if (!header.po_type_id) return toast('Select a PO type', 'error')
    if (!header.location_id) return toast('Select a delivery location', 'error')
    setSaving(true)
    let poId = null
    try {
      poId = await persist()
    } catch (e) {
      toast(e.message, 'error')
      setSaving(false)
      return
    }
    try {
      const { error } = await supabase.rpc('submit_po', { p_po: poId })
      if (error) throw error
      toast('PO submitted for approval')
    } catch (e) {
      toast(`Saved as draft — ${e.message}`, 'error')
    } finally {
      qc.invalidateQueries()
      setSaving(false)
      navigate(`/pos/${poId}`)
    }
  }

  if (isEdit && loadingExisting) return <FullPageSpinner />

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={isEdit ? `Edit ${existing?.po_number || 'draft PO'}` : 'New purchase order'}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="secondary" icon={Save} onClick={saveDraft} loading={saving}>Save draft</Button>
            <Button icon={Send} onClick={saveAndSubmit} loading={saving}>Save & submit</Button>
          </>
        }
      />

      <div className="space-y-4">
        <Card title="Order details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Vendor" required className="sm:col-span-2">
              <div className="flex gap-2">
                <Select value={header.vendor_id} onChange={setH('vendor_id')}>
                  <option value="">Select vendor…</option>
                  {vendors.filter((v) => v.active || v.id === header.vendor_id).map((v) => (
                    <option key={v.id} value={v.id}>{v.name}{v.city ? ` — ${v.city}` : ''}</option>
                  ))}
                </Select>
                <Button variant="secondary" icon={Plus} onClick={() => setVendorModal(true)} />
              </div>
            </Field>
            <Field label="PO type" required>
              <Select value={header.po_type_id} onChange={setH('po_type_id')}>
                <option value="">Select…</option>
                {poTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Deliver to" required>
              <Select value={header.location_id} onChange={setH('location_id')}>
                <option value="">Select…</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
            <Field label="PO date"><Input type="date" value={header.order_date || ''} onChange={setH('order_date')} /></Field>
            <Field label="Expected delivery"><Input type="date" value={header.expected_date || ''} onChange={setH('expected_date')} /></Field>
            <Field label="Reference" hint="Quotation / indent no."><Input value={header.reference || ''} onChange={setH('reference')} /></Field>
            <Field label="GST mode" hint="Suggested from vendor vs delivery state">
              <Select value={header.tax_mode} onChange={(e) => { setTaxModeTouched(true); setH('tax_mode')(e) }}>
                <option value="cgst_sgst">CGST + SGST (within state)</option>
                <option value="igst">IGST (inter-state)</option>
                <option value="none">No GST</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card title="Line items" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">HSN</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-left">Unit</th>
                  <th className="px-3 py-2 text-right">Rate (₹)</th>
                  <th className="px-3 py-2 text-right">GST %</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const amt = (Number(l.qty) || 0) * (Number(l.unit_price) || 0)
                  return (
                    <tr key={l.key} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-2 py-1.5 min-w-64">
                        <Textarea rows={1} value={l.description} placeholder="Item / service description"
                          onChange={(e) => setLine(l.key, 'description', e.target.value)} className="resize-y" />
                      </td>
                      <td className="px-2 py-1.5 w-24"><Input value={l.hsn_code} onChange={(e) => setLine(l.key, 'hsn_code', e.target.value)} /></td>
                      <td className="px-2 py-1.5 w-24"><Input type="number" min="0" step="any" className="text-right" value={l.qty} onChange={(e) => setLine(l.key, 'qty', e.target.value)} /></td>
                      <td className="px-2 py-1.5 w-24">
                        <Select value={l.unit} onChange={(e) => setLine(l.key, 'unit', e.target.value)}>
                          {UNITS.map((u) => <option key={u}>{u}</option>)}
                        </Select>
                      </td>
                      <td className="px-2 py-1.5 w-32"><Input type="number" min="0" step="any" className="text-right" value={l.unit_price} onChange={(e) => setLine(l.key, 'unit_price', e.target.value)} /></td>
                      <td className="px-2 py-1.5 w-24">
                        <Select value={l.tax_pct} onChange={(e) => setLine(l.key, 'tax_pct', e.target.value)} disabled={header.tax_mode === 'none'}>
                          {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                        </Select>
                      </td>
                      <td className={cx('px-3 py-2 text-right font-medium', amt ? 'text-slate-800' : 'text-slate-300')}>{inr(amt)}</td>
                      <td className="px-2 py-1.5">
                        <Button variant="ghost" size="xs" icon={Trash2} disabled={lines.length === 1}
                          onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-start justify-between gap-4 p-4">
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setLines((ls) => [...ls, newLine()])}>Add line</Button>
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{inr(totals.sub)}</span></div>
              {header.tax_mode === 'cgst_sgst' && (
                <>
                  <div className="flex justify-between text-slate-500"><span>CGST</span><span>{inr(totals.tax / 2)}</span></div>
                  <div className="flex justify-between text-slate-500"><span>SGST</span><span>{inr(totals.tax / 2)}</span></div>
                </>
              )}
              {header.tax_mode === 'igst' && <div className="flex justify-between text-slate-500"><span>IGST</span><span>{inr(totals.tax)}</span></div>}
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-slate-900">
                <span>Total</span><span>{inr(header.tax_mode === 'none' ? totals.sub : totals.grand)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Terms & conditions">
            <Textarea rows={5} value={header.terms || ''} onChange={setH('terms')} placeholder="Shown on the PO PDF" />
          </Card>
          <Card title="Internal notes">
            <Textarea rows={5} value={header.notes || ''} onChange={setH('notes')} placeholder="Visible to your team and approvers, not on the PDF" />
          </Card>
        </div>

        <div className="flex justify-end gap-2 pb-10">
          <Button variant="secondary" icon={Save} onClick={saveDraft} loading={saving}>Save draft</Button>
          <Button icon={Send} onClick={saveAndSubmit} loading={saving}>Save & submit</Button>
        </div>
      </div>

      {vendorModal && (
        <VendorModal vendor={null} onClose={() => setVendorModal(false)}
          onCreated={(v) => setHeader((h) => ({ ...h, vendor_id: v.id }))} />
      )}
    </div>
  )
}
