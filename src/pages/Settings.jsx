import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, RefreshCw, ArrowDown, ArrowUp, GraduationCap, Mail, Sheet } from 'lucide-react'
import { supabase, callFunction } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  PageHeader, Card, Button, Badge, Tabs, Modal, Field, Input, Select, Textarea, Checkbox,
  Table, Th, Td, Tr, FullPageSpinner, useToast, EmptyState,
} from '../components/ui'
import { ROLES } from '../lib/constants'
import { inr, fmtDateTime } from '../lib/format'

export default function Settings() {
  const [tab, setTab] = useState('users')
  return (
    <div>
      <PageHeader title="Settings" />
      <Tabs
        className="mb-5 w-fit"
        tabs={[
          { value: 'users', label: 'Users' },
          { value: 'company', label: 'Company' },
          { value: 'purchase', label: 'Purchase setup' },
          { value: 'integrations', label: 'Integrations' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'users' && <UsersTab />}
      {tab === 'company' && <CompanyTab />}
      {tab === 'purchase' && <PurchaseTab />}
      {tab === 'integrations' && <IntegrationsTab />}
    </div>
  )
}

/* ================= Users ================= */

function UsersTab() {
  const { appUser } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState(null) // 'new' | user

  const { data: users, isLoading } = useQuery({
    queryKey: ['app-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_users').select('*').order('created_at')
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <FullPageSpinner />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">People who can sign in to this app. They sign in with Google using the exact email you invite.</p>
        <Button icon={Plus} onClick={() => setEditing('new')}>Invite user</Button>
      </div>
      <Table>
        <thead>
          <tr><Th>Name</Th><Th>Email</Th><Th>Roles</Th><Th>Status</Th><Th /></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <Tr key={u.id}>
              <Td className="font-medium text-slate-900">{u.full_name || '—'}{u.id === appUser.id && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}</Td>
              <Td className="text-slate-500">{u.email}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {u.roles.map((r) => <Badge key={r} tone={r === 'admin' ? 'violet' : 'indigo'}>{r}</Badge>)}
                  {!u.roles.length && <span className="text-xs text-slate-300">no roles</span>}
                </div>
              </Td>
              <Td>
                {!u.active ? <Badge tone="gray">Deactivated</Badge> : u.auth_id ? <Badge tone="green">Joined</Badge> : <Badge tone="amber">Invited</Badge>}
              </Td>
              <Td right><Button variant="ghost" size="xs" icon={Pencil} onClick={() => setEditing(u)}>Edit</Button></Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {editing && <UserModal user={editing === 'new' ? null : editing} self={appUser} onClose={() => setEditing(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ['app-users'] })} />}
    </div>
  )
}

function UserModal({ user, self, onClose, onSaved }) {
  const toast = useToast()
  const [email, setEmail] = useState(user?.email || '')
  const [name, setName] = useState(user?.full_name || '')
  const [roles, setRoles] = useState(user?.roles || ['hr'])
  const [active, setActive] = useState(user ? user.active : true)
  const [saving, setSaving] = useState(false)
  const isSelf = user && self && user.id === self.id

  const toggleRole = (r) => setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))

  const save = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) return toast('Enter a valid email', 'error')
    if (isSelf && !roles.includes('admin')) return toast("You can't remove your own admin role", 'error')
    if (isSelf && !active) return toast("You can't deactivate yourself", 'error')
    setSaving(true)
    try {
      if (user) {
        const { error } = await supabase.from('app_users').update({ email: email.trim(), full_name: name.trim() || null, roles, active }).eq('id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('app_users').insert({ email: email.trim(), full_name: name.trim() || null, roles, active })
        if (error) throw error
      }
      toast('Saved')
      onSaved()
      onClose()
    } catch (e) {
      toast(e.message.includes('duplicate') ? 'That email is already invited' : e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={user ? `Edit ${user.email}` : 'Invite user'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>{user ? 'Save' : 'Invite'}</Button></>}>
      <div className="space-y-4">
        <Field label="Google email" required hint="They must sign in with exactly this Google account">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!user?.auth_id} autoFocus={!user} />
        </Field>
        <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div>
          <p className="mb-2 text-[13px] font-medium text-slate-600">Roles</p>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <Checkbox key={r.value} label={r.label} hint={r.hint} checked={roles.includes(r.value)} onChange={() => toggleRole(r.value)} />
            ))}
          </div>
        </div>
        {user && <Checkbox label="Active" hint="Deactivated users can't sign in" checked={active} onChange={(e) => setActive(e.target.checked)} />}
      </div>
    </Modal>
  )
}

/* ================= Company ================= */

function CompanyTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data } = useQuery({
    queryKey: ['settings-company'],
    queryFn: async () => (await supabase.from('app_settings').select('value').eq('key', 'company').maybeSingle()).data?.value || {},
  })

  useEffect(() => { if (data && !form) setForm(data) }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return <FullPageSpinner />
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('app_settings').upsert({ key: 'company', value: form })
    setSaving(false)
    if (error) return toast(error.message, 'error')
    qc.invalidateQueries({ queryKey: ['settings-company'] })
    toast('Company profile saved')
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card title="Company profile" actions={<Button size="sm" onClick={save} loading={saving}>Save</Button>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company name"><Input value={form.name || ''} onChange={set('name')} /></Field>
          <Field label="GSTIN"><Input value={form.gstin || ''} onChange={set('gstin')} /></Field>
          <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={form.address || ''} onChange={set('address')} /></Field>
          <Field label="City"><Input value={form.city || ''} onChange={set('city')} /></Field>
          <Field label="State" hint="Used to suggest GST mode on POs"><Input value={form.state || ''} onChange={set('state')} /></Field>
          <Field label="PIN code"><Input value={form.pincode || ''} onChange={set('pincode')} /></Field>
          <Field label="Phone"><Input value={form.phone || ''} onChange={set('phone')} /></Field>
          <Field label="Email"><Input value={form.email || ''} onChange={set('email')} /></Field>
        </div>
      </Card>
      <Card title="Purchase order defaults" actions={<Button size="sm" onClick={save} loading={saving}>Save</Button>}>
        <div className="space-y-4">
          <Field label="PO number prefix" hint={`Numbers look like ${form.po_prefix || 'PO'}/26-27/0001 (resets each financial year)`}>
            <Input className="w-40" value={form.po_prefix || ''} onChange={set('po_prefix')} />
          </Field>
          <Field label="Default terms & conditions" hint="Pre-filled on every new PO; editable per PO">
            <Textarea rows={5} value={form.po_terms || ''} onChange={set('po_terms')} />
          </Field>
        </div>
      </Card>
    </div>
  )
}

/* ================= Purchase setup ================= */

function PurchaseTab() {
  return (
    <div className="space-y-4">
      <ApprovalRulesCard />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PoTypesCard />
        <LocationsCard />
      </div>
    </div>
  )
}

function PoTypesCard() {
  const qc = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const { data: types = [] } = useQuery({
    queryKey: ['po-types-all'],
    queryFn: async () => (await supabase.from('po_types').select('*').order('name')).data || [],
  })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['po-types-all'] }); qc.invalidateQueries({ queryKey: ['po-types'] }) }

  const add = async () => {
    if (!name.trim()) return
    const { error } = await supabase.from('po_types').insert({ name: name.trim() })
    if (error) return toast(error.message, 'error')
    setName('')
    refresh()
  }
  const toggle = async (t) => {
    const { error } = await supabase.from('po_types').update({ active: !t.active }).eq('id', t.id)
    if (error) return toast(error.message, 'error')
    refresh()
  }

  return (
    <Card title="PO types" pad={false}>
      <ul className="divide-y divide-slate-100">
        {types.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className={t.active ? 'text-slate-800' : 'text-slate-400 line-through'}>{t.name}</span>
            <Button variant="ghost" size="xs" onClick={() => toggle(t)}>{t.active ? 'Deactivate' : 'Activate'}</Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 border-t border-slate-100 p-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New PO type…" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button variant="secondary" icon={Plus} onClick={add}>Add</Button>
      </div>
    </Card>
  )
}

function LocationsCard() {
  const qc = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-all'],
    queryFn: async () => (await supabase.from('delivery_locations').select('*').order('name')).data || [],
  })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['locations-all'] }); qc.invalidateQueries({ queryKey: ['locations'] }) }

  const toggle = async (l) => {
    const { error } = await supabase.from('delivery_locations').update({ active: !l.active }).eq('id', l.id)
    if (error) return toast(error.message, 'error')
    refresh()
  }

  return (
    <Card title="Delivery locations" pad={false}
      actions={<Button variant="secondary" size="xs" icon={Plus} onClick={() => setEditing('new')}>Add</Button>}>
      <ul className="divide-y divide-slate-100">
        {locations.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <div>
              <span className={l.active ? 'text-slate-800' : 'text-slate-400 line-through'}>{l.name}</span>
              <span className="ml-2 text-xs text-slate-400">{[l.state, l.gstin].filter(Boolean).join(' · ')}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="xs" icon={Pencil} onClick={() => setEditing(l)} />
              <Button variant="ghost" size="xs" onClick={() => toggle(l)}>{l.active ? 'Deactivate' : 'Activate'}</Button>
            </div>
          </li>
        ))}
        {!locations.length && <li className="px-4 py-3 text-sm text-slate-400">No locations yet.</li>}
      </ul>
      {editing && <LocationModal location={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </Card>
  )
}

function LocationModal({ location, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: location?.name || '', address: location?.address || '', state: location?.state || '', gstin: location?.gstin || '' })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.name.trim()) return toast('Name is required', 'error')
    setSaving(true)
    const payload = { ...form }
    for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null
    const q = location
      ? supabase.from('delivery_locations').update(payload).eq('id', location.id)
      : supabase.from('delivery_locations').insert(payload)
    const { error } = await q
    setSaving(false)
    if (error) return toast(error.message, 'error')
    onSaved()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={location ? `Edit ${location.name}` : 'Add delivery location'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Name" required><Input value={form.name} onChange={set('name')} placeholder="e.g. Factory — Baddi" autoFocus /></Field>
        <Field label="Address (shown on PO as Ship To)"><Textarea rows={2} value={form.address} onChange={set('address')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="State" hint="Drives CGST+SGST vs IGST suggestion"><Input value={form.state} onChange={set('state')} /></Field>
          <Field label="GSTIN (if different)"><Input value={form.gstin} onChange={set('gstin')} /></Field>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- approval rules ---------------- */

function ApprovalRulesCard() {
  const qc = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState(null)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['approval-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_rules')
        .select('*, approval_rule_steps(*, approver:approver_id(id, full_name, email))')
        .order('priority')
      if (error) throw error
      return data.map((r) => ({ ...r, approval_rule_steps: r.approval_rule_steps.sort((a, b) => a.position - b.position) }))
    },
  })
  const { data: types = [] } = useQuery({ queryKey: ['po-types-all'], queryFn: async () => (await supabase.from('po_types').select('*').order('name')).data || [] })
  const { data: locations = [] } = useQuery({ queryKey: ['locations-all'], queryFn: async () => (await supabase.from('delivery_locations').select('*').order('name')).data || [] })

  const refresh = () => qc.invalidateQueries({ queryKey: ['approval-rules'] })

  const remove = async (r) => {
    if (!window.confirm(`Delete rule “${r.name}”?`)) return
    const { error } = await supabase.from('approval_rules').delete().eq('id', r.id)
    if (error) return toast(error.message, 'error')
    refresh()
  }

  const typeName = (id) => types.find((t) => t.id === id)?.name || '?'
  const locName = (id) => locations.find((l) => l.id === id)?.name || '?'

  return (
    <Card
      title="Approval rules"
      pad={false}
      actions={<Button size="xs" icon={Plus} onClick={() => setEditing('new')}>New rule</Button>}
    >
      <p className="border-b border-slate-100 px-4 py-2.5 text-xs text-slate-400">
        When a PO is submitted, the first matching rule (lowest priority number) decides who approves, in order. A PO that matches no rule cannot be submitted.
      </p>
      {isLoading ? <FullPageSpinner /> : !rules.length ? (
        <EmptyState className="m-4" title="No rules yet — POs can't be submitted until one exists"
          action={<Button icon={Plus} onClick={() => setEditing('new')}>Create your first rule</Button>} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Badge tone="slate">#{r.priority}</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{r.name} {!r.active && <Badge tone="gray" className="ml-1">Inactive</Badge>}</p>
                <p className="text-xs text-slate-400">
                  {[
                    r.po_type_ids.length ? `Types: ${r.po_type_ids.map(typeName).join(', ')}` : 'Any type',
                    r.location_ids.length ? `Locations: ${r.location_ids.map(locName).join(', ')}` : 'Any location',
                    r.max_amount != null ? `${inr(r.min_amount)} – ${inr(r.max_amount)}` : Number(r.min_amount) > 0 ? `Above ${inr(r.min_amount)}` : 'Any amount',
                  ].join(' · ')}
                </p>
                <p className="mt-0.5 text-xs text-indigo-600">
                  {r.approval_rule_steps.length
                    ? r.approval_rule_steps.map((s, i) => `${i + 1}. ${s.approver?.full_name || s.approver?.email}`).join(' → ')
                    : 'Auto-approves (no steps)'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="xs" icon={Pencil} onClick={() => setEditing(r)} />
                <Button variant="ghost" size="xs" icon={Trash2} onClick={() => remove(r)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <RuleModal rule={editing === 'new' ? null : editing} types={types} locations={locations}
          onClose={() => setEditing(null)} onSaved={refresh} defaultPriority={(rules.at(-1)?.priority || 0) + 10} />
      )}
    </Card>
  )
}

function RuleModal({ rule, types, locations, onClose, onSaved, defaultPriority }) {
  const toast = useToast()
  const [name, setName] = useState(rule?.name || '')
  const [priority, setPriority] = useState(rule?.priority ?? defaultPriority)
  const [active, setActive] = useState(rule ? rule.active : true)
  const [typeIds, setTypeIds] = useState(rule?.po_type_ids || [])
  const [locIds, setLocIds] = useState(rule?.location_ids || [])
  const [minAmount, setMinAmount] = useState(rule?.min_amount ?? 0)
  const [maxAmount, setMaxAmount] = useState(rule?.max_amount ?? '')
  const [steps, setSteps] = useState(rule ? rule.approval_rule_steps.map((s) => s.approver_id) : [''])
  const [saving, setSaving] = useState(false)

  const { data: approvers = [] } = useQuery({
    queryKey: ['approver-users'],
    queryFn: async () => {
      const { data } = await supabase.from('app_users').select('id, full_name, email, roles, active').eq('active', true)
      return (data || []).filter((u) => u.roles.includes('approver') || u.roles.includes('admin'))
    },
  })

  const toggleIn = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const moveStep = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSteps(next)
  }

  const save = async () => {
    if (!name.trim()) return toast('Name the rule', 'error')
    const cleanSteps = steps.filter(Boolean)
    if (new Set(cleanSteps).size !== cleanSteps.length) return toast('The same approver appears twice', 'error')
    setSaving(true)
    try {
      const payload = {
        name: name.trim(), priority: Number(priority) || 100, active,
        po_type_ids: typeIds, location_ids: locIds,
        min_amount: Number(minAmount) || 0, max_amount: maxAmount === '' ? null : Number(maxAmount),
      }
      let ruleId = rule?.id
      if (rule) {
        const { error } = await supabase.from('approval_rules').update(payload).eq('id', rule.id)
        if (error) throw error
        const { error: delErr } = await supabase.from('approval_rule_steps').delete().eq('rule_id', rule.id)
        if (delErr) throw delErr
      } else {
        const { data, error } = await supabase.from('approval_rules').insert(payload).select('id').single()
        if (error) throw error
        ruleId = data.id
      }
      if (cleanSteps.length) {
        const { error } = await supabase.from('approval_rule_steps').insert(cleanSteps.map((a, i) => ({ rule_id: ruleId, position: i + 1, approver_id: a })))
        if (error) throw error
      }
      toast('Rule saved')
      onSaved()
      onClose()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={rule ? `Edit rule — ${rule.name}` : 'New approval rule'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save rule</Button></>}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Rule name" required className="sm:col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Capex above ₹1L" autoFocus /></Field>
          <Field label="Priority" hint="Lower number = checked first"><Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} /></Field>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-600">PO types <span className="font-normal text-slate-400">(none = any)</span></p>
            <div className="space-y-1.5">
              {types.filter((t) => t.active || typeIds.includes(t.id)).map((t) => (
                <Checkbox key={t.id} label={t.name} checked={typeIds.includes(t.id)} onChange={() => toggleIn(typeIds, setTypeIds, t.id)} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-600">Delivery locations <span className="font-normal text-slate-400">(none = any)</span></p>
            <div className="space-y-1.5">
              {locations.filter((l) => l.active || locIds.includes(l.id)).map((l) => (
                <Checkbox key={l.id} label={l.name} checked={locIds.includes(l.id)} onChange={() => toggleIn(locIds, setLocIds, l.id)} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Minimum amount (₹)"><Input type="number" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} /></Field>
          <Field label="Maximum amount (₹)" hint="Blank = no upper limit"><Input type="number" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} /></Field>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-slate-600">Approvers, in order</p>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm text-slate-400">{i + 1}.</span>
                <Select value={s} onChange={(e) => setSteps((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))}>
                  <option value="">Select approver…</option>
                  {approvers.map((a) => <option key={a.id} value={a.id}>{a.full_name || a.email}</option>)}
                </Select>
                <Button variant="ghost" size="xs" icon={ArrowUp} onClick={() => moveStep(i, -1)} disabled={i === 0} />
                <Button variant="ghost" size="xs" icon={ArrowDown} onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} />
                <Button variant="ghost" size="xs" icon={Trash2} onClick={() => setSteps((xs) => xs.filter((_, j) => j !== i))} />
              </div>
            ))}
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setSteps((xs) => [...xs, ''])}>Add approver</Button>
            <p className="text-xs text-slate-400">Only users with the Approver (or Admin) role are listed. A rule with no approvers auto-approves matching POs.</p>
          </div>
        </div>

        {rule && <Checkbox label="Rule is active" checked={active} onChange={(e) => setActive(e.target.checked)} />}
      </div>
    </Modal>
  )
}

/* ================= Integrations ================= */

function IntegrationsTab() {
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)
  const qc = useQueryClient()

  const { data: syncLog = [] } = useQuery({
    queryKey: ['sheet-sync-log'],
    queryFn: async () => (await supabase.from('sheet_sync_log').select('*').order('created_at', { ascending: false }).limit(8)).data || [],
  })
  const { data: learnappLog = [] } = useQuery({
    queryKey: ['learnapp-log-all'],
    queryFn: async () => (await supabase.from('learnapp_actions').select('*, people(full_name)').order('created_at', { ascending: false }).limit(8)).data || [],
  })

  const syncNow = async () => {
    setSyncing(true)
    try {
      const res = await callFunction('sync-sheet', {})
      toast(`Sheet updated — ${res?.rows ?? '?'} rows`)
    } catch (e) {
      toast(`Sync failed: ${e.message}`, 'error')
    } finally {
      setSyncing(false)
      qc.invalidateQueries({ queryKey: ['sheet-sync-log'] })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Google Sheet sync" actions={<Button size="sm" variant="secondary" icon={RefreshCw} loading={syncing} onClick={syncNow}>Sync now</Button>}>
        <div className="flex items-start gap-3">
          <Sheet className="mt-0.5 h-6 w-6 text-emerald-600" />
          <div className="text-sm text-slate-600">
            <p>This app is the source of truth. Every save pushes the full employee list to your Google Sheet; use <em>Sync now</em> to force it.</p>
            <p className="mt-1 text-xs text-slate-400">Configured via edge-function secrets: GOOGLE_SERVICE_ACCOUNT, SHEET_ID, SHEET_TAB — see the README.</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
          {syncLog.map((l) => (
            <li key={l.id} className="flex items-center gap-2 text-xs">
              <Badge tone={l.status === 'ok' ? 'green' : 'red'}>{l.status}</Badge>
              <span className="text-slate-500">{l.rows != null ? `${l.rows} rows` : ''} {l.detail || ''}</span>
              <span className="ml-auto text-slate-400">{fmtDateTime(l.created_at)}</span>
            </li>
          ))}
          {!syncLog.length && <li className="text-xs text-slate-400">No syncs yet.</li>}
        </ul>
      </Card>

      <Card title="CRIL learnapp">
        <div className="flex items-start gap-3">
          <GraduationCap className="mt-0.5 h-6 w-6 text-indigo-600" />
          <div className="text-sm text-slate-600">
            <p>Create, disable and re-enable learnapp accounts from each person's Learnapp tab. Actions run against the learnapp's own Supabase project.</p>
            <p className="mt-1 text-xs text-slate-400">Configured via edge-function secrets: LEARNAPP_URL, LEARNAPP_SERVICE_ROLE_KEY — see the README.</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
          {learnappLog.map((l) => (
            <li key={l.id} className="flex items-center gap-2 text-xs">
              <Badge tone={l.status === 'ok' ? 'green' : 'red'}>{l.action}</Badge>
              <span className="text-slate-500">{l.people?.full_name}</span>
              <span className="ml-auto text-slate-400">{fmtDateTime(l.created_at)}</span>
            </li>
          ))}
          {!learnappLog.length && <li className="text-xs text-slate-400">No actions yet.</li>}
        </ul>
      </Card>

      <Card title="PO emails">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-6 w-6 text-sky-600" />
          <div className="text-sm text-slate-600">
            <p>POs are emailed to vendors (with the PDF attached) through Resend. Every send and failure is logged on the PO's activity timeline.</p>
            <p className="mt-1 text-xs text-slate-400">Configured via edge-function secrets: RESEND_API_KEY, PO_FROM_EMAIL — see the README.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
