import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, GripVertical, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Card, Button, Input, Select, Field, Modal, Badge, EmptyState, FullPageSpinner, useToast } from '../../components/ui'
import { DOC_TYPES } from '../../lib/constants'

export default function ChecklistTemplates() {
  const qc = useQueryClient()
  const toast = useToast()
  const [editItem, setEditItem] = useState(null) // {templateId, item?}
  const [newTplOpen, setNewTplOpen] = useState(false)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['checklist-templates-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*, checklist_template_items(*)')
        .order('kind')
      if (error) throw error
      return data.map((t) => ({ ...t, checklist_template_items: t.checklist_template_items.sort((a, b) => a.position - b.position) }))
    },
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['checklist-templates-full'] })
    qc.invalidateQueries({ queryKey: ['checklist-templates'] })
  }

  const removeItem = async (item) => {
    if (!window.confirm('Remove this item from the template?')) return
    const { error } = await supabase.from('checklist_template_items').delete().eq('id', item.id)
    if (error) return toast(error.message, 'error')
    refresh()
  }

  const move = async (tpl, index, dir) => {
    const items = tpl.checklist_template_items
    const j = index + dir
    if (j < 0 || j >= items.length) return
    const a = items[index], b = items[j]
    await supabase.from('checklist_template_items').update({ position: b.position }).eq('id', a.id)
    await supabase.from('checklist_template_items').update({ position: a.position }).eq('id', b.id)
    refresh()
  }

  const toggleActive = async (tpl) => {
    const { error } = await supabase.from('checklist_templates').update({ active: !tpl.active }).eq('id', tpl.id)
    if (error) return toast(error.message, 'error')
    refresh()
  }

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <PageHeader
        title="Checklist templates"
        sub="What gets checked off when someone joins or leaves. Changes apply to newly started checklists."
        actions={<Button icon={Plus} onClick={() => setNewTplOpen(true)}>New template</Button>}
      />

      {!templates?.length ? (
        <EmptyState title="No templates" action={<Button icon={Plus} onClick={() => setNewTplOpen(true)}>New template</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id} pad={false}
              title={<span>{tpl.name} <Badge tone={tpl.kind === 'onboarding' ? 'green' : 'slate'} className="ml-1">{tpl.kind}</Badge></span>}
              actions={
                <>
                  <Button variant="ghost" size="xs" onClick={() => toggleActive(tpl)}>{tpl.active ? 'Deactivate' : 'Activate'}</Button>
                  <Button variant="secondary" size="xs" icon={Plus} onClick={() => setEditItem({ templateId: tpl.id, position: (tpl.checklist_template_items.at(-1)?.position || 0) + 1 })}>
                    Add item
                  </Button>
                </>
              }>
              <ul className="divide-y divide-slate-100">
                {tpl.checklist_template_items.map((item, i) => (
                  <li key={item.id} className="group flex items-center gap-2 px-4 py-2">
                    <div className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100">
                      <button className="text-slate-300 hover:text-slate-500" onClick={() => move(tpl, i, -1)}>▲</button>
                      <button className="text-slate-300 hover:text-slate-500" onClick={() => move(tpl, i, 1)}>▼</button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-400">
                        {[item.description, item.due_days != null ? `due +${item.due_days}d` : null, item.doc_type ? `doc: ${item.doc_type}` : null]
                          .filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Button variant="ghost" size="xs" icon={Pencil} onClick={() => setEditItem({ templateId: tpl.id, item })} />
                    <Button variant="ghost" size="xs" icon={Trash2} onClick={() => removeItem(item)} />
                  </li>
                ))}
                {!tpl.checklist_template_items.length && <li className="px-4 py-3 text-sm text-slate-400">No items yet.</li>}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {editItem && <ItemModal spec={editItem} onClose={() => setEditItem(null)} onSaved={refresh} />}
      {newTplOpen && <TemplateModal onClose={() => setNewTplOpen(false)} onSaved={refresh} />}
    </div>
  )
}

function ItemModal({ spec, onClose, onSaved }) {
  const toast = useToast()
  const item = spec.item
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    doc_type: item?.doc_type || '',
    due_days: item?.due_days ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.title.trim()) return toast('Title is required', 'error')
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      doc_type: form.doc_type || null,
      due_days: form.due_days === '' ? null : Number(form.due_days),
    }
    let error
    if (item) {
      ;({ error } = await supabase.from('checklist_template_items').update(payload).eq('id', item.id))
    } else {
      ;({ error } = await supabase.from('checklist_template_items').insert({ ...payload, template_id: spec.templateId, position: spec.position }))
    }
    setSaving(false)
    if (error) return toast(error.message, 'error')
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={item ? 'Edit item' : 'Add item'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={set('title')} autoFocus /></Field>
        <Field label="Description"><Input value={form.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Linked document" hint="Optional — ties this item to a document type">
            <Select value={form.doc_type} onChange={set('doc_type')}>
              <option value="">None</option>
              {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </Field>
          <Field label="Due (days after start)"><Input type="number" min="0" value={form.due_days} onChange={set('due_days')} /></Field>
        </div>
      </div>
    </Modal>
  )
}

function TemplateModal({ onClose, onSaved }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('onboarding')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return toast('Name is required', 'error')
    setSaving(true)
    const { error } = await supabase.from('checklist_templates').insert({ name: name.trim(), kind })
    setSaving(false)
    if (error) return toast(error.message, 'error')
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="New template"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Create</Button></>}>
      <div className="space-y-4">
        <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Factory-worker onboarding" autoFocus /></Field>
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="onboarding">Onboarding</option>
            <option value="exit">Exit</option>
          </Select>
        </Field>
      </div>
    </Modal>
  )
}
