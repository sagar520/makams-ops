import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Briefcase, Link2, Copy, Ban, Trash2, ClipboardList, Check, Inbox, Pencil, X, Search, Clock, ShieldCheck } from 'lucide-react'
import { supabase, formUrl } from '../../lib/supabase'
import {
  PageHeader, Button, Table, Th, Td, Tr, Badge, SearchInput, Tabs, Select, Input, Textarea,
  Field, Modal, EmptyState, FullPageSpinner, Card, Checkbox, useToast, cx,
} from '../../components/ui'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { fmtMobile, isMobile, normalizeMobile, mobileInput, MOBILE_HINT } from '../../lib/phone'
import { useAuth } from '../../hooks/useAuth'
import { RECENT_DAYS } from '../../lib/constants'

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
    if (form.phone && !isMobile(form.phone)) return toast(`Phone: ${MOBILE_HINT}`, 'error')
    setSaving(true)
    try {
      const payload = {}
      for (const k of KEYS) payload[k] = form[k] === '' ? null : form[k]
      payload.phone = normalizeMobile(form.phone)
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
        <Field label="Location"><Input value={form.area} onChange={set('area')} /></Field>
        <Field label="Designation"><Input value={form.designation} onChange={set('designation')} /></Field>
        <Field label="Current company"><Input value={form.current_company} onChange={set('current_company')} /></Field>
        <Field label="Phone number" hint={MOBILE_HINT}>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-2.5 text-sm text-slate-500">+91</span>
            <Input className="rounded-l-none" inputMode="numeric" placeholder="98765 43210"
              value={mobileInput(form.phone)} onChange={(e) => setForm((f) => ({ ...f, phone: mobileInput(e.target.value) }))} />
          </div>
        </Field>
      </div>
    </Modal>
  )
}

/* ================= database ================= */

function Database() {
  const qc = useQueryClient()
  const toast = useToast()
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')

  const [areaInput, setAreaInput] = useState('')
  const [area, setArea] = useState('')          // the location actually searched
  // admins open on the full list; HR opens on the last 15 days and searches for anything older
  const [view, setView] = useState(isAdmin ? 'all' : 'recent')  // 'all' | 'recent' | 'area'
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [pickingId, setPickingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // areas HR may search — names only, no candidate rows
  const { data: areas = [] } = useQuery({
    queryKey: ['candidate-areas'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('candidate_areas')
      if (error) throw error
      return (data || []).map((r) => (typeof r === 'string' ? r : r.area ?? r.candidate_areas)).filter(Boolean)
    },
  })

  // HR always has the last 15 days, and searches a location for anything older.
  // Admins can deliberately open the whole DB.
  const full = isAdmin && view === 'all'
  const recent = view === 'recent'
  const listKey = full ? 'all' : recent ? 'recent' : area
  const { data: candidates, isLoading, isFetching } = useQuery({
    queryKey: ['candidates', listKey],
    enabled: full || recent || !!area,
    queryFn: async () => {
      if (full) {
        const { data, error } = await supabase.from('candidates').select('*').order('created_at', { ascending: false }).limit(3000)
        if (error) throw error
        return data
      }
      if (recent) {
        const { data, error } = await supabase.rpc('recent_candidates', { p_days: RECENT_DAYS })
        if (error) throw error
        return data || []
      }
      const { data, error } = await supabase.rpc('search_candidates', { p_area: area })
      if (error) throw error
      return data || []
    },
  })

  const search = (value) => {
    const v = (value ?? areaInput).trim()
    if (v.length < 2) return toast('Type at least 2 characters of a location', 'error')
    setAreaInput(v)
    setArea(v)
    setView('area')
  }

  const showRecent = () => { setArea(''); setAreaInput(''); setView('recent') }

  const filtered = useMemo(() => {
    let list = candidates || []
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      list = list.filter((c) =>
        [c.full_name, c.designation, c.area, c.current_company, c.phone, c.referred_by_name, c.referrer_emp_id, c.hr_comment]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(n))
      )
    }
    return list
  }, [candidates, q])

  const refresh = () => qc.invalidateQueries({ queryKey: ['candidates'] })

  const saveComment = async (c, hr_comment) => {
    const next = hr_comment.trim() || null
    if ((c.hr_comment || null) === next) return
    const { error } = await supabase.rpc('save_candidate', { p_id: c.id, p_patch: { hr_comment: next } })
    if (error) return toast(error.message, 'error')
    qc.setQueryData(['candidates', listKey], (old) =>
      (old || []).map((x) => (x.id === c.id ? { ...x, hr_comment: next } : x)))
    toast('Comment saved')
  }

  const removeCandidate = async (c) => {
    if (!window.confirm(`Delete ${c.full_name} from the Candidates DB? This cannot be undone.`)) return
    setDeletingId(c.id)
    try {
      const { error } = await supabase.rpc('delete_candidate', { p_id: c.id })
      if (error) throw error
      toast(`${c.full_name} deleted`)
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const addToProspectives = async (c) => {
    setPickingId(c.id)
    try {
      const { error } = await supabase.rpc('pick_candidate', { p_id: c.id })
      if (error) throw error
      refresh()
      qc.invalidateQueries({ queryKey: ['prospectives'] })
      toast(`${c.full_name.split(' ')[0]} added to Prospectives`)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setPickingId(null)
    }
  }

  return (
    <div>
      {!full && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Search a location" className="min-w-64 flex-1"
              hint={`Anything added or updated in the last ${RECENT_DAYS} days is always listed. Search a location for older records — the database is never opened in full.`}>
              <div className="flex gap-2">
                <Input
                  list="candidate-locations"
                  value={areaInput}
                  placeholder="e.g. Ludhiana"
                  onChange={(e) => setAreaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                />
                <Button icon={Search} onClick={() => search()} loading={isFetching}>Search</Button>
                {!recent && (
                  <Button variant="secondary" icon={Clock} onClick={showRecent}>Last {RECENT_DAYS} days</Button>
                )}
              </div>
            </Field>
            <datalist id="candidate-locations">
              {areas.map((a) => <option key={a} value={a} />)}
            </datalist>
          </div>
          {isAdmin && (
            <p className="mt-3 text-xs text-slate-400">
              You're an admin, so you can also{' '}
              <button className="font-medium text-red-600 hover:underline" onClick={() => { setArea(''); setAreaInput(''); setView('all') }}>
                open the full database
              </button>. HR accounts see the last {RECENT_DAYS} days, plus whichever location they search.
            </p>
          )}
          {areas.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400">Locations on file:</span>
              {areas.slice(0, 12).map((a) => (
                <button key={a}
                  className={cx('rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                    a === area ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600')}
                  onClick={() => { setAreaInput(a); search(a) }}>
                  {a}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {full && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              <ShieldCheck className="mr-1.5 inline h-4 w-4 text-red-500" />
              Admin view — the whole database. HR accounts see the last {RECENT_DAYS} days, plus whichever location they search.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="xs" icon={Clock} onClick={showRecent}>Last {RECENT_DAYS} days</Button>
              <Button variant="secondary" size="xs" icon={Search} onClick={() => setView('area')}>Search by location</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Filter these results…" className="w-72" />
          {!full && recent && <Badge tone="indigo">{filtered.length} touched in the last {RECENT_DAYS} days</Badge>}
          {!full && !recent && area && <Badge tone="indigo">{filtered.length} in “{area}”</Badge>}
        </div>
        <Button icon={Plus} onClick={() => setEditing('new')}>Add candidate</Button>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : !full && !recent && !area ? (
        <EmptyState
          icon={ShieldCheck}
          title="Search a location to open the database"
          hint="Older records are pulled one location at a time — nobody can browse or export the whole pool."
        />
      ) : !filtered.length ? (
        <EmptyState
          icon={Briefcase}
          title={q ? 'No matches' : recent ? `Nothing added or updated in the last ${RECENT_DAYS} days` : area ? `No candidates in “${area}”` : 'No candidates yet'}
          hint="Share a referral link (Referral links tab) — sources and employees can submit several candidates at once."
          action={!q && <Button icon={Plus} onClick={() => setEditing('new')}>Add candidate</Button>}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Referred by</Th><Th>Name</Th><Th>Location</Th><Th>Designation</Th><Th>Current company</Th><Th>Phone</Th><Th>HR comment</Th><Th>Added / updated</Th><Th />
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
                  <button className="hover:text-red-600" onClick={() => setEditing(c)}>{c.full_name}</button>
                </Td>
                <Td>{c.area || '—'}</Td>
                <Td>{c.designation || '—'}</Td>
                <Td>{c.current_company || '—'}</Td>
                <Td className="whitespace-nowrap text-slate-500">{c.phone ? fmtMobile(c.phone) : '—'}</Td>
                <Td className="max-w-64"><CommentCell value={c.hr_comment} onSave={(v) => saveComment(c, v)} /></Td>
                <Td className="whitespace-nowrap text-xs text-slate-400">
                  {fmtDate(c.created_at)}
                  {c.updated_at && c.updated_at.slice(0, 10) !== c.created_at.slice(0, 10) && (
                    <p className="text-slate-300">edited {fmtDate(c.updated_at)}</p>
                  )}
                </Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    {c.prospective_id ? (
                      <Badge tone="green"><Check className="h-3 w-3" /> In Prospectives</Badge>
                    ) : (
                      <Button variant="secondary" size="xs" icon={ClipboardList} loading={pickingId === c.id} onClick={() => addToProspectives(c)}>
                        Add to Prospectives
                      </Button>
                    )}
                    <Button variant="ghost" size="xs" icon={Pencil} onClick={() => setEditing(c)}>Edit</Button>
                    {isAdmin && (
                      <Button variant="dangerSubtle" size="xs" icon={Trash2} loading={deletingId === c.id}
                        onClick={() => removeCandidate(c)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && <CandidateModal candidate={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  )
}

/** HR comment, edited in place: click the cell, type, Enter or blur to save. */
function CommentCell({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  if (!editing) {
    return (
      <button
        className="group flex w-full items-start gap-1.5 text-left"
        onClick={() => { setDraft(value || ''); setEditing(true) }}
      >
        <span className={cx('line-clamp-2 text-xs', value ? 'text-slate-600' : 'text-slate-300 italic')}>
          {value || 'Add a comment'}
        </span>
        <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    )
  }

  const commit = () => { setEditing(false); onSave(draft) }

  return (
    <Textarea
      autoFocus
      rows={2}
      className="text-xs"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() }
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}

const EMPTY = { referred_by_name: '', referrer_emp_id: '', full_name: '', area: '', designation: '', current_company: '', phone: '', hr_comment: '' }

function CandidateModal({ candidate, onClose, onSaved }) {
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState(candidate ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, candidate[k] ?? ''])) } : EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.full_name.trim()) return toast('Candidate name is required', 'error')
    if (form.phone && !isMobile(form.phone)) return toast(`Phone: ${MOBILE_HINT}`, 'error')
    setSaving(true)
    try {
      const payload = { ...form, phone: normalizeMobile(form.phone) }
      for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null
      const { error } = await supabase.rpc('save_candidate', { p_id: candidate?.id ?? null, p_patch: payload })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['candidates'] })
      onSaved?.()
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
    const { error } = await supabase.rpc('delete_candidate', { p_id: candidate.id })
    if (error) return toast(error.message, 'error')
    qc.invalidateQueries({ queryKey: ['candidates'] })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={candidate ? candidate.full_name : 'Add candidate'} size="lg"
      sub={candidate?.source ? `Source: ${candidate.source} · added ${fmtDate(candidate.created_at)}` : undefined}
      footer={
        <>
          {candidate && isAdmin && <Button variant="dangerSubtle" icon={Trash2} onClick={remove} className="mr-auto">Remove</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save</Button>
        </>
      }>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Referred by (name)"><Input value={form.referred_by_name} onChange={set('referred_by_name')} /></Field>
        <Field label="Referrer EMP ID" hint="If the referrer is an employee"><Input value={form.referrer_emp_id} onChange={set('referrer_emp_id')} placeholder="e.g. MKM-004" /></Field>
        <Field label="Candidate name" required><Input value={form.full_name} onChange={set('full_name')} /></Field>
        <Field label="Location"><Input value={form.area} onChange={set('area')} /></Field>
        <Field label="Designation"><Input value={form.designation} onChange={set('designation')} /></Field>
        <Field label="Current company"><Input value={form.current_company} onChange={set('current_company')} /></Field>
        <Field label="Phone number" hint={MOBILE_HINT}>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-2.5 text-sm text-slate-500">+91</span>
            <Input className="rounded-l-none" inputMode="numeric" placeholder="98765 43210"
              value={mobileInput(form.phone)} onChange={(e) => setForm((f) => ({ ...f, phone: mobileInput(e.target.value) }))} />
          </div>
        </Field>
        <Field label="HR comment" className="sm:col-span-2"><Textarea value={form.hr_comment} onChange={set('hr_comment')} /></Field>
      </div>
    </Modal>
  )
}

/* ================= referral links ================= */

const expired = (l) => !!l.expires_at && new Date(l.expires_at) < new Date()

function expiryLabel(l) {
  if (!l.expires_at) return 'no expiry'
  const days = Math.ceil((new Date(l.expires_at) - Date.now()) / 86400000)
  if (days < 0) return `expired ${fmtDate(l.expires_at)}`
  if (days === 0) return 'expires today'
  return `in ${days} day${days === 1 ? '' : 's'}`
}

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
    toast(l.active ? 'Link disabled' : 'Link enabled')
  }

  const remove = async (l) => {
    const warn = l.submission_count
      ? `Delete the link for ${l.source_name}? The ${l.submission_count} submission${l.submission_count > 1 ? 's' : ''} already received stay in the database.`
      : `Delete the link for ${l.source_name}?`
    if (!window.confirm(warn)) return
    const { error } = await supabase.from('form_links').delete().eq('id', l.id)
    if (error) return toast(error.message, 'error')
    qc.invalidateQueries({ queryKey: ['form-links'] })
    toast('Link deleted')
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            One link per source — a consultant, a campus cell, or your own sales team. The form asks for their details once,
            then lets them add several candidates in a table. Every link stops working after 7 days — make a new one when you need it again.
          </p>
          <Button icon={Link2} onClick={() => setCreating(true)}>New referral link</Button>
        </div>
      </Card>

      {!links.length ? (
        <EmptyState icon={Link2} title="No referral links yet" hint="Create one and WhatsApp it to your sources." />
      ) : (
        <Table>
          <thead>
            <tr><Th>Source</Th><Th>Referrer</Th><Th>Submissions</Th><Th>Status</Th><Th>Expires</Th><Th /></tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <Tr key={l.id}>
                <Td className="font-medium text-slate-900">{l.source_name}</Td>
                <Td className="text-slate-500">
                  {l.referrer_name ? (
                    <>
                      {l.referrer_name}
                      {l.referrer_emp_id && <span className="ml-1.5 text-xs text-slate-400">{l.referrer_emp_id}</span>}
                    </>
                  ) : (
                    <span className="text-slate-300">they fill it in</span>
                  )}
                </Td>
                <Td><span className="font-semibold text-slate-800">{l.submission_count}</span></Td>
                <Td>
                  {expired(l) ? <Badge tone="gray">Expired</Badge>
                    : l.active ? <Badge tone="green">Active</Badge>
                    : <Badge tone="gray">Disabled</Badge>}
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-400">
                  <Clock className="mr-1 inline h-3 w-3" />{expiryLabel(l)}
                </Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    {!expired(l) && <Button variant="ghost" size="xs" icon={Copy} onClick={() => copy(l)}>Copy link</Button>}
                    <Button variant="ghost" size="xs" icon={Ban} onClick={() => toggle(l)}>{l.active ? 'Disable' : 'Enable'}</Button>
                    <Button variant="dangerSubtle" size="xs" icon={Trash2} onClick={() => remove(l)}>Delete</Button>
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
  const [personId, setPersonId] = useState('')          // '' = nobody picked yet, 'outside' = not an employee
  const [outsideName, setOutsideName] = useState('')
  const [outsidePhone, setOutsidePhone] = useState('')
  const [created, setCreated] = useState(null)
  const [saving, setSaving] = useState(false)

  // referral links always use the candidate referral form
  const { data: referralForm } = useQuery({
    queryKey: ['referral-form-template'],
    queryFn: async () => {
      const { data } = await supabase
        .from('form_templates').select('id, name')
        .eq('kind', 'referral').eq('active', true).order('created_at').limit(1)
      return data?.[0] ?? null
    },
  })

  // sales employees, so a link can be issued to one of them by name
  const { data: people = [] } = useQuery({
    queryKey: ['people-for-links'],
    queryFn: async () => {
      const { data } = await supabase
        .from('people').select('id, full_name, emp_code, phone')
        .eq('status', 'active').order('full_name')
      return data || []
    },
  })

  const person = people.find((p) => p.id === personId) || null
  const outside = personId === 'outside'
  const referrerName = person?.full_name || (outside ? outsideName.trim() : '')

  const create = async () => {
    if (!personId) return toast('Choose who this link is for', 'error')
    if (!referrerName) return toast("Enter the person's name", 'error')
    if (outside && outsidePhone && !isMobile(outsidePhone)) return toast(`Phone: ${MOBILE_HINT}`, 'error')
    if (!referralForm) return toast('No active referral form found — ask the admin to check Settings → Forms', 'error')
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('form_links')
        .insert({
          form_id: referralForm.id,
          source_name: referrerName,
          referrer_name: referrerName,
          referrer_emp_id: person?.emp_code ?? null,
          referrer_phone: person ? normalizeMobile(person.phone) : normalizeMobile(outsidePhone),
        })
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
          <p className="text-sm text-slate-600">
            Share this with <span className="font-medium">{referrerName}</span> — no login needed. It expires in 7 days.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <code className="min-w-0 flex-1 truncate text-xs text-slate-700">{created}</code>
            <Button size="xs" variant="secondary" icon={Copy} onClick={async () => { await navigator.clipboard.writeText(created); toast('Copied') }}>Copy</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Who is this link for?" required
            hint="Their details are filled in on the form automatically — they only add their contacts.">
            <Select value={personId} onChange={(e) => setPersonId(e.target.value)} autoFocus>
              <option value="">Select…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}{p.emp_code ? ` · ${p.emp_code}` : ''}</option>
              ))}
              <option value="outside">Someone outside the company (consultant, campus cell…)</option>
            </Select>
          </Field>

          {outside && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Their name" required>
                <Input value={outsideName} onChange={(e) => setOutsideName(e.target.value)} placeholder="e.g. Ramesh Kumar (TalentBridge)" />
              </Field>
              <Field label="Their phone" hint={MOBILE_HINT}>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-2.5 text-sm text-slate-500">+91</span>
                  <Input className="rounded-l-none" inputMode="numeric" placeholder="98765 43210"
                    value={outsidePhone} onChange={(e) => setOutsidePhone(mobileInput(e.target.value))} />
                </div>
              </Field>
            </div>
          )}

          {person && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              The form will show <span className="font-medium text-slate-700">{person.full_name}</span>
              {person.emp_code ? ` (${person.emp_code})` : ''} as the referrer — they can't change it.
            </p>
          )}

          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" /> The link stops working automatically 7 days from now.
          </p>
        </div>
      )}
    </Modal>
  )
}
