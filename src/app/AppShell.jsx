import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/auth/AuthContext'
import { Logo } from '../shared/ui/Logo'
import { enabledModuleIds, navForRole, permissionsFor, roleLabel, serviceAllowed } from '../shared/security/roles'
import { workspace, WORKSPACE_CHANGED } from '../features/workspace/workspaceApi'
import UiIcon from '../shared/ui/Icon'
import PricingModal from '../features/dashboard/PricingModal'
import GlobalSearch from '../features/crm/GlobalSearch'

/* ─── Icons ─────────────────────────────────────────────────────────────── */
function IconDiamond({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h12l4 5.5L12 21 2 9.5 6 4z" />
      <path d="M2 9.5h20" />
      <path d="M10 4l-2.5 5.5L12 21l4.5-11.5L14 4" />
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

function IconApps({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><path d="M17 13.5v7M13.5 17h7" />
    </svg>
  )
}
function IconPlus({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/* ─── Section definitions ───────────────────────────────────────────────── */
const MAIN_SECTIONS = [
  { id: 'dashboard', label: 'Home', icon: IconHome, to: '/app', color: '#007f9b' },
  { id: 'ops', label: 'Operations', icon: IconOps, to: '/app/providers', color: '#007f9b', module: 'ops' },
  { id: 'crm', label: 'CRM', icon: IconCRM, to: '/app/crm', color: '#007f9b', module: 'crm' },
  { id: 'mkt', label: 'Marketing', icon: IconMarketing, to: '/app/provider-leads', color: '#007f9b', module: 'mkt' },
  { id: 'tc', label: 'Time Clock', icon: IconClock, to: '/app/timeclock', color: '#007f9b', module: 'tc' },
]

/*
 * Always-on tools — every practice gets these, whatever modules were picked.
 * Users choose which ones sit on the rail (Customize menu); the rest live under "More".
 */
const CORE_TOOLS = [
  { id: 'my-work', label: 'My work', icon: 'checkSquare', to: '/app/my-work', hint: 'Your tasks across every module' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', to: '/app/calendar', hint: 'Team events and appointments' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', to: '/app/inbox', hint: 'Team email linked to records' },
  { id: 'notes', label: 'Notes', icon: 'note', to: '/app/notes', hint: 'Private or shared notes' },
  { id: 'board', label: 'Team board', icon: 'board', to: '/app/board', hint: 'Announcements and updates' },
  { id: 'team', label: 'Team', icon: 'users', to: '/app/team', hint: 'People in your practice' },
  { id: 'modules', label: 'Apps', icon: 'apps', to: '/app/modules', hint: 'Add or remove modules' },
  { id: 'setup', label: 'Setup', icon: 'settings', to: '/app/setup', hint: 'Practice profile and settings' },
]
const CORE_BY_ID = Object.fromEntries(CORE_TOOLS.map(t => [t.id, t]))
const DEFAULT_PINNED = ['my-work', 'calendar', 'notes', 'board']

/* Page titles used by Favorites */
const PAGE_LABELS = {
  '/app': 'Home',
  ...Object.fromEntries(CORE_TOOLS.map(t => [t.to, t.label === 'Apps' ? 'Apps & modules' : t.label])),
}

function readPref(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function writePref(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* preferences are optional */ }
}

const SECTION_TITLE_MAP = {
  dashboard: ['Dashboard'],
  ops: ['Operations'],
  crm: ['CRM'],
  mkt: ['Marketing & outreach'],
  tc: ['Time clock'],
}

/* ─── AppShell ──────────────────────────────────────────────────────────── */
export default function AppShell() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [booting, setBooting] = useState(() => Boolean(location.state?.bootDashboard))
  const [bootProgress, setBootProgress] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [summary, setSummary] = useState(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [favOpen, setFavOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [pinned, setPinned] = useState(DEFAULT_PINNED)
  const [favorites, setFavorites] = useState([])

  const profileRef = useRef(null)
  const notifRef = useRef(null)
  const createRef = useRef(null)
  const moreRef = useRef(null)
  const favRef = useRef(null)

  /* Per-user rail preferences (which tools are pinned, favorite pages) */
  const prefKey = user?.userId ? `utessa.rail.${user.userId}` : null
  useEffect(() => {
    if (!prefKey) return
    setPinned(readPref(`${prefKey}.pinned`, DEFAULT_PINNED).filter(id => CORE_BY_ID[id]))
    setFavorites(readPref(`${prefKey}.favorites`, []))
  }, [prefKey])
  function savePinned(next) {
    setPinned(next)
    if (prefKey) writePref(`${prefKey}.pinned`, next)
  }
  function saveFavorites(next) {
    setFavorites(next)
    if (prefKey) writePref(`${prefKey}.favorites`, next)
  }

  /* Outside-click closes dropdowns */
  useEffect(() => {
    function h(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (createRef.current && !createRef.current.contains(e.target)) setCreateOpen(false)
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
      if (favRef.current && !favRef.current.contains(e.target)) setFavOpen(false)
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
    if (p === '/app' || p === '/app/') { setActiveSection('dashboard'); return }
    const tool = CORE_TOOLS.find(t => p.startsWith(t.to))
    if (tool) { setActiveSection(tool.id); return }
    if (['/app/providers', '/app/staff', '/app/vendors', '/app/document-vault',
      '/app/resources', '/app/training', '/app/inventory', '/app/operations'].some(x => p.startsWith(x))) { setActiveSection('ops'); return }
    if (p.startsWith('/app/crm') || p.startsWith('/app/no-shows')) { setActiveSection('crm'); return }
    if (['/app/provider-leads', '/app/cms-search', '/app/email-campaigns',
      '/app/social', '/app/agents', '/app/marketing'].some(x => p.startsWith(x))) { setActiveSection('mkt'); return }
    if (p.startsWith('/app/timeclock')) { setActiveSection('tc'); return }
  }, [location.pathname])

  /* Close rail popovers on navigation */
  useEffect(() => { setMoreOpen(false); setFavOpen(false) }, [location.pathname])

  /* Workspace counters for real notifications */
  const loadSummary = useCallback(async () => {
    try {
      setSummary(await workspace.summary())
    } catch {
      /* notifications are optional */
    }
  }, [])
  useEffect(() => {
    if (!isAuthenticated || user?.superAdmin || !user?.onboardingDone) return undefined
    loadSummary()
    const onChange = () => loadSummary()
    window.addEventListener(WORKSPACE_CHANGED, onChange)
    return () => window.removeEventListener(WORKSPACE_CHANGED, onChange)
  }, [isAuthenticated, user?.superAdmin, user?.onboardingDone, loadSummary])

  const sections = useMemo(() => navForRole(user?.role, user?.enabledServices), [user?.role, user?.enabledServices])
  const enabledIds = enabledModuleIds(user?.enabledServices)
  /* Rail shows Home + only the modules this practice picked (and the role can open) */
  const railSections = MAIN_SECTIONS.filter(sec => {
    if (!sec.module) return true
    if (!enabledIds.includes(sec.module)) return false
    const title = SECTION_TITLE_MAP[sec.id]?.[0]
    return sections.some(s => s.title === title && s.items.length > 0)
  })
  const canSearchCrm = permissionsFor(user?.role).has('patients') && serviceAllowed(user?.enabledServices, 'patients')

  const activeSubItems = useMemo(() => {
    if (!activeSection) return []
    const titles = SECTION_TITLE_MAP[activeSection] || []
    return sections
      .filter(s => titles.some(t => s.title.toLowerCase() === t.toLowerCase()))
      .flatMap(s => s.items)
  }, [activeSection, sections])

  const pinnedTools = pinned.map(id => CORE_BY_ID[id]).filter(Boolean)
  const moreTools = CORE_TOOLS.filter(t => !pinned.includes(t.id))
  const activeTool = CORE_BY_ID[activeSection]
  const moreActive = !!activeTool && !pinned.includes(activeTool.id)
  const crmItems = sections.find(sec => sec.title === 'CRM')?.items.map(item => ({
    ...item,
    end: item.to === '/app/crm' || !['/app/crm/patients', '/app/crm/opportunities'].includes(item.to),
  })) ?? []
  const subItems = activeSection === 'crm' ? crmItems : activeSubItems
  const activeMeta = MAIN_SECTIONS.find(s => s.id === activeSection)

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

  const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt) : null
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - Date.now()) / 86400000)) : 0
  const initials = user.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  const notifications = buildNotifications(summary)
  const myWorkBadge = summary ? (summary.overdue || 0) + (summary.dueToday || 0) : 0

  /* Favorites — star any page to keep it one click away */
  const currentPath = location.pathname
  const isFavorite = favorites.some(f => f.to === currentPath)
  function currentPageLabel() {
    if (PAGE_LABELS[currentPath]) return PAGE_LABELS[currentPath]
    const item = sections.flatMap(sec => sec.items).filter(i => currentPath === i.to || currentPath.startsWith(`${i.to}/`))
      .sort((a, b) => b.to.length - a.to.length)[0]
    const heading = document.querySelector('main h1')?.textContent?.trim()
    return heading || item?.label || 'Page'
  }
  function toggleFavorite() {
    if (isFavorite) saveFavorites(favorites.filter(f => f.to !== currentPath))
    else saveFavorites([...favorites, { to: currentPath, label: currentPageLabel(), section: activeMeta?.label || activeTool?.label || 'Workspace' }].slice(-12))
  }
  const createActions = [
    { label: 'Task', to: '/app/my-work?new=1' },
    { label: 'Calendar event', to: '/app/calendar?new=1' },
    { label: 'Note', to: '/app/notes?new=1' },
    { label: 'Team post', to: '/app/board?new=1' },
    ...(canSearchCrm ? [{ label: 'Patient lead', to: '/app/crm/leads?new=1' }] : []),
  ]

  return (
    /* Page shell — gray canvas */
    <div className="flex h-screen flex-col overflow-hidden bg-[#f6f7fb] text-[#171d39]">

      {/* ══════════════════════════════════════════════════════════════════
          TOP NAVBAR  (matches Monday CRM header)
      ══════════════════════════════════════════════════════════════════ */}
      <header className="flex h-[56px] flex-none items-center gap-3 bg-[#f6f7fb] px-4">

        {/* Left: Logo + wordmark */}
        <div className="flex shrink-0 items-center gap-2.5 pr-3">
          <Logo className="h-9 w-9 flex-none" />
          <span className="text-[19px] font-bold tracking-[-0.01em] text-[#1B1F4B]">
            <b className="font-extrabold text-[#3BC4CA]">U</b>tessa
          </span>
        </div>

        {/* Center: Global search (patients, leads, opportunities, partners) */}
        <GlobalSearch enabled={canSearchCrm} />

        {/* Right: icon actions + avatar */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Quick create */}
          <div className="relative" ref={createRef}>
            <button
              type="button"
              onClick={() => { setCreateOpen(o => !o); setNotifOpen(false); setProfileOpen(false) }}
              className="flex h-[30px] items-center gap-1 rounded-[5px] bg-[#007f9b] px-2.5 text-[13px] font-normal text-white transition hover:bg-[#006a82]"
            >
              <IconPlus className="h-4 w-4" />
              New
            </button>
            {createOpen && (
              <div className="absolute right-0 top-10 z-50 w-52 rounded-2xl border border-[#e0e2e9] bg-white py-1 shadow-xl">
                {createActions.map(a => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => { setCreateOpen(false); navigate(a.to) }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[#171d39] hover:bg-[#f6f7fb]"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* See plans button */}
          <button
            type="button"
            onClick={() => setPricingOpen(true)}
            className="mr-1 flex h-[30px] items-center gap-1.5 rounded-[5px] border border-[#007f9b] bg-transparent px-2.5 text-[13px] font-normal text-[#007f9b] transition hover:bg-[#007f9b]/8"
          >
            <IconDiamond className="h-4 w-4" />
            See plans
          </button>

          {/* Bell */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); setCreateOpen(false); loadSummary() }}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#676879] transition hover:bg-[#ecedf5]"
              aria-label="Notifications"
            >
              <IconBell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-[#f6f7fb] bg-red-500" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-[#e0e2e9] bg-white shadow-xl">
                <div className="border-b border-[#f0f1f7] px-4 py-3">
                  <p className="text-sm font-bold text-[#171d39]">Notifications</p>
                </div>
                <ul className="divide-y divide-[#f0f1f7]">
                  {notifications.map(n => (
                    <li key={n.id}>
                      <Link to={n.to} onClick={() => setNotifOpen(false)} className="flex items-start gap-3 px-4 py-3 no-underline hover:bg-[#f6f7fb]">
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.urgent ? 'bg-red-500' : 'bg-[#2f54eb]'}`} />
                        <div>
                          <p className="text-xs font-semibold text-[#171d39]">{n.title}</p>
                          <p className="text-[11px] text-[#9aaac8]">{n.time}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                  {!notifications.length && (
                    <li className="px-4 py-4 text-center text-xs text-[#9aaac8]">You&apos;re all caught up.</li>
                  )}
                </ul>
                <div className="px-4 py-2.5">
                  <Link to="/app/my-work" onClick={() => setNotifOpen(false)} className="block w-full text-center text-xs font-semibold text-[#2f54eb] hover:underline">
                    View my work
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Inbox */}
          <button
            type="button"
            onClick={() => navigate('/app/inbox')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#676879] transition hover:bg-[#ecedf5]"
            aria-label="Inbox"
            title="Inbox"
          >
            <UiIcon name="inbox" className="h-5 w-5" />
          </button>

          {/* Team */}
          <button
            type="button"
            onClick={() => navigate('/app/team')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#676879] transition hover:bg-[#ecedf5]"
            aria-label="Team"
            title="Team"
          >
            <UiIcon name="userPlus" className="h-5 w-5" />
          </button>

          {/* Apps & modules */}
          <button
            type="button"
            onClick={() => navigate('/app/modules')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#676879] transition hover:bg-[#ecedf5]"
            aria-label="Apps and modules"
            title="Apps & modules"
          >
            <IconApps className="h-5 w-5" />
          </button>

          {/* Help */}
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#676879] transition hover:bg-[#ecedf5]" aria-label="Help">
            <IconHelp className="h-5 w-5" />
          </button>

          {/* Profile avatar */}
          <div className="relative ml-1" ref={profileRef}>
            <button
              type="button"
              onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); setCreateOpen(false) }}
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
                  {[{ label: 'Team', to: '/app/team' }, { label: 'Apps & modules', to: '/app/modules' }, { label: 'Settings', to: '/app/setup' }].map(item => (
                    <li key={item.label}>
                      <button type="button" onClick={() => { setProfileOpen(false); navigate(item.to) }} className="w-full px-4 py-2.5 text-left text-sm text-[#171d39] hover:bg-[#f6f7fb]">
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
          className="hide-scrollbar flex w-[84px] flex-none flex-col items-center gap-1.5 overflow-y-auto bg-[#f6f7fb] py-3"
        >
          {/* Home + only the modules this practice picked */}
          <div className="flex w-full flex-col items-center gap-1.5">
            {railSections.map(sec => {
              const Icon = sec.icon
              const isActive = activeSection === sec.id
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => { setActiveSection(sec.id); navigate(sec.to) }}
                  className={`group flex w-[68px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 transition-all ${isActive ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                    }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isActive ? 'text-[#007f9b]' : 'text-[#676879] group-hover:text-[#171d39]'
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-[#007f9b]' : 'text-[#9aaac8] group-hover:text-[#676879]'
                      }`}
                  >
                    {sec.label}
                  </span>
                </button>
              )
            })}
          </div>

          <span className="my-1 h-px w-10 shrink-0 bg-[#e0e2e9]" />

          {/* Always-on tools the user pinned (Customize menu) */}
          <div className="flex w-full flex-col items-center gap-1.5">
            {pinnedTools.map(tool => (
              <RailButton
                key={tool.id}
                icon={tool.icon}
                label={tool.label}
                active={activeSection === tool.id}
                badge={tool.id === 'my-work' ? myWorkBadge : 0}
                onClick={() => navigate(tool.to)}
              />
            ))}

            {/* Favorites */}
            <div className="relative" ref={favRef}>
              <RailButton icon="star" label="Favorites" active={favOpen} onClick={() => { setFavOpen(o => !o); setMoreOpen(false) }} />
              {favOpen && (
                <RailPopover title="Favorites">
                  {favorites.length ? favorites.map(f => (
                    <div key={f.to} className="group/fav flex items-center rounded-lg hover:bg-[#f6f7fb]">
                      <button type="button" onClick={() => navigate(f.to)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left">
                        <UiIcon name="star" className="h-4 w-4 text-[#f5a524]" fill="#f5a524" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-[#171d39]">{f.label}</span>
                          <span className="block truncate text-[11px] text-[#9aaac8]">{f.section}</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => saveFavorites(favorites.filter(x => x.to !== f.to))} className="mr-1 rounded-md p-1.5 text-[#9aaac8] opacity-0 hover:bg-white hover:text-[#171d39] group-hover/fav:opacity-100" aria-label={`Remove ${f.label} from favorites`}>
                        <UiIcon name="x" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )) : (
                    <p className="px-3 py-4 text-center text-[13px] leading-relaxed text-[#687699]">
                      No favorites yet.<br />Click the <UiIcon name="star" className="inline h-3.5 w-3.5 align-[-2px]" /> on any page to add it here.
                    </p>
                  )}
                </RailPopover>
              )}
            </div>

            {/* More */}
            <div className="relative" ref={moreRef}>
              <RailButton icon="more" label="More" active={moreOpen || moreActive} onClick={() => { setMoreOpen(o => !o); setFavOpen(false) }} />
              {moreOpen && (
                <RailPopover>
                  {moreTools.map(tool => (
                    <button key={tool.id} type="button" onClick={() => navigate(tool.to)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f6f7fb] ${activeSection === tool.id ? 'bg-[#f6f7fb]' : ''}`}>
                      <UiIcon name={tool.icon} className="h-[18px] w-[18px] text-[#676879]" />
                      <span className="text-sm text-[#171d39]">{tool.id === 'modules' ? 'Apps & modules' : tool.label}</span>
                    </button>
                  ))}
                  {moreTools.length > 0 && <div className="my-1.5 h-px bg-[#e0e2e9]" />}
                  <button type="button" onClick={() => { setMoreOpen(false); setCustomizeOpen(true) }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#f6f7fb]">
                    <UiIcon name="settings" className="h-[18px] w-[18px] text-[#676879]" />
                    <span className="text-sm text-[#171d39]">Customize menu</span>
                  </button>
                </RailPopover>
              )}
            </div>
          </div>
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
              <button
                type="button"
                onClick={toggleFavorite}
                title={isFavorite ? 'Remove from favorites' : 'Add this page to favorites'}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition ${isFavorite ? 'border-[#f5d18a] bg-[#fff8e8] text-[#a8741e]' : 'border-[#e0e2e9] text-[#676879] hover:bg-[#f6f7fb]'}`}
              >
                <UiIcon name="star" className="h-4 w-4" fill={isFavorite ? '#f5a524' : 'none'} />
                {isFavorite ? 'Favorited' : 'Favorite'}
              </button>
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
                <nav aria-label={`${activeMeta?.label} tabs`} className="hide-scrollbar flex items-end gap-0.5 overflow-x-auto">
                  {subItems.map(item => (
                    <NavLink
                      key={item.id}
                      to={item.to}
                      end={item.end ?? true}
                      className={({ isActive }) =>
                        `relative shrink-0 px-3.5 pb-2.5 pt-2 text-[13px] font-semibold transition-colors ${isActive ? 'text-[#171d39]' : 'text-[#9aaac8] hover:text-[#676879]'
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

      {customizeOpen && (
        <CustomizeMenu
          pinned={pinned}
          onClose={() => setCustomizeOpen(false)}
          onSave={(next) => { savePinned(next); setCustomizeOpen(false) }}
        />
      )}

      {/* Pricing & Upgrade Plan Modal */}
      <PricingModal
        isOpen={pricingOpen}
        onClose={() => setPricingOpen(false)}
        defaultSizeBand={user?.teamSizeBand ? Number(user.teamSizeBand) : undefined}
      />
    </div>
  )
}

/* ─── Rail building blocks ──────────────────────────────────────────────── */
function RailButton({ icon, label, active, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-[68px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 transition-all ${active ? 'bg-white shadow-sm' : 'hover:bg-white/70'}`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${active ? 'text-[#007f9b]' : 'text-[#676879] group-hover:text-[#171d39]'}`}>
        <UiIcon name={icon} className="h-5 w-5" />
      </span>
      <span className={`text-[10px] font-semibold leading-none transition-colors ${active ? 'text-[#007f9b]' : 'text-[#9aaac8] group-hover:text-[#676879]'}`}>
        {label}
      </span>
      {badge > 0 && (
        <span className="absolute right-2.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9.5px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

/* Flyout beside the rail button; opens upward when there isn't room below (like monday's More menu). */
function RailPopover({ title, children }) {
  const ref = useRef(null)
  const [top, setTop] = useState(null)
  useLayoutEffect(() => {
    const el = ref.current
    const anchor = el?.parentElement?.getBoundingClientRect()
    if (!el || !anchor) return
    const height = el.offsetHeight
    const below = anchor.top
    setTop(below + height > window.innerHeight - 12 ? Math.max(12, anchor.bottom - height) : below)
  }, [children])
  return (
    <div
      ref={ref}
      style={{ top: top ?? 0, visibility: top == null ? 'hidden' : 'visible' }}
      className="fixed left-[86px] z-50 w-64 rounded-2xl border border-[#e0e2e9] bg-white p-1.5 shadow-xl"
    >
      {title && <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9aaac8]">{title}</p>}
      {children}
    </div>
  )
}

function CustomizeMenu({ pinned, onClose, onSave }) {
  const [draft, setDraft] = useState(pinned)
  const toggle = (id) => setDraft(d => (d.includes(id) ? d.filter(x => x !== id) : [...d, id]))
  const move = (id, dir) => setDraft(d => {
    const i = d.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= d.length) return d
    const next = [...d]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#151940]/40 px-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-[#f0f1f7] px-5 py-4">
          <h2 className="m-0 text-lg font-bold text-[#171d39]">Customize menu</h2>
          <p className="m-0 mt-0.5 text-[13px] text-[#687699]">Choose which tools sit on your left menu. The rest stay under More. Your modules always show.</p>
        </div>
        <ul className="m-0 max-h-[60vh] list-none overflow-y-auto p-2">
          {[...draft.map(id => CORE_BY_ID[id]).filter(Boolean), ...CORE_TOOLS.filter(t => !draft.includes(t.id))].map(tool => {
            const on = draft.includes(tool.id)
            const idx = draft.indexOf(tool.id)
            return (
              <li key={tool.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#f6f7fb]">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${on ? 'bg-[#e6f4f7] text-[#007f9b]' : 'bg-[#f1f2f7] text-[#9aaac8]'}`}>
                  <UiIcon name={tool.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#171d39]">{tool.id === 'modules' ? 'Apps & modules' : tool.label}</span>
                  <span className="block text-[12px] text-[#9aaac8]">{tool.hint}</span>
                </span>
                {on && (
                  <span className="flex">
                    <button type="button" onClick={() => move(tool.id, -1)} disabled={idx === 0} className="rounded-md p-1 text-[#9aaac8] hover:bg-white hover:text-[#171d39] disabled:opacity-30" aria-label={`Move ${tool.label} up`}>
                      <UiIcon name="chevronUp" className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(tool.id, 1)} disabled={idx === draft.length - 1} className="rounded-md p-1 text-[#9aaac8] hover:bg-white hover:text-[#171d39] disabled:opacity-30" aria-label={`Move ${tool.label} down`}>
                      <UiIcon name="chevronDown" className="h-4 w-4" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`Show ${tool.label} on the menu`}
                  onClick={() => toggle(tool.id)}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-[#007f9b]' : 'bg-[#d5d8e4]'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-[#f0f1f7] px-5 py-3">
          <button type="button" onClick={() => setDraft(DEFAULT_PINNED)} className="text-[13px] font-semibold text-[#687699] hover:text-[#171d39]">Reset to default</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-[#d5d8e4] px-4 py-2 text-sm font-semibold text-[#171d39] hover:bg-[#f6f7fb]">Cancel</button>
            <button type="button" onClick={() => onSave(draft)} className="rounded-lg bg-[#007f9b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006a82]">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Notifications (built from the workspace summary) ─────────────────── */
function buildNotifications(summary) {
  if (!summary) return []
  const list = []
  if (summary.overdue > 0) {
    list.push({ id: 'overdue', urgent: true, title: `${summary.overdue} overdue task${summary.overdue === 1 ? '' : 's'}`, time: 'My work', to: '/app/my-work' })
  }
  if (summary.dueToday > 0) {
    list.push({ id: 'today', title: `${summary.dueToday} task${summary.dueToday === 1 ? '' : 's'} due today`, time: 'My work', to: '/app/my-work' })
  }
  ;(summary.upcomingEvents || []).slice(0, 3).forEach((e) => {
    list.push({
      id: `e-${e.id}`,
      title: e.title,
      time: new Date(e.startsAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      to: '/app/calendar',
    })
  })
  ;(summary.announcements || []).slice(0, 2).forEach((a) => {
    list.push({ id: `a-${a.id}`, urgent: a.category === 'URGENT', title: a.title, time: `Team board · ${a.authorName || 'Team'}`, to: '/app/board' })
  })
  return list
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
