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

  const hasRole = useCallback(
    (role) => {
      if (!appUser?.active) return false
      return appUser.roles?.includes(role) || appUser.roles?.includes('admin')
    },
    [appUser]
  )

  const hasAnyRole = useCallback((roles) => roles.some((r) => hasRole(r)), [hasRole])

  return (
    <AuthCtx.Provider value={{ session, appUser, signInWithGoogle, signOut, hasRole, hasAnyRole }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
