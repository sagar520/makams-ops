import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader, Button, Table, Th, Td, Tr, Badge, SearchInput, Tabs, EmptyState, FullPageSpinner } from '../../components/ui'
import { PO_STATUS, RECEIVED_STATUS } from '../../lib/constants'
import { inr, fmtDate } from '../../lib/format'

export default function POList() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'all'
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const { hasRole } = useAuth()

  const { data: pos, isLoading } = useQuery({
    queryKey: ['pos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, received_status, order_date, expected_date, grand_total, sent_count, vendors(name), po_types(name), delivery_locations(name), created_at')
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      return data
    },
  })

  const counts = useMemo(() => {
    const c = { all: pos?.length || 0 }
    for (const p of pos || []) c[p.status] = (c[p.status] || 0) + 1
    return c
  }, [pos])

  const filtered = useMemo(() => {
    let list = pos || []
    if (status !== 'all') list = list.filter((p) => p.status === status)
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      list = list.filter((p) => [p.po_number, p.vendors?.name, p.po_types?.name].filter(Boolean).some((x) => x.toLowerCase().includes(n)))
    }
    return list
  }, [pos, status, q])

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        actions={hasRole('purchase') && <Button icon={Plus} onClick={() => navigate('/pos/new')}>New PO</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'draft', label: 'Drafts', count: counts.draft || 0 },
            { value: 'pending_approval', label: 'Pending', count: counts.pending_approval || 0 },
            { value: 'approved', label: 'Approved', count: counts.approved || 0 },
            { value: 'rejected', label: 'Rejected', count: counts.rejected || 0 },
            { value: 'closed', label: 'Closed', count: counts.closed || 0 },
          ]}
          value={status}
          onChange={(v) => setParams(v === 'all' ? {} : { status: v })}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search PO no, vendor…" className="w-72" />
      </div>

      {!filtered.length ? (
        <EmptyState icon={FileText} title={q ? 'No matches' : 'No purchase orders here yet'}
          action={hasRole('purchase') && !q && <Button icon={Plus} onClick={() => navigate('/pos/new')}>New PO</Button>} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>PO no.</Th><Th>Vendor</Th><Th>Type</Th><Th>Date</Th><Th right>Amount</Th><Th>Status</Th><Th>Goods</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const st = PO_STATUS[p.status] || {}
              const rc = RECEIVED_STATUS[p.received_status] || {}
              return (
                <Tr key={p.id} onClick={() => navigate(`/pos/${p.id}`)}>
                  <Td className="font-medium text-slate-900">
                    <Link to={`/pos/${p.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-red-600">
                      {p.po_number || <span className="italic text-slate-400">draft</span>}
                    </Link>
                  </Td>
                  <Td>{p.vendors?.name || '—'}</Td>
                  <Td className="text-slate-500">{p.po_types?.name || '—'}</Td>
                  <Td>{fmtDate(p.order_date)}</Td>
                  <Td right className="font-semibold text-slate-800">{inr(p.grand_total)}</Td>
                  <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                  <Td>
                    {p.status === 'approved' || p.status === 'closed'
                      ? <Badge tone={rc.tone}>{rc.label}</Badge>
                      : <span className="text-slate-300">—</span>}
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </div>
  )
}
