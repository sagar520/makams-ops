import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Briefcase, Link2, Copy, Ban, Trash2, ClipboardList, Check, Inbox, Pencil, X } from 'lucide-react'
import { supabase, formUrl } from '../../lib/supabase'
import {
  PageHeader, Button, Table, Th, Td, Tr, Badge, SearchInput, Tabs, Select, Input, Textarea,
  Field, Modal, EmptyState, FullPageSpinner, Card, Checkbox, useToast, cx,
} from '../../components/ui'
import { fmtDate, fmtDateTime } from '../../lib/format'

export default function Candidates() {
  const [tab, setTab] = useState('db')

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['referral-submissions-pending-count'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from('referral_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      return count ?? 0
    },
  })

  return (
    <div>
      <PageHeader
        title="Candidates DB"
        sub="The referral database — everyone recommended to Makams, whoever sent them. New submissions wait for your approval first."
      />
      <Tabs
        className="mb-5 w-fit"
        tabs={[
          { value: 'db', label: 'Database' },
          { value: 'submissions', label: 'Submissions', count: pendingCount },
          { value: 'links', label: 'Referral links' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'db' && <Database />}
      {tab === 'submissions' && <Submissions />}
      {tab === 'links' && <ReferralLinks />}
    </div>
  )
}

/* ================= submissions (review queue) ================= */

function Submissions() {
  const qc = useQueryClient()
  const toast = useToast()
  const [showReviewed, setShowReviewed] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['referral-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      return data
    },
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['referral-submissions'] })
    qc.invalidateQueries({ queryKey: ['referral-submissions-pending-count'] })
    qc.invalidateQueries({ queryKey: ['candidates'] })
  }

  const visible = showReviewed ? subs : subs.filter((s) => s.status === 'pending')

  // group by submission (response), newest first
  const groups = useMemo(() => {
    const map = new Map()
    for (const s of visible) {
      const key = s.response_id || s.id
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    }
    return [...map.values()]
  }, [visible])

  const approve = async (entry) => {
    setBusyId(entry.id)
    try {
      const { error } = await supabase.rpc('approve_referral_submission', { p_id: entry.id })
      if (error) throw error
      toast(`${entry.full_name} added to the Candidates DB`)
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (entry) => {
    const { error } = await supabase
      .from('referral_submissions')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', entry.id)
    if (error) return toast(error.message, 'error')
    refresh()
  }

  const approveAll = async (entries) => {
    const pending = entries.filter((e) => e.status === 'pending')
    setBusyId('all')
    try {
      for (const e of pending) {
        const { error } = await supabase.rpc('approve_referral_submission', { p_id: e.id })
        if (error) throw error
      }
      toast(`${pending.length} candidate${pending.length > 1 ? 's' : ''} added to the DB`)
      refresh()
    } catch (e) {
      toast(e.message, 'error')
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Everything sent in through referral links. Fix any details, then approve into the database — or reject.
        </p>
        <Checkbox label="Show reviewed" checked={showReviewed} onChange={(e) => setShowReviewed(e.target.checked)} />
      </div>

      {!groups.length ? (
        <EmptyState icon={Inbox} title="No pending submissions" hint="New referral-form submissions land here for review." />
      ) : (
        groups.map((entries) => {
          const head = entries[0]
          const pending = entries.filter((e) => e.status === 'pending')
          return (
            <Card key={head.response_id || head.id} pad={false}
              title={
                <span>
                  {head.referred_by_name || 'Unknown referrer'}
                  {head.referrer_emp_id && <Badge tone="slate" className="ml-2">{head.referrer_emp_id}</Badge>}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {head.source} · {fmtDateTime(head.created_at)}
                  </span>
                </span>
              }
              actions={pending.length > 1 && (
                <Button size="xs" variant="secondary" icon={Check} loading={busyId === 'all'} onClick={() => approveAll(entries)}>
                  Approve all ({pending.length})
                </Button>
              )}>
              <ul className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className={cx('text-sm font-medium', e.status === 'rejected' ? 'text-slate-400 line-through' : 'text-slate-900')}>
                        {e.full_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {[e.designation, e.area, e.current_company, e.phone].filter(Boolean).join(' · ') || 'no details'}
                      </p>
                    </div>
                    {e.status === 'pending' ? (
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="xs" icon={Pencil} onClick={() => setEditing(e)}>Edit</Button>
                        <Button variant="dangerSubtle" size="xs" icon={X} onClick={() => reject(e)}>Reject</Button>
                        <Button variant="success" size="xs" icon={Check} loading={busyId === e.id} onClick={() => approve(e)}>Approve</Button>
                      </div>
                    ) : e.status === 'approved' ? (
                      <Badge tone="green"><Check className="h-3 w-3" /> In DB</Badge>
                    ) : (
                      <Badge tone="red">Rejected</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )
        })
      )}

      {editing && <SubmissionModal entry={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  )
}

function SubmissionModal({ entry, onClose, onSaved }) {
  const toast = useToast()
  const KEYS = ['referred_by_name', 'referrer_emp_id', 'full_name', 'designation', 'area', 'current_company', 'phone']
  const [form, setForm] = useState(Object.fromEntries(KEYS.map((k) => [k, entry[k] ?? ''])))
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (thenApprove = false) => {
    if (!form.full_name.trim()) return toast('Candidate name is required', 'error')
    setSaving(true)
    try {
      const payload = {}
      for (const k of KEYS) payload[k] = form[k] === '' ? null : form[k]
      const { error } = await supabase.from('referral_submissions').update(payload).eq('id', entry.id)
      if (error) throw error
      if (thenApprove) {
        const { error: e2 } = await supabase.rpc('approve_referral_submission', { p_id: entry.id })
        if (e2) throw e2
        toast(`${form.full_name} added to the Candidates DB`)
      } else {
        toast('Saved')
      }
      onSaved()
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Edit submission — ${entry.full_name}`} size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" onClick={() => save(false)} loading={saving}>Save</Button>
          <Button variant="success" icon={Check} onClick={() => save(true)} loading={saving}>Save & approve</Button>
        </>
      }>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Referred by (name)"><Input value={form.referred_by_name} onChange={set('referred_by_name')} /></Field>
        <Field label="Referrer EMP ID"><Input value={form.referrer_emp_id} onChange={set('referrer_emp_id')} /></Field>
        <Field label="Candidate name" required><Input value={form.full_name} onChange={set('full_name')} /></Field>
        <Field label="Area"><Input value={form.area} onChange={set('area')} /></Field>
        <Field label="Designation"><Input value={form.designation} onChange={set('designation')} /></Field>
        <Field label="Current company"><Input value={form.current_company} onChange={set('current_company')} /></Field>
        <Field label="Phone number"><Input value={form.phone} onChange={set('phone')} /></Field>
      </div>
    </Modal>
  )
}

/* ================= database ================= */

function Database() {
  const qc = useQueryClient()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [refFilter, setRefFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [pickingId, setPickingId] = useState(null)

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('candidates').select('*').order('created_at', { ascending: false }).limit(3000)
      if (error) throw error
      return data
    },
  })

  const referrers = useMemo(() => [...new Set((candidates || []).map((c) => c.referred_by_name).filter(Boolean))].sort(), [candidates])

  const filtered = useMemo(() => {
    let list = candidates || []
    if (refFilter) list = list.filter((c) => c.referred_by_name === refFilter)
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      list = list.filter((c) =>
        [c.full_name, c.designation, c.area, c.current_company, c.phone, c.referred_by_name, c.referrer_emp_id, c.hr_comment]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(n))
      )
    }
    return list
  }, [candidates, q, refFilter])

  const addToProspectives = async (c) => {
    setPickingId(c.id)
    try {
      const { data: pros, error } = await supabase
        .from('prospectives')
        .insert({ full_name: c.full_name, designation: c.designation, area: c.area, contact: c.phone, status: 'new', candidate_id: c.id, source: c.referrer_emp_id ? 'Internal Referral' : 'Other' })
        .select('id')
        .single()
      if (error) throw error
      const { error: e2 } = await supabase.from('candidates')
        .update({ picked_at: new Date().toISOString(), prospective_id: pros.id }).eq('id', c.id)
      if (e2) throw e2
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['prospectives'] })
      toast(`${c.full_name.split(' ')[0]} added to Prospectives`)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setPickingId(null)
    }
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select className="w-56" value={refFilter} onChange={(e) => setRefFilter(e.target.value)}>
            <option value="">All referrers</option>
            {referrers.map((r) => <option key={r}>{r}</option>)}
          </Select>
          <SearchInput value={q} onChange={setQ} placeholder="Search name, company, area, referrer…" className="w-72" />
        </div>
        <Button icon={Plus} onClick={() => setEditing('new')}>Add candidate</Button>
      </div>

      {!filtered.length ? (
        <EmptyState
          icon={Briefcase}
          title={q || refFilter ? 'No matches' : 'No candidates yet'}
          hint="Share a referral link (Referral links tab) — sources and employees can submit several candidates at once."
          action={!q && <Button icon={Plus} onClick={() => setEditing('new')}>Add candidate</Button>}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Referred by</Th><Th>Name</Th><Th>Area</Th><Th>Designation</Th><Th>Current company</Th><Th>Phone</Th><Th>HR comment</Th><Th>Added</Th><Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <span className="text-slate-700">{c.referred_by_name || '—'}</span>
                  {c.referrer_emp_id && <p className="text-xs text-slate-400">{c.referrer_emp_id}</p>}
                </Td>
                <Td className="font-medium text-slate-900">
                  <button className="hover:text-indigo-600" onClick={() => setEditing(c)}>{c.full_name}</button>
                </Td>
                <Td>{c.area || '—'}</Td>
                <Td>{c.designation || '—'}</Td>
                <Td>{c.current_company || '—'}</Td>
                <Td className="text-slate-500">{c.phone || '—'}</Td>
                <Td className="max-w-52">
                  <span className="line-clamp-2 text-xs text-slate-500">{c.hr_comment || '—'}</span>
                </Td>
                <Td className="text-xs text-slate-400">{fmtDate(c.created_at)}</Td>
                <Td right>
                  {c.prospective_id ? (
                    <Badge tone="green"><Check className="h-3 w-3" /> In Prospectives</Badge>
                  ) : (
                    <Button variant="secondary" size="xs" icon={ClipboardList} loading={pickingId === c.id} onClick={() => addToProspectives(c)}>
                      Add to Prospectives
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && <CandidateModal candidate={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

const EMPTY = { referred_by_name: '', referrer_emp_id: '', full_name: '', area: '', designation: '', current_company: '', phone: '', hr_comment: '' }

function CandidateModal({ candidate, onClose }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState(candidate ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, candidate[k] ?? ''])) } : EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.full_name.trim()) return toast('Candidate name is required', 'error')
    setSaving(true)
    try {
      const payload = { ...form }
      for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null
      if (!candidate && !payload.source) payload.source = 'Manual entry'
      const qy = candidate
        ? supabase.from('candidates').update(payload).eq('id', candidate.id)
        : supabase.from('candidates').insert(payload)
      const { error } = await qy
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['candidates'] })
      toast('Saved')
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Remove ${candidate.full_name} from the database?`)) return
    const { error } = await supabase.from('candidates').delete().eq('id', candidate.id)
    if (error) return toast(error.message, 'error')
    qc.invalidateQueries({ queryKey: ['candidates'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={candidate ? candidate.full_name : 'Add candidate'} size="lg"
      sub={candidate?.source ? `Source: ${candidate.source} · added ${fmtDate(candidate.created_at)}` : undefined}
      footer={
        <>
          {candidate && <Button variant="dangerSubtle" icon={Trash2} onClick={remove} className="mr-auto">Remove</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </>
      }>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Referred by (name)"><Input value={form.referred_by_name} onChange={set('referred_by_name')} /></Field>
        <Field label="Referrer EMP ID" hint="If the referrer is an employee"><Input value={form.referrer_emp_id} onChange={set('referrer_emp_id')} placeholder="e.g. MKM-004" /></Field>
        <Field label="Candidate name" required><Input value={form.full_name} onChange={set('full_name')} /></Field>
        <Field label="Area"><Input value={form.area} onChange={set('area')} /></Field>
        <Field label="Designation"><Input value={form.designation} onChange={set('designation')} /></Field>
        <Field label="Current company"><Input value={form.current_company} onChange={set('current_company')} /></Field>
        <Field label="Phone number"><Input value={form.phone} onChange={set('phone')} /></Field>
        <Field label="HR comment" className="sm:col-span-2"><Textarea value={form.hr_comment} onChange={set('hr_comment')} /></Field>
      </div>
    </Modal>
  )
}

/* ================= referral links ================= */

function ReferralLinks() {
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
            One link per source — a consultant, a campus cell, or your own sales team. The form asks for their details once,
            then lets them add several candidates in a table. Everything lands here, tagged with who referred whom.
          </p>
          <Button icon={Link2} onClick={() => setCreating(true)}>New referral link</Button>
        </div>
      </Card>

      {!links.length ? (
        <EmptyState icon={Link2} title="No referral links yet" hint="Create one and WhatsApp it to your sources." />
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
                  {l.form_templates?.kind === 'referral' && <Badge tone="indigo" className="ml-1.5">referral</Badge>}
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
      return (data || []).filter((f) => f.kind !== 'general')
    },
  })

  const referral = forms.filter((f) => f.kind === 'referral')
  const effectiveFormId = formId || referral[0]?.id || forms[0]?.id || ''

  const create = async () => {
    if (!effectiveFormId) return toast('No active referral form found — ask the admin to check Settings → Forms', 'error')
    if (!sourceName.trim()) return toast('Name the source (e.g. "Sales team — Punjab")', 'error')
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
    <Modal open onClose={onClose} title="New referral link"
      footer={created
        ? <Button onClick={onClose}>Done</Button>
        : <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={create} loading={saving}>Create link</Button></>}>
      {created ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Share this with <span className="font-medium">{sourceName}</span> — no login needed:</p>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <code className="min-w-0 flex-1 truncate text-xs text-slate-700">{created}</code>
            <Button size="xs" variant="secondary" icon={Copy} onClick={async () => { await navigator.clipboard.writeText(created); toast('Copied') }}>Copy</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Source name" required hint="Tags every candidate they submit">
            <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Sales team — Punjab / Consultant Ramesh" autoFocus />
          </Field>
          <Field label="Form">
            <Select value={effectiveFormId} onChange={(e) => setFormId(e.target.value)}>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.name}{f.kind === 'referral' ? ' (referral)' : ''}</option>)}
            </Select>
          </Field>
        </div>
      )}
    </Modal>
  )
}
