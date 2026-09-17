import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, ClipboardList, Briefcase, Store, FileText, CheckSquare, Settings as SettingsIcon,
  LogOut, Menu, X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { cx } from './ui'
import { initials } from '../lib/format'

function NavItem({ to, icon: Icon, label, badge, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-indigo-600/90 text-white' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
        )
      }
    >
      <Icon className="h-4.5 w-4.5 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge > 0 && <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-amber-950">{badge}</span>}
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return <p className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</p>
}

export default function Layout({ children }) {
  const { appUser, signOut, hasRole, hasAnyRole } = useAuth()
  const [open, setOpen] = useState(false)

  // Pending approvals badge for the current user
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['my-pending-approvals-count', appUser?.id],
    enabled: !!appUser && hasAnyRole(['approver', 'purchase']),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('po_approval_steps')
        .select('id, purchase_orders!inner(status)', { count: 'exact', head: true })
        .eq('approver_id', appUser.id)
        .eq('status', 'pending')
        .eq('is_current', true)
        .eq('purchase_orders.status', 'pending_approval')
      if (error) return 0
      return count ?? 0
    },
  })

  const close = () => setOpen(false)

  const nav = (
    <nav className="flex h-full flex-col px-3 pb-4">
      <div className="flex items-center gap-2.5 px-3 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">M</div>
        <div>
          <p className="text-sm font-semibold leading-tight text-white">Makams Ops</p>
          <p className="text-[11px] leading-tight text-slate-400">HR &amp; Purchase</p>
        </div>
        <button className="ml-auto rounded-md p-1 text-slate-400 hover:text-white lg:hidden" onClick={close}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <NavItem to="/" icon={LayoutDashboard} label="Overview" onClick={close} />

        {hasRole('hr') && (
          <>
            <SectionLabel>HR</SectionLabel>
            <NavItem to="/people" icon={Users} label="Employees" onClick={close} />
            <NavItem to="/prospectives" icon={ClipboardList} label="Prospectives" onClick={close} />
            <NavItem to="/candidates" icon={Briefcase} label="Candidates DB" onClick={close} />
          </>
        )}

        {hasAnyRole(['purchase', 'approver']) && (
          <>
            <SectionLabel>Purchase</SectionLabel>
            {hasRole('purchase') && <NavItem to="/vendors" icon={Store} label="Vendors" onClick={close} />}
            <NavItem to="/pos" icon={FileText} label="Purchase orders" onClick={close} />
            <NavItem to="/approvals" icon={CheckSquare} label="Approvals" badge={pendingCount} onClick={close} />
          </>
        )}

        {hasRole('admin') && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <NavItem to="/settings" icon={SettingsIcon} label="Settings" onClick={close} />
          </>
        )}
      </div>

      <div className="mt-3 border-t border-slate-700/60 pt-3">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-semibold text-white">
            {initials(appUser?.full_name || appUser?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{appUser?.full_name || appUser?.email}</p>
            <p className="truncate text-[11px] text-slate-400">{appUser?.roles?.join(' · ')}</p>
          </div>
          <button onClick={signOut} title="Sign out" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen lg:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-slate-900 lg:block">{nav}</aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={close} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900 shadow-xl">{nav}</aside>
        </div>
      )}

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="text-sm font-semibold text-slate-900">
          Makams Ops
        </Link>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
