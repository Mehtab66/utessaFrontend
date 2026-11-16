import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/AuthContext'
import { Logo } from '../shared/ui/Logo'
import { navForRole, roleLabel } from '../shared/security/roles'

/* ─── Icons ─────────────────────────────────────────────────────────────── */
function IconSearch({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  )
}
function IconBell({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 4.5-2 6-2 6h16s-2-1.5-2-6" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
function IconChat({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
function IconGrid({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconHelp({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  )
}
function IconChevronDown({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
/* Sidebar nav icons */
function IconHome({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M5 10v11h14V10" />
    </svg>
  )
}
function IconCRM({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </svg>
  )
}
function IconOps({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  )
}
function IconMarketing({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
function IconClock({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  )
}

/* ─── Section definitions ───────────────────────────────────────────────── */
const MAIN_SECTIONS = [
  { id: 'dashboard', label: 'Home',       icon: IconHome,      to: '/app',               color: '#2f54eb' },
  { id: 'crm',       label: 'CRM',        icon: IconCRM,       to: '/app/crm',           color: '#0ea47a' },
  { id: 'ops',       label: 'Operations', icon: IconOps,       to: '/app/providers',     color: '#7c3aed' },
  { id: 'mkt',       label: 'Marketing',  icon: IconMarketing, to: '/app/provider-leads',color: '#db6c14' },
  { id: 'tc',        label: 'Time Clock', icon: IconClock,     to: '/app/timeclock',     color: '#0891b2' },
]

const SECTION_TITLE_MAP = {
  dashboard: ['Dashboard'],
  crm:       ['CRM'],
  ops:       ['Operations'],
  mkt:       ['Marketing & outreach'],
  tc:        ['Time clock'],
}

/* ─── AppShell ──────────────────────────────────────────────────────────── */
export default function AppShell() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()

  const [booting, setBooting]           = useState(() => Boolean(location.state?.bootDashboard))
  const [bootProgress, setBootProgress] = useState(0)
  const [search, setSearch]             = useState('')
  const [profileOpen, setProfileOpen]   = useState(false)
  const [notifOpen, setNotifOpen]       = useState(false)
  const [activeSection, setActiveSection] = useState(null)

  const profileRef = useRef(null)
  const notifRef   = useRef(null)

  /* Outside-click closes dropdowns */
  useEffect(() => {
    function h(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
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
          if (location.state?.bootDashboard)
            navigate(location.pathname, { replace: true, state: {} })
        }, 180)
      }
    }, 40)
    return () => clearInterval(timer)
  }, [booting, location.pathname, location.state, navigate])

  /* Auto-detect active section from URL */
  useEffect(() => {
    const p = location.pathname
    if (p === '/app' || p === '/app/inbox') { setActiveSection('dashboard'); return }
    if (p.startsWith('/app/crm') || p.startsWith('/app/no-shows')) { setActiveSection('crm'); return }
    if (['/app/providers','/app/staff','/app/vendors','/app/document-vault',
         '/app/resources','/app/training','/app/inventory'].some(x => p.startsWith(x))) { setActiveSection('ops'); return }
    if (['/app/provider-leads','/app/cms-search','/app/email-campaigns',
         '/app/social','/app/agents'].some(x => p.startsWith(x))) { setActiveSection('mkt'); return }
    if (p.startsWith('/app/timeclock')) { setActiveSection('tc'); return }
  }, [location.pathname])

  const sections = useMemo(() => navForRole(user?.role, user?.enabledServices), [user?.role, user?.enabledServices])

  const activeSubItems = useMemo(() => {
    if (!activeSection) return []
    const titles = SECTION_TITLE_MAP[activeSection] || []
    return sections
      .filter(s => titles.some(t => s.title.toLowerCase() === t.toLowerCase()))
      .flatMap(s => s.items)
  }, [activeSection, sections])

  const dashItems = [
    { id: 'dash',  label: 'Home',  to: '/app',       end: true },
    { id: 'inbox', label: 'Inbox', to: '/app/inbox', end: true },
  ]
  const subItems   = activeSection === 'dashboard' ? dashItems : activeSubItems
  const activeMeta = MAIN_SECTIONS.find(s => s.id === activeSection)

  if (loading)          return <BootScreen progress={35} label="Checking your secure session…" />
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
  const initials = user.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  return (
    /* Page shell — gray canvas */
    <div className="flex h-screen flex-col overflow-hidden bg-[#f6f7fb] text-[#171d39]">

      {/* ══════════════════════════════════════════════════════════════════
          TOP NAVBAR  (matches Monday CRM header)
      ══════════════════════════════════════════════════════════════════ */}
      <header className="flex h-[52px] flex-none items-center gap-3 bg-[#f6f7fb] px-4">

        {/* Left: Logo + wordmark + See Plans pill */}
        <div className="flex shrink-0 items-center gap-2.5 pr-3">
          <Logo className="h-7 w-7 flex-none" />
          <span className="text-[17px] font-semibold tracking-[-0.01em] text-[#1B1F4B]">
            <b className="font-extrabold text-[#3BC4CA]">U</b>tessa
          </span>
          <button
            type="button"
            className="ml-1 flex items-center gap-1.5 rounded-full border border-[#3BC4CA] bg-[#edfaf9] px-3 py-1 text-[12px] font-bold text-[#1aaa99] transition hover:bg-[#d5f5f2]"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
            </svg>
            See plans
          </button>
        </div>

        {/* Center: Search bar */}
        <div className="relative mx-auto flex w-full max-w-md items-center">
          <span className="pointer-events-none absolute left-3 text-[#9aaac8]">
            <IconSearch className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for anything..."
            className="h-9 w-full rounded-lg border border-[#d8dae5] bg-white pl-9 pr-20 text-[13px] text-[#171d39] placeholder-[#9aaac8] outline-none transition focus:border-[#2f54eb] focus:ring-2 focus:ring-[#2f54eb]/15"
          />
          <span className="pointer-events-none absolute right-3 flex items-center gap-0.5 rounded border border-[#e0e2e9] bg-[#f6f7fb] px-1.5 py-0.5 text-[10px] font-semibold text-[#9aaac8]">
            Ctrl K
          </span>
        </div>

        {/* Right: icon actions + avatar */}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {/* Bell */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => { setNotifOpen(o => !o); setProfileOpen(false) }}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#676879] transition hover:bg-[#ecedf5]"
              aria-label="Notifications"
            >
              <IconBell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-[#f6f7fb] bg-red-500" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-[#e0e2e9] bg-white shadow-xl">
                <div className="border-b border-[#f0f1f7] px-4 py-3">
                  <p className="text-sm font-bold text-[#171d39]">Notifications</p>
                </div>
                <ul className="divide-y divide-[#f0f1f7]">
                  {[
                    { title: 'New patient registered', time: '2 min ago' },
                    { title: 'Appointment reminder sent', time: '1 hr ago' },
                    { title: 'Invoice #1042 paid', time: 'Yesterday' },
                  ].map(n => (
                    <li key={n.title} className="flex items-start gap-3 px-4 py-3 hover:bg-[#f6f7fb]">
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

          {/* Chat */}
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#676879] transition hover:bg-[#ecedf5]" aria-label="Chat">
            <IconChat className="h-5 w-5" />
          </button>

          {/* Apps grid */}
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#676879] transition hover:bg-[#ecedf5]" aria-label="Apps">
            <IconGrid className="h-4.5 w-4.5" />
          </button>

          {/* Help */}
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#676879] transition hover:bg-[#ecedf5]" aria-label="Help">
            <IconHelp className="h-5 w-5" />
          </button>

          {/* Profile avatar */}
          <div className="relative ml-1" ref={profileRef}>
            <button
              type="button"
              onClick={() => { setProfileOpen(o => !o); setNotifOpen(false) }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f54eb] text-[12px] font-bold text-white shadow-sm transition hover:opacity-90"
              aria-label="Profile"
            >
              {initials}
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-10 z-50 w-52 rounded-2xl border border-[#e0e2e9] bg-white shadow-xl">
                <div className="border-b border-[#f0f1f7] px-4 py-3">
                  <p className="text-sm font-semibold text-[#171d39]">{user.fullName}</p>
                  <p className="text-xs text-[#687699]">{roleLabel(user.role)}</p>
                </div>
                <ul className="py-1">
                  {[{ label: 'My Profile' }, { label: 'Settings' }].map(item => (
                    <li key={item.label}>
                      <button type="button" className="w-full px-4 py-2.5 text-left text-sm text-[#171d39] hover:bg-[#f6f7fb]">
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-[#f0f1f7] px-3 py-2">
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

      {/* ══════════════════════════════════════════════════════════════════
          BODY ROW  (sidebar + main card)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Narrow icon sidebar (matches Monday's left icon rail) ─────── */}
        <nav
          aria-label="Main sections"
          className="flex w-[68px] flex-none flex-col items-center gap-1 overflow-y-auto bg-[#f6f7fb] py-3"
        >
          {MAIN_SECTIONS.map(sec => {
            const Icon     = sec.icon
            const isActive = activeSection === sec.id
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => { setActiveSection(sec.id); navigate(sec.to) }}
                className={`group flex flex-col items-center gap-1 rounded-xl px-1 py-2 w-14 transition-all ${
                  isActive ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isActive ? '' : 'text-[#676879] group-hover:text-[#171d39]'
                  }`}
                  style={isActive ? { color: sec.color } : {}}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span
                  className={`text-[10px] font-semibold leading-none transition-colors ${
                    isActive ? '' : 'text-[#9aaac8] group-hover:text-[#676879]'
                  }`}
                  style={isActive ? { color: sec.color } : {}}
                >
                  {sec.label}
                </span>
              </button>
            )
          })}

          {/* Sign out at very bottom */}
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="mt-auto flex flex-col items-center gap-1 rounded-xl px-1 py-2 w-14 text-[#9aaac8] transition hover:bg-white/70 hover:text-red-400"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              </svg>
            </span>
            <span className="text-[10px] font-semibold leading-none">Sign out</span>
          </button>
        </nav>

        {/* ── Main content card ─────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden p-3">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[#e0e2e9] bg-white shadow-sm">

            {/* Inner top bar: workspace info + trial */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#f0f1f7] px-5 py-2.5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9aaac8]">Practice workspace</p>
                <p className="text-xs text-[#687699]">
                  Trial: <b className="text-[#171d39]">{daysLeft}</b> day{daysLeft === 1 ? '' : 's'} left
                </p>
              </div>
              <span className="rounded-full border border-[#e0e2e9] bg-[#f6f7fb] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687699]">
                {roleLabel(user.role)}
              </span>
            </div>

            {/* Section sub-nav tabs */}
            {activeSection && subItems.length > 0 && (
              <div className="flex shrink-0 items-center gap-1 border-b border-[#f0f1f7] px-5">
                <span
                  className="mr-2 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                  style={{ backgroundColor: activeMeta?.color ?? '#2f54eb' }}
                >
                  {activeMeta?.label}
                </span>
                <span className="mr-1 h-4 w-px bg-[#e0e2e9]" />
                <nav aria-label={`${activeMeta?.label} tabs`} className="flex items-end gap-0.5 overflow-x-auto">
                  {subItems.map(item => (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      end={item.end ?? true}
                      className={({ isActive }) =>
                        `relative shrink-0 px-3.5 pb-2.5 pt-2 text-[13px] font-semibold transition-colors ${
                          isActive ? 'text-[#171d39]' : 'text-[#9aaac8] hover:text-[#676879]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {item.label}
                          {isActive && (
                            <span
                              className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full"
                              style={{ backgroundColor: activeMeta?.color ?? '#2f54eb' }}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            )}

            {/* Page content — scrollable */}
            <main className="flex-1 overflow-y-auto px-5 py-5">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Boot screen ───────────────────────────────────────────────────────── */
function BootScreen({ progress, label, detail }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f6f7fb] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center">
          <Logo className="h-12 w-12 animate-pulse-soft" />
        </div>
        <h1 className="text-[22px] font-bold text-[#171d39]">{label}</h1>
        {detail && <p className="mt-1 text-sm text-[#687699]">{detail}</p>}
        <div className="mx-auto mt-6 h-2.5 overflow-hidden rounded-full bg-[#e0e2e9]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#53e4d4_0%,#2ec4b6_55%,#1d2448_100%)] transition-[width] duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 font-mono text-xs text-[#9aaac8]">{progress}%</p>
      </div>
    </div>
  )
}
