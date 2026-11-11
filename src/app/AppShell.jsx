import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/AuthContext'
import { Logo, Wordmark } from '../shared/ui/Logo'
import { navForRole, roleLabel } from '../shared/security/roles'

export default function AppShell() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [booting, setBooting] = useState(() => Boolean(location.state?.bootDashboard))
  const [bootProgress, setBootProgress] = useState(0)

  useEffect(() => {
    if (!booting) return undefined
    const started = Date.now()
    const timer = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - started) / 1400) * 100))
      setBootProgress(pct)
      if (pct >= 100) {
        clearInterval(timer)
        setTimeout(() => {
          setBooting(false)
          if (location.state?.bootDashboard) {
            navigate(location.pathname, { replace: true, state: {} })
          }
        }, 180)
      }
    }, 40)
    return () => clearInterval(timer)
  }, [booting, location.pathname, location.state, navigate])

  const sections = useMemo(() => navForRole(user?.role, user?.enabledServices), [user?.role, user?.enabledServices])

  if (loading) {
    return <BootScreen progress={35} label="Checking your secure session…" />
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.superAdmin) return <Navigate to="/platform" replace />
  if (user && !user.onboardingDone) return <Navigate to="/welcome" replace />

  if (booting) {
    return (
      <BootScreen
        progress={bootProgress}
        label="Loading your practice dashboard…"
        detail={`${user.organizationName} · ${roleLabel(user.role)}`}
      />
    )
  }

  const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt) : null
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - Date.now()) / 86400000)) : 0

  return (
    <div className="flex min-h-screen flex-wrap bg-[#F3F3F8] text-[#151940]">
      <nav
        aria-label="Main"
        className="flex w-full flex-col gap-4 border-b border-[#E1E3F0] bg-[#F4F5FB] px-3.5 py-5 text-navy md:min-h-screen md:w-[236px] md:flex-none md:border-b-0 md:border-r"
      >
        <div className="flex items-center gap-2.5 px-1.5">
          <Logo className="h-8 w-8" />
          <div className="min-w-0">
            <Wordmark />
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-0.5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#717490]">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={`${section.title}-${item.id}`}
                    to={item.to}
                    end={item.end ?? true}
                    className={({ isActive }) =>
                      `flex min-h-10 items-center justify-between gap-2 rounded-lg px-2.5 text-[13.5px] font-semibold transition ${
                        isActive
                          ? 'bg-[#DDEFEF] text-[#075E66]'
                          : 'text-[#1B1F4B] hover:bg-[#EBECF4]'
                      }`
                    }
                  >
                    <span className="min-w-0 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="shrink-0 rounded-full bg-[#FFD23F] px-2 py-0.5 text-[11px] font-bold text-[#151940]">
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-2 border-t border-[#E1E3F0] px-1.5 pt-3">
          <div className="rounded-lg bg-white px-2.5 py-2 text-[12px] leading-snug text-[#4C5076]">
            <div className="font-semibold text-navy">{user.fullName}</div>
            <div>{roleLabel(user.role)}</div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="min-h-10 w-full rounded-lg border border-[#C8C9D4] bg-white px-3 text-sm font-semibold text-navy hover:bg-[#F1F2F8]"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E1E3F0] bg-white px-5 py-3">
          <div>
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.08em] text-[#717490]">Practice workspace</p>
            <p className="m-0 text-sm text-[#43476A]">
              Trial: <b className="text-navy">{daysLeft}</b> day{daysLeft === 1 ? '' : 's'} left
            </p>
          </div>
        </header>
        <section className="px-5 py-6 sm:px-7">
          <Outlet />
        </section>
      </div>
    </div>
  )
}

function BootScreen({ progress, label, detail }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F3F3F8] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center">
          <Logo className="h-12 w-12 animate-mosaic" />
        </div>
        <h1 className="text-[22px] font-bold text-navy">{label}</h1>
        {detail && <p className="mt-1 text-sm text-[#4C5076]">{detail}</p>}
        <div className="mx-auto mt-6 h-2.5 overflow-hidden rounded-full bg-[#DEE0EE]">
          <div
            className="h-full rounded-full bg-[#0A7A82] transition-[width] duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 font-mono text-xs text-[#717490]">{progress}%</p>
      </div>
    </div>
  )
}
