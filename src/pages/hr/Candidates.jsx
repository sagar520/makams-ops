import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Briefcase, Link2, Copy, Ban, FileText, Trash2, Upload } from 'lucide-react'
import { supabase, formUrl } from '../../lib/supabase'
import {
  PageHeader, Button, Table, Th, Td, Tr, Badge, SearchInput, Tabs, Select, Input, Textarea,
  Field, Modal, EmptyState, FullPageSpinner, Card, useToast,
} from '../../components/ui'
import { CANDIDATE_STATUS, candidateStatusMeta } from '../../lib/constants'
import { fmtDate, fmtDateTime } from '../../lib/format'

export default function Candidates() {
  const [tab, setTab] = useState('pipeline')
  return (
    <div>
      <PageHeader
        title="Candidates"
        sub="Everyone in the talent pool — sourced via links, referrals, or added by hand. Separate from employees."
      />
      <Tabs
        className="mb-5 w-fit"
        tabs={[
          { value: 'pipeline', label: 'Candidate database' },
          { value: 'links', label: 'Sources & links' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'pipeline' ? <Pipeline /> : <SourceLinks />}
    </div>
  )
}

/* ================= candidate database ================= */

function Pipeline() {
  const qc = useQueryClient()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [editing, setEditing] = useState(null) // 'new' | candidate

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('candidates').select('*').order('created_at', { ascending: false }).limit(2000)
      if (error) throw error
      return data
    },
  })

  const filtered = useMemo(() => {
    let list = candidates || []
    if (statusFilter === 'open') list = list.filter((c) => !['hired', 'rejected'].includes(c.status))
    else if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter)
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      list = list.filter((c) =>
        [c.full_name, c.title, c.organization, c.email, c.phone, c.location, c.source]
          .filter(Boolean).some((v) => v.toLowerCase().includes(n))
      )
    }
    return list
  }, [candidates, q, statusFilter])

  const setStatus = async (c, status) => {
    const { error } = await supabase.from('candidates').update({ status }).eq('id', c.id)
    if (error) return toast(error.message, 'error')
    qc.invalidateQueries({ queryKey: ['candidates'] })
    toast(`${c.full_name.split(' ')[0]} → ${candidateStatusMeta(status).label}`)
  }

  const viewResume = async (c) => {
    if (!c.resume_path) return
    const { data, error } = await supabase.storage.from('form-uploads').createSignedUrl(c.resume_path, 300)
    if (error) return toast(error.message, 'error')
    window.open(data.signedUrl, '_blank')
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select className="w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="open">All open</option>
            <option value="all">Everyone</option>
            {CANDIDATE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, org, source…" className="w-72" />
        </div>
        <Button icon={Plus} onClick={() => setEditing('new')}>Add candidate</Button>
      </div>

      {!filtered.length ? (
        <EmptyState
          icon={Briefcase}
          title={q ? 'No matches' : 'No candidates here yet'}
          hint="Add someone manually, or share a source link (Sources & links tab) so industry contacts can submit candidates directly."
          action={!q && <Button icon={Plus} onClick={() => setEditing('new')}>Add candidate</Button>}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th><Th>Title</Th><Th>Organisation</Th><Th>Contact</Th><Th>Source</Th><Th>Resume</Th><Th>Status</Th><Th>Added</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-slate-900">
                  <button className="hover:text-indigo-600" onClick={() => setEditing(c)}>{c.full_name}</button>
                  {c.location && <p className="text-xs font-normal text-slate-400">{c.location}</p>}
                </Td>
                <Td>{c.title || '—'}</Td>
                <Td>{c.organization || '—'}</Td>
                <Td className="text-slate-500">
                  {c.phone || '—'}
                  {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                </Td>
                <Td className="text-xs text-slate-500">{c.source || '—'}</Td>
                <Td>
                  {c.resume_path || c.resume_name ? (
                    <button className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline" onClick={() => viewResume(c)}>
                      <FileText className="h-3.5 w-3.5" /> View
                    </button>
                  ) : <span className="text-slate-300">—</span>}
                </Td>
                <Td>
                  <Select
                    className="w-32 py-1 text-xs"
                    value={c.status}
                    onChange={(e) => setStatus(c, e.target.value)}
                  >
                    {CANDIDATE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </Td>
                <Td className="text-xs text-slate-400">{fmtDate(c.created_at)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && <CandidateModal candidate={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

const EMPTY = { full_name: '', title: '', organization: '', email: '', phone: '', location: '', source: '', status: 'new', notes: '' }

function CandidateModal({ candidate, onClose }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState(candidate ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, candidate[k] ?? ''])) } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const refresh = () => qc.invalidateQueries({ queryKey: ['candidates'] })

  const save = async () => {
    if (!form.full_name.trim()) return toast('Name is required', 'error')
    setSaving(true)
    try {
      const payload = { ...form }
      for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null
      if (!payload.source && !candidate) payload.source = 'Manual'
      if (candidate) {
        const { error } = await supabase.from('candidates').update(payload).eq('id', candidate.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('candidates').insert(payload)
        if (error) throw error
      }
      refresh()
      toast('Candidate saved')
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const uploadResume = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !candidate) return
    setUploading(true)
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80)
      const path = `manual/${candidate.id}/${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage.from('form-uploads').upload(path, file)
      if (upErr) throw upErr
      const { error } = await supabase.from('candidates').update({ resume_path: path, resume_name: file.name }).eq('id', candidate.id)
      if (error) throw error
      refresh()
      toast('Resume attached')
      onClose()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Remove ${candidate.full_name} from the candidate database?`)) return
    const { error } = await supabase.from('candidates').delete().eq('id', candidate.id)
    if (error) return toast(error.message, 'error')
    refresh()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={candidate ? candidate.full_name : 'Add candidate'} size="lg"
      sub={candidate?.source ? `Source: ${candidate.source}${candidate.created_at ? ` · added ${fmtDate(candidate.created_at)}` : ''}` : undefined}
      footer={
        <>
          {candidate && <Button variant="dangerSubtle" icon={Trash2} onClick={remove} className="mr-auto">Remove</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </>
      }>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required><Input value={form.full_name} onChange={set('full_name')} autoFocus={!candidate} /></Field>
        <Field label="Status">
          <Select value={form.status} onChange={set('status')}>
            {CANDIDATE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Current title / role"><Input value={form.title} onChange={set('title')} /></Field>
        <Field label="Current organisation"><Input value={form.organization} onChange={set('organization')} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Location"><Input value={form.location} onChange={set('location')} /></Field>
        <Field label="Source" hint="Who this candidate came from"><Input value={form.source} onChange={set('source')} placeholder="e.g. Consultant Ramesh / Referral / Naukri" /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={form.notes} onChange={set('notes')} /></Field>
        {candidate && (
          <div className="sm:col-span-2">
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={uploadResume} />
            <Button variant="secondary" size="sm" icon={Upload} loading={uploading} onClick={() => fileRef.current?.click()}>
              {candidate.resume_path || candidate.resume_name ? `Replace resume (${candidate.resume_name || 'file'})` : 'Attach resume'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ================= sources & links ================= */

function SourceLinks() {
  const qc = useQueryClient()
  const toast = useToast()
  const [creating, setCreating] = useState(false)

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['form-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_links')
        .select('*, form_templates(name, kind)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const copy = async (l) => {
    await navigator.clipboard.writeText(formUrl(l.token))
    toast('Link copied — share it with the source')
  }

  const toggle = async (l) => {
    const { error } = await supabase.from('form_links').update({ active: !l.active }).eq('id', l.id)
    if (error) return toast(error.message, 'error')
    qc.invalidateQueries({ queryKey: ['form-links'] })
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Each industry source gets their own link to a form built by the admin. Every submission lands in the candidate
            database, tagged with the source.
          </p>
          <Button icon={Link2} onClick={() => setCreating(true)}>New source link</Button>
        </div>
      </Card>

      {!links.length ? (
        <EmptyState icon={Link2} title="No source links yet" hint="Create one per consultant, campus cell, or referrer." />
      ) : (
        <Table>
          <thead>
            <tr><Th>Source</Th><Th>Form</Th><Th>Submissions</Th><Th>Status</Th><Th>Created</Th><Th /></tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <Tr key={l.id}>
                <Td className="font-medium text-slate-900">{l.source_name}</Td>
                <Td className="text-slate-500">
                  {l.form_templates?.name}
                  {l.form_templates?.kind === 'candidate_intake' && <Badge tone="indigo" className="ml-1.5">intake</Badge>}
                </Td>
                <Td><span className="font-semibold text-slate-800">{l.submission_count}</span></Td>
                <Td>{l.active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Disabled</Badge>}</Td>
                <Td className="text-xs text-slate-400">{fmtDateTime(l.created_at)}</Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="xs" icon={Copy} onClick={() => copy(l)}>Copy link</Button>
                    <Button variant="ghost" size="xs" icon={Ban} onClick={() => toggle(l)}>{l.active ? 'Disable' : 'Enable'}</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {creating && <NewLinkModal onClose={() => setCreating(false)} />}
    </div>
  )
}

function NewLinkModal({ onClose }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [formId, setFormId] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [created, setCreated] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data: forms = [] } = useQuery({
    queryKey: ['form-templates-active'],
    queryFn: async () => {
      const { data } = await supabase.from('form_templates').select('id, name, kind').eq('active', true).order('name')
      return data || []
    },
  })

  // default to the first intake form
  const intake = forms.filter((f) => f.kind === 'candidate_intake')
  const effectiveFormId = formId || intake[0]?.id || ''

  const create = async () => {
    if (!effectiveFormId) return toast('No active form found — ask the admin to create one under Settings → Forms', 'error')
    if (!sourceName.trim()) return toast('Name the source (e.g. "Consultant Ramesh")', 'error')
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('form_links')
        .insert({ form_id: effectiveFormId, source_name: sourceName.trim() })
        .select('token')
        .single()
      if (error) throw error
      setCreated(formUrl(data.token))
      qc.invalidateQueries({ queryKey: ['form-links'] })
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="New source link"
      footer={created
        ? <Button onClick={onClose}>Done</Button>
        : <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={create} loading={saving}>Create link</Button></>}>
      {created ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Share this with <span className="font-medium">{sourceName}</span> — it works without any login:</p>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <code className="min-w-0 flex-1 truncate text-xs text-slate-700">{created}</code>
            <Button size="xs" variant="secondary" icon={Copy} onClick={async () => { await navigator.clipboard.writeText(created); toast('Copied') }}>Copy</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Source name" required hint="Shown on every candidate they submit">
            <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Consultant Ramesh — TalentBridge" autoFocus />
          </Field>
          <Field label="Form">
            <Select value={effectiveFormId} onChange={(e) => setFormId(e.target.value)}>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.name}{f.kind === 'candidate_intake' ? ' (candidate intake)' : ''}</option>)}
            </Select>
          </Field>
        </div>
      )}
    </Modal>
  )
}
