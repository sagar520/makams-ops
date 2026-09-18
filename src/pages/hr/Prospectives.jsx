import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ClipboardList, Trash2, Paperclip, Upload, X, Pencil, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  PageHeader, Button, Table, Th, Td, Tr, Badge, SearchInput, Tabs, Select, Input,
  Field, Modal, EmptyState, FullPageSpinner, useToast, cx,
} from '../../components/ui'
import { PROSPECTIVE_STATUS, PROSPECTIVE_SOURCES, PROSPECTIVE_DEPARTMENTS, PROSPECTIVE_STATUS_CLS, PROSPECTIVE_ROW_CLS, prospectiveStatusMeta } from '../../lib/constants'
import { fmtDate } from '../../lib/format'

export default function Prospectives() {
  const qc = useQueryClient()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [areaFilter, setAreaFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [editing, setEditing] = useState(null) // 'new' | row
  const [opening, setOpening] = useState(null)

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
    if (deptFilter) list = list.filter((r) => (r.department || 'Sales') === deptFilter)
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      list = list.filter((r) => [r.full_name, r.designation, r.area, r.contact].filter(Boolean).some((v) => v.toLowerCase().includes(n)))
    }
    return list
  }, [rows, statusFilter, areaFilter, sourceFilter, deptFilter, q])

  const openResume = async (row) => {
    setOpening(row.id)
    try {
      const { data, error } = await supabase.storage.from('prospective-resumes').createSignedUrl(row.resume_path, 300)
      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setOpening(null)
    }
  }

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
        <Select className="w-44" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">All departments</option>
          {PROSPECTIVE_DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
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
            <tr><Th>Name</Th><Th>Department</Th><Th>Area</Th><Th>Contact</Th><Th>Source</Th><Th>Status</Th><Th>Last updated</Th><Th /></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <Tr key={r.id} className={PROSPECTIVE_ROW_CLS[r.status]}>
                <Td className="font-semibold">
                  <button className="hover:underline" onClick={() => setEditing(r)}>{r.full_name}</button>
                  {r.candidate_id && <Badge tone="slate" className="ml-2">from DB</Badge>}
                </Td>
                <Td className="whitespace-nowrap opacity-80">{r.department || 'Sales'}</Td>
                <Td className="opacity-80">{r.area || '—'}</Td>
                <Td className="opacity-70">{r.contact || '—'}</Td>
                <Td className="opacity-70">{r.source || 'Other'}</Td>
                <Td>
                  <Select
                    className={cx('w-52 py-1 text-xs font-medium', PROSPECTIVE_STATUS_CLS[r.status])}
                    value={r.status}
                    onChange={(e) => setStatus(r, e.target.value)}
                  >
                    {PROSPECTIVE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </Td>
                <Td className="whitespace-nowrap text-xs opacity-60">{fmtDate(r.updated_at || r.created_at)}</Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    {r.resume_path ? (
                      <Button variant="secondary" size="xs" icon={FileText} loading={opening === r.id} onClick={() => openResume(r)}>
                        Resume
                      </Button>
                    ) : (
                      <Button variant="ghost" size="xs" icon={Upload} onClick={() => setEditing(r)}>Add resume</Button>
                    )}
                    <Button variant="ghost" size="xs" icon={Pencil} onClick={() => setEditing(r)}>Edit</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && <ProspectiveModal row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

const EMPTY = { full_name: '', department: 'Sales', designation: '', area: '', contact: '', source: 'Other', status: 'new' }

const RESUME_OK = /\.(pdf|docx?|jpe?g|png)$/i

function ProspectiveModal({ row, onClose }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState(row ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, row[k] ?? ''])) } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [resume, setResume] = useState(null)                       // newly picked file
  const [existing, setExisting] = useState(row?.resume_path ? { path: row.resume_path, name: row.resume_name } : null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const pickResume = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 15 * 1024 * 1024) return toast('File is too large (max 15 MB)', 'error')
    if (!RESUME_OK.test(file.name)) return toast('Upload a PDF, Word file or image', 'error')
    setResume(file)
  }

  const openExisting = async () => {
    const { data, error } = await supabase.storage.from('prospective-resumes').createSignedUrl(existing.path, 300)
    if (error) return toast(error.message, 'error')
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const save = async () => {
    if (!form.full_name.trim()) return toast('Name is required', 'error')
    setSaving(true)
    try {
      const payload = { ...form }
      for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null

      // resume: upload the new one, or clear what was there
      if (resume) {
        const safe = resume.name.replace(/[^\w.\-]+/g, '_').slice(-80)
        const path = `${row?.id || 'new'}/${Date.now()}_${safe}`
        const { error: upErr } = await supabase.storage.from('prospective-resumes').upload(path, resume)
        if (upErr) throw upErr
        payload.resume_path = path
        payload.resume_name = resume.name
        if (existing?.path) await supabase.storage.from('prospective-resumes').remove([existing.path])
      } else if (row?.resume_path && !existing) {
        await supabase.storage.from('prospective-resumes').remove([row.resume_path])
        payload.resume_path = null
        payload.resume_name = null
      }

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
    if (row.resume_path) await supabase.storage.from('prospective-resumes').remove([row.resume_path])
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
        <Field label="Department" hint="Only Sales prospectives are mirrored into the Candidates DB">
          <Select value={form.department || 'Sales'} onChange={set('department')}>
            {PROSPECTIVE_DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Designation"><Input value={form.designation} onChange={set('designation')} placeholder="e.g. Area Sales Manager" /></Field>
        <Field label="Area"><Input value={form.area} onChange={set('area')} placeholder="e.g. Ludhiana / Jalandhar" /></Field>
        <Field label="Contact"><Input value={form.contact} onChange={set('contact')} placeholder="Phone / email" /></Field>
        <Field label="Source">
          <Select value={form.source || 'Other'} onChange={set('source')}>
            {PROSPECTIVE_SOURCES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select className={cx('font-medium', PROSPECTIVE_STATUS_CLS[form.status])} value={form.status} onChange={set('status')}>
            {PROSPECTIVE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Resume" hint="Optional — PDF, Word or image, max 15 MB" className="sm:col-span-2">
          {resume ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              <Paperclip className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{resume.name}</span>
              <button className="text-emerald-600 hover:text-red-600" onClick={() => setResume(null)}><X className="h-4 w-4" /></button>
            </div>
          ) : existing ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
              <button className="min-w-0 flex-1 truncate text-left hover:text-red-600" onClick={openExisting}>
                {existing.name || 'Resume on file'}
              </button>
              <button className="text-slate-400 hover:text-red-600" title="Remove on save" onClick={() => setExisting(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 transition-colors hover:border-red-400 hover:bg-red-50/30">
              <Upload className="h-4 w-4 shrink-0" />
              <span>Attach a resume</span>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={pickResume} />
            </label>
          )}
        </Field>
      </div>
    </Modal>
  )
}
