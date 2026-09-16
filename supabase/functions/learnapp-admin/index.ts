// Manage user accounts in the CRIL learnapp (a separate Supabase project)
// from the ops app: invite, create-with-password, disable, enable.
//
// Secrets required:
//   LEARNAPP_URL               — the learnapp project URL (https://xxxx.supabase.co)
//   LEARNAPP_SERVICE_ROLE_KEY  — that project's service_role key
//
// NOTE: if the learnapp expects a row in its own profiles/users table for each
// auth user, add that insert where marked "LEARNAPP PROFILE HOOK" below.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json, serviceClient, requireRole } from '../_shared/utils.ts'

function randomPassword(len = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%'
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
  if (!url || !key) {
    return json({ error: 'Learnapp is not connected yet: set LEARNAPP_URL and LEARNAPP_SERVICE_ROLE_KEY secrets (see README)' }, 500)
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Bad request' }, 400)
  }
  const { action, person_id, email, full_name } = body
  if (!action || !person_id) return json({ error: 'Missing fields' }, 400)

  const { data: person } = await svc.from('people').select('*').eq('id', person_id).maybeSingle()
  if (!person) return json({ error: 'Person not found' }, 404)

  const learn = createClient(url, key, { auth: { persistSession: false } })

  const logIt = async (status: 'ok' | 'error', detail: string) => {
    await svc.from('learnapp_actions').insert({
      person_id, action: action === 'create' ? 'create' : action, status, detail: detail.slice(0, 500), created_by: appUser.id,
    })
  }

  try {
    if (action === 'invite' || action === 'create') {
      const targetEmail = (email || person.work_email || person.personal_email || '').trim().toLowerCase()
      if (!targetEmail) return json({ error: 'No email on file for this person' }, 400)
      if (person.learnapp_user_id) return json({ error: 'They already have a learnapp account' }, 400)

      let userId: string
      let password: string | undefined

      if (action === 'invite') {
        const { data, error } = await learn.auth.admin.inviteUserByEmail(targetEmail, {
          data: { full_name: full_name || person.full_name },
        })
        if (error) throw new Error(error.message)
        userId = data.user.id
      } else {
        password = randomPassword()
        const { data, error } = await learn.auth.admin.createUser({
          email: targetEmail,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name || person.full_name },
        })
        if (error) throw new Error(error.message)
        userId = data.user.id
      }

      // ---- LEARNAPP PROFILE HOOK ----------------------------------------
      // If the learnapp needs a row in its own table for each user, add it here, e.g.:
      // await learn.from('profiles').insert({ id: userId, full_name: person.full_name, role: 'learner' })
      // --------------------------------------------------------------------

      await svc.from('people').update({
        learnapp_user_id: userId,
        learnapp_email: targetEmail,
        learnapp_status: 'active',
      }).eq('id', person_id)

      await logIt('ok', `${targetEmail} (${userId})`)
      return json({
        ok: true,
        message: action === 'invite' ? `Invite email sent to ${targetEmail}` : `Account created for ${targetEmail}`,
        ...(password ? { password } : {}),
      })
    }

    if (action === 'disable' || action === 'enable') {
      if (!person.learnapp_user_id) return json({ error: 'No learnapp account linked' }, 400)
      const { error } = await learn.auth.admin.updateUserById(person.learnapp_user_id, {
        ban_duration: action === 'disable' ? '876000h' : 'none',
      })
      if (error) throw new Error(error.message)

      await svc.from('people').update({
        learnapp_status: action === 'disable' ? 'disabled' : 'active',
      }).eq('id', person_id)

      await logIt('ok', person.learnapp_email || '')
      return json({ ok: true, message: action === 'disable' ? 'Learnapp access disabled' : 'Learnapp access re-enabled' })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await logIt('error', msg)
    return json({ error: msg }, 500)
  }
})
