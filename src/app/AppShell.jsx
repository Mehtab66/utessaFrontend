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
    <div className="min-h-screen bg-[#edf3ff] text-[#171d39]">
      <div className="flex min-h-screen flex-col md:flex-row">
        <nav
          aria-label="Main"
          className="flex w-full flex-col gap-4 border-b border-[#dfe6f7] bg-[linear-gradient(180deg,#0d1429_0%,#121d3e_100%)] px-3.5 py-5 text-white md:min-h-screen md:w-[250px] md:flex-none md:border-b-0 md:border-r md:border-[#203057]"
        >
          <div className="flex items-center gap-2.5 px-1.5">
            <Logo className="h-8 w-8" />
            <div className="min-w-0">
              <Wordmark light />
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-0.5">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a7b3d7]">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={`${section.title}-${item.id}`}
                      to={item.to}
                      end={item.end ?? true}
                      className={({ isActive }) =>
                        `flex min-h-10 items-center justify-between gap-2 rounded-xl px-2.5 text-[13.5px] font-semibold transition ${
                          isActive
                            ? 'bg-[linear-gradient(135deg,#dffaf8_0%,#dfe6ff_100%)] text-[#101a3a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]'
                            : 'text-white/82 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="shrink-0 rounded-full bg-[#f7c75a] px-2 py-0.5 text-[11px] font-bold text-[#141b38]">
                          {item.badge}
                        </span>
                      ) : null}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-2 border-t border-white/10 px-1.5 pt-3">
            <div className="rounded-2xl bg-white/6 px-2.5 py-2 text-[12px] leading-snug text-white/80">
              <div className="font-semibold text-white">{user.fullName}</div>
              <div>{roleLabel(user.role)}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="min-h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe6f7] bg-white/75 px-5 py-3 backdrop-blur-md">
            <div>
              <p className="m-0 text-[12px] font-bold uppercase tracking-[0.12em] text-[#687699]">Practice workspace</p>
              <p className="m-0 text-sm text-[#4c5678]">
                Trial: <b className="text-[#171d39]">{daysLeft}</b> day{daysLeft === 1 ? '' : 's'} left
              </p>
            </div>
            <div className="rounded-full border border-[#e3eaf6] bg-[#f7f9fe] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#4a567d]">
              {roleLabel(user.role)}
            </div>
          </header>
          <section className="px-5 py-6 sm:px-7">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  )
}

function BootScreen({ progress, label, detail }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#edf3ff] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center">
          <Logo className="h-12 w-12 animate-pulse-soft" />
        </div>
        <h1 className="text-[22px] font-bold text-[#171d39]">{label}</h1>
        {detail && <p className="mt-1 text-sm text-[#4c5678]">{detail}</p>}
        <div className="mx-auto mt-6 h-2.5 overflow-hidden rounded-full bg-[#dfe7f8]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#53e4d4_0%,#2ec4b6_55%,#1d2448_100%)] transition-[width] duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 font-mono text-xs text-[#687699]">{progress}%</p>
      </div>
    </div>
  )
}
