// Push the full employee list from this app into the company Google Sheet.
// The app is the source of truth; the sheet tab is overwritten on every sync.
//
// Secrets required:
//   GOOGLE_SERVICE_ACCOUNT  — the full service-account JSON (one line)
//   SHEET_ID                — the spreadsheet id from its URL
//   SHEET_TAB               — tab name to overwrite (default "Employees")
// Share the spreadsheet with the service account's client_email (Editor).

import { SignJWT, importPKCS8 } from 'npm:jose@5'
import { corsHeaders, json, serviceClient, requireRole } from '../_shared/utils.ts'

const COLUMNS: [string, string][] = [
  ['Emp Code', 'emp_code'],
  ['Full Name', 'full_name'],
  ['Status', 'status'],
  ['Department', 'department'],
  ['Designation', 'designation'],
  ['Location', 'location'],
  ['Employment Type', 'employment_type'],
  ['Date of Joining', 'date_of_join'],
  ['Date of Exit', 'date_of_exit'],
  ['Exit Reason', 'exit_reason'],
  ['Personal Email', 'personal_email'],
  ['Work Email', 'work_email'],
  ['Phone', 'phone'],
  ['Alt Phone', 'alt_phone'],
  ['Date of Birth', 'date_of_birth'],
  ['Gender', 'gender'],
  ['Blood Group', 'blood_group'],
  ['Address', 'address'],
  ['City', 'city'],
  ['State', 'state'],
  ['PIN', 'pincode'],
  ['Emergency Contact', 'emergency_contact_name'],
  ['Emergency Phone', 'emergency_contact_phone'],
  ['PAN', 'pan_number'],
  ['Aadhaar', 'aadhaar_number'],
  ['UAN', 'uan_number'],
  ['ESIC', 'esic_number'],
  ['Bank Name', 'bank_name'],
  ['Bank Account', 'bank_account'],
  ['IFSC', 'bank_ifsc'],
  ['Monthly Gross', 'monthly_gross'],
  ['Learnapp Status', 'learnapp_status'],
  ['Notes', 'notes'],
]

async function googleAccessToken(saJson: string): Promise<string> {
  const sa = JSON.parse(saJson)
  const key = await importPKCS8(sa.private_key, 'RS256')
  const now = Math.floor(Date.now() / 1000)
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/spreadsheets' })
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

  const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
  const sheetId = Deno.env.get('SHEET_ID')
  const tab = Deno.env.get('SHEET_TAB') || 'Employees'

  const log = async (status: string, rows: number | null, detail: string | null) => {
    await svc.from('sheet_sync_log').insert({ status, rows, detail, created_by: appUser.id })
  }

  if (!saJson || !sheetId) {
    await log('error', null, 'Sheet sync not configured (set GOOGLE_SERVICE_ACCOUNT and SHEET_ID secrets)')
    return json({ error: 'Sheet sync is not configured yet: set GOOGLE_SERVICE_ACCOUNT and SHEET_ID secrets (see README)' }, 500)
  }

  try {
    const { data: people, error } = await svc
      .from('people')
      .select('*')
      .order('status')
      .order('full_name')
    if (error) throw new Error(error.message)

    const header = COLUMNS.map(([label]) => label)
    const rows = (people || []).map((p: Record<string, unknown>) =>
      COLUMNS.map(([, field]) => {
        const v = p[field]
        return v == null ? '' : String(v)
      })
    )

    const token = await googleAccessToken(saJson)
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values`
    const range = encodeURIComponent(`${tab}!A:AZ`)

    const clearRes = await fetch(`${base}/${range}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!clearRes.ok) {
      const e = await clearRes.json().catch(() => ({}))
      throw new Error(`Sheet clear failed (${clearRes.status}): ${e?.error?.message || 'check SHEET_ID, tab name, and that the sheet is shared with the service account'}`)
    }

    const updateRes = await fetch(`${base}/${encodeURIComponent(`${tab}!A1`)}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [header, ...rows] }),
    })
    if (!updateRes.ok) {
      const e = await updateRes.json().catch(() => ({}))
      throw new Error(`Sheet update failed (${updateRes.status}): ${e?.error?.message || ''}`)
    }

    await log('ok', rows.length, null)
    return json({ ok: true, rows: rows.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await log('error', null, msg.slice(0, 500))
    return json({ error: msg }, 500)
  }
})
