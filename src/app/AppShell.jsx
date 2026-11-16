import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/AuthContext'
import { Logo, Wordmark } from '../shared/ui/Logo'
import { navForRole, roleLabel } from '../shared/security/roles'

/* ─── Inline SVG icons ──────────────────────────────────────────────────── */
function IconSearch({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  )
}
function IconBell({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 4.5-2 6-2 6h16s-2-1.5-2-6" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
function IconChevronDown({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
function IconChevronRight({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
/* Section icons */
function IconDashboard({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}
function IconCRM({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </svg>
  )
}
function IconOps({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}
function IconMarketing({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
function IconClock({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  )
}

/* ─── Section definitions ───────────────────────────────────────────────── */
const MAIN_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: IconDashboard, to: '/app',      color: '#2f54eb' },
  { id: 'crm',       label: 'CRM',       icon: IconCRM,       to: '/app/crm',  color: '#0ea47a' },
  { id: 'ops',       label: 'Operations',icon: IconOps,       to: '/app/providers', color: '#7c3aed' },
  { id: 'mkt',       label: 'Marketing', icon: IconMarketing, to: '/app/provider-leads', color: '#db6c14' },
  { id: 'tc',        label: 'Time Clock',icon: IconClock,     to: '/app/timeclock', color: '#0891b2' },
]

/* Map section id → which navForRole section titles belong to it */
const SECTION_TITLE_MAP = {
  dashboard: ['Dashboard'],
  crm:       ['CRM'],
  ops:       ['Operations'],
  mkt:       ['Marketing & outreach'],
  tc:        ['Time clock'],
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function AppShell() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [booting, setBooting]         = useState(() => Boolean(location.state?.bootDashboard))
  const [bootProgress, setBootProgress] = useState(0)
  const [search, setSearch]           = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const [activeSection, setActiveSection] = useState(null) // id of selected rail item

  const profileRef = useRef(null)
  const notifRef   = useRef(null)

  /* Close dropdowns on outside click */
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  /* Boot animation */
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

  /* Auto-detect active section from URL */
  useEffect(() => {
    const path = location.pathname
    if (path === '/app' || path === '/app/inbox') { setActiveSection('dashboard'); return }
    if (path.startsWith('/app/crm') || path.startsWith('/app/no-shows')) { setActiveSection('crm'); return }
    if (['/app/providers','/app/staff','/app/vendors','/app/document-vault',
         '/app/resources','/app/training','/app/inventory'].some(p => path.startsWith(p))) { setActiveSection('ops'); return }
    if (['/app/provider-leads','/app/cms-search','/app/email-campaigns',
         '/app/social','/app/agents'].some(p => path.startsWith(p))) { setActiveSection('mkt'); return }
    if (path.startsWith('/app/timeclock')) { setActiveSection('tc'); return }
  }, [location.pathname])

  const sections = useMemo(() => navForRole(user?.role, user?.enabledServices), [user?.role, user?.enabledServices])

  /* Sub-items for the active rail section */
  const activeSubItems = useMemo(() => {
    if (!activeSection) return []
    const titles = SECTION_TITLE_MAP[activeSection] || []
    return sections
      .filter(s => titles.some(t => s.title.toLowerCase() === t.toLowerCase()))
      .flatMap(s => s.items)
  }, [activeSection, sections])

  /* Dashboard sub-items (Home + Inbox) */
  const dashItems = [
    { id: 'dash',  label: 'Home',  to: '/app',       end: true },
    { id: 'inbox', label: 'Inbox', to: '/app/inbox', end: true },
  ]
  const subItems = activeSection === 'dashboard' ? dashItems : activeSubItems

  if (loading) return <BootScreen progress={35} label="Checking your secure session…" />
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

  const trialEnd  = user?.trialEndsAt ? new Date(user.trialEndsAt) : null
  const daysLeft  = trialEnd ? Math.max(0, Math.ceil((trialEnd - Date.now()) / 86400000)) : 0
  const activeMeta = MAIN_SECTIONS.find(s => s.id === activeSection)

  return (
    <div className="min-h-screen bg-white text-[#171d39]">
      <div className="flex min-h-screen">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <nav
          aria-label="Main sections"
          className="flex w-56 flex-none flex-col border-r border-[#e2e5eb] bg-[#f3f4f6] py-4"
        >
          {/* Wordmark: logo + "Utessa" */}
          <div className="mb-4 flex items-center gap-2.5 px-4">
            <Logo className="h-8 w-8 flex-none" />
            <span className="text-[20px] font-semibold tracking-[-0.01em] text-[#1B1F4B]">
              <b className="font-extrabold text-[#3BC4CA]">U</b>tessa
            </span>
          </div>

          {/* See Plan button */}
          <div className="mb-4 px-3">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl border border-[#d0d4de] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#4a567d] shadow-sm transition hover:border-[#2f54eb]/40 hover:bg-[#f0f4ff] hover:text-[#2f54eb]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              See plan
              <svg viewBox="0 0 24 24" className="ml-auto h-3.5 w-3.5 shrink-0 text-[#9aaac8]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="mx-3 mb-3 h-px bg-[#e2e5eb]" />

          {/* Section buttons */}
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
            {MAIN_SECTIONS.map(sec => {
              const Icon     = sec.icon
              const isActive = activeSection === sec.id
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(sec.id)
                    navigate(sec.to)
                  }}
                  style={isActive ? { backgroundColor: sec.color + '18', color: sec.color } : {}}
                  className={`group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-all ${
                    isActive
                      ? ''
                      : 'text-[#687699] hover:bg-white hover:text-[#171d39]'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {sec.label}
                  {isActive && (
                    <span
                      className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: sec.color }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Sign out at bottom */}
          <div className="mt-auto border-t border-[#e2e5eb] px-2 pt-3">
            <button
              type="button"
              onClick={logout}
              className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-[#687699] hover:bg-white hover:text-red-500"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              </svg>
              Sign out
            </button>
          </div>
        </nav>

        {/* ── Main content column ──────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Top header */}
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#e2e5eb] bg-[#f3f4f6] px-5 py-3">
            {/* Left: workspace label */}
            <div className="hidden shrink-0 md:block">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-[#687699]">Practice workspace</p>
              <p className="m-0 text-xs text-[#4c5678]">
                Trial: <b className="text-[#171d39]">{daysLeft}</b> day{daysLeft === 1 ? '' : 's'} left
              </p>
            </div>

            {/* Center: search bar */}
            <div className="relative mx-auto w-full max-w-sm flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#9aaac8]">
                <IconSearch className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-9 w-full rounded-xl border border-[#d0d4de] bg-white pl-9 pr-4 text-sm text-[#171d39] placeholder-[#9aaac8] outline-none transition focus:border-[#2f54eb] focus:ring-2 focus:ring-[#2f54eb]/15"
              />
            </div>

            {/* Right: notifications + profile */}
            <div className="ml-auto flex shrink-0 items-center gap-2">

              {/* Notification bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => { setNotifOpen(o => !o); setProfileOpen(false) }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#d0d4de] bg-white text-[#4a567d] transition hover:bg-[#edf3ff] hover:text-[#2f54eb]"
                  aria-label="Notifications"
                >
                  <IconBell className="h-5 w-5" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-[#dfe6f7] bg-white shadow-xl">
                    <div className="border-b border-[#f0f4fb] px-4 py-3">
                      <p className="text-sm font-bold text-[#171d39]">Notifications</p>
                    </div>
                    <ul className="divide-y divide-[#f0f4fb]">
                      {[
                        { title: 'New patient registered', time: '2 min ago' },
                        { title: 'Appointment reminder sent', time: '1 hr ago' },
                        { title: 'Invoice #1042 paid', time: 'Yesterday' },
                      ].map(n => (
                        <li key={n.title} className="flex items-start gap-3 px-4 py-3 hover:bg-[#f7f9fe]">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2f54eb]" />
                          <div>
                            <p className="text-xs font-semibold text-[#171d39]">{n.title}</p>
                            <p className="text-[11px] text-[#9aaac8]">{n.time}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="px-4 py-2.5">
                      <button type="button" className="w-full text-center text-xs font-semibold text-[#2f54eb] hover:underline">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => { setProfileOpen(o => !o); setNotifOpen(false) }}
                  className="flex h-9 items-center gap-2 rounded-xl border border-[#d0d4de] bg-white pl-2 pr-2.5 text-[#171d39] transition hover:bg-[#edf3ff]"
                  aria-label="Profile menu"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2f54eb] text-[11px] font-bold uppercase text-white">
                    {user.fullName?.[0] ?? '?'}
                  </span>
                  <span className="hidden max-w-[110px] truncate text-xs font-semibold sm:block">{user.fullName}</span>
                  <IconChevronDown className="h-3.5 w-3.5 text-[#9aaac8]" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-11 z-50 w-52 rounded-2xl border border-[#dfe6f7] bg-white shadow-xl">
                    <div className="border-b border-[#f0f4fb] px-4 py-3">
                      <p className="text-sm font-semibold text-[#171d39]">{user.fullName}</p>
                      <p className="text-xs text-[#687699]">{roleLabel(user.role)}</p>
                    </div>
                    <ul className="py-1">
                      {[{ label: 'My Profile' }, { label: 'Settings' }].map(item => (
                        <li key={item.label}>
                          <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-[#171d39] hover:bg-[#f7f9fe]">
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-[#f0f4fb] px-3 py-2">
                      <button
                        type="button"
                        onClick={logout}
                        className="w-full rounded-xl border border-red-100 bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ── Section sub-nav: horizontal tabs below header ──────────────── */}
          {activeSection && subItems.length > 0 && (
            <div className="border-b border-[#e8ecf4] bg-white px-5">
              {/* Section label pill */}
              <div className="flex items-center gap-3 overflow-x-auto pb-0 pt-2">
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                  style={{ backgroundColor: activeMeta?.color ?? '#2f54eb' }}
                >
                  {activeMeta?.label}
                </span>

                {/* Divider */}
                <span className="h-4 w-px shrink-0 bg-[#dfe6f7]" />

                {/* Tab links */}
                <nav aria-label={`${activeMeta?.label} tabs`} className="flex items-end gap-1 overflow-x-auto">
                  {subItems.map(item => (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      end={item.end ?? true}
                      className={({ isActive }) =>
                        `relative shrink-0 px-3.5 pb-2.5 pt-1.5 text-[13px] font-semibold transition-colors ${
                          isActive
                            ? 'text-[#171d39]'
                            : 'text-[#687699] hover:text-[#2f54eb]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {item.label}
                          {isActive && (
                            <span
                              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                              style={{ backgroundColor: activeMeta?.color ?? '#2f54eb' }}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 px-5 py-6 sm:px-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

/* ─── Boot screen ───────────────────────────────────────────────────────── */
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
