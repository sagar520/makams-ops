import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Pencil, Send, Copy, Trash2, Download, PackagePlus, CheckCircle2, XCircle, RotateCcw,
  Ban, Archive, Clock, User, FileText, Truck, Mail, CircleDot, Circle,
} from 'lucide-react'
import { supabase, callFunction, isDemo } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  PageHeader, Card, Button, Badge, Modal, Field, Input, Textarea, Info,
  FullPageSpinner, useToast, cx, Table, Th, Td, Tr,
} from '../../components/ui'
import { PO_STATUS, RECEIVED_STATUS } from '../../lib/constants'
import { inr, num, fmtDate, fmtDateTime } from '../../lib/format'

export default function PODetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { appUser, hasRole } = useAuth()
  const [busy, setBusy] = useState(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [decision, setDecision] = useState(null) // 'approve' | 'reject'

  const { data: po, isLoading } = useQuery({
    queryKey: ['po', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendors (*),
          po_types (id, name),
          delivery_locations (*),
          creator:created_by (full_name),
          po_items (*),
          po_approval_steps (*, approver:approver_id (id, full_name, email)),
          po_events (*, actor:actor_id (full_name)),
          receipts (*, receipt_items (*))
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      data.po_items.sort((a, b) => a.position - b.position)
      data.po_approval_steps.sort((a, b) => a.position - b.position)
      data.po_events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      data.receipts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return data
    },
  })

  const { data: company } = useQuery({
    queryKey: ['settings-company'],
    queryFn: async () => (await supabase.from('app_settings').select('value').eq('key', 'company').maybeSingle()).data?.value || {},
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['po', id] })
    qc.invalidateQueries({ queryKey: ['pos'] })
    qc.invalidateQueries({ queryKey: ['home-my-approvals'] })
    qc.invalidateQueries({ queryKey: ['my-pending-approvals-count'] })
    qc.invalidateQueries({ queryKey: ['approvals-inbox'] })
  }

  const rpc = async (name, args, okMsg) => {
    setBusy(name)
    try {
      const { error } = await supabase.rpc(name, args)
      if (error) throw error
      if (okMsg) toast(okMsg)
      refresh()
      return true
    } catch (e) {
      toast(e.message, 'error')
      return false
    } finally {
      setBusy(null)
    }
  }

  const myTurn = useMemo(() => {
    if (!po || !appUser || po.status !== 'pending_approval') return false
    const step = po.po_approval_steps.find((s) => s.position === po.current_step && s.status === 'pending')
    return step && (step.approver_id === appUser.id || hasRole('admin'))
  }, [po, appUser, hasRole])

  if (isLoading || !po) return <FullPageSpinner />

  const st = PO_STATUS[po.status] || {}
  const rc = RECEIVED_STATUS[po.received_status] || {}
  const pdfData = { po, items: po.po_items, vendor: po.vendors, location: po.delivery_locations, company }
  const canPurchase = hasRole('purchase')

  const duplicate = async () => {
    setBusy('duplicate')
    try {
      const { data, error } = await supabase.rpc('duplicate_po', { p_po: id })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['pos'] })
      toast('Duplicated — you are now on the new draft')
      navigate(`/pos/${data}`)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const deleteDraft = async () => {
    if (!window.confirm('Delete this draft PO permanently?')) return
    const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
    if (error) return toast(error.message, 'error')
    qc.invalidateQueries({ queryKey: ['pos'] })
    navigate('/pos')
  }

  return (
    <div>
      <PageHeader
        title={po.po_number || 'Draft PO'}
        actions={
          <>
            {myTurn && (
              <>
                <Button variant="success" icon={CheckCircle2} onClick={() => setDecision('approve')}>Approve</Button>
                <Button variant="dangerSubtle" icon={XCircle} onClick={() => setDecision('reject')}>Reject</Button>
              </>
            )}
            {canPurchase && po.status === 'draft' && (
              <>
                <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/pos/${id}/edit`)}>Edit</Button>
                <Button icon={Send} loading={busy === 'submit_po'} onClick={() => rpc('submit_po', { p_po: id }, 'Submitted for approval')}>Submit</Button>
              </>
            )}
            {canPurchase && po.status === 'rejected' && (
              <Button icon={RotateCcw} loading={busy === 'reopen_po'} onClick={() => rpc('reopen_po', { p_po: id }, 'Back to draft — edit and resubmit')}>Reopen as draft</Button>
            )}
            {canPurchase && (po.status === 'approved' || po.status === 'closed') && (
              <Button icon={Mail} onClick={() => setSendOpen(true)}>{po.sent_count > 0 ? 'Resend to vendor' : 'Send to vendor'}</Button>
            )}
            {canPurchase && po.status === 'approved' && (
              <Button variant="secondary" icon={PackagePlus} onClick={() => setReceiveOpen(true)}>Record receipt</Button>
            )}
            <Button variant="secondary" icon={Download} loading={busy === 'pdf'}
              onClick={async () => {
                setBusy('pdf')
                try {
                  const { downloadPoPdf } = await import('../../lib/pdf')
                  downloadPoPdf(pdfData)
                  if (isDemo) toast('PDF generated — if the download doesn\'t start, your browser sandbox blocked it; it works normally in the real deployment', 'info')
                } finally { setBusy(null) }
              }}>PDF</Button>
            {canPurchase && <Button variant="secondary" icon={Copy} loading={busy === 'duplicate'} onClick={duplicate}>Duplicate</Button>}
          </>
        }
      >
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge tone={st.tone}>{st.label}</Badge>
          {(po.status === 'approved' || po.status === 'closed') && <Badge tone={rc.tone}>{rc.label}</Badge>}
          {po.sent_count > 0 && <Badge tone="indigo">Sent ×{po.sent_count}</Badge>}
          <span className="text-sm text-slate-500">
            {po.vendors?.name} · {inr(po.grand_total)} · raised by {po.creator?.full_name || '—'}
          </span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* ------------ left: order info + items + receipts ------------ */}
        <div className="space-y-4 xl:col-span-2">
          <Card title="Order details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <Info label="Vendor">{po.vendors?.name}</Info>
              <Info label="PO type">{po.po_types?.name}</Info>
              <Info label="Deliver to">{po.delivery_locations?.name}</Info>
              <Info label="PO date">{fmtDate(po.order_date)}</Info>
              <Info label="Expected">{fmtDate(po.expected_date)}</Info>
              <Info label="Reference">{po.reference}</Info>
              <Info label="GST">{po.tax_mode === 'igst' ? 'IGST (inter-state)' : po.tax_mode === 'none' ? 'None' : 'CGST + SGST'}</Info>
              <Info label="Vendor GSTIN">{po.vendors?.gstin}</Info>
              <Info label="Payment terms">{po.vendors?.payment_terms}</Info>
            </dl>
            {po.notes && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><span className="font-medium">Internal note:</span> {po.notes}</p>}
          </Card>

          <Card title="Items" pad={false}>
            <Table className="rounded-none border-0 shadow-none">
              <thead>
                <tr>
                  <Th>#</Th><Th>Description</Th><Th right>Qty</Th><Th right>Rate</Th><Th right>GST</Th><Th right>Amount</Th>
                  {(po.status === 'approved' || po.status === 'closed') && <Th right>Received</Th>}
                </tr>
              </thead>
              <tbody>
                {po.po_items.map((it, i) => (
                  <Tr key={it.id}>
                    <Td className="text-slate-400">{i + 1}</Td>
                    <Td>
                      <p className="font-medium text-slate-800">{it.description}</p>
                      {it.hsn_code && <p className="text-xs text-slate-400">HSN {it.hsn_code}</p>}
                    </Td>
                    <Td right>{num(it.qty)} {it.unit}</Td>
                    <Td right>{inr(it.unit_price)}</Td>
                    <Td right className="text-slate-500">{Number(it.tax_pct)}%</Td>
                    <Td right className="font-medium">{inr(it.line_total)}</Td>
                    {(po.status === 'approved' || po.status === 'closed') && (
                      <Td right>
                        <span className={cx(
                          'font-medium',
                          Number(it.received_qty) >= Number(it.qty) ? 'text-emerald-600' : Number(it.received_qty) > 0 ? 'text-amber-600' : 'text-slate-400'
                        )}>
                          {num(it.received_qty)} / {num(it.qty)}
                        </span>
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </Table>
            <div className="flex justify-end p-4">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{inr(po.subtotal)}</span></div>
                {po.tax_mode === 'cgst_sgst' && (
                  <>
                    <div className="flex justify-between text-slate-500"><span>CGST</span><span>{inr(po.tax_total / 2)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>SGST</span><span>{inr(po.tax_total / 2)}</span></div>
                  </>
                )}
                {po.tax_mode === 'igst' && <div className="flex justify-between text-slate-500"><span>IGST</span><span>{inr(po.tax_total)}</span></div>}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-semibold text-slate-900">
                  <span>Total</span><span>{inr(po.grand_total)}</span>
                </div>
              </div>
            </div>
          </Card>

          {po.receipts.length > 0 && (
            <Card title="Goods receipts" pad={false}>
              <ul className="divide-y divide-slate-100">
                {po.receipts.map((r) => (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-slate-400" />
                      <p className="text-sm font-medium text-slate-800">{fmtDate(r.received_date)}</p>
                      {r.invoice_number && <span className="text-xs text-slate-400">Invoice {r.invoice_number}{r.invoice_date ? ` · ${fmtDate(r.invoice_date)}` : ''}</span>}
                      {canPurchase && (
                        <Button variant="ghost" size="xs" icon={Trash2} className="ml-auto"
                          onClick={() => window.confirm('Delete this receipt? Quantities will be rolled back.') && rpc('delete_receipt', { p_receipt: r.id }, 'Receipt deleted')} />
                      )}
                    </div>
                    <ul className="mt-1.5 space-y-0.5 pl-6">
                      {r.receipt_items.map((ri) => {
                        const item = po.po_items.find((x) => x.id === ri.po_item_id)
                        return (
                          <li key={ri.id} className="text-xs text-slate-500">
                            {num(ri.qty)} {item?.unit} — {item?.description}{ri.remarks ? ` (${ri.remarks})` : ''}
                          </li>
                        )
                      })}
                    </ul>
                    {r.notes && <p className="mt-1 pl-6 text-xs text-slate-400">{r.notes}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ------------ right: approvals + timeline + danger ------------ */}
        <div className="space-y-4">
          {po.po_approval_steps.length > 0 && (
            <Card title="Approval chain" pad={false}>
              <ul className="divide-y divide-slate-100">
                {po.po_approval_steps.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                    {s.status === 'approved' ? <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-500" />
                      : s.status === 'rejected' ? <XCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-500" />
                      : s.is_current ? <CircleDot className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-500" />
                      : <Circle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-slate-300" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        {s.approver?.full_name || s.approver?.email}
                        <span className="ml-1.5 text-xs font-normal text-slate-400">step {s.position}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {s.status === 'pending' ? (s.is_current ? 'Waiting on them now' : 'Up next') : `${s.status} · ${fmtDateTime(s.acted_at)}`}
                      </p>
                      {s.comment && <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">“{s.comment}”</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Activity" pad={false}>
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {po.po_events.map((e) => (
                <li key={e.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <EventIcon kind={e.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-600">{eventLabel(e)}</p>
                    <p className="text-[11px] text-slate-400">{e.actor?.full_name ? `${e.actor.full_name} · ` : ''}{fmtDateTime(e.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {canPurchase && (
            <Card title="More actions">
              <div className="flex flex-wrap gap-2">
                {po.status === 'pending_approval' && (
                  <Button variant="secondary" size="sm" icon={RotateCcw} loading={busy === 'reopen_po'}
                    onClick={() => rpc('reopen_po', { p_po: id }, 'Withdrawn — back to draft')}>Withdraw</Button>
                )}
                {po.status === 'approved' && po.received_status !== 'none' && (
                  <Button variant="secondary" size="sm" icon={Archive} loading={busy === 'close_po'}
                    onClick={() => rpc('close_po', { p_po: id }, 'PO closed')}>Close PO</Button>
                )}
                {['draft', 'pending_approval', 'approved'].includes(po.status) && po.received_status === 'none' && (
                  <Button variant="dangerSubtle" size="sm" icon={Ban} loading={busy === 'cancel_po'}
                    onClick={() => window.confirm('Cancel this PO?') && rpc('cancel_po', { p_po: id }, 'PO cancelled')}>Cancel PO</Button>
                )}
                {po.status === 'draft' && (
                  <Button variant="dangerSubtle" size="sm" icon={Trash2} onClick={deleteDraft}>Delete draft</Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {decision && (
        <DecisionModal action={decision} po={po} onClose={() => setDecision(null)}
          onDone={() => { setDecision(null); refresh() }} />
      )}
      {sendOpen && <SendModal po={po} pdfData={pdfData} onClose={() => setSendOpen(false)} onSent={refresh} />}
      {receiveOpen && <ReceiveModal po={po} onClose={() => setReceiveOpen(false)} onDone={() => { setReceiveOpen(false); refresh() }} />}
    </div>
  )
}

function EventIcon({ kind }) {
  const map = {
    created: [FileText, 'text-slate-400'],
    submitted: [Send, 'text-indigo-500'],
    approved_step: [CheckCircle2, 'text-emerald-400'],
    approved: [CheckCircle2, 'text-emerald-500'],
    rejected: [XCircle, 'text-red-500'],
    reopened: [RotateCcw, 'text-slate-400'],
    cancelled: [Ban, 'text-slate-400'],
    closed: [Archive, 'text-slate-400'],
    sent: [Mail, 'text-indigo-500'],
    send_failed: [Mail, 'text-red-500'],
    received: [Truck, 'text-emerald-500'],
    receipt_deleted: [Trash2, 'text-slate-400'],
    duplicated: [Copy, 'text-slate-400'],
  }
  const [Icon, color] = map[kind] || [Clock, 'text-slate-400']
  return <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
}

function eventLabel(e) {
  const d = e.detail || {}
  switch (e.kind) {
    case 'created': return 'PO created'
    case 'submitted': return `Submitted for approval (rule: ${d.rule || '—'}, ${d.steps} step${d.steps > 1 ? 's' : ''})`
    case 'approved_step': return `Step ${d.step} approved${d.comment ? ` — “${d.comment}”` : ''}`
    case 'approved': return d.auto ? `Auto-approved (rule: ${d.rule})` : `Fully approved${d.comment ? ` — “${d.comment}”` : ''}`
    case 'rejected': return `Rejected${d.comment ? ` — “${d.comment}”` : ''}`
    case 'reopened': return 'Reopened as draft'
    case 'cancelled': return 'Cancelled'
    case 'closed': return 'Closed'
    case 'sent': return `Emailed to ${d.to}${d.cc ? ` (cc ${d.cc})` : ''}`
    case 'send_failed': return `Email failed: ${d.error || ''}`
    case 'received': return `Goods received (${d.lines} line${d.lines > 1 ? 's' : ''}${d.invoice ? `, invoice ${d.invoice}` : ''})`
    case 'receipt_deleted': return 'A receipt was deleted'
    case 'duplicated': return `Duplicated from ${d.from_po || 'another PO'}`
    default: return e.kind
  }
}

/* ---------------- approve / reject ---------------- */

function DecisionModal({ action, po, onClose, onDone }) {
  const toast = useToast()
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const approve = action === 'approve'

  const act = async () => {
    if (!approve && !comment.trim()) return toast('Add a short reason for rejecting', 'error')
    setSaving(true)
    try {
      const { error } = await supabase.rpc('act_on_po', { p_po: po.id, p_action: action, p_comment: comment.trim() || null })
      if (error) throw error
      toast(approve ? 'Approved' : 'Rejected')
      onDone()
    } catch (e) {
      toast(e.message, 'error')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`${approve ? 'Approve' : 'Reject'} ${po.po_number}`}
      sub={`${po.vendors?.name} · ${inr(po.grand_total)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={approve ? 'success' : 'danger'} onClick={act} loading={saving}>
            {approve ? 'Approve PO' : 'Reject PO'}
          </Button>
        </>
      }>
      <Field label={approve ? 'Comment (optional)' : 'Reason'} required={!approve}>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} autoFocus
          placeholder={approve ? 'Looks good' : 'Why is this being rejected?'} />
      </Field>
    </Modal>
  )
}

/* ---------------- send to vendor ---------------- */

function SendModal({ po, pdfData, onClose, onSent }) {
  const toast = useToast()
  const [to, setTo] = useState(po.vendors?.email || '')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(`Purchase Order ${po.po_number} — ${pdfData.company?.name || 'Makams'}`)
  const [message, setMessage] = useState(
    `Dear ${po.vendors?.contact_name || po.vendors?.name},\n\nPlease find attached our purchase order ${po.po_number}.\nKindly confirm receipt and the expected delivery date.\n\nRegards,\n${pdfData.company?.name || 'Makams'}`
  )
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!/\S+@\S+\.\S+/.test(to)) return toast('Enter a valid vendor email', 'error')
    setSending(true)
    try {
      const { poPdfBase64 } = await import('../../lib/pdf')
      const pdf_base64 = poPdfBase64(pdfData)
      await callFunction('send-po', {
        po_id: po.id, to: to.trim(), cc: cc.trim() || null, subject, message, pdf_base64,
        filename: `${(po.po_number || 'PO').replace(/[\/\\]/g, '-')}.pdf`,
      })
      toast(`PO emailed to ${to}`)
      onSent()
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={po.sent_count > 0 ? `Resend ${po.po_number}` : `Send ${po.po_number}`}
      sub="The PO PDF is attached automatically." size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={Send} onClick={send} loading={sending}>Send email</Button>
        </>
      }>
      <div className="space-y-4">
        {po.sent_count > 0 && (
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
            Already sent {po.sent_count} time{po.sent_count > 1 ? 's' : ''}, last on {fmtDateTime(po.last_sent_at)}.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="To" required><Input type="email" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Cc"><Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="comma-separated" /></Field>
        </div>
        <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Message"><Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

/* ---------------- record receipt ---------------- */

function ReceiveModal({ po, onClose, onDone }) {
  const toast = useToast()
  const [rows, setRows] = useState(() =>
    po.po_items.map((it) => ({ po_item_id: it.id, description: it.description, unit: it.unit, ordered: Number(it.qty), already: Number(it.received_qty), qty: '', remarks: '' }))
  )
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10))
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const setRow = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const fillRemaining = () => setRows((rs) => rs.map((r) => ({ ...r, qty: Math.max(r.ordered - r.already, 0) || '' })))

  const save = async () => {
    const items = rows.filter((r) => Number(r.qty) > 0).map((r) => ({ po_item_id: r.po_item_id, qty: Number(r.qty), remarks: r.remarks || null }))
    if (!items.length) return toast('Enter a received quantity on at least one line', 'error')
    setSaving(true)
    try {
      const { error } = await supabase.rpc('add_receipt', {
        p_po: po.id, p_received_date: receivedDate, p_invoice_number: invoiceNumber || null,
        p_invoice_date: invoiceDate || null, p_notes: notes || null, p_items: items,
      })
      if (error) throw error
      toast('Receipt recorded')
      onDone()
    } catch (e) {
      toast(e.message, 'error')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Record receipt — ${po.po_number}`} size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={fillRemaining}>Fill remaining</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={PackagePlus} onClick={save} loading={saving}>Save receipt</Button>
        </>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Received on"><Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} /></Field>
          <Field label="Invoice / challan no."><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></Field>
          <Field label="Invoice date"><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></Field>
          <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Ordered</th>
                <th className="px-3 py-2 text-right">Received so far</th>
                <th className="px-3 py-2 text-right">Receiving now</th>
                <th className="px-3 py-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const remaining = Math.max(r.ordered - r.already, 0)
                const over = Number(r.qty) > remaining && Number(r.qty) > 0
                return (
                  <tr key={r.po_item_id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{r.description}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{num(r.ordered)} {r.unit}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{num(r.already)}</td>
                    <td className="w-32 px-2 py-1.5">
                      <Input type="number" min="0" step="any" className={cx('text-right', over && 'border-amber-400 bg-amber-50')}
                        value={r.qty} onChange={(e) => setRow(i, 'qty', e.target.value)} />
                      {over && <p className="mt-0.5 text-right text-[10px] text-amber-600">over remaining ({num(remaining)})</p>}
                    </td>
                    <td className="w-44 px-2 py-1.5"><Input value={r.remarks} onChange={(e) => setRow(i, 'remarks', e.target.value)} placeholder="damage, shortfall…" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}
