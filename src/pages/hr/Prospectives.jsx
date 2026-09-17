import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ClipboardList, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  PageHeader, Button, Table, Th, Td, Tr, Badge, SearchInput, Tabs, Select, Input,
  Field, Modal, EmptyState, FullPageSpinner, useToast,
} from '../../components/ui'
import { PROSPECTIVE_STATUS, PROSPECTIVE_SOURCES, prospectiveStatusMeta } from '../../lib/constants'
import { fmtDate } from '../../lib/format'

export default function Prospectives() {
  const qc = useQueryClient()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [areaFilter, setAreaFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [editing, setEditing] = useState(null) // 'new' | row

  const { data: rows, isLoading } = useQuery({
    queryKey: ['prospectives'],
    queryFn: async () => {
      const { data, error } = await supabase.from('prospectives').select('*').order('created_at', { ascending: false }).limit(2000)
      if (error) throw error
      return data
    },
  })

  const areas = useMemo(() => [...new Set((rows || []).map((r) => r.area).filter(Boolean))].sort(), [rows])

  const counts = useMemo(() => {
    const c = { open: 0 }
    for (const r of rows || []) {
      c[r.status] = (c[r.status] || 0) + 1
      if (!['rejected', 'joined'].includes(r.status)) c.open++
    }
    return c
  }, [rows])

  const filtered = useMemo(() => {
    let list = rows || []
    if (statusFilter === 'open') list = list.filter((r) => !['rejected', 'joined'].includes(r.status))
    else if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter)
    if (areaFilter) list = list.filter((r) => r.area === areaFilter)
    if (sourceFilter) list = list.filter((r) => (r.source || 'Other') === sourceFilter)
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      list = list.filter((r) => [r.full_name, r.designation, r.area, r.contact].filter(Boolean).some((v) => v.toLowerCase().includes(n)))
    }
    return list
  }, [rows, statusFilter, areaFilter, sourceFilter, q])

  const setStatus = async (row, status) => {
    const { error } = await supabase.from('prospectives').update({ status }).eq('id', row.id)
    if (error) return toast(error.message, 'error')
    qc.invalidateQueries({ queryKey: ['prospectives'] })
    toast(`${row.full_name.split(' ')[0]} → ${prospectiveStatusMeta(status).label}`)
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Prospectives"
        sub="The active hiring sheet — everyone HR is currently working on."
        actions={<Button icon={Plus} onClick={() => setEditing('new')}>Add prospective</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select className="w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="open">All open ({counts.open})</option>
          <option value="all">Everyone</option>
          {PROSPECTIVE_STATUS.map((s) => (
            <option key={s.value} value={s.value}>{s.label} ({counts[s.value] || 0})</option>
          ))}
        </Select>
        <Select className="w-44" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
          <option value="">All areas</option>
          {areas.map((a) => <option key={a}>{a}</option>)}
        </Select>
        <Select className="w-44" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">All sources</option>
          {PROSPECTIVE_SOURCES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, designation, area…" className="w-72" />
      </div>

      {!filtered.length ? (
        <EmptyState
          icon={ClipboardList}
          title={q || areaFilter ? 'No matches' : 'Nothing on the sheet yet'}
          hint="Add prospectives by hand, or push promising referrals across from the Candidates DB."
          action={!q && <Button icon={Plus} onClick={() => setEditing('new')}>Add prospective</Button>}
        />
      ) : (
        <Table>
          <thead>
            <tr><Th>Name</Th><Th>Designation</Th><Th>Area</Th><Th>Contact</Th><Th>Source</Th><Th>Status</Th><Th>Added</Th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-slate-900">
                  <button className="hover:text-indigo-600" onClick={() => setEditing(r)}>{r.full_name}</button>
                  {r.candidate_id && <Badge tone="slate" className="ml-2">from DB</Badge>}
                </Td>
                <Td>{r.designation || '—'}</Td>
                <Td>{r.area || '—'}</Td>
                <Td className="text-slate-500">{r.contact || '—'}</Td>
                <Td className="text-slate-600">{r.source || 'Other'}</Td>
                <Td>
                  <Select className="w-44 py-1 text-xs" value={r.status} onChange={(e) => setStatus(r, e.target.value)}>
                    {PROSPECTIVE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </Td>
                <Td className="text-xs text-slate-400">{fmtDate(r.created_at)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && <ProspectiveModal row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

const EMPTY = { full_name: '', designation: '', area: '', contact: '', source: 'Other', status: 'new' }

function ProspectiveModal({ row, onClose }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState(row ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, row[k] ?? ''])) } : EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.full_name.trim()) return toast('Name is required', 'error')
    setSaving(true)
    try {
      const payload = { ...form }
      for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null
      const qy = row
        ? supabase.from('prospectives').update(payload).eq('id', row.id)
        : supabase.from('prospectives').insert(payload)
      const { error } = await qy
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['prospectives'] })
      toast('Saved')
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Remove ${row.full_name} from the sheet?`)) return
    const { error } = await supabase.from('prospectives').delete().eq('id', row.id)
    if (error) return toast(error.message, 'error')
    qc.invalidateQueries({ queryKey: ['prospectives'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={row ? row.full_name : 'Add prospective'}
      footer={
        <>
          {row && <Button variant="dangerSubtle" icon={Trash2} onClick={remove} className="mr-auto">Remove</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </>
      }>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2"><Input value={form.full_name} onChange={set('full_name')} autoFocus={!row} /></Field>
        <Field label="Designation"><Input value={form.designation} onChange={set('designation')} placeholder="e.g. Area Sales Manager" /></Field>
        <Field label="Area"><Input value={form.area} onChange={set('area')} placeholder="e.g. Ludhiana / Jalandhar" /></Field>
        <Field label="Contact"><Input value={form.contact} onChange={set('contact')} placeholder="Phone / email" /></Field>
        <Field label="Source">
          <Select value={form.source || 'Other'} onChange={set('source')}>
            {PROSPECTIVE_SOURCES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={set('status')}>
            {PROSPECTIVE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  )
}
