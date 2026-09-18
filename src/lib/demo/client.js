// In-memory stand-in for the Supabase client, used when VITE_DEMO=1.
// Implements exactly the surface this app uses: PostgREST-style queries with
// nested hydration, the state-transition RPCs, auth, storage and edge functions.
// Data lives only in this browser tab; refresh = reset.

import { buildSeedStore, DEMO_AUTH_ID } from './data'

const store = buildSeedStore()
const objectUrls = {} // storage path -> blob URL for files uploaded during the demo

const genId = (p = 'x') => `${p}-${Math.random().toString(36).slice(2, 10)}`
const nowIso = () => new Date().toISOString()
const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)))
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))

/* ---------------- computed columns & rollups ---------------- */

const r2 = (n) => Math.round(n * 100) / 100

function itemWithComputed(it) {
  const line_total = r2(Number(it.qty) * Number(it.unit_price))
  const tax_amount = r2(Number(it.qty) * Number(it.unit_price) * Number(it.tax_pct) / 100)
  return { ...it, line_total, tax_amount }
}

function recomputePoTotals(poId) {
  const po = store.purchase_orders.find((p) => p.id === poId)
  if (!po) return
  const items = store.po_items.filter((i) => i.po_id === poId).map(itemWithComputed)
  po.subtotal = r2(items.reduce((s, i) => s + i.line_total, 0))
  po.tax_total = r2(items.reduce((s, i) => s + i.tax_amount, 0))
  po.grand_total = r2(po.subtotal + po.tax_total)
  po.updated_at = nowIso()
}

function recomputeReceived(poId) {
  const po = store.purchase_orders.find((p) => p.id === poId)
  if (!po) return
  const items = store.po_items.filter((i) => i.po_id === poId)
  const any = items.some((i) => Number(i.received_qty) > 0)
  const full = items.length > 0 && items.every((i) => Number(i.received_qty) >= Number(i.qty))
  po.received_status = full ? 'full' : any ? 'partial' : 'none'
}

function recomputeChecklist(checklistId) {
  const cl = store.person_checklists.find((c) => c.id === checklistId)
  if (!cl || cl.status === 'cancelled') return
  const items = store.person_checklist_items.filter((i) => i.checklist_id === checklistId)
  const pending = items.filter((i) => i.status === 'pending').length
  if (pending === 0 && items.length) {
    if (cl.status !== 'completed') { cl.status = 'completed'; cl.completed_at = cl.completed_at || nowIso() }
  } else if (cl.status === 'completed') {
    cl.status = 'in_progress'; cl.completed_at = null
  }
}

store.purchase_orders.forEach((p) => recomputePoTotals(p.id))
store._po_counter = 6

/* ---------------- hydration (joins) ---------------- */

const userLite = (id) => {
  const u = store.app_users.find((x) => x.id === id)
  return u ? { id: u.id, full_name: u.full_name, email: u.email } : null
}

function hydratePoLite(po) {
  return {
    ...po,
    vendors: clone(store.vendors.find((v) => v.id === po.vendor_id)) || null,
    po_types: clone(store.po_types.find((t) => t.id === po.po_type_id)) || null,
    delivery_locations: clone(store.delivery_locations.find((l) => l.id === po.location_id)) || null,
    creator: userLite(po.created_by),
  }
}

const hydrators = {
  purchase_orders: (po) => ({
    ...hydratePoLite(po),
    po_items: store.po_items.filter((i) => i.po_id === po.id).map(itemWithComputed).sort((a, b) => a.position - b.position),
    po_approval_steps: store.po_approval_steps.filter((s) => s.po_id === po.id).map((s) => ({ ...s, approver: userLite(s.approver_id) })),
    po_events: store.po_events.filter((e) => e.po_id === po.id).map((e) => ({ ...e, actor: userLite(e.actor_id) })),
    receipts: store.receipts.filter((r) => r.po_id === po.id).map((r) => ({
      ...r, receipt_items: store.receipt_items.filter((ri) => ri.receipt_id === r.id),
    })),
  }),
  po_approval_steps: (s) => {
    const po = store.purchase_orders.find((p) => p.id === s.po_id)
    return { ...s, approver: userLite(s.approver_id), purchase_orders: po ? hydratePoLite(po) : null }
  },
  po_items: (i) => itemWithComputed(i),
  upload_links: (l) => {
    const p = store.people.find((x) => x.id === l.person_id)
    return { ...l, people: p ? { id: p.id, full_name: p.full_name } : null }
  },
  person_checklists: (c) => ({
    ...c,
    person_checklist_items: store.person_checklist_items.filter((i) => i.checklist_id === c.id),
  }),
  checklist_templates: (t) => ({
    ...t,
    checklist_template_items: store.checklist_template_items.filter((i) => i.template_id === t.id),
  }),
  approval_rules: (r) => ({
    ...r,
    approval_rule_steps: store.approval_rule_steps.filter((s) => s.rule_id === r.id).map((s) => ({ ...s, approver: userLite(s.approver_id) })),
  }),
  learnapp_actions: (a) => {
    const p = store.people.find((x) => x.id === a.person_id)
    return { ...a, people: p ? { full_name: p.full_name } : null }
  },
  receipts: (r) => ({ ...r, receipt_items: store.receipt_items.filter((ri) => ri.receipt_id === r.id) }),
  form_links: (l) => {
    const t = store.form_templates.find((x) => x.id === l.form_id)
    return { ...l, form_templates: t ? { name: t.name, kind: t.kind } : null }
  },
  form_responses: (r) => {
    const l = store.form_links.find((x) => x.id === r.link_id)
    return { ...r, form_links: l ? { source_name: l.source_name } : null }
  },
}

function hydrateTable(table) {
  const rows = store[table] || []
  const h = hydrators[table]
  return rows.map((r) => clone(h ? h(r) : r))
}

/* ---------------- write behaviour ---------------- */

/** the Candidates DB holds everyone: employees and prospectives are mirrored into it */
function ensureCandidate({ full_name, phone, designation, area, source, current_company = null }) {
  const key = String(phone || '').replace(/\D/g, '').slice(-10)
  const dup = store.candidates.find(
    (c) => (key && String(c.phone || '').replace(/\D/g, '').slice(-10) === key) ||
           String(c.full_name || '').toLowerCase() === String(full_name || '').trim().toLowerCase()
  )
  if (dup || !String(full_name || '').trim()) return
  store.candidates.unshift({
    ...insertDefaults.candidates(),
    full_name: String(full_name).trim(), phone: phone || null,
    designation: designation || null, area: area || null,
    current_company, referred_by_name: 'CRIL HR', source: source || 'Makams Ops',
  })
}

/** MI0001, MI0002, … — mirrors the prospective_cv_seq sequence in Postgres. */
const nextCvNo = () => {
  const used = (store.prospectives || [])
    .map((r) => Number(String(r.cv_no || '').replace(/^MI/, '')))
    .filter((n) => Number.isFinite(n) && n > 0)
  return 'MI' + String((used.length ? Math.max(...used) : 0) + 1).padStart(4, '0')
}

const insertDefaults = {
  app_users: () => ({ id: genId('u'), auth_id: null, active: true, roles: [], created_at: nowIso(), updated_at: nowIso() }),
  people: () => ({ id: genId('p'), status: 'joining', sales_role: 'sales', department: 'Sales', extra: {}, created_by: 'u-aakash', created_at: nowIso(), updated_at: nowIso() }),
  person_documents: () => ({ id: genId('d'), status: 'uploaded', source: 'hr', uploaded_at: nowIso(), created_at: nowIso() }),
  upload_links: () => ({ id: genId('l'), token: genId('demo-link'), doc_types: [], profile_fields: [], expires_at: new Date(Date.now() + 14 * 86400000).toISOString(), created_by: 'u-aakash', created_at: nowIso(), revoked_at: null, last_used_at: null, submitted_at: null }),
  checklist_templates: () => ({ id: genId('t'), active: true, created_at: nowIso() }),
  checklist_template_items: () => ({ id: genId('ti'), position: 0, owner_role: 'hr' }),
  person_checklists: () => ({ id: genId('cl'), status: 'in_progress', started_at: nowIso() }),
  person_checklist_items: () => ({ id: genId('ci'), status: 'pending', owner_role: 'hr' }),
  vendors: () => ({ id: genId('v'), active: true, created_at: nowIso(), updated_at: nowIso() }),
  po_types: () => ({ id: genId('pt'), active: true, created_at: nowIso() }),
  delivery_locations: () => ({ id: genId('loc'), active: true, created_at: nowIso() }),
  approval_rules: () => ({ id: genId('r'), priority: 100, active: true, po_type_ids: [], location_ids: [], min_amount: 0, max_amount: null, created_at: nowIso() }),
  approval_rule_steps: () => ({ id: genId('rs'), position: 1 }),
  purchase_orders: () => ({ id: genId('po'), po_number: null, status: 'draft', order_date: nowIso().slice(0, 10), tax_mode: 'cgst_sgst', subtotal: 0, tax_total: 0, grand_total: 0, current_step: null, sent_count: 0, received_status: 'none', created_by: 'u-aakash', created_at: nowIso(), updated_at: nowIso() }),
  po_items: () => ({ id: genId('i'), position: 0, unit: 'nos', unit_price: 0, tax_pct: 18, received_qty: 0 }),
  learnapp_actions: () => ({ id: genId('la'), created_by: 'u-aakash', created_at: nowIso() }),
  app_settings: () => ({ updated_at: nowIso() }),
  candidates: () => ({ id: genId('c'), status: 'new', extra: {}, referred_by_name: null, referrer_emp_id: null, picked_at: null, prospective_id: null, hr_comment: null, created_by: 'u-aakash', created_at: nowIso(), updated_at: nowIso() }),
  prospectives: () => ({ id: genId('pr'), cv_no: nextCvNo(), division: null, department: 'Sales', source: 'Other', status: 'new', candidate_id: null, resume_path: null, resume_name: null, created_by: 'u-aakash', created_at: nowIso(), updated_at: nowIso() }),
  referral_submissions: () => ({ id: genId('rs'), status: 'pending', candidate_id: null, reviewed_by: null, reviewed_at: null, created_at: nowIso(), updated_at: nowIso() }),
  form_templates: () => ({ id: genId('ft'), kind: 'general', fields: [], active: true, created_at: nowIso(), updated_at: nowIso() }),
  form_links: () => ({ id: genId('fl'), token: genId('demo-link'), active: true, expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), referrer_name: null, referrer_emp_id: null, referrer_phone: null, submission_count: 0, created_by: 'u-aakash', created_at: nowIso() }),
  form_responses: () => ({ id: genId('fr'), answers: {}, files: [], candidate_id: null, created_at: nowIso() }),
}

function afterWrite(table, rows, mode) {
  if (mode === 'insert' && table === 'people') {
    for (const p of rows) ensureCandidate({ ...p, area: p.hq_name, source: 'Employee', current_company: 'CRIL' })
  }
  if (mode === 'insert' && table === 'prospectives') {
    for (const p of rows) {
      if (p.candidate_id) continue                                   // came FROM the Candidates DB
      if ((p.department || 'Sales') !== 'Sales') continue             // sales pipeline only
      ensureCandidate({ full_name: p.full_name, phone: p.contact, designation: p.designation, area: p.area, source: 'Prospective' })
    }
  }
  if (table === 'po_items') {
    new Set(rows.map((r) => r.po_id)).forEach((id) => recomputePoTotals(id))
  }
  if (table === 'person_checklist_items') {
    new Set(rows.map((r) => r.checklist_id)).forEach((id) => recomputeChecklist(id))
  }
  if (table === 'purchase_orders' && rows.length) {
    for (const po of rows) {
      if (!store.po_events.some((e) => e.po_id === po.id)) {
        store.po_events.push({ id: genId('e'), po_id: po.id, kind: 'created', actor_id: po.created_by, detail: {}, created_at: nowIso() })
      }
    }
  }
}

function cascadeDelete(table, row) {
  if (table === 'purchase_orders') {
    store.po_items = store.po_items.filter((i) => i.po_id !== row.id)
    store.po_approval_steps = store.po_approval_steps.filter((s) => s.po_id !== row.id)
    store.po_events = store.po_events.filter((e) => e.po_id !== row.id)
    const rIds = store.receipts.filter((r) => r.po_id === row.id).map((r) => r.id)
    store.receipts = store.receipts.filter((r) => r.po_id !== row.id)
    store.receipt_items = store.receipt_items.filter((ri) => !rIds.includes(ri.receipt_id))
  }
  if (table === 'approval_rules') {
    store.approval_rule_steps = store.approval_rule_steps.filter((s) => s.rule_id !== row.id)
  }
  if (table === 'checklist_templates') {
    store.checklist_template_items = store.checklist_template_items.filter((i) => i.template_id !== row.id)
  }
  if (table === 'form_templates') {
    store.form_links = store.form_links.filter((l) => l.form_id !== row.id)
    store.form_responses = store.form_responses.filter((r) => r.form_id !== row.id)
  }
}

/* ---------------- query builder ---------------- */

const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)

class Query {
  constructor(table) {
    this.table = table
    this.filters = []
    this._order = []
    this._limit = null
    this._head = false
    this._count = null
    this._mode = 'select'
    this._payload = null
    this._single = null
    this._selectAfterWrite = false
    this._upsertOpts = null
  }

  select(_sel, opts = {}) {
    if (this._mode !== 'select') { this._selectAfterWrite = true; return this }
    this._head = !!opts.head
    this._count = opts.count || null
    return this
  }
  insert(payload) { this._mode = 'insert'; this._payload = payload; return this }
  update(payload) { this._mode = 'update'; this._payload = payload; return this }
  upsert(payload, opts) { this._mode = 'upsert'; this._payload = payload; this._upsertOpts = opts || {}; return this }
  delete() { this._mode = 'delete'; return this }

  eq(k, v) { this.filters.push((r) => getPath(r, k) === v); return this }
  neq(k, v) { this.filters.push((r) => getPath(r, k) !== v); return this }
  in(k, arr) { this.filters.push((r) => arr.includes(getPath(r, k))); return this }
  gte(k, v) { this.filters.push((r) => getPath(r, k) != null && getPath(r, k) >= v); return this }
  order(k, opts = {}) { this._order.push([k, opts.ascending !== false]); return this }
  limit(n) { this._limit = n; return this }
  single() { this._single = 'strict'; return this }
  maybeSingle() { this._single = 'maybe'; return this }

  async _run() {
    await delay(120 + Math.random() * 120)

    if (this._mode === 'select') {
      let rows = hydrateTable(this.table)
      for (const f of this.filters) rows = rows.filter(f)
      for (const [k, asc] of [...this._order].reverse()) {
        rows.sort((a, b) => {
          const av = getPath(a, k), bv = getPath(b, k)
          if (av == null && bv == null) return 0
          if (av == null) return 1
          if (bv == null) return -1
          return (av < bv ? -1 : av > bv ? 1 : 0) * (asc ? 1 : -1)
        })
      }
      const count = rows.length
      if (this._limit != null) rows = rows.slice(0, this._limit)
      if (this._head) return { data: null, error: null, count }
      if (this._single) {
        const row = rows[0] ?? null
        if (!row && this._single === 'strict') return { data: null, error: { message: 'Row not found' }, count }
        return { data: row, error: null, count }
      }
      return { data: rows, error: null, count }
    }

    if (this._mode === 'insert' || this._mode === 'upsert') {
      const payloads = Array.isArray(this._payload) ? this._payload : [this._payload]
      const written = []
      for (const p of payloads) {
        let target = null
        if (this._mode === 'upsert') {
          const key = this.table === 'app_settings' ? 'key' : this._upsertOpts?.onConflict
          if (key && p[key] != null) target = (store[this.table] || []).find((r) => r[key] === p[key])
        }
        if (target) {
          Object.assign(target, clone(p), { updated_at: nowIso() })
          written.push(target)
        } else {
          const row = { ...(insertDefaults[this.table]?.() || { id: genId() }), ...clone(p) }
          store[this.table].push(row)
          written.push(row)
        }
      }
      afterWrite(this.table, written, this._mode === 'upsert' ? 'upsert' : 'insert')
      const data = this._selectAfterWrite
        ? (this._single ? clone(hydrators[this.table] ? hydrators[this.table](written[0]) : written[0]) : written.map(clone))
        : null
      return { data, error: null, count: written.length }
    }

    if (this._mode === 'update') {
      const rows = (store[this.table] || []).filter((r) => this.filters.every((f) => f(r)))
      for (const r of rows) Object.assign(r, clone(this._payload), 'updated_at' in r ? { updated_at: nowIso() } : {})
      afterWrite(this.table, rows, this._mode)
      return { data: this._selectAfterWrite ? rows.map(clone) : null, error: null, count: rows.length }
    }

    if (this._mode === 'delete') {
      const doomed = (store[this.table] || []).filter((r) => this.filters.every((f) => f(r)))
      store[this.table] = store[this.table].filter((r) => !doomed.includes(r))
      for (const row of doomed) cascadeDelete(this.table, row)
      afterWrite(this.table, doomed, 'delete')
      return { data: null, error: null, count: doomed.length }
    }
    return { data: null, error: { message: 'Unsupported' } }
  }

  then(res, rej) { return this._run().then(res, rej) }
  catch(rej) { return this._run().catch(rej) }
  finally(f) { return this._run().finally(f) }
}

/* ---------------- RPCs ---------------- */

const err = (message) => ({ data: null, error: { message } })
const ok = (data = { ok: true }) => ({ data, error: null })
const me = () => store.app_users.find((u) => u.auth_id === DEMO_AUTH_ID)

const PROFILE_WHITELIST = [
  'personal_email', 'phone', 'alt_phone', 'date_of_birth', 'blood_group', 'address', 'city', 'state', 'pincode',
  'emergency_contact_name', 'emergency_contact_phone', 'pan_number', 'aadhaar_number', 'uan_number',
  'bank_name', 'bank_account', 'bank_ifsc',
]

function fyCode(d = new Date()) {
  const y = d.getFullYear() % 100
  return d.getMonth() + 1 >= 4
    ? `${String(y).padStart(2, '0')}-${String((y + 1) % 100).padStart(2, '0')}`
    : `${String((y + 99) % 100).padStart(2, '0')}-${String(y).padStart(2, '0')}`
}

function pushEvent(po_id, kind, detail = {}) {
  store.po_events.push({ id: genId('e'), po_id, kind, actor_id: me().id, detail, created_at: nowIso() })
}

// mirrors src/lib/phone.js — demo mode enforces the same +91 rule
function demoMobile(input) {
  const d = String(input ?? '').replace(/\D+/g, '')
  const t = d.length === 12 && d.startsWith('91') ? d.slice(2)
    : d.length === 11 && d.startsWith('0') ? d.slice(1)
    : d
  return /^[6-9]\d{9}$/.test(t) ? `+91${t}` : null
}

const rpcs = {
  claim_app_user: () => ok(true),

  start_checklist: ({ p_person, p_template }) => {
    const tpl = store.checklist_templates.find((t) => t.id === p_template && t.active)
    if (!tpl) return err('Template not found')
    const cl = { id: genId('cl'), person_id: p_person, template_id: tpl.id, kind: tpl.kind, name: tpl.name, status: 'in_progress', started_at: nowIso(), completed_at: null, created_by: me().id }
    store.person_checklists.push(cl)
    store.checklist_template_items
      .filter((i) => i.template_id === tpl.id)
      .sort((a, b) => a.position - b.position)
      .forEach((i) => store.person_checklist_items.push({
        id: genId('ci'), checklist_id: cl.id, position: i.position, title: i.title, description: i.description,
        owner_role: i.owner_role, doc_type: i.doc_type,
        due_date: i.due_days != null ? new Date(Date.now() + i.due_days * 86400000).toISOString().slice(0, 10) : null,
        status: 'pending', done_by: null, done_at: null, note: null,
      }))
    return ok(cl.id)
  },

  upload_link_info: ({ p_token }) => {
    const link = store.upload_links.find((l) => l.token === p_token)
    if (!link) return ok({ ok: false, reason: 'invalid' })
    if (link.revoked_at) return ok({ ok: false, reason: 'revoked' })
    if (new Date(link.expires_at) < new Date()) return ok({ ok: false, reason: 'expired' })
    const person = store.people.find((p) => p.id === link.person_id)
    const company = store.app_settings.find((s) => s.key === 'company')?.value?.name || 'Makams'
    const profile_values = {}
    for (const f of link.profile_fields) if (PROFILE_WHITELIST.includes(f)) profile_values[f] = person[f] ?? null
    return ok({
      ok: true, company, person_name: person.full_name, message: link.message, expires_at: link.expires_at,
      doc_types: link.doc_types.map((dt) => ({
        doc_type: dt,
        uploaded: store.person_documents.some((d) => d.person_id === person.id && d.doc_type === dt && d.link_id === link.id),
      })),
      profile_fields: link.profile_fields, profile_values, submitted_at: link.submitted_at,
    })
  },

  submit_link_profile: ({ p_token, p_fields }) => {
    const link = store.upload_links.find((l) => l.token === p_token)
    if (!link || link.revoked_at || new Date(link.expires_at) < new Date()) return ok({ ok: false, reason: 'invalid' })
    const person = store.people.find((p) => p.id === link.person_id)
    for (const [k, v] of Object.entries(p_fields || {})) {
      if (link.profile_fields.includes(k) && PROFILE_WHITELIST.includes(k)) {
        person[k] = v === '' ? null : String(v).slice(0, 500)
      }
    }
    link.last_used_at = nowIso()
    link.submitted_at = nowIso()
    return ok({ ok: true })
  },

  form_link_info: ({ p_token }) => {
    const link = store.form_links.find((l) => l.token === p_token)
    if (!link) return ok({ ok: false, reason: 'invalid' })
    if (!link.active) return ok({ ok: false, reason: 'revoked' })
    if (link.expires_at && new Date(link.expires_at) < new Date()) return ok({ ok: false, reason: 'expired' })
    const form = store.form_templates.find((t) => t.id === link.form_id)
    if (!form || !form.active) return ok({ ok: false, reason: 'revoked' })
    const company = store.app_settings.find((s) => s.key === 'company')?.value?.name || 'Makams'
    return ok({
      ok: true, company, source_name: link.source_name, expires_at: link.expires_at,
      referrer: {
        name: link.referrer_name ?? null,
        emp_id: link.referrer_emp_id ?? null,
        phone: link.referrer_phone ?? null,
        locked: !!link.referrer_name,
      },
      form: { name: form.name, description: form.description, kind: form.kind, fields: form.fields },
    })
  },

  search_candidates: ({ p_area }) => {
    const v = String(p_area || '').trim()
    if (v.length < 2) return err('Type at least 2 characters of an area to search')
    return ok(store.candidates.filter((c) => String(c.area || '').toLowerCase().includes(v.toLowerCase())))
  },

  recent_candidates: ({ p_days }) => {
    const days = Math.min(Math.max(Number(p_days) || 15, 1), 15)
    const since = Date.now() - days * 86400000
    const touched = (c) => Math.max(Date.parse(c.created_at || 0) || 0, Date.parse(c.updated_at || 0) || 0)
    return ok(store.candidates.filter((c) => touched(c) >= since).sort((a, b) => touched(b) - touched(a)))
  },

  candidates_count: () => ok(store.candidates.length),

  revoke_app_user: ({ p_id }) => {
    const u = store.app_users.find((x) => x.id === p_id)
    if (!u) return err('That user no longer exists')
    if (u.id === me().id) return err('You cannot revoke your own access')
    Object.assign(u, { active: false, auth_id: null })
    return ok(null)
  },

  restore_app_user: ({ p_id }) => {
    const u = store.app_users.find((x) => x.id === p_id)
    if (u) u.active = true
    return ok(null)
  },

  delete_app_user: ({ p_id }) => {
    const u = store.app_users.find((x) => x.id === p_id)
    if (!u) return err('That user no longer exists')
    if (u.id === me().id) return err('You cannot delete your own account')
    const refs =
      store.purchase_orders.filter((x) => x.created_by === p_id).length +
      store.po_approval_steps.filter((x) => x.approver_id === p_id).length +
      store.candidates.filter((x) => x.created_by === p_id).length +
      store.prospectives.filter((x) => x.created_by === p_id).length +
      store.people.filter((x) => x.created_by === p_id).length
    if (refs > 0) {
      return err(`${u.full_name || u.email} has ${refs} record(s) against their name — revoke their access instead, so the history keeps its author`)
    }
    store.app_users = store.app_users.filter((x) => x.id !== p_id)
    return ok(null)
  },

  save_candidate: ({ p_id, p_patch }) => {
    const allowed = ['full_name','designation','area','current_company','phone','referred_by_name','referrer_emp_id','hr_comment','source']
    const patch = {}
    for (const k of allowed) if (k in (p_patch || {})) patch[k] = p_patch[k]
    if (!p_id) {
      if (!String(patch.full_name || '').trim()) return err('Candidate name is required')
      const c = { ...insertDefaults.candidates(), ...patch, source: patch.source || 'Manual entry', created_by: me().id }
      store.candidates.unshift(c)
      return ok(c.id)
    }
    const c = store.candidates.find((x) => x.id === p_id)
    if (!c) return err('Candidate not found')
    Object.assign(c, patch, { updated_at: nowIso() })
    return ok(c.id)
  },

  delete_candidate: ({ p_id }) => {
    if (!me().roles.includes('admin')) return err('Only an admin can delete from the Candidates DB')
    const i = store.candidates.findIndex((x) => x.id === p_id)
    if (i >= 0) store.candidates.splice(i, 1)
    return ok(null)
  },

  pick_candidate: ({ p_id }) => {
    const c = store.candidates.find((x) => x.id === p_id)
    if (!c) return err('Candidate not found')
    if (c.prospective_id) return err('Already on the Prospectives sheet')
    const pros = {
      ...insertDefaults.prospectives(),
      full_name: c.full_name, designation: c.designation, area: c.area, contact: c.phone,
      status: 'new', candidate_id: c.id,
      source: c.referrer_emp_id ? 'Internal Referral' : 'Other',
    }
    store.prospectives.unshift(pros)
    Object.assign(c, { picked_at: nowIso(), prospective_id: pros.id, updated_at: nowIso() })
    return ok(pros.id)
  },

  candidate_areas: () =>
    ok([...new Set(store.candidates.map((c) => c.area).filter((a) => a && String(a).trim()))].sort()),

  approve_referral_submission: ({ p_id }) => {
    const v = store.referral_submissions.find((x) => x.id === p_id)
    if (!v) return err('Submission not found')
    if (v.status !== 'pending') return err('Already reviewed')
    const cand = {
      ...insertDefaults.candidates(),
      full_name: v.full_name, designation: v.designation, area: v.area,
      current_company: v.current_company, phone: v.phone,
      referred_by_name: v.referred_by_name, referrer_emp_id: v.referrer_emp_id,
      source: v.source, link_id: v.link_id, response_id: v.response_id, created_by: me().id,
    }
    store.candidates.unshift(cand)
    Object.assign(v, { status: 'approved', candidate_id: cand.id, reviewed_by: me().id, reviewed_at: nowIso(), updated_at: nowIso() })
    return ok(cand.id)
  },

  submit_po: ({ p_po }) => {
    const po = store.purchase_orders.find((p) => p.id === p_po)
    if (!po) return err('PO not found')
    if (po.status !== 'draft') return err('Only draft POs can be submitted')
    if (!po.vendor_id) return err('Select a vendor before submitting')
    if (!po.po_type_id) return err('Select a PO type before submitting')
    if (!po.location_id) return err('Select a delivery location before submitting')
    const items = store.po_items.filter((i) => i.po_id === p_po)
    if (!items.length) return err('Add at least one line item before submitting')
    recomputePoTotals(p_po)

    const rule = store.approval_rules
      .filter((r) => r.active)
      .filter((r) => !r.po_type_ids.length || r.po_type_ids.includes(po.po_type_id))
      .filter((r) => !r.location_ids.length || r.location_ids.includes(po.location_id))
      .filter((r) => po.grand_total >= (r.min_amount || 0) && (r.max_amount == null || po.grand_total <= r.max_amount))
      .sort((a, b) => a.priority - b.priority || (a.created_at < b.created_at ? -1 : 1))[0]

    if (!rule) return err('No approval rule matches this PO (type / location / amount). Add one under Settings → Approval rules.')

    if (!po.po_number) {
      store._po_counter += 1
      const prefix = store.app_settings.find((s) => s.key === 'company')?.value?.po_prefix || 'PO'
      po.po_number = `${prefix}/${fyCode()}/${String(store._po_counter).padStart(4, '0')}`
    }

    store.po_approval_steps = store.po_approval_steps.filter((s) => s.po_id !== p_po)
    const ruleSteps = store.approval_rule_steps.filter((s) => s.rule_id === rule.id).sort((a, b) => a.position - b.position)

    if (!ruleSteps.length) {
      po.status = 'approved'; po.submitted_at = nowIso(); po.approved_at = nowIso(); po.current_step = null
      pushEvent(p_po, 'approved', { auto: true, rule: rule.name })
    } else {
      ruleSteps.forEach((s, i) => store.po_approval_steps.push({
        id: genId('s'), po_id: p_po, position: i + 1, approver_id: s.approver_id,
        status: 'pending', is_current: i === 0, comment: null, acted_at: null,
      }))
      po.status = 'pending_approval'; po.submitted_at = nowIso(); po.current_step = 1
      pushEvent(p_po, 'submitted', { rule: rule.name, steps: ruleSteps.length })
    }
    po.updated_at = nowIso()
    return ok({ ok: true, steps: ruleSteps.length })
  },

  act_on_po: ({ p_po, p_action, p_comment }) => {
    const po = store.purchase_orders.find((p) => p.id === p_po)
    if (!po) return err('PO not found')
    if (po.status !== 'pending_approval') return err('PO is not awaiting approval')
    const step = store.po_approval_steps.find((s) => s.po_id === p_po && s.position === po.current_step && s.status === 'pending')
    if (!step) return err('No pending approval step')
    const my = me()
    if (step.approver_id !== my.id && !my.roles.includes('admin')) return err('This step is assigned to someone else')

    if (p_action === 'approve') {
      Object.assign(step, { status: 'approved', is_current: false, comment: p_comment || null, acted_at: nowIso() })
      const next = store.po_approval_steps
        .filter((s) => s.po_id === p_po && s.status === 'pending')
        .sort((a, b) => a.position - b.position)[0]
      if (!next) {
        po.status = 'approved'; po.approved_at = nowIso(); po.current_step = null
        pushEvent(p_po, 'approved', { comment: p_comment || null })
      } else {
        next.is_current = true
        po.current_step = next.position
        pushEvent(p_po, 'approved_step', { step: step.position, comment: p_comment || null })
      }
    } else {
      Object.assign(step, { status: 'rejected', is_current: false, comment: p_comment || null, acted_at: nowIso() })
      po.status = 'rejected'; po.current_step = null
      pushEvent(p_po, 'rejected', { step: step.position, comment: p_comment || null })
    }
    po.updated_at = nowIso()
    return ok()
  },

  reopen_po: ({ p_po }) => {
    const po = store.purchase_orders.find((p) => p.id === p_po)
    if (!po) return err('PO not found')
    if (!['rejected', 'pending_approval'].includes(po.status)) return err('Only rejected or pending POs can be reopened')
    store.po_approval_steps = store.po_approval_steps.filter((s) => s.po_id !== p_po)
    po.status = 'draft'; po.current_step = null; po.submitted_at = null; po.updated_at = nowIso()
    pushEvent(p_po, 'reopened')
    return ok()
  },

  cancel_po: ({ p_po }) => {
    const po = store.purchase_orders.find((p) => p.id === p_po)
    if (!po) return err('PO not found')
    if (!['draft', 'pending_approval', 'approved'].includes(po.status) || po.received_status !== 'none') {
      return err('This PO cannot be cancelled (already received against or closed)')
    }
    store.po_approval_steps = store.po_approval_steps.filter((s) => !(s.po_id === p_po && s.status === 'pending'))
    po.status = 'cancelled'; po.current_step = null; po.updated_at = nowIso()
    pushEvent(p_po, 'cancelled')
    return ok()
  },

  close_po: ({ p_po }) => {
    const po = store.purchase_orders.find((p) => p.id === p_po)
    if (!po || po.status !== 'approved') return err('Only approved POs can be closed')
    po.status = 'closed'; po.updated_at = nowIso()
    pushEvent(p_po, 'closed')
    return ok()
  },

  duplicate_po: ({ p_po }) => {
    const src = store.purchase_orders.find((p) => p.id === p_po)
    if (!src) return err('PO not found')
    const id = genId('po')
    store.purchase_orders.push({
      ...insertDefaults.purchase_orders(), id,
      vendor_id: src.vendor_id, po_type_id: src.po_type_id, location_id: src.location_id,
      reference: src.reference, tax_mode: src.tax_mode, terms: src.terms, notes: src.notes,
      duplicated_from: src.id, created_by: me().id,
    })
    store.po_items.filter((i) => i.po_id === p_po).forEach((i) =>
      store.po_items.push({ ...insertDefaults.po_items(), id: genId('i'), po_id: id, position: i.position, description: i.description, hsn_code: i.hsn_code, qty: i.qty, unit: i.unit, unit_price: i.unit_price, tax_pct: i.tax_pct })
    )
    recomputePoTotals(id)
    pushEvent(id, 'duplicated', { from_po: src.po_number, from_id: src.id })
    return ok(id)
  },

  add_receipt: ({ p_po, p_received_date, p_invoice_number, p_invoice_date, p_notes, p_items }) => {
    const po = store.purchase_orders.find((p) => p.id === p_po)
    if (!po) return err('PO not found')
    if (po.status !== 'approved') return err('Receipts can only be recorded against approved POs')
    const lines = (p_items || []).filter((i) => Number(i.qty) > 0)
    if (!lines.length) return err('Enter a received quantity on at least one line')
    const receipt = { id: genId('rc'), po_id: p_po, received_date: p_received_date || nowIso().slice(0, 10), invoice_number: p_invoice_number || null, invoice_date: p_invoice_date || null, notes: p_notes || null, created_by: me().id, created_at: nowIso() }
    store.receipts.push(receipt)
    for (const l of lines) {
      const item = store.po_items.find((i) => i.id === l.po_item_id && i.po_id === p_po)
      if (!item) return err('Line item does not belong to this PO')
      store.receipt_items.push({ id: genId('ri'), receipt_id: receipt.id, po_item_id: item.id, qty: Number(l.qty), remarks: l.remarks || null })
      item.received_qty = Number(item.received_qty) + Number(l.qty)
    }
    recomputeReceived(p_po)
    pushEvent(p_po, 'received', { receipt_id: receipt.id, invoice: p_invoice_number, lines: lines.length })
    return ok(receipt.id)
  },

  delete_receipt: ({ p_receipt }) => {
    const receipt = store.receipts.find((r) => r.id === p_receipt)
    if (!receipt) return err('Receipt not found')
    store.receipt_items.filter((ri) => ri.receipt_id === p_receipt).forEach((ri) => {
      const item = store.po_items.find((i) => i.id === ri.po_item_id)
      if (item) item.received_qty = Math.max(Number(item.received_qty) - Number(ri.qty), 0)
    })
    store.receipt_items = store.receipt_items.filter((ri) => ri.receipt_id !== p_receipt)
    store.receipts = store.receipts.filter((r) => r.id !== p_receipt)
    recomputeReceived(receipt.po_id)
    pushEvent(receipt.po_id, 'receipt_deleted', { receipt_id: p_receipt })
    return ok()
  },
}

/* ---------------- edge functions ---------------- */

async function invokeFunction(name, body = {}) {
  await delay(700 + Math.random() * 500)

  if (name === 'send-po') {
    const po = store.purchase_orders.find((p) => p.id === body.po_id)
    if (!po) return { error: 'PO not found' }
    pushEvent(po.id, 'sent', { to: body.to, cc: body.cc || null, subject: body.subject, message_id: 'demo-' + genId() })
    po.sent_count += 1
    po.last_sent_at = nowIso()
    return { ok: true, message_id: 'demo-msg' }
  }

  if (name === 'learnapp-admin') {
    const person = store.people.find((p) => p.id === body.person_id)
    if (!person) return { error: 'Person not found' }
    const log = (status, detail) => store.learnapp_actions.unshift({ id: genId('la'), person_id: person.id, action: body.action, status, detail, created_by: me().id, created_at: nowIso() })

    if (body.action === 'create') {
      const empId = (person.emp_code || '').trim()
      if (!empId) return { error: 'Set an Employee ID first — it becomes their learnapp login' }
      if (person.learnapp_user_id) return { error: 'They already have a learnapp account' }
      person.learnapp_user_id = genId('lu')
      person.learnapp_email = `${empId.toLowerCase()}@example.com`
      person.learnapp_status = 'active'
      log('ok', `${empId} (demo)`)
      return { ok: true, message: `Learnapp login created — ID: ${empId} (demo)`, password: 'Demo' + Math.random().toString(36).slice(2, 8) }
    }
    if (body.action === 'disable' || body.action === 'enable') {
      person.learnapp_status = body.action === 'disable' ? 'disabled' : 'active'
      log('ok', person.emp_code || '')
      return { ok: true, message: body.action === 'disable' ? 'Learnapp access disabled (demo)' : 'Learnapp access re-enabled (demo)' }
    }
    return { error: 'Unknown action' }
  }

  if (name === 'public-form') {
    const link = store.form_links.find((l) => l.token === body.token)
    if (!link || !link.active) return { error: 'This link is not valid' }
    if (link.expires_at && new Date(link.expires_at) < new Date()) return { error: 'This link has expired' }
    const tpl = store.form_templates.find((t) => t.id === link.form_id)
    if (!tpl || !tpl.active) return { error: 'This form is no longer accepting responses' }

    if (tpl.kind === 'referral') {
      const referrer = body.answers?.referrer || {}
      const refName = String(link.referrer_name || referrer.name || '').trim()
      if (!refName) return { error: 'Your name is required' }
      const refEmpId = String(link.referrer_emp_id || referrer.emp_id || '').trim() || null
      const refPhone = demoMobile(link.referrer_phone || referrer.phone)
      if ((link.referrer_phone || referrer.phone) && !refPhone) {
        return { error: 'Your phone must be a 10-digit Indian mobile number' }
      }

      const cands = body.answers?.candidates || []
      if (!cands.length) return { error: 'Add at least one contact' }
      const rows = []
      for (let i = 0; i < cands.length; i++) {
        const c = cands[i] || {}
        const row = {
          full_name: String(c.name || '').trim(),
          designation: String(c.designation || '').trim(),
          area: String(c.area || '').trim(),
          current_company: String(c.current_company || '').trim(),
          phone: demoMobile(c.phone),
        }
        const missing = [['full_name', 'name'], ['designation', 'designation'], ['area', 'area'], ['current_company', 'current company']]
          .find(([k]) => !row[k])
        if (missing) return { error: `Contact ${i + 1}: ${missing[1]} is required` }
        if (!row.phone) return { error: `Contact ${i + 1}: phone must be a 10-digit Indian mobile number` }
        rows.push(row)
      }

      const response = { ...insertDefaults.form_responses(), form_id: tpl.id, link_id: link.id, answers: body.answers, files: [] }
      store.form_responses.unshift(response)
      for (const c of rows) {
        store.referral_submissions.unshift({
          ...insertDefaults.referral_submissions(), ...c,
          referred_by_name: refName, referrer_emp_id: refEmpId, referrer_phone: refPhone,
          source: link.source_name, link_id: link.id, response_id: response.id,
        })
      }
      link.submission_count = (link.submission_count || 0) + 1
      return { ok: true, added: rows.length }
    }

    const answers = body.answers || {}
    const clean = {}
    for (const f of tpl.fields) {
      if (f.type === 'file') continue
      const v = answers[f.key]
      if (f.required && (v == null || String(v).trim() === '')) return { error: `"${f.label}" is required` }
      if (v != null && String(v).trim() !== '') clean[f.key] = String(v)
    }

    const files = []
    for (const f of tpl.fields) {
      if (f.type !== 'file') continue
      const file = body.files?.[f.key]
      if (!file) {
        if (f.required) return { error: `"${f.label}" is required` }
        continue
      }
      const path = `${link.id}/${Date.now()}_${f.key}_${file.name}`
      try { objectUrls[path] = URL.createObjectURL(file) } catch { /* ignore */ }
      files.push({ key: f.key, path, name: file.name })
    }

    const response = { ...insertDefaults.form_responses(), form_id: tpl.id, link_id: link.id, answers: clean, files }
    store.form_responses.unshift(response)

    link.submission_count = (link.submission_count || 0) + 1
    return { ok: true }
  }

  if (name === 'import-employees') {
    const rows = [
      { emp_code: 'SALES007', full_name: 'Sheet Row — Amit Chawla', hq_name: 'Ludhiana', designation: 'VSO', sales_role: 'sales', asm_name: 'Sunita Kaur', rsm_name: 'Deepak Verma', sbu_head_name: 'Aakash Agarwal', personal_email: 'amit.chawla@gmail.com', phone: '+919812340001', date_of_join: '2026-04-01', status: 'active' },
      { emp_code: 'SALES008', full_name: 'Sheet Row — Priti Nanda', hq_name: 'Patiala', designation: 'ASO', sales_role: 'sales', asm_name: 'Sunita Kaur', rsm_name: 'Deepak Verma', sbu_head_name: 'Aakash Agarwal', personal_email: 'priti.nanda@gmail.com', phone: '+919812340002', date_of_join: '2026-05-12', status: 'active' },
    ]
    if (!body.dry_run) {
      for (const r of rows) {
        if (store.people.some((p) => p.emp_code === r.emp_code)) continue
        store.people.unshift({ ...insertDefaults.people(), ...r, department: 'Sales', sales_role: r.sales_role || 'sales' })
        ensureCandidate({ ...r, area: r.hq_name, source: 'Employee', current_company: 'CRIL' })
      }
    }
    return {
      ok: true, tab: 'Master Sheet', dry_run: !!body.dry_run,
      matched_columns: ['emp_code', 'full_name', 'hq_name', 'asm_name', 'rsm_name', 'sbu_head_name', 'personal_email', 'phone', 'date_of_join', 'status'],
      levels: { sales: 11, asm: 2, rsm: 1, unknown: 0 },
      unknown_prefixes: [],
      vacant: 2,
      vacancies: [{ row: 5, designation: 'VSO', location: 'Moga' }, { row: 11, designation: 'ASO', location: 'Khanna' }],
      scanned: 14,
      ...(body.dry_run ? { would_add: 2, would_update: 12 } : { added: 2, updated: 12 }),
      skipped: [{ row: 9, name: '', reason: 'no name' }],
    }
  }

  return { error: `Unknown function ${name}` }
}

/* ---------------- the client ---------------- */

const session = {
  user: { id: DEMO_AUTH_ID, email: 'aakash@makams.com', user_metadata: { full_name: 'Aakash Agarwal' } },
  access_token: 'demo',
}

export function createDemoClient() {
  return {
    from: (table) => new Query(table),

    rpc: async (name, args = {}) => {
      await delay(180 + Math.random() * 200)
      const fn = rpcs[name]
      if (!fn) return err(`Unknown RPC ${name}`)
      try { return fn(args) } catch (e) { return err(e.message) }
    },

    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth: async () => ({ data: {}, error: null }),
      signOut: async () => { window.location.reload(); return { error: null } },
    },

    storage: {
      from: () => ({
        upload: async (path, file) => {
          await delay(400)
          try { objectUrls[path] = URL.createObjectURL(file) } catch { /* ignore */ }
          return { data: { path }, error: null }
        },
        createSignedUrl: async (path) => {
          await delay(150)
          if (objectUrls[path]) return { data: { signedUrl: objectUrls[path] }, error: null }
          return { data: null, error: { message: 'Demo: seeded documents have no stored file — upload one to preview it' } }
        },
        remove: async (paths) => {
          for (const p of paths || []) delete objectUrls[p]
          return { data: null, error: null }
        },
      }),
    },

    functions: {
      invoke: async (name, { body } = {}) => {
        try {
          const data = await invokeFunction(name, body)
          return { data, error: null }
        } catch (e) {
          return { data: null, error: { message: e.message } }
        }
      },
    },
  }
}

export { invokeFunction as demoInvoke }
