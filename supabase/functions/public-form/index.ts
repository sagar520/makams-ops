// Public endpoint behind /f/:token — receives form submissions from industry
// sources (and any other admin-built form). Multipart form-data:
//   token    — the form link token
//   answers  — JSON string { fieldKey: value }
//   file_<fieldKey> — one file per file-type field (resume etc.)
// Stores files in the private form-uploads bucket, records the response, and
// for candidate_intake forms creates a row in the candidate database.

import { corsHeaders, json, serviceClient } from '../_shared/utils.ts'

const MAX_BYTES = 15 * 1024 * 1024
const ALLOWED_EXT = /\.(pdf|docx?|jpe?g|png|webp)$/i

// ---- Indian mobile numbers: stored canonically as +91XXXXXXXXXX ----
function tenDigits(input: unknown): string {
  const d = String(input ?? '').replace(/\D+/g, '')
  if (d.length === 12 && d.startsWith('91')) return d.slice(2)
  if (d.length === 11 && d.startsWith('0')) return d.slice(1)
  if (d.length === 13 && d.startsWith('091')) return d.slice(3)
  return d
}
const normalizeMobile = (input: unknown): string | null => {
  const t = tenDigits(input)
  return /^[6-9]\d{9}$/.test(t) ? `+91${t}` : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ error: 'Expected form-data' }, 400)
  }

  const token = String(form.get('token') || '')
  let answers: Record<string, unknown>
  try {
    answers = JSON.parse(String(form.get('answers') || '{}'))
  } catch {
    return json({ error: 'Bad answers payload' }, 400)
  }

  const svc = serviceClient()

  const { data: link } = await svc.from('form_links').select('*').eq('token', token).maybeSingle()
  if (!link || !link.active) return json({ error: 'This link is not valid' }, 403)
  if (link.expires_at && new Date(link.expires_at) < new Date()) return json({ error: 'This link has expired' }, 403)

  const { data: tpl } = await svc.from('form_templates').select('*').eq('id', link.form_id).maybeSingle()
  if (!tpl || !tpl.active) return json({ error: 'This form is no longer accepting responses' }, 403)

  // ---- referral forms: referrer details + a table of candidates ----
  if (tpl.kind === 'referral') {
    const referrer = (answers as any).referrer || {}
    const cands: any[] = Array.isArray((answers as any).candidates) ? (answers as any).candidates : []

    // A link issued to a specific employee always wins over whatever was posted.
    const refName = String(link.referrer_name || referrer.name || '').trim()
    if (!refName) return json({ error: 'Your name is required' }, 400)
    const refEmpId = String(link.referrer_emp_id || referrer.emp_id || '').trim() || null
    const refPhone = normalizeMobile(link.referrer_phone || referrer.phone)
    if ((link.referrer_phone || referrer.phone) && !refPhone) {
      return json({ error: 'Your phone must be a 10-digit Indian mobile number' }, 400)
    }

    if (!cands.length) return json({ error: 'Add at least one candidate' }, 400)
    if (cands.length > 50) return json({ error: 'Maximum 50 candidates per submission' }, 400)

    const rows: any[] = []
    for (let i = 0; i < cands.length; i++) {
      const c = cands[i] || {}
      const row = {
        full_name: String(c.name || '').trim().slice(0, 200),
        designation: String(c.designation || '').trim().slice(0, 200),
        area: String(c.area || '').trim().slice(0, 200),
        current_company: String(c.current_company || '').trim().slice(0, 200),
        phone: normalizeMobile(c.phone),
      }
      const required: [string, string][] = [
        ['full_name', 'name'], ['designation', 'designation'],
        ['area', 'area'], ['current_company', 'current company'],
      ]
      const missing = required.find(([k]) => !(row as any)[k])
      if (missing) return json({ error: `Candidate ${i + 1}: ${missing[1]} is required` }, 400)
      if (!row.phone) return json({ error: `Candidate ${i + 1}: phone must be a 10-digit Indian mobile number` }, 400)
      rows.push(row)
    }

    const { data: response, error: respErr } = await svc
      .from('form_responses')
      .insert({
        form_id: tpl.id,
        link_id: link.id,
        answers: { referrer: { name: refName, emp_id: refEmpId, phone: refPhone }, candidates: rows },
      })
      .select('id')
      .single()
    if (respErr) return json({ error: respErr.message }, 500)

    // land in the review queue, not the Candidates DB — HR edits & approves each entry
    const { error: subErr } = await svc.from('referral_submissions').insert(
      rows.map((c) => ({
        ...c,
        referred_by_name: refName,
        referrer_emp_id: refEmpId,
        referrer_phone: refPhone,
        source: link.source_name,
        link_id: link.id,
        response_id: response.id,
      }))
    )
    if (subErr) return json({ error: subErr.message }, 500)

    await svc.from('form_links').update({ submission_count: (link.submission_count || 0) + 1 }).eq('id', link.id)
    return json({ ok: true, added: rows.length })
  }

  const fields: any[] = Array.isArray(tpl.fields) ? tpl.fields : []

  // server-side required check + whitelist answers to known keys
  const clean: Record<string, unknown> = {}
  for (const f of fields) {
    if (f.type === 'file') continue
    const v = answers[f.key]
    if (f.required && (v == null || String(v).trim() === '')) {
      return json({ error: `"${f.label}" is required` }, 400)
    }
    if (v != null) clean[f.key] = String(v).slice(0, 4000)
  }

  // files
  const files: { key: string; path: string; name: string }[] = []
  for (const f of fields) {
    if (f.type !== 'file') continue
    const file = form.get(`file_${f.key}`)
    if (!(file instanceof File) || file.size === 0) {
      if (f.required) return json({ error: `"${f.label}" is required` }, 400)
      continue
    }
    if (file.size > MAX_BYTES) return json({ error: `"${f.label}" is too large (max 15 MB)` }, 400)
    if (!ALLOWED_EXT.test(file.name)) return json({ error: `"${f.label}": please upload a PDF, Word or image file` }, 400)

    const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80)
    const path = `${link.id}/${Date.now()}_${f.key}_${safe}`
    const { error: upErr } = await svc.storage
      .from('form-uploads')
      .upload(path, file, { contentType: file.type || 'application/octet-stream' })
    if (upErr) return json({ error: `Upload failed: ${upErr.message}` }, 500)
    files.push({ key: f.key, path, name: file.name })
  }

  const { data: response, error: respErr } = await svc
    .from('form_responses')
    .insert({ form_id: tpl.id, link_id: link.id, answers: clean, files })
    .select('id')
    .single()
  if (respErr) return json({ error: respErr.message }, 500)

  // candidate intake -> create a candidate from mapped fields
  if (tpl.kind === 'candidate_intake') {
    const mapped: Record<string, unknown> = {}
    for (const f of fields) {
      if (!f.map_to || f.type === 'file') continue
      const v = clean[f.key]
      if (v != null && String(v).trim() !== '') mapped[f.map_to] = v
    }
    const resumeField = fields.find((f) => f.type === 'file' && f.map_to === 'resume')
    const resume = resumeField ? files.find((x) => x.key === resumeField.key) : null

    if (mapped.full_name) {
      // intake forms also go through the review queue
      await svc.from('referral_submissions').insert({
        full_name: mapped.full_name,
        designation: mapped.title ?? null,
        current_company: mapped.organization ?? null,
        phone: mapped.phone ?? null,
        area: mapped.location ?? null,
        referred_by_name: link.source_name,
        source: link.source_name,
        link_id: link.id,
        response_id: response.id,
      })
    }
  }

  await svc.from('form_links').update({ submission_count: (link.submission_count || 0) + 1 }).eq('id', link.id)

  return json({ ok: true })
})
