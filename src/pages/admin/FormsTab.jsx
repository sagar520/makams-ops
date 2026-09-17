import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, ArrowUp, ArrowDown, Trash2, Inbox, FileText, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  Card, Button, Badge, Modal, Field, Input, Select, Textarea, Checkbox, EmptyState,
  FullPageSpinner, useToast, cx,
} from '../../components/ui'
import { FORM_FIELD_TYPES, FORM_MAP_TO } from '../../lib/constants'
import { fmtDateTime } from '../../lib/format'

export default function FormsTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState(null)   // 'new' | template
  const [viewing, setViewing] = useState(null)   // template (responses)

  const { data: forms, isLoading } = useQuery({
    queryKey: ['form-templates-full'],
    queryFn: async () => {
      const [tpls, links, responses] = await Promise.all([
        supabase.from('form_templates').select('*').order('created_at'),
        supabase.from('form_links').select('id, form_id'),
        supabase.from('form_responses').select('id, form_id'),
      ])
      if (tpls.error) throw tpls.error
      return (tpls.data || []).map((t) => ({
        ...t,
        link_count: (links.data || []).filter((l) => l.form_id === t.id).length,
        response_count: (responses.data || []).filter((r) => r.form_id === t.id).length,
      }))
    },
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['form-templates-full'] })
    qc.invalidateQueries({ queryKey: ['form-templates-active'] })
  }

  const toggleActive = async (t) => {
    const { error } = await supabase.from('form_templates').update({ active: !t.active }).eq('id', t.id)
    if (error) return toast(error.message, 'error')
    refresh()
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Build forms like Jotform — add fields, share links, collect responses. Candidate-intake forms feed the candidate
          database automatically; HR shares the links from Candidates → Sources &amp; links.
        </p>
        <Button icon={Plus} onClick={() => setEditing('new')}>New form</Button>
      </div>

      {!forms?.length ? (
        <EmptyState icon={FileText} title="No forms yet" action={<Button icon={Plus} onClick={() => setEditing('new')}>New form</Button>} />
      ) : (
        <div className="space-y-3">
          {forms.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {t.name}
                    <Badge tone={t.kind === 'candidate_intake' ? 'indigo' : 'slate'} className="ml-2">
                      {t.kind === 'candidate_intake' ? 'Candidate intake' : 'General'}
                    </Badge>
                    {!t.active && <Badge tone="gray" className="ml-1.5">Inactive</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {(t.fields || []).length} fields · {t.link_count} link{t.link_count === 1 ? '' : 's'} · {t.response_count} response{t.response_count === 1 ? '' : 's'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" icon={Inbox} onClick={() => setViewing(t)}>Responses ({t.response_count})</Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(t)}>{t.active ? 'Deactivate' : 'Activate'}</Button>
                <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(t)}>Edit</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <FormBuilder template={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {viewing && <ResponsesModal template={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

/* ================= builder ================= */

let fieldSeq = 0
const newField = () => ({ key: `f_${Date.now().toString(36)}_${++fieldSeq}`, label: '', type: 'text', required: false, options: [], map_to: null })

function FormBuilder({ template, onClose, onSaved }) {
  const toast = useToast()
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [kind, setKind] = useState(template?.kind || 'general')
  const [fields, setFields] = useState(() => (template?.fields?.length ? template.fields.map((f) => ({ ...f })) : [{ ...newField(), label: 'Full name', required: true }]))
  const [saving, setSaving] = useState(false)

  const setField = (i, patch) => setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const move = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= fields.length) return
    const next = [...fields]
    ;[next[i], next[j]] = [next[j], next[i]]
    setFields(next)
  }

  const save = async () => {
    if (!name.trim()) return toast('Name the form', 'error')
    const clean = fields
      .filter((f) => f.label.trim())
      .map((f) => ({
        key: f.key,
        label: f.label.trim(),
        type: f.type,
        required: !!f.required,
        options: f.type === 'select' ? (Array.isArray(f.options) ? f.options : String(f.options || '').split(',')).map((o) => String(o).trim()).filter(Boolean) : [],
        map_to: kind === 'candidate_intake' && f.map_to ? f.map_to : null,
      }))
    if (!clean.length) return toast('Add at least one field', 'error')
    if (kind === 'candidate_intake' && !clean.some((f) => f.map_to === 'full_name')) {
      return toast('A candidate-intake form needs one field mapped to “Candidate name”', 'error')
    }
    setSaving(true)
    try {
      const payload = { name: name.trim(), description: description.trim() || null, kind, fields: clean }
      const q = template
        ? supabase.from('form_templates').update(payload).eq('id', template.id)
        : supabase.from('form_templates').insert(payload)
      const { error } = await q
      if (error) throw error
      toast('Form saved')
      onSaved()
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={template ? `Edit — ${template.name}` : 'New form'} size="xl"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save form</Button></>}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ---------- left: settings + fields ---------- */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Form name" required className="sm:col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus={!template} /></Field>
            <Field label="Intro text shown to the person filling it" className="sm:col-span-2">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Type" hint="Intake forms create candidates automatically" className="sm:col-span-2">
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="general">General (responses only)</option>
                <option value="candidate_intake">Candidate intake</option>
              </Select>
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-600">Fields</p>
            <div className="space-y-2.5">
              {fields.map((f, i) => (
                <div key={f.key} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Input className="flex-1 bg-white" placeholder="Field label" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                    <Select className="w-32 bg-white" value={f.type} onChange={(e) => setField(i, { type: e.target.value, map_to: e.target.value === 'file' ? 'resume' : f.map_to === 'resume' ? null : f.map_to })}>
                      {FORM_FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Select>
                    <Button variant="ghost" size="xs" icon={ArrowUp} onClick={() => move(i, -1)} disabled={i === 0} />
                    <Button variant="ghost" size="xs" icon={ArrowDown} onClick={() => move(i, 1)} disabled={i === fields.length - 1} />
                    <Button variant="ghost" size="xs" icon={Trash2} onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))} disabled={fields.length === 1} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Checkbox label="Required" checked={!!f.required} onChange={(e) => setField(i, { required: e.target.checked })} />
                    {f.type === 'select' && (
                      <Input className="w-64 bg-white" placeholder="Options, comma separated"
                        value={Array.isArray(f.options) ? f.options.join(', ') : f.options || ''}
                        onChange={(e) => setField(i, { options: e.target.value })} />
                    )}
                    {kind === 'candidate_intake' && (
                      <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        Fills candidate field:
                        <Select className="w-48 bg-white py-1 text-xs" value={f.map_to || ''} onChange={(e) => setField(i, { map_to: e.target.value || null })}>
                          {FORM_MAP_TO.filter((m) => (f.type === 'file' ? ['', 'resume'].includes(m.value) : m.value !== 'resume')).map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </Select>
                      </label>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" icon={Plus} onClick={() => setFields((fs) => [...fs, newField()])}>Add field</Button>
            </div>
          </div>
        </div>

        {/* ---------- right: live preview ---------- */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-slate-600"><Eye className="h-3.5 w-3.5" /> Preview</p>
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
            <div className="rounded-lg bg-indigo-600 px-4 py-4 text-center text-white">
              <p className="text-[10px] font-medium uppercase tracking-widest text-indigo-200">Makams</p>
              <p className="mt-0.5 text-sm font-semibold">{name || 'Untitled form'}</p>
              {description && <p className="mt-0.5 text-xs text-indigo-100">{description}</p>}
            </div>
            <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              {fields.filter((f) => f.label.trim()).map((f) => (
                <Field key={f.key} label={f.label} required={f.required}>
                  {f.type === 'textarea' ? <Textarea rows={2} disabled placeholder=" " />
                    : f.type === 'select' ? (
                      <Select disabled>
                        <option>{(Array.isArray(f.options) ? f.options : String(f.options || '').split(',')).filter(Boolean)[0] || 'Select…'}</option>
                      </Select>
                    ) : f.type === 'file' ? (
                      <div className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400">Choose file…</div>
                    ) : (
                      <Input disabled type={f.type === 'date' ? 'date' : 'text'} placeholder={f.type === 'email' ? 'name@example.com' : f.type === 'phone' ? '98xxxxxx00' : ' '} />
                    )}
                </Field>
              ))}
              <div className={cx('rounded-lg bg-indigo-600 py-2 text-center text-sm font-medium text-white', !fields.some((f) => f.label.trim()) && 'opacity-40')}>Submit</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ================= responses viewer ================= */

function ResponsesModal({ template, onClose }) {
  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['form-responses', template.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_responses')
        .select('*, form_links(source_name)')
        .eq('form_id', template.id)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data
    },
  })

  const labelFor = useMemo(() => {
    const m = {}
    for (const f of template.fields || []) m[f.key] = f.label
    return (k) => m[k] || k
  }, [template])

  return (
    <Modal open onClose={onClose} title={`Responses — ${template.name}`} size="lg"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {isLoading ? <FullPageSpinner /> : !responses.length ? (
        <p className="py-6 text-center text-sm text-slate-400">No responses yet.</p>
      ) : (
        <ul className="space-y-3">
          {responses.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-200 p-3.5">
              <p className="mb-2 text-xs text-slate-400">
                {fmtDateTime(r.created_at)}{r.form_links?.source_name ? ` · via ${r.form_links.source_name}` : ''}
                {r.candidate_id && <Badge tone="green" className="ml-2">Added to candidates</Badge>}
              </p>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {Object.entries(r.answers || {}).map(([k, v]) => (
                  <div key={k} className="text-sm">
                    <dt className="text-xs text-slate-400">{labelFor(k)}</dt>
                    <dd className="text-slate-700">{String(v)}</dd>
                  </div>
                ))}
                {(r.files || []).map((f) => (
                  <div key={f.key} className="text-sm">
                    <dt className="text-xs text-slate-400">{labelFor(f.key)}</dt>
                    <dd className="text-indigo-600">{f.name}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
