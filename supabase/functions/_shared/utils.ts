import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

/**
 * Resolve the calling staff member from the request's JWT and check a role.
 * Returns { user, appUser } or throws a Response.
 */
export async function requireRole(req: Request, svc: SupabaseClient, role: string) {
  const auth = req.headers.get('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) throw json({ error: 'Not signed in' }, 401)

  const { data: userData, error } = await svc.auth.getUser(token)
  if (error || !userData?.user) throw json({ error: 'Not signed in' }, 401)

  const { data: appUser } = await svc
    .from('app_users')
    .select('*')
    .eq('auth_id', userData.user.id)
    .eq('active', true)
    .maybeSingle()

  if (!appUser) throw json({ error: 'No access' }, 403)
  if (!appUser.roles.includes(role) && !appUser.roles.includes('admin')) {
    throw json({ error: `Needs the ${role} role` }, 403)
  }
  return { user: userData.user, appUser }
}
