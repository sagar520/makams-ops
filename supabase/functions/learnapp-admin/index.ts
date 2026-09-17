// Manage user accounts in the CRIL learnapp (a separate Supabase project)
// from the ops app. Mirrors the learnapp's own create-user function:
//   * login = Employee ID; auth email is synthesized as <empid>@<domain>
//   * a matching row goes into the learnapp's `profiles` table
//
// Secrets required:
//   LEARNAPP_URL               — the learnapp project URL (https://xxxx.supabase.co)
//   LEARNAPP_SERVICE_ROLE_KEY  — that project's service_role key
//   LEARNAPP_EMAIL_DOMAIN      — optional; default "example.com" (must match the
//                                learnapp frontend's EMAIL_DOMAIN in src/supabase.js)

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json, serviceClient, requireRole } from '../_shared/utils.ts'

function randomPassword(len = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
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

  const url = Deno.env.get('LEARNAPP_URL')
  const key = Deno.env.get('LEARNAPP_SERVICE_ROLE_KEY')
  const domain = Deno.env.get('LEARNAPP_EMAIL_DOMAIN') || 'example.com'
  if (!url || !key) {
    return json({ error: 'Learnapp is not connected yet: set LEARNAPP_URL and LEARNAPP_SERVICE_ROLE_KEY secrets (see README)' }, 500)
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Bad request' }, 400)
  }
  const { action, person_id } = body
  if (!action || !person_id) return json({ error: 'Missing fields' }, 400)

  const { data: person } = await svc.from('people').select('*').eq('id', person_id).maybeSingle()
  if (!person) return json({ error: 'Person not found' }, 404)

  const learn = createClient(url, key, { auth: { persistSession: false } })

  const logIt = async (status: 'ok' | 'error', detail: string) => {
    await svc.from('learnapp_actions').insert({
      person_id, action, status, detail: detail.slice(0, 500), created_by: appUser.id,
    })
  }

  try {
    if (action === 'create') {
      const empId = (person.emp_code || '').trim()
      if (!empId) return json({ error: 'Set an Employee ID first — it becomes their learnapp login' }, 400)
      if (person.learnapp_user_id) return json({ error: 'They already have a learnapp account' }, 400)

      // same employee_id must not already exist in the learnapp
      const { data: existing } = await learn.from('profiles').select('id').eq('employee_id', empId).maybeSingle()
      if (existing) return json({ error: `Employee ID ${empId} already exists in the learnapp` }, 400)

      const password = randomPassword()
      const loginEmail = `${empId.toLowerCase()}@${domain}`

      const { data: created, error } = await learn.auth.admin.createUser({
        email: loginEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: person.full_name },
      })
      if (error) throw new Error(error.message)
      const userId = created.user.id

      const { error: profErr } = await learn.from('profiles').insert({
        id: userId,
        employee_id: empId,
        name: person.full_name,
        role: 'sales',
        active: true,
        email: person.personal_email || person.work_email || null,
      })
      if (profErr) {
        await learn.auth.admin.deleteUser(userId).catch(() => {})
        throw new Error(`learnapp profile insert failed: ${profErr.message}`)
      }

      await svc.from('people').update({
        learnapp_user_id: userId,
        learnapp_email: loginEmail,
        learnapp_status: 'active',
      }).eq('id', person_id)

      await logIt('ok', `${empId} (${userId})`)
      return json({ ok: true, message: `Learnapp login created — ID: ${empId}`, password })
    }

    if (action === 'disable' || action === 'enable') {
      if (!person.learnapp_user_id) return json({ error: 'No learnapp account linked' }, 400)
      const { error } = await learn.auth.admin.updateUserById(person.learnapp_user_id, {
        ban_duration: action === 'disable' ? '876000h' : 'none',
      })
      if (error) throw new Error(error.message)
      await learn.from('profiles').update({ active: action === 'enable' }).eq('id', person.learnapp_user_id)

      await svc.from('people').update({
        learnapp_status: action === 'disable' ? 'disabled' : 'active',
      }).eq('id', person_id)

      await logIt('ok', person.emp_code || '')
      return json({ ok: true, message: action === 'disable' ? 'Learnapp access disabled' : 'Learnapp access re-enabled' })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await logIt('error', msg)
    return json({ error: msg }, 500)
  }
})
