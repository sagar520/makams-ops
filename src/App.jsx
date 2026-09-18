import { BrowserRouter, HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider, FullPageSpinner } from './components/ui'
import { isConfigured, isDemo } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import PeopleList from './pages/hr/PeopleList'
import PersonDetail from './pages/hr/PersonDetail'
import PersonForm from './pages/hr/PersonForm'
import Candidates from './pages/hr/Candidates'
import Prospectives from './pages/hr/Prospectives'
import FormPage from './pages/public/FormPage'
import Vendors from './pages/purchase/Vendors'
import POList from './pages/purchase/POList'
import POEditor from './pages/purchase/POEditor'
import PODetail from './pages/purchase/PODetail'
import Approvals from './pages/purchase/Approvals'
import Settings from './pages/Settings'

function ConfigError() {
  return (
    <div className="flex h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">App not configured</p>
        <p className="mt-2">
          Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to{' '}
          <code className="rounded bg-amber-100 px-1">.env</code> and set your Supabase URL and anon key, then restart the dev
          server. On Vercel, set the same variables in Project Settings → Environment Variables.
        </p>
      </div>
    </div>
  )
}

function NotInvited() {
  const { session, signOut } = useAuth()
  return (
    <div className="flex h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">No access</h1>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{session?.user?.email}</span> hasn't been invited to Makams Ops. Ask an
          admin to add you under Settings → Users, then sign in again.
        </p>
        <button onClick={signOut} className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Sign out
        </button>
      </div>
    </div>
  )
}

function Protected() {
  const { session, appUser } = useAuth()
  if (session === undefined || (session && appUser === undefined)) return <FullPageSpinner />
  if (!session) return <Login />
  if (!appUser || !appUser.active) return <NotInvited />
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

function RequireRole({ roles, children }) {
  const { hasAnyRole } = useAuth()
  return hasAnyRole(roles) ? children : <Navigate to="/" replace />
}

/** No dashboard: "/" sends you to the first page your roles can open. */
function Landing() {
  const { hasRole, hasAnyRole } = useAuth()
  if (hasRole('hr')) return <Navigate to="/prospectives" replace />
  if (hasAnyRole(['purchase', 'approver'])) return <Navigate to="/pos" replace />
  if (hasRole('admin')) return <Navigate to="/settings" replace />
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-lg font-semibold text-slate-900">No modules yet</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your account has no roles assigned. Ask an admin to give you HR or Purchase access.
      </p>
    </div>
  )
}

function DemoBanner() {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[70] -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300 bg-amber-50/95 py-1.5 pl-4 pr-2 text-xs font-medium text-amber-900 shadow-lg backdrop-blur">
        <span>Demo — sample data, changes live only in this tab</span>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-amber-200/80 px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-300"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

const Router = isDemo ? HashRouter : BrowserRouter

export default function App() {
  if (!isConfigured) return <ConfigError />
  return (
    <ToastProvider>
      <AuthProvider>
        {isDemo && <DemoBanner />}
        <Router>
          <Routes>
            {/* Public: tokenised referral/intake form links */}
            <Route path="/f/:token" element={<FormPage />} />

            <Route element={<Protected />}>
              <Route path="/" element={<Landing />} />

              <Route path="/people" element={<RequireRole roles={['hr']}><PeopleList /></RequireRole>} />
              <Route path="/people/:id" element={<RequireRole roles={['hr']}><PersonDetail /></RequireRole>} />
              <Route path="/people/:id/edit" element={<RequireRole roles={['hr']}><PersonForm /></RequireRole>} />
              <Route path="/prospectives" element={<RequireRole roles={['hr']}><Prospectives /></RequireRole>} />
              <Route path="/candidates" element={<RequireRole roles={['hr']}><Candidates /></RequireRole>} />

              <Route path="/vendors" element={<RequireRole roles={['purchase']}><Vendors /></RequireRole>} />
              <Route path="/pos" element={<RequireRole roles={['purchase', 'approver']}><POList /></RequireRole>} />
              <Route path="/pos/new" element={<RequireRole roles={['purchase']}><POEditor /></RequireRole>} />
              <Route path="/pos/:id" element={<RequireRole roles={['purchase', 'approver']}><PODetail /></RequireRole>} />
              <Route path="/pos/:id/edit" element={<RequireRole roles={['purchase']}><POEditor /></RequireRole>} />
              <Route path="/approvals" element={<RequireRole roles={['purchase', 'approver']}><Approvals /></RequireRole>} />

              <Route path="/settings/*" element={<RequireRole roles={['admin']}><Settings /></RequireRole>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  )
}
