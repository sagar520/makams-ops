import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, UserPlus, ListChecks, FileText, CheckSquare, PackageOpen, IndianRupee, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { PageHeader, Card, Badge, Spinner } from '../components/ui'
import { inr, fmtDate } from '../lib/format'

function fyStart() {
  const now = new Date()
  const y = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1
  return `${y}-04-01`
}

function Stat({ icon: Icon, label, value, to, tone = 'indigo', loading }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  const body = (
    <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-xl font-semibold text-slate-900">{loading ? <Spinner className="h-4 w-4" /> : value}</p>
      </div>
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

export default function Home() {
  const { appUser, hasRole, hasAnyRole } = useAuth()
  const isHr = hasRole('hr')
  const isPurchase = hasRole('purchase')
  const canApprove = hasAnyRole(['approver', 'purchase'])

  const hrStats = useQuery({
    queryKey: ['home-hr'],
    enabled: isHr,
    queryFn: async () => {
      const [active, candidates, onboarding, exits] = await Promise.all([
        supabase.from('people').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('people').select('id', { count: 'exact', head: true }).eq('status', 'candidate'),
        supabase.from('person_checklists').select('id', { count: 'exact', head: true }).eq('kind', 'onboarding').eq('status', 'in_progress'),
        supabase.from('person_checklists').select('id', { count: 'exact', head: true }).eq('kind', 'exit').eq('status', 'in_progress'),
      ])
      return {
        active: active.count ?? 0,
        candidates: candidates.count ?? 0,
        onboarding: onboarding.count ?? 0,
        exits: exits.count ?? 0,
      }
    },
  })

  const poStats = useQuery({
    queryKey: ['home-po'],
    enabled: isPurchase,
    queryFn: async () => {
      const [pending, awaiting, fyValue] = await Promise.all([
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status', 'approved').neq('received_status', 'full'),
        supabase.from('purchase_orders').select('grand_total').in('status', ['approved', 'closed']).gte('order_date', fyStart()),
      ])
      return {
        pending: pending.count ?? 0,
        awaiting: awaiting.count ?? 0,
        fyValue: (fyValue.data || []).reduce((s, r) => s + Number(r.grand_total || 0), 0),
      }
    },
  })

  const myApprovals = useQuery({
    queryKey: ['home-my-approvals', appUser?.id],
    enabled: canApprove && !!appUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_approval_steps')
        .select('id, position, purchase_orders!inner(id, po_number, grand_total, status, order_date, vendors(name))')
        .eq('approver_id', appUser.id)
        .eq('status', 'pending')
        .eq('is_current', true)
        .eq('purchase_orders.status', 'pending_approval')
        .limit(8)
      if (error) throw error
      return data
    },
  })

  return (
    <div>
      <PageHeader title={`Hi ${appUser?.full_name?.split(' ')[0] || 'there'}`} sub="Here's where things stand." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {isHr && (
          <>
            <Stat icon={Users} label="Active employees" value={hrStats.data?.active ?? '—'} loading={hrStats.isLoading} to="/people" tone="green" />
            <Stat icon={UserPlus} label="Candidates" value={hrStats.data?.candidates ?? '—'} loading={hrStats.isLoading} to="/people?status=candidate" tone="sky" />
            <Stat icon={ListChecks} label="Onboardings running" value={hrStats.data?.onboarding ?? '—'} loading={hrStats.isLoading} to="/people" tone="indigo" />
            <Stat icon={ListChecks} label="Exits running" value={hrStats.data?.exits ?? '—'} loading={hrStats.isLoading} to="/people?status=exited" tone="slate" />
          </>
        )}
        {isPurchase && (
          <>
            <Stat icon={FileText} label="POs pending approval" value={poStats.data?.pending ?? '—'} loading={poStats.isLoading} to="/pos?status=pending_approval" tone="amber" />
            <Stat icon={PackageOpen} label="Awaiting delivery" value={poStats.data?.awaiting ?? '—'} loading={poStats.isLoading} to="/pos?status=approved" tone="indigo" />
            <Stat icon={IndianRupee} label="PO value this FY" value={inr(poStats.data?.fyValue ?? 0, { compact: true })} loading={poStats.isLoading} to="/pos" tone="green" />
          </>
        )}
      </div>

      {canApprove && (
        <Card title="Waiting on your approval" className="mt-6" pad={false}
          actions={<Link to="/approvals" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">All approvals <ArrowRight className="h-3.5 w-3.5" /></Link>}>
          {myApprovals.isLoading ? (
            <div className="flex justify-center p-6"><Spinner /></div>
          ) : !myApprovals.data?.length ? (
            <p className="p-5 text-sm text-slate-400">Nothing pending — you're all caught up.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {myApprovals.data.map((s) => (
                <li key={s.id}>
                  <Link to={`/pos/${s.purchase_orders.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-indigo-50/40">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{s.purchase_orders.po_number || 'Draft'}</p>
                      <p className="truncate text-xs text-slate-400">{s.purchase_orders.vendors?.name} · {fmtDate(s.purchase_orders.order_date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-800">{inr(s.purchase_orders.grand_total)}</span>
                      <Badge tone="amber">Step {s.position}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {!isHr && !isPurchase && !canApprove && (
        <Card className="mt-6">
          <p className="text-sm text-slate-500">Your account has no roles yet. Ask an admin to assign you HR or Purchase access under Settings → Users.</p>
        </Card>
      )}
    </div>
  )
}
