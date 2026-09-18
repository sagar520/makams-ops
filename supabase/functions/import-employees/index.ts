// Pull the employee roster from the HR Google Sheet. The sheet is the
// source of truth; this app never writes back to it.
// Row 1 is the header; columns are matched by name, so the sheet can be
// laid out however HR likes.
//
// Secrets required:
//   GOOGLE_SERVICE_ACCOUNT  — the full service-account JSON (one line)
// Sheet + tab come from app_settings.employee_sheet, or from the
// EMPLOYEE_SHEET_ID / EMPLOYEE_SHEET_TAB secrets as a fallback.
// Share the spreadsheet with the service account's client_email (Viewer is enough).

import { SignJWT, importPKCS8 } from 'npm:jose@5'
import { corsHeaders, json, serviceClient, requireRole } from '../_shared/utils.ts'

/** people field  ->  header names we accept for it (lowercased, punctuation stripped) */
const HEADER_MAP: [string, string[]][] = [
  ['emp_code',      ['empcode', 'emp code', 'employee code', 'emp id', 'employee id', 'code']],
  ['full_name',     ['name', 'full name', 'employee name', 'employee']],
  ['hq_name',       ['hq name', 'hq', 'headquarter', 'headquarters', 'head quarter', 'location', 'area']],
  ['asm_name',      ['asm name', 'asm', 'area sales manager']],
  ['rsm_name',      ['rsm name', 'rsm', 'regional sales manager']],
  ['sbu_head_name', ['sbu head', 'sbu head name', 'sbu', 'business head']],
  ['personal_email',['email', 'email id', 'mail', 'personal email', 'email address']],
  ['phone',         ['mobile', 'mobile number', 'mobile no', 'phone', 'phone number', 'contact', 'contact number']],
  ['date_of_join',  ['doj', 'date of joining', 'date of join', 'joining date', 'joined']],
  ['status',        ['active inactive', 'active  inactive', 'active', 'status', 'active status', 'employment status']],
]

/** "Active" / "Inactive" (and friends) -> the people.status value */
function readStatus(v: string | null): string | null {
  const t = String(v ?? '').trim().toLowerCase()
  if (!t) return null
  if (/^(y|yes|a|active|working|1|true)$/.test(t)) return 'active'
  if (/^(n|no|i|inactive|exited|left|resigned|0|false)$/.test(t)) return 'exited'
  if (t.includes('active') && !t.includes('in')) return 'active'
  if (t.includes('inactive') || t.includes('exit') || t.includes('left')) return 'exited'
  return null
}

/** Sheets dates come through as dd/mm/yyyy, dd-mm-yyyy or an ISO string. */
function readDate(v: string | null): string | null {
  const t = String(v ?? '').trim()
  if (!t) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (m) {
    const [, d, mo, y] = m
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const parsed = new Date(t)
  return isNaN(+parsed) ? null : parsed.toISOString().slice(0, 10)
}

const norm = (h: string) => String(h || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

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

async function googleAccessToken(saJson: string): Promise<string> {
  const sa = JSON.parse(saJson)
  const key = await importPKCS8(sa.private_key, 'RS256')
  const now = Math.floor(Date.now() / 1000)
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/spreadsheets.readonly' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(sa.token_uri || 'https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    throw new Error(`Google auth failed: ${data.error_description || data.error || res.status}`)
  }
  return data.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const svc = serviceClient()
  let appUser
  try {
    ;({ appUser } = await requireRole(req, svc, 'hr'))
  } catch (resp) {
    return resp as Response
  }

  const body = await req.json().catch(() => ({}))
  const dryRun = !!body.dry_run

  const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
  if (!saJson) {
    return json({ error: 'Not configured yet: set the GOOGLE_SERVICE_ACCOUNT secret (see README)' }, 500)
  }

  const { data: setting } = await svc.from('app_settings').select('value').eq('key', 'employee_sheet').maybeSingle()
  const sheetId = (setting?.value?.sheet_id as string) || Deno.env.get('EMPLOYEE_SHEET_ID') || ''
  const tab = (setting?.value?.tab as string) || Deno.env.get('EMPLOYEE_SHEET_TAB') || 'Master Sheet'
  if (!sheetId) {
    return json({ error: 'No employee sheet set — add it under Settings → Company' }, 400)
  }

  try {
    const token = await googleAccessToken(saJson)
    const range = encodeURIComponent(`${tab}!A:Z`)
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(
        `Could not read the sheet (${res.status}): ${e?.error?.message || 'check the sheet id, the tab name, and that the sheet is shared with the service account'}`
      )
    }
    const { values } = await res.json()
    const rows: string[][] = values || []
    if (rows.length < 2) return json({ error: `"${tab}" looks empty — row 1 should be the header` }, 400)

    // header -> column index
    const header = rows[0].map(norm)
    const col: Record<string, number> = {}
    for (const [field, names] of HEADER_MAP) {
      const idx = header.findIndex((h) => names.includes(h))
      if (idx >= 0) col[field] = idx
    }
    if (col.full_name == null) {
      return json({
        error: `No name column found in "${tab}". Headers seen: ${rows[0].filter(Boolean).join(', ') || '(none)'}`,
      }, 400)
    }

    const cell = (r: string[], field: string) => {
      const i = col[field]
      return i == null ? null : (String(r[i] ?? '').trim() || null)
    }

    // existing people, keyed by emp code, then mobile, then name
    const { data: existing } = await svc.from('people').select('id, emp_code, full_name, phone')
    const byCode = new Map<string, string>()
    const byPhone = new Map<string, string>()
    const byName = new Map<string, string>()
    for (const p of existing || []) {
      if (p.emp_code) byCode.set(String(p.emp_code).trim().toUpperCase(), p.id)
      const ph = normalizeMobile(p.phone)
      if (ph) byPhone.set(ph, p.id)
      byName.set(String(p.full_name || '').trim().toLowerCase(), p.id)
    }

    const toInsert: Record<string, unknown>[] = []
    const toUpdate: { id: string; patch: Record<string, unknown> }[] = []
    const skipped: { row: number; name: string; reason: string }[] = []
    const seen = new Set<string>()

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      const rowNo = i + 1
      const name = cell(r, 'full_name')
      if (!name) {
        if (r.some((v) => String(v ?? '').trim())) skipped.push({ row: rowNo, name: '', reason: 'no name' })
        continue
      }
      const code = (cell(r, 'emp_code') || '').toUpperCase() || null
      const phone = normalizeMobile(cell(r, 'phone'))
      const key = code ? `code:${code}` : phone ? `ph:${phone}` : `name:${name.toLowerCase()}`
      if (seen.has(key)) {
        skipped.push({ row: rowNo, name, reason: 'duplicate of an earlier row' })
        continue
      }
      seen.add(key)

      const patch: Record<string, unknown> = {
        full_name: name,
        emp_code: code,
        hq_name: cell(r, 'hq_name'),
        asm_name: cell(r, 'asm_name'),
        rsm_name: cell(r, 'rsm_name'),
        sbu_head_name: cell(r, 'sbu_head_name'),
        personal_email: cell(r, 'personal_email'),
        phone,
        date_of_join: readDate(cell(r, 'date_of_join')),
        status: readStatus(cell(r, 'status')),
        department: 'Sales',
      }
      // blank cells leave the app's value alone rather than wiping it
      for (const k of Object.keys(patch)) if (patch[k] == null) delete patch[k]
      patch.full_name = name

      const id =
        (code && byCode.get(code)) ||
        (phone && byPhone.get(phone)) ||
        byName.get(name.toLowerCase())

      if (id) toUpdate.push({ id, patch })
      else toInsert.push({ ...patch, status: patch.status || 'active', created_by: appUser.id })
    }

    if (dryRun) {
      return json({
        ok: true, dry_run: true, tab,
        matched_columns: Object.keys(col),
        scanned: rows.length - 1, would_add: toInsert.length, would_update: toUpdate.length, skipped,
      })
    }

    if (toInsert.length) {
      const { error } = await svc.from('people').insert(toInsert)
      if (error) throw new Error(error.message)
    }
    for (const u of toUpdate) {
      const { error } = await svc.from('people').update(u.patch).eq('id', u.id)
      if (error) throw new Error(error.message)
    }

    return json({
      ok: true, tab,
      matched_columns: Object.keys(col),
      scanned: rows.length - 1, added: toInsert.length, updated: toUpdate.length, skipped,
    })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
