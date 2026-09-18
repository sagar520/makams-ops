import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  const [appUser, setAppUser] = useState(undefined) // undefined = loading, null = not invited

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadAppUser = useCallback(async (s) => {
    if (!s) {
      setAppUser(null)
      return
    }
    const { data } = await supabase.from('app_users').select('*').eq('auth_id', s.user.id).maybeSingle()
    if (data) {
      setAppUser(data)
      return
    }
    // First sign-in: try to claim an invited row matching this email
    await supabase.rpc('claim_app_user')
    const { data: after } = await supabase.from('app_users').select('*').eq('auth_id', s.user.id).maybeSingle()
    setAppUser(after ?? null)
  }, [])

  useEffect(() => {
    if (session === undefined) return
    setAppUser(undefined)
    loadAppUser(session)
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
    })

  const signOut = () => supabase.auth.signOut()

  /* ---------------- view as another user (admins only) ----------------
   * This changes the INTERFACE only: which modules and buttons appear.
   * Every query still runs as the signed-in admin, so row-level security
   * is untouched — it is a preview, not a login.
   */
  const [viewAs, setViewAsState] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('makams.viewAs') || 'null') } catch { return null }
  })

  const isAdmin = !!appUser?.active && appUser.roles?.includes('admin')

  const setViewAs = useCallback((user) => {
    const next = user ? { id: user.id, full_name: user.full_name, email: user.email, roles: user.roles } : null
    setViewAsState(next)
    try {
      if (next) sessionStorage.setItem('makams.viewAs', JSON.stringify(next))
      else sessionStorage.removeItem('makams.viewAs')
    } catch { /* private window: it just won't survive a reload */ }
  }, [])

  // only an admin can be pretending; drop it if the account changes
  const acting = isAdmin ? viewAs : null
  useEffect(() => {
    if (viewAs && appUser !== undefined && !isAdmin) setViewAs(null)
  }, [isAdmin, appUser]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasRole = useCallback(
    (role) => {
      if (!appUser?.active) return false
      const roles = acting ? acting.roles : appUser.roles
      return roles?.includes(role) || roles?.includes('admin')
    },
    [appUser, acting]
  )

  const hasAnyRole = useCallback((roles) => roles.some((r) => hasRole(r)), [hasRole])

  return (
    <AuthCtx.Provider
      value={{ session, appUser, signInWithGoogle, signOut, hasRole, hasAnyRole, viewAs: acting, setViewAs, isAdmin }}
    >
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
