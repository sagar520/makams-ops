import { createClient } from '@supabase/supabase-js'
import { createDemoClient } from './demo/client'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Demo mode: the whole app runs against an in-memory store — no Supabase needed. */
export const isDemo = import.meta.env.VITE_DEMO === '1'

export const supabaseAnonKey = anonKey
export const isConfigured = isDemo || Boolean(url && anonKey)

export const supabase = isDemo
  ? createDemoClient()
  : isConfigured
  ? createClient(url, anonKey)
  : new Proxy({}, {
      get() {
        throw new Error(
          'Supabase is not configured. Copy .env.example to .env and set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
        )
      },
    })

/** Public employee-portal URL for an upload link token. */
export function portalUrl(token) {
  return isDemo
    ? `${window.location.origin}${window.location.pathname}#/u/${token}`
    : `${window.location.origin}/u/${token}`
}

/** Base URL for edge functions */
export const functionsUrl = !isDemo && isConfigured ? `${url}/functions/v1` : ''

/** Call an edge function with the current session's JWT. */
export async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    // supabase-js wraps non-2xx into FunctionsHttpError; surface server message
    let msg = error.message
    try {
      const ctx = await error.context?.json?.()
      if (ctx?.error) msg = ctx.error
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}
