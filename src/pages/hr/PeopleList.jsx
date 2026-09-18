import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Upload, Users, RefreshCw, Sheet, Search } from 'lucide-react'
import { supabase, callFunction } from '../../lib/supabase'
import { PageHeader, Button, Table, Th, Td, Tr, Badge, SearchInput, Tabs, EmptyState, FullPageSpinner, Modal, useToast } from '../../components/ui'
import { peopleStatusMeta, salesRoleLabel } from '../../lib/constants'
import { fmtDate } from '../../lib/format'

export default function PeopleList() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'active'
  const [q, setQ] = useState('')
  const [importing, setImporting] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

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

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Employees"
        sub="The sales force. The HR Google Sheet is the roster — import it here to bring the app up to date."
        actions={
          <>
            <Button variant="secondary" icon={Sheet} onClick={() => setImporting(true)}>Import from sheet</Button>
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
      {importing && <SheetImportModal onClose={() => setImporting(false)} />}
    </div>
  )
}

/** Bring the roster in from the HR Google Sheet. The sheet is the source of truth. */
function SheetImportModal({ onClose }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(null)   // 'check' | 'import'
  const [result, setResult] = useState(null)

  const { data: setting } = useQuery({
    queryKey: ['employee-sheet-setting'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'employee_sheet').maybeSingle()
      return data?.value || null
    },
  })

  const run = async (dryRun) => {
    setBusy(dryRun ? 'check' : 'import')
    setResult(null)
    try {
      const res = await callFunction('import-employees', { dry_run: dryRun })
      if (res.error) throw new Error(res.error)
      setResult(res)
      if (!dryRun) {
        toast(`${res.added} added, ${res.updated} updated`)
        qc.invalidateQueries({ queryKey: ['people'] })
      }
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal open onClose={onClose} title="Import employees from the HR sheet" size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="secondary" icon={Search} loading={busy === 'check'} onClick={() => run(true)}>Dry run</Button>
          <Button icon={RefreshCw} loading={busy === 'import'} onClick={() => run(false)}>Import</Button>
        </>
      }>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Reads the <span className="font-medium">{setting?.tab || 'Master Sheet'}</span> tab: HQ, ASM, RSM, SBU Head,
          EmpCode, Name, Email, Mobile, DOJ and Active/Inactive. People are matched on EmpCode first, then mobile, then
          name — so importing again updates rather than duplicates. Blank cells leave the app's value alone.
        </p>
        {setting?.sheet_id && (
          <p className="truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">{setting.sheet_id}</p>
        )}
        <p className="text-xs text-slate-400">
          Try <span className="font-medium">Dry run</span> first — it reports what would change without writing anything.
        </p>

        {result && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-800">{result.dry_run ? 'Dry run — nothing written' : 'Imported'}</p>
            <p className="mt-1 text-slate-600">
              {result.scanned} rows scanned · {result.dry_run ? result.would_add : result.added} new ·{' '}
              {result.dry_run ? result.would_update : result.updated} updated
              {result.skipped?.length ? ` · ${result.skipped.length} skipped` : ''}
            </p>
            {result.matched_columns?.length > 0 && (
              <p className="mt-1.5 text-xs text-slate-400">Columns matched: {result.matched_columns.join(', ')}</p>
            )}
            {result.skipped?.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-slate-500">
                {result.skipped.slice(0, 40).map((sk, i) => (
                  <li key={i}>Row {sk.row}{sk.name ? ` (${sk.name})` : ''} — {sk.reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
