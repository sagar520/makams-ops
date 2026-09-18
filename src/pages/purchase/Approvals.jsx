import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, CheckSquare, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader, Card, Button, Badge, Modal, Field, Textarea, EmptyState, FullPageSpinner, useToast } from '../../components/ui'
import { inr, fmtDate, fmtDateTime } from '../../lib/format'

export default function Approvals() {
  const { appUser } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const [acting, setActing] = useState(null) // { step, action }
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: pending, isLoading } = useQuery({
    queryKey: ['approvals-inbox', appUser?.id],
    enabled: !!appUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_approval_steps')
        .select('id, position, po_id, purchase_orders!inner(id, po_number, status, order_date, expected_date, grand_total, notes, submitted_at, vendors(name), po_types(name), delivery_locations(name), creator:created_by(full_name))')
        .eq('approver_id', appUser.id)
        .eq('status', 'pending')
        .eq('is_current', true)
        .eq('purchase_orders.status', 'pending_approval')
      if (error) throw error
      return data.sort((a, b) => new Date(a.purchase_orders.submitted_at) - new Date(b.purchase_orders.submitted_at))
    },
  })

  const { data: history = [] } = useQuery({
    queryKey: ['approvals-history', appUser?.id],
    enabled: !!appUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_approval_steps')
        .select('id, status, comment, acted_at, purchase_orders(id, po_number, grand_total, vendors(name))')
        .eq('approver_id', appUser.id)
        .in('status', ['approved', 'rejected'])
        .order('acted_at', { ascending: false })
        .limit(15)
      if (error) throw error
      return data
    },
  })

  const act = async () => {
    if (acting.action === 'reject' && !comment.trim()) return toast('Add a short reason for rejecting', 'error')
    setSaving(true)
    try {
      const { error } = await supabase.rpc('act_on_po', {
        p_po: acting.step.purchase_orders.id, p_action: acting.action, p_comment: comment.trim() || null,
      })
      if (error) throw error
      toast(acting.action === 'approve' ? 'Approved' : 'Rejected')
      setActing(null)
      setComment('')
      qc.invalidateQueries({ queryKey: ['approvals-inbox'] })
      qc.invalidateQueries({ queryKey: ['approvals-history'] })
      qc.invalidateQueries({ queryKey: ['my-pending-approvals-count'] })
      qc.invalidateQueries({ queryKey: ['pos'] })
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <PageHeader title="Approvals" sub="Purchase orders waiting on you." />

      {!pending?.length ? (
        <EmptyState icon={CheckSquare} title="Nothing waiting on you" hint="POs land here when an approval rule routes them to you." />
      ) : (
        <div className="space-y-3">
          {pending.map((s) => {
            const po = s.purchase_orders
            return (
              <Card key={s.id}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/pos/${po.id}`} className="text-sm font-semibold text-slate-900 hover:text-red-600">{po.po_number}</Link>
                      <Badge tone="amber">Step {s.position}</Badge>
                      <span className="text-xs text-slate-400">submitted {fmtDateTime(po.submitted_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {po.vendors?.name} · {po.po_types?.name} · deliver to {po.delivery_locations?.name}
                      {po.expected_date ? ` by ${fmtDate(po.expected_date)}` : ''}
                    </p>
                    <p className="text-xs text-slate-400">Raised by {po.creator?.full_name || '—'}{po.notes ? ` — “${po.notes}”` : ''}</p>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{inr(po.grand_total)}</p>
                  <div className="flex items-center gap-2">
                    <Link to={`/pos/${po.id}`}>
                      <Button variant="ghost" size="sm" icon={ArrowRight}>Review</Button>
                    </Link>
                    <Button variant="dangerSubtle" size="sm" icon={XCircle} onClick={() => { setActing({ step: s, action: 'reject' }); setComment('') }}>Reject</Button>
                    <Button variant="success" size="sm" icon={CheckCircle2} onClick={() => { setActing({ step: s, action: 'approve' }); setComment('') }}>Approve</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {history.length > 0 && (
        <Card title="Your recent decisions" className="mt-6" pad={false}>
          <ul className="divide-y divide-slate-100">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                {h.status === 'approved' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <Link to={`/pos/${h.purchase_orders?.id}`} className="font-medium text-slate-800 hover:text-red-600">{h.purchase_orders?.po_number}</Link>
                <span className="text-slate-500">{h.purchase_orders?.vendors?.name}</span>
                <span className="ml-auto text-slate-500">{inr(h.purchase_orders?.grand_total)}</span>
                <span className="w-32 text-right text-xs text-slate-400">{fmtDateTime(h.acted_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {acting && (
        <Modal open onClose={() => setActing(null)}
          title={`${acting.action === 'approve' ? 'Approve' : 'Reject'} ${acting.step.purchase_orders.po_number}`}
          sub={`${acting.step.purchase_orders.vendors?.name} · ${inr(acting.step.purchase_orders.grand_total)}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setActing(null)}>Cancel</Button>
              <Button variant={acting.action === 'approve' ? 'success' : 'danger'} onClick={act} loading={saving}>
                {acting.action === 'approve' ? 'Approve PO' : 'Reject PO'}
              </Button>
            </>
          }>
          <Field label={acting.action === 'approve' ? 'Comment (optional)' : 'Reason'} required={acting.action === 'reject'}>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
          </Field>
        </Modal>
      )}
    </div>
  )
}
