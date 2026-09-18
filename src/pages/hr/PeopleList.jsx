import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Users, RefreshCw, Sheet, Search } from 'lucide-react'
import { supabase, callFunction } from '../../lib/supabase'
import { PageHeader, Button, Table, Th, Td, Tr, Badge, SearchInput, Select, EmptyState, FullPageSpinner, Modal, useToast } from '../../components/ui'
import { salesRoleLabel } from '../../lib/constants'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { fmtMobile } from '../../lib/phone'

export default function PeopleList() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'active'
  const [q, setQ] = useState('')
  const [importing, setImporting] = useState(false)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()

  // The HR sheet is the roster: pull anything new in whenever this page opens.
  // The function itself throttles, so this is cheap on repeat visits.
  const autoSync = useQuery({
    queryKey: ['employees-auto-sync'],
    staleTime: 30 * 60_000,
    retry: false,
    queryFn: async () => {
      const res = await callFunction('import-employees', { auto: true })
      if (res.error) throw new Error(res.error)
      return res
    },
  })

  useEffect(() => {
    if (autoSync.data && !autoSync.data.skipped && (autoSync.data.added || autoSync.data.updated)) {
      qc.invalidateQueries({ queryKey: ['people'] })
    }
  }, [autoSync.data]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const list = people || []
    return {
      active: list.filter((p) => p.status === 'active').length,
      exited: list.filter((p) => p.status !== 'active').length,
      all: list.length,
    }
  }, [people])

  const filtered = useMemo(() => {
    let list = status === 'all' ? (people || []) : (people || []).filter((p) => (status === 'active' ? p.status === 'active' : p.status !== 'active'))
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
        sub={syncLine(autoSync)}
        actions={
          <>
            <Button variant="secondary" icon={Sheet} onClick={() => setImporting(true)}>Import from sheet</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select
          className="w-56"
          value={status}
          onChange={(e) => setParams(e.target.value === 'active' ? {} : { status: e.target.value })}
        >
          <option value="active">Active ({counts.active})</option>
          <option value="exited">Inactive ({counts.exited})</option>
          <option value="all">Active + inactive ({counts.all})</option>
        </Select>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, code, department…" className="w-72" />
      </div>

      {!filtered.length ? (
        <EmptyState
          icon={Users}
          title={q ? 'No matches' : 'Nobody here yet'}
          hint={!q ? 'The roster comes from the HR Google Sheet — it syncs when this page opens.' : undefined}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Emp ID</Th>
              <Th>Level</Th>
              <Th>Location</Th>
              <Th>ASM</Th>
              <Th>Contact</Th>
              <Th>Email</Th>
              <Th>Joining Date</Th>
              <Th>LearnApp Status</Th>
              <Th>Status</Th>
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
                <Td className="whitespace-nowrap text-slate-500">{p.phone ? fmtMobile(p.phone) : '—'}</Td>
                <Td className="text-slate-500">{p.personal_email || p.work_email || '—'}</Td>
                <Td className="whitespace-nowrap">{fmtDate(p.date_of_join)}</Td>
                <Td>
                  {p.learnapp_status === 'active' && <Badge tone="green">Active</Badge>}
                  {p.learnapp_status === 'disabled' && <Badge tone="gray">Disabled</Badge>}
                  {!p.learnapp_status && <span className="text-slate-300">—</span>}
                </Td>
                <Td>
                  {p.status === 'active'
                    ? <Badge tone="green">Active</Badge>
                    : <Badge tone="gray">Inactive</Badge>}
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
            {result.vacant > 0 && (
              <p className="mt-1 text-orange-800">
                {result.vacant} vacant position{result.vacant === 1 ? '' : 's'}:{' '}
                {result.vacancies.slice(0, 8).map((v) => [v.designation, v.location].filter(Boolean).join(' ')).join(', ')}
                {result.vacancies.length > 8 ? ` +${result.vacancies.length - 8} more` : ''}
              </p>
            )}
            {result.levels && (
              <p className="mt-1 text-slate-600">
                Levels read from HQ Name: {result.levels.sales} sales rep, {result.levels.asm} sales manager,{' '}
                {result.levels.rsm} regional manager
                {result.levels.unknown ? `, ${result.levels.unknown} unrecognised` : ''}
              </p>
            )}
            {result.unknown_prefixes?.length > 0 && (
              <p className="mt-1 text-xs text-orange-700">
                Prefixes not recognised: {result.unknown_prefixes.join(', ')} — those rows keep their current level.
              </p>
            )}
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

/** One quiet line about the automatic sheet sync. */
function syncLine(q) {
  if (q.isFetching) return 'The sales force — checking the HR sheet for changes…'
  const d = q.data
  if (q.error) return `The sales force. Automatic sheet sync is not running: ${q.error.message}`
  if (!d) return 'The sales force. The HR Google Sheet is the roster.'
  const at = d.skipped ? d.last_import_at : new Date().toISOString()
  const when = at ? fmtDateTime(at) : 'just now'
  const r = d.skipped ? d.last_result : d
  const changed = r ? `${r.added} new, ${r.updated} updated` : 'no changes'
  const vacant = r?.vacant ? `, ${r.vacant} vacant position${r.vacant === 1 ? '' : 's'}` : ''
  return `The sales force, synced from the HR sheet — last read ${when} (${changed}${vacant}).`
}
