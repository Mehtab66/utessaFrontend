import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/AuthContext'
import { Logo, Wordmark } from '../shared/ui/Logo'

const NAV = [
  { to: '/app', end: true, label: 'Home', color: null },
  { to: '/app/crm', label: 'CRM', color: 'bg-cyan' },
  { to: '/app/operations', label: 'Operations', color: 'bg-lavender' },
  { to: '/app/marketing', label: 'Marketing', color: 'bg-yellow' },
  { to: '/app/timeclock', label: 'Time Clock', color: 'bg-teal' },
]

export default function AppShell() {
  const { user, loading, logout, isAuthenticated } = useAuth()

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-bg text-muted">Loading…</div>
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt) : null
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - Date.now()) / 86400000)) : 0

  return (
    <div className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto max-w-[1060px] overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-center gap-3 bg-navy px-5 py-3 text-white">
          <Logo className="h-[30px] w-[30px]" />
          <Wordmark light />
          <span className="text-sm font-semibold text-lcyan">{user.organizationName}</span>
          <span className="flex-1" />
          <button type="button" onClick={logout} className="rounded-lg bg-yellow px-3.5 py-2 text-sm font-bold text-navy">
            Sign out
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-[#B7F0F2] bg-[#E9FBFB] px-5 py-2.5 text-sm">
          <span>
            Trial: <b className="font-extrabold">{daysLeft}</b> day{daysLeft === 1 ? '' : 's'} left
          </span>
          <span className="flex-1" />
          <span className="text-muted">Signed in as {user.fullName} · {user.role}</span>
        </div>

        <div className="grid min-h-[460px] md:grid-cols-[200px_minmax(0,1fr)]">
          <nav className="hidden border-r border-[#EEF1F8] p-3 md:block" aria-label="Product areas">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold ${isActive ? 'bg-soft text-navy' : 'text-muted hover:bg-soft/70'}`
                }
              >
                {item.color && <span className={`h-3 w-3 rounded-sm ${item.color}`} />}
                {item.label}
              </NavLink>
            ))}
          </nav>
          <section className="px-5 py-6 sm:px-6">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  )
}
