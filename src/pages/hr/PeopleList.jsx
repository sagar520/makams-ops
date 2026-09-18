import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { UserPlus, Upload, Users, RefreshCw } from 'lucide-react'
import { supabase, callFunction } from '../../lib/supabase'
import { PageHeader, Button, Table, Th, Td, Tr, Badge, SearchInput, Tabs, EmptyState, FullPageSpinner, useToast } from '../../components/ui'
import { peopleStatusMeta, salesRoleLabel } from '../../lib/constants'
import { fmtDate } from '../../lib/format'

export default function PeopleList() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'active'
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)

  const { data: people, isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .select('id, emp_code, full_name, status, sales_role, hq_name, asm_name, phone, personal_email, work_email, date_of_join, date_of_exit, learnapp_status')
        .order('full_name')
        .limit(2000)
      if (error) throw error
      return data
    },
  })

  const counts = useMemo(() => {
    const c = { active: 0, joining: 0, exited: 0, not_joined: 0 }
    for (const p of people || []) c[p.status] = (c[p.status] || 0) + 1
    return c
  }, [people])

  const filtered = useMemo(() => {
    let list = (people || []).filter((p) => p.status === status)
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter((p) =>
        [p.full_name, p.emp_code, p.hq_name, p.asm_name, p.phone, p.personal_email, p.work_email]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(needle))
      )
    }
    return list
  }, [people, status, q])

  const syncSheet = async () => {
    setSyncing(true)
    try {
      const res = await callFunction('sync-sheet', {})
      toast(`Google Sheet updated — ${res?.rows ?? 'all'} rows pushed`)
    } catch (e) {
      toast(`Sheet sync failed: ${e.message}`, 'error')
    } finally {
      setSyncing(false)
    }
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Employees"
        sub="The sales force — source of truth for the employee sheet and learnapp accounts."
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} loading={syncing} onClick={syncSheet}>Sync sheet</Button>
            <Button variant="secondary" icon={Upload} onClick={() => navigate('/people/import')}>Import CSV</Button>
            <Button icon={UserPlus} onClick={() => navigate('/people/new')}>Add person</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { value: 'active', label: 'Active', count: counts.active },
            { value: 'joining', label: 'Joining', count: counts.joining },
            { value: 'exited', label: 'Exited', count: counts.exited },
            { value: 'not_joined', label: 'Not joined', count: counts.not_joined },
          ]}
          value={status}
          onChange={(v) => setParams(v === 'active' ? {} : { status: v })}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search name, code, department…" className="w-72" />
      </div>

      {!filtered.length ? (
        <EmptyState
          icon={Users}
          title={q ? 'No matches' : `No ${peopleStatusMeta(status).label.toLowerCase()} people yet`}
          hint={status === 'active' && !q ? 'Import your current employee Google Sheet to get started.' : undefined}
          action={status === 'active' && !q ? <Button variant="secondary" icon={Upload} onClick={() => navigate('/people/import')}>Import CSV</Button> : undefined}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>EMP ID</Th>
              <Th>Level</Th>
              <Th>HQ</Th>
              <Th>ASM</Th>
              <Th>Contact</Th>
              <Th>{status === 'exited' ? 'Exit date' : 'Joined'}</Th>
              <Th>Learnapp</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <Tr key={p.id} onClick={() => navigate(`/people/${p.id}`)}>
                <Td className="font-medium text-slate-900">
                  <Link to={`/people/${p.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-red-600">
                    {p.full_name}
                  </Link>
                </Td>
                <Td className="text-slate-500">{p.emp_code || '—'}</Td>
                <Td>{salesRoleLabel(p.sales_role)}</Td>
                <Td>{p.hq_name || '—'}</Td>
                <Td className="text-slate-500">{p.asm_name || '—'}</Td>
                <Td className="text-slate-500">{p.phone || p.personal_email || p.work_email || '—'}</Td>
                <Td>{fmtDate(status === 'exited' ? p.date_of_exit : p.date_of_join)}</Td>
                <Td>
                  {p.learnapp_status === 'active' && <Badge tone="green">Active</Badge>}
                  {p.learnapp_status === 'disabled' && <Badge tone="gray">Disabled</Badge>}
                  {!p.learnapp_status && <span className="text-slate-300">—</span>}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}
