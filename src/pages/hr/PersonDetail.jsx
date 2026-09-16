import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Pencil, FileText, Eye, Trash2, CheckCircle2, XCircle, Link2, Copy, GraduationCap,
  Upload, Plus, ListChecks, ShieldCheck, ShieldOff, MailPlus,
} from 'lucide-react'
import { supabase, callFunction } from '../../lib/supabase'
import {
  PageHeader, Card, Button, Badge, Tabs, Modal, Field, Input, Select, Textarea, Checkbox,
  Info, FullPageSpinner, EmptyState, useToast, cx,
} from '../../components/ui'
import { DOC_TYPES, docTypeLabel, PROFILE_FIELDS, peopleStatusMeta } from '../../lib/constants'
import { fmtDate, fmtDateTime, inr } from '../../lib/format'
import { useAuth } from '../../hooks/useAuth'

export default function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('people').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
  })

  if (isLoading || !person) return <FullPageSpinner />
  const statusMeta = peopleStatusMeta(person.status)

  return (
    <div>
      <PageHeader
        title={person.full_name}
        actions={<Button variant="secondary" icon={Pencil} onClick={() => navigate(`/people/${id}/edit`)}>Edit</Button>}
      >
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          {person.emp_code && <Badge tone="slate">{person.emp_code}</Badge>}
          {person.designation && <span className="text-sm text-slate-500">{person.designation}{person.department ? ` · ${person.department}` : ''}</span>}
        </div>
      </PageHeader>

      <Tabs
        className="mb-5 w-fit"
        tabs={[
          { value: 'profile', label: 'Profile' },
          { value: 'documents', label: 'Documents' },
          { value: 'checklists', label: 'Checklists' },
          { value: 'learnapp', label: 'Learnapp' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'profile' && <ProfileTab person={person} />}
      {tab === 'documents' && <DocumentsTab person={person} />}
      {tab === 'checklists' && <ChecklistsTab person={person} />}
      {tab === 'learnapp' && <LearnappTab person={person} />}
    </div>
  )
}

/* ================= Profile ================= */

function ProfileTab({ person: p }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Job">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Info label="Department">{p.department}</Info>
          <Info label="Designation">{p.designation}</Info>
          <Info label="Location">{p.location}</Info>
          <Info label="Employment type">{p.employment_type?.replace('_', ' ')}</Info>
          <Info label="Date of joining">{fmtDate(p.date_of_join)}</Info>
          {p.status === 'exited' && <Info label="Date of exit">{fmtDate(p.date_of_exit)}</Info>}
          {p.status === 'exited' && <Info label="Exit reason">{p.exit_reason}</Info>}
          <Info label="Monthly gross">{p.monthly_gross ? inr(p.monthly_gross) : '—'}</Info>
        </dl>
      </Card>
      <Card title="Contact">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Info label="Personal email">{p.personal_email}</Info>
          <Info label="Work email">{p.work_email}</Info>
          <Info label="Phone">{p.phone}</Info>
          <Info label="Alternate phone">{p.alt_phone}</Info>
          <Info label="Address" className="col-span-2">{[p.address, p.city, p.state, p.pincode].filter(Boolean).join(', ') || '—'}</Info>
          <Info label="Emergency contact">{p.emergency_contact_name ? `${p.emergency_contact_name} (${p.emergency_contact_phone || 'no phone'})` : '—'}</Info>
        </dl>
      </Card>
      <Card title="Personal">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Info label="Date of birth">{fmtDate(p.date_of_birth)}</Info>
          <Info label="Gender">{p.gender}</Info>
          <Info label="Blood group">{p.blood_group}</Info>
        </dl>
      </Card>
      <Card title="Statutory & bank">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Info label="PAN">{p.pan_number}</Info>
          <Info label="Aadhaar">{p.aadhaar_number}</Info>
          <Info label="UAN">{p.uan_number}</Info>
          <Info label="ESIC">{p.esic_number}</Info>
          <Info label="Bank">{p.bank_name}</Info>
          <Info label="Account">{p.bank_account}</Info>
          <Info label="IFSC">{p.bank_ifsc}</Info>
        </dl>
      </Card>
      {p.notes && (
        <Card title="Notes" className="lg:col-span-2">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{p.notes}</p>
        </Card>
      )}
    </div>
  )
}

/* ================= Documents ================= */

const docStatusMeta = {
  uploaded: { label: 'Uploaded', tone: 'blue' },
  verified: { label: 'Verified', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
}

function DocumentsTab({ person }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [requestOpen, setRequestOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState('other')
  const fileInputId = `doc-upload-${person.id}`

  const { data: docs = [] } = useQuery({
    queryKey: ['person-docs', person.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('person_documents')
        .select('*')
        .eq('person_id', person.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['person-docs', person.id] })

  const view = async (doc) => {
    if (!doc.file_path) return
    const { data, error } = await supabase.storage.from('employee-docs').createSignedUrl(doc.file_path, 300)
    if (error) return toast(error.message, 'error')
    window.open(data.signedUrl, '_blank')
  }

  const setStatus = async (doc, status) => {
    const patch = { status }
    if (status === 'verified') patch.verified_at = new Date().toISOString()
    const { error } = await supabase.from('person_documents').update(patch).eq('id', doc.id)
    if (error) return toast(error.message, 'error')
    refresh()
  }

  const remove = async (doc) => {
    if (!window.confirm('Delete this document?')) return
    if (doc.file_path) await supabase.storage.from('employee-docs').remove([doc.file_path])
    const { error } = await supabase.from('person_documents').delete().eq('id', doc.id)
    if (error) return toast(error.message, 'error')
    refresh()
  }

  const directUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${person.id}/${uploadType}/${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage.from('employee-docs').upload(path, file)
      if (upErr) throw upErr
      const { error } = await supabase.from('person_documents').insert({
        person_id: person.id, doc_type: uploadType, file_path: path, file_name: file.name,
        mime_type: file.type, size_bytes: file.size, status: 'uploaded', source: 'hr',
      })
      if (error) throw error
      toast('Document uploaded')
      refresh()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="w-56">
            {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
          <input id={fileInputId} type="file" className="hidden" onChange={directUpload} accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" />
          <Button variant="secondary" icon={Upload} loading={uploading} onClick={() => document.getElementById(fileInputId)?.click()}>
            Upload
          </Button>
        </div>
        <Button icon={Link2} onClick={() => setRequestOpen(true)}>Request from {person.full_name.split(' ')[0]}</Button>
      </div>

      {!docs.length ? (
        <EmptyState icon={FileText} title="No documents yet" hint="Upload directly, or send an upload link so they can submit documents themselves." />
      ) : (
        <Card pad={false}>
          <ul className="divide-y divide-slate-100">
            {docs.map((doc) => {
              const meta = docStatusMeta[doc.status] || { label: doc.status, tone: 'gray' }
              return (
                <li key={doc.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <FileText className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{docTypeLabel(doc.doc_type)}</p>
                    <p className="truncate text-xs text-slate-400">
                      {doc.file_name || 'no file'} · {doc.source === 'employee' ? 'sent by employee' : 'uploaded by HR'} · {fmtDateTime(doc.uploaded_at)}
                    </p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <div className="flex items-center gap-1">
                    {doc.file_path && <Button variant="ghost" size="xs" icon={Eye} onClick={() => view(doc)}>View</Button>}
                    {doc.status !== 'verified' && <Button variant="ghost" size="xs" icon={CheckCircle2} onClick={() => setStatus(doc, 'verified')}>Verify</Button>}
                    {doc.status !== 'rejected' && <Button variant="ghost" size="xs" icon={XCircle} onClick={() => setStatus(doc, 'rejected')}>Reject</Button>}
                    <Button variant="ghost" size="xs" icon={Trash2} onClick={() => remove(doc)} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <RequestLinkModal person={person} open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  )
}

export function RequestLinkModal({ person, open, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [docTypes, setDocTypes] = useState(['photo', 'aadhaar', 'pan', 'bank_proof'])
  const [fields, setFields] = useState(['personal_email', 'phone', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'bank_name', 'bank_account', 'bank_ifsc'])
  const [message, setMessage] = useState('')
  const [days, setDays] = useState(14)
  const [created, setCreated] = useState(null)
  const [saving, setSaving] = useState(false)

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const create = async () => {
    if (!docTypes.length && !fields.length) return toast('Pick at least one document or field', 'error')
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('upload_links')
        .insert({
          person_id: person.id,
          doc_types: docTypes,
          profile_fields: fields,
          message: message || null,
          expires_at: new Date(Date.now() + days * 86400000).toISOString(),
        })
        .select('token')
        .single()
      if (error) throw error
      setCreated(`${window.location.origin}/u/${data.token}`)
      qc.invalidateQueries({ queryKey: ['upload-links'] })
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(created)
    toast('Link copied')
  }

  const close = () => {
    setCreated(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={close} title={`Request details from ${person.full_name}`} size="lg"
      footer={created ? (
        <Button onClick={close}>Done</Button>
      ) : (
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button onClick={create} loading={saving}>Create link</Button>
        </>
      )}>
      {created ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Share this link — it works without any login and expires in {days} days.</p>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <code className="min-w-0 flex-1 truncate text-xs text-slate-700">{created}</code>
            <Button size="xs" variant="secondary" icon={Copy} onClick={copy}>Copy</Button>
          </div>
          <div className="flex gap-2">
            <a className="text-sm font-medium text-emerald-600 hover:underline" target="_blank" rel="noreferrer"
              href={`https://wa.me/${(person.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${person.full_name.split(' ')[0]}, please submit your details/documents here: ${created}`)}`}>
              Share on WhatsApp
            </a>
            <a className="text-sm font-medium text-indigo-600 hover:underline"
              href={`mailto:${person.personal_email || ''}?subject=${encodeURIComponent('Documents needed')}&body=${encodeURIComponent(`Hi ${person.full_name.split(' ')[0]},\n\nPlease submit your details and documents here:\n${created}\n\nThanks`)}`}>
              Share by email
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Documents to collect</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {DOC_TYPES.map((d) => (
                <Checkbox key={d.value} label={d.label} checked={docTypes.includes(d.value)} onChange={() => toggle(docTypes, setDocTypes, d.value)} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Details to fill / confirm</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {PROFILE_FIELDS.map((f) => (
                <Checkbox key={f.value} label={f.label} checked={fields.includes(f.value)} onChange={() => toggle(fields, setFields, f.value)} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Message shown on the page">
              <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Welcome to Makams! Please submit these before your joining date." />
            </Field>
            <Field label="Link valid for">
              <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </Select>
            </Field>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ================= Checklists ================= */

function ChecklistsTab({ person }) {
  const qc = useQueryClient()
  const toast = useToast()
  const { appUser } = useAuth()
  const [starting, setStarting] = useState(false)

  const { data: templates = [] } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('checklist_templates').select('*').eq('active', true).order('kind')
      if (error) throw error
      return data
    },
  })

  const { data: checklists = [] } = useQuery({
    queryKey: ['person-checklists', person.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('person_checklists')
        .select('*, person_checklist_items(*)')
        .eq('person_id', person.id)
        .order('started_at', { ascending: false })
      if (error) throw error
      return data.map((c) => ({ ...c, person_checklist_items: c.person_checklist_items.sort((a, b) => a.position - b.position) }))
    },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['person-checklists', person.id] })

  const start = async (templateId) => {
    if (!templateId) return
    setStarting(true)
    try {
      const { error } = await supabase.rpc('start_checklist', { p_person: person.id, p_template: templateId })
      if (error) throw error
      toast('Checklist started')
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setStarting(false)
    }
  }

  const setItem = async (item, status) => {
    const patch = { status }
    if (status === 'done') {
      patch.done_by = appUser.id
      patch.done_at = new Date().toISOString()
    } else {
      patch.done_by = null
      patch.done_at = null
    }
    const { error } = await supabase.from('person_checklist_items').update(patch).eq('id', item.id)
    if (error) return toast(error.message, 'error')
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Onboarding and exit progress for {person.full_name.split(' ')[0]}.</p>
        <div className="flex items-center gap-2">
          <Select className="w-64" defaultValue="" onChange={(e) => { start(e.target.value); e.target.value = '' }} disabled={starting}>
            <option value="" disabled>Start a checklist…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>)}
          </Select>
        </div>
      </div>

      {!checklists.length ? (
        <EmptyState icon={ListChecks} title="No checklists yet" hint="Start the onboarding checklist when someone is joining, or the exit checklist when they leave." />
      ) : (
        checklists.map((cl) => {
          const items = cl.person_checklist_items
          const done = items.filter((i) => i.status !== 'pending').length
          return (
            <Card key={cl.id} pad={false}
              title={`${cl.name} — ${done}/${items.length}`}
              actions={<Badge tone={cl.status === 'completed' ? 'green' : cl.status === 'cancelled' ? 'gray' : 'amber'}>
                {cl.status === 'completed' ? `Completed ${fmtDate(cl.completed_at)}` : cl.status.replace('_', ' ')}
              </Badge>}>
              <div className="h-1 w-full bg-slate-100">
                <div className="h-1 bg-emerald-500 transition-all" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
              </div>
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={item.status === 'done'}
                      onChange={() => setItem(item, item.status === 'done' ? 'pending' : 'done')}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cx('text-sm', item.status === 'done' ? 'text-slate-400 line-through' : item.status === 'na' ? 'text-slate-400' : 'text-slate-800')}>
                        {item.title}
                        {item.status === 'na' && <span className="ml-2 text-xs text-slate-400">(N/A)</span>}
                      </p>
                      {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                      {item.due_date && item.status === 'pending' && (
                        <p className={cx('text-xs', new Date(item.due_date) < new Date() ? 'font-medium text-red-500' : 'text-slate-400')}>
                          Due {fmtDate(item.due_date)}
                        </p>
                      )}
                    </div>
                    {item.status === 'pending' ? (
                      <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setItem(item, 'na')}>N/A</button>
                    ) : item.status === 'na' ? (
                      <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setItem(item, 'pending')}>Undo</button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          )
        })
      )}
    </div>
  )
}

/* ================= Learnapp ================= */

function LearnappTab({ person }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [busy, setBusy] = useState(null)
  const [password, setPassword] = useState(null)

  const { data: log = [] } = useQuery({
    queryKey: ['learnapp-log', person.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learnapp_actions')
        .select('*')
        .eq('person_id', person.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })

  const email = person.learnapp_email || person.work_email || person.personal_email

  const run = async (action, extra = {}) => {
    setBusy(action)
    try {
      const res = await callFunction('learnapp-admin', { action, person_id: person.id, email, full_name: person.full_name, ...extra })
      if (res?.password) setPassword(res.password)
      toast(res?.message || 'Done')
      qc.invalidateQueries({ queryKey: ['person', person.id] })
      qc.invalidateQueries({ queryKey: ['learnapp-log', person.id] })
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Learnapp account">
        <div className="mb-4 flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-indigo-500" />
          <div>
            {person.learnapp_status === 'active' && <Badge tone="green">Active</Badge>}
            {person.learnapp_status === 'disabled' && <Badge tone="gray">Disabled</Badge>}
            {!person.learnapp_status && <Badge tone="amber">No account</Badge>}
            <p className="mt-1 text-xs text-slate-400">{person.learnapp_email || (person.learnapp_status ? '' : `Will use: ${email || 'no email on file'}`)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!person.learnapp_user_id && (
            <>
              <Button icon={MailPlus} loading={busy === 'invite'} disabled={!email} onClick={() => run('invite')}>Invite by email</Button>
              <Button variant="secondary" icon={Plus} loading={busy === 'create'} disabled={!email} onClick={() => run('create')}>Create with password</Button>
            </>
          )}
          {person.learnapp_user_id && person.learnapp_status === 'active' && (
            <Button variant="dangerSubtle" icon={ShieldOff} loading={busy === 'disable'} onClick={() => run('disable')}>Disable access</Button>
          )}
          {person.learnapp_user_id && person.learnapp_status === 'disabled' && (
            <Button variant="secondary" icon={ShieldCheck} loading={busy === 'enable'} onClick={() => run('enable')}>Re-enable access</Button>
          )}
        </div>
        {!email && !person.learnapp_user_id && (
          <p className="mt-3 text-xs text-amber-600">Add an email on the profile first.</p>
        )}

        {password && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">Temporary password — share it now, it won't be shown again:</p>
            <code className="mt-1 block text-sm font-semibold text-amber-900">{password}</code>
          </div>
        )}
      </Card>

      <Card title="Activity" pad={false}>
        {!log.length ? (
          <p className="p-4 text-sm text-slate-400">No learnapp actions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {log.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <Badge tone={l.status === 'ok' ? 'green' : 'red'}>{l.status}</Badge>
                <span className="font-medium capitalize text-slate-700">{l.action}</span>
                <span className="truncate text-xs text-slate-400">{l.detail}</span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">{fmtDateTime(l.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
