import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, matchPath, useLocation, useNavigate } from 'react-router-dom'
import UiIcon from '../shared/ui/Icon'
import { crm } from '../features/crm/crmApi'

/*
 * Module navigation.
 *   Top bar: module switcher · breadcrumb (group › page) · trial card · save shortcut
 *   Left sidebar (desktop): every page group as a collapsible folder, with live counts
 *   Small screens: a "Pages" menu in the top bar instead of the sidebar
 * Every page stays reachable — pages are only grouped, never hidden.
 */

/** Page groups per module. Pages not listed here fall into a trailing "More" group. */
const MODULE_GROUPS = {
  crm: [
    { id: 'pipeline', label: 'Pipeline', items: ['crm-dashboard', 'crm-leads', 'crm-patients', 'crm-opportunities', 'crm-referrals'] },
    { id: 'care', label: 'Patient care', items: ['crm-call-desk', 'crm-phone', 'crm-appointments', 'crm-tasks', 'crm-recalls'] },
    { id: 'insights', label: 'Insights', items: ['crm-call-analytics', 'crm-targets'] },
    { id: 'setup', label: 'Setup', items: ['crm-integrations'] },
  ],
  ops: [
    { id: 'providers', label: 'Providers', items: ['creds', 'creds-compliance', 'creds-payers', 'creds-privileges', 'creds-trackers'] },
    { id: 'people', label: 'Staff', items: ['staff', 'staff-onboarding', 'staff-import', 'training'] },
    { id: 'compliance', label: 'Vendors & compliance', items: ['vendors', 'vendor-invoices', 'vendor-specialties', 'docvault'] },
    { id: 'resources', label: 'Resources', items: ['resources', 'inventory'] },
  ],
  mkt: [
    { id: 'prospecting', label: 'Prospecting', items: ['leads', 'cms'] },
    { id: 'campaigns', label: 'Campaigns', items: ['email', 'social'] },
    { id: 'automation', label: 'Automation', items: ['agents'] },
  ],
  tc: [
    { id: 'mytime', label: 'My time', items: ['timeclock', 'tc-timesheet', 'tc-timeoff'] },
    { id: 'team', label: 'Team', items: ['tc-team', 'tc-approvals'] },
    { id: 'payroll', label: 'Payroll', items: ['tc-payroll', 'tc-settings'] },
  ],
}

/** Icon + one-line description shown in the group menus. */
const PAGE_META = {
  'crm-dashboard': ['grid', 'Pipeline health at a glance'],
  'crm-leads': ['userPlus', 'New inquiries to work and book'],
  'crm-patients': ['users', 'Everyone under your care'],
  'crm-opportunities': ['chart', 'Treatment plans and their value'],
  'crm-referrals': ['link', 'Referrals in and out, with partners'],
  'crm-call-desk': ['phoneIn', 'Answer calls with caller lookup'],
  'crm-phone': ['phone', 'Voicemail, texts and faxes'],
  'crm-appointments': ['calendar', 'Visits scheduled and upcoming'],
  'crm-tasks': ['checkSquare', 'Follow-ups and call-backs'],
  'crm-recalls': ['refresh', 'Recover missed and cancelled visits'],
  'crm-call-analytics': ['pulse', 'Call volume, outcomes and peaks'],
  'crm-targets': ['sparkles', 'Goals and quotas by person'],
  'crm-integrations': ['apps', 'Phone system and EHR connections'],
  creds: ['stethoscope', 'Licenses, DEA and credentials'],
  'creds-compliance': ['shield', 'Open compliance items for every provider'],
  'creds-payers': ['creditCard', 'Payer enrollment and re-credentialing'],
  'creds-privileges': ['building', 'Facility appointments and reappointment'],
  'creds-trackers': ['checkSquare', 'CME, education, malpractice, contracts'],
  'staff-onboarding': ['list', 'New-hire checklists and evaluations'],
  'staff-import': ['upload', 'Add staff from a spreadsheet'],
  'vendor-invoices': ['creditCard', 'Unpaid, overdue and paid invoices'],
  'vendor-specialties': ['grid', 'Vendor folders and intake by specialty'],
  staff: ['users', 'Team records and onboarding'],
  training: ['checkSquare', 'Required training and progress'],
  vendors: ['building', 'Vendors and BAA status'],
  docvault: ['note', 'Contracts, policies and files'],
  resources: ['list', 'Shared SOPs and templates'],
  inventory: ['grid', 'Supplies and reorder levels'],
  leads: ['userPlus', 'Referral-partner outreach pipeline'],
  cms: ['search', 'Find providers in CMS data'],
  email: ['mail', 'Email campaigns and results'],
  social: ['message', 'Plan and publish social posts'],
  agents: ['sparkles', 'Automated outreach helpers'],
  timeclock: ['clock', 'Clock in and out, breaks'],
  'tc-timesheet': ['list', 'Your hours this pay period'],
  'tc-timeoff': ['calendar', 'Request and track time off'],
  'tc-team': ['users', 'Who is clocked in right now'],
  'tc-approvals': ['checkSquare', 'Review and approve timesheets'],
  'tc-payroll': ['download', 'Hours per person, CSV for payroll'],
  'tc-settings': ['settings', 'Pay period, overtime and rounding'],
}

/* ── Live counts (CRM) ─────────────────────────────────────────────────── */
function useCrmCounts(enabled, pathname) {
  const [counts, setCounts] = useState({})
  const last = useRef(0)
  useEffect(() => {
    if (!enabled) return
    // Refresh at most every 20s while moving between CRM pages. The result is always applied
    // (no cancel-on-cleanup), so React's dev double-run can't drop the only request.
    if (Date.now() - last.current < 20000) return
    last.current = Date.now()
    crm.dashboard()
      .then((d) => {
        const k = d?.kpis || {}
        setCounts({
          'crm-leads': { n: k.openLeads },
          'crm-referrals': { n: k.openReferrals },
          'crm-appointments': { n: k.appointmentsToday, hint: 'today' },
          'crm-tasks': k.tasksOverdue ? { n: k.tasksOverdue, danger: true, hint: 'overdue' } : { n: k.tasksDueToday, hint: 'due today' },
        })
      })
      .catch(() => { last.current = 0 })
  }, [enabled, pathname])
  return counts
}

function Count({ c, active }) {
  if (!c?.n) return null
  const tone = c.danger ? 'bg-danger-100 text-danger-700' : active ? 'bg-brand-100 text-brand-800' : 'bg-mist-100 text-mist-700'
  return <span className={`rounded-md px-1.5 py-px text-[11px] font-semibold leading-4 ${tone}`}>{c.n}</span>
}

/* ── Trial card (shared with the plain section bar) ────────────────────── */
export function TrialCard({ daysLeft, total = 14, onUpgrade }) {
  const pct = Math.min(100, Math.max(6, Math.round((daysLeft / Math.max(1, total)) * 100)))
  const urgent = daysLeft <= 3
  return (
    <div className={`hidden items-center gap-2.5 rounded-[10px] border py-1 pl-3 pr-1 md:flex ${urgent ? 'border-danger-200 bg-danger-50' : 'border-sun-200 bg-sun-50'}`}>
      <span className={`whitespace-nowrap text-[12.5px] ${urgent ? 'text-danger-700' : 'text-sun-700'}`}>
        <b className="font-semibold">{daysLeft} day{daysLeft === 1 ? '' : 's'}</b> left
      </span>
      <span className={`h-1 w-11 overflow-hidden rounded-sm ${urgent ? 'bg-danger-100' : 'bg-sun-100'}`} aria-hidden="true">
        <span className={`block h-full rounded-sm ${urgent ? 'bg-danger-500' : 'bg-sun-400'}`} style={{ width: `${pct}%` }} />
      </span>
      <button type="button" onClick={onUpgrade} className="rounded-md bg-brand-600 px-2.5 py-1 text-[12px] font-semibold text-white transition-colors hover:bg-brand-700">
        Upgrade
      </button>
    </div>
  )
}

export function SaveShortcutButton({ saved, onToggle, sectionLabel }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-section-label={sectionLabel}
      title={saved ? 'Remove from your shortcuts' : 'Save this page to your shortcuts'}
      aria-label={saved ? 'Saved to shortcuts' : 'Save shortcut'}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
        saved ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-mist-200 bg-white text-mist-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700'
      }`}
    >
      <UiIcon name="bookmark" className="h-4 w-4" fill={saved ? '#1E8E94' : 'none'} />
    </button>
  )
}

/* ── Module header (top-left) ──────────────────────────────────────────── */
/** One line under each module name. */
const MODULE_DESC = {
  crm: 'Patients, leads and referrals',
  ops: 'Providers, staff and vendors',
  mkt: 'Outreach and campaigns',
  tc: 'Hours, timesheets and payroll',
}

/** Module mark: the module logo on a white tile. */
function ModuleMark({ module, size = 'md' }) {
  const Glyph = module.icon
  const box = size === 'sm' ? 'h-8 w-8 rounded-[8px]' : 'h-10 w-10 rounded-[10px]'
  return (
    <span className={`flex shrink-0 items-center justify-center border border-mist-200 bg-white shadow-[0_1px_2px_rgba(17,20,58,0.06)] ${box}`} style={{ color: module.color }}>
      {Glyph ? <Glyph className={size === 'sm' ? 'h-5 w-5' : 'h-[26px] w-[26px]'} /> : <span className="h-3 w-3 rounded-[4px]" style={{ backgroundColor: module.color }} />}
    </span>
  )
}

/** Which module you are in, with a live status line. Modules are switched from the left rail. */
function ModuleHeader({ current, full, alerts, pageCount }) {
  const status = alerts > 0
    ? <span className="font-semibold text-danger-600">{alerts} need{alerts === 1 ? 's' : ''} attention</span>
    : <span>{MODULE_DESC[current.module] || `${pageCount} pages`}</span>
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <ModuleMark module={current} size={full ? 'md' : 'sm'} />
      <div className="min-w-0">
        <p className="m-0 truncate text-[15px] font-semibold leading-tight text-ink-950">{current.label}</p>
        {full && <p className="m-0 mt-1 hidden truncate text-[12px] leading-tight text-mist-600 md:block">{status}</p>}
      </div>
    </div>
  )
}

function ChevronsIcon({ dir = 'left', className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'M11 17l-5-5 5-5M18 17l-5-5 5-5' : 'M13 17l5-5-5-5M6 17l5-5-5-5'} />
    </svg>
  )
}

const headerBtn = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mist-500 transition-colors hover:bg-mist-50 hover:text-ink-950'

/* ── Small screens: every page in one "Pages" menu ─────────────────────── */
function PagesMenu({ groups, counts, isActivePage }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div className="relative md:hidden" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-ink-950 hover:bg-mist-50"
      >
        <UiIcon name="list" className="h-4 w-4" /> Pages
      </button>
      {open && (
        <div role="menu" className="menu-surface absolute left-0 top-11 z-50 max-h-[70vh] w-64 overflow-y-auto">
          {groups.map((g) => (
            <div key={g.id}>
              {groups.length > 1 && <p className="menu-label m-0">{g.label}</p>}
              {g.items.map((item) => {
                const [icon] = PAGE_META[item.id] || ['dot']
                const current = isActivePage(item)
                return (
                  <NavLink key={item.id} to={item.to} end={item.end ?? true} role="menuitem" onClick={() => setOpen(false)} data-current={current || undefined} className="menu-item">
                    <UiIcon name={icon} />
                    <span className="flex-1">{item.label}</span>
                    <Count c={counts[item.id]} active={current} />
                  </NavLink>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Module model: groups, current page and counts (used by the shell) ─── */
export function useModuleModel(module, items) {
  const location = useLocation()
  const counts = useCrmCounts(module?.module === 'crm', location.pathname)

  const isActivePage = useCallback(
    (item) => Boolean(matchPath({ path: item.to, end: item.end ?? true }, location.pathname)),
    [location.pathname],
  )

  /* Build groups from the pages this role can actually open */
  const groups = useMemo(() => {
    if (!module || !items?.length) return []
    const byId = Object.fromEntries(items.map((i) => [i.id, i]))
    const used = new Set()
    const defs = (MODULE_GROUPS[module.module] || [])
      .map((g) => {
        const gi = g.items.map((id) => byId[id]).filter(Boolean)
        gi.forEach((i) => used.add(i.id))
        return { ...g, items: gi }
      })
      .filter((g) => g.items.length)
    const rest = items.filter((i) => !used.has(i.id))
    if (rest.length) defs.push({ id: 'more', label: defs.length ? 'More' : module.label, items: rest })
    return defs
  }, [items, module])

  // The current page, or for detail pages (e.g. /app/vendors/:id) the closest parent page.
  const activeItem = useMemo(() => {
    const all = groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g })))
    const exact = all.find(isActivePage)
    if (exact) return { item: exact, detail: false }
    let best = null
    all.forEach((i) => { if (location.pathname.startsWith(`${i.to}/`) && (!best || i.to.length > best.to.length)) best = i })
    return best ? { item: best, detail: true } : null
  }, [groups, isActivePage, location.pathname])

  const totalPages = groups.reduce((n, g) => n + g.items.length, 0)
  const showSidebar = Boolean(module) && totalPages > 1 && Boolean(activeItem) && !activeItem.detail
  const alerts = groups.reduce((n, g) => n + g.items.reduce((m, i) => m + (counts[i.id]?.danger ? counts[i.id].n || 0 : 0), 0), 0)
  return { groups, activeItem, counts, totalPages, showSidebar, alerts, isActivePage }
}

/** Page-list collapse, remembered across visits. */
export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => readJson(COLLAPSE_KEY, false) === true)
  const toggle = useCallback(() => setCollapsed((c) => { writeJson(COLLAPSE_KEY, !c); return !c }), [])
  return [collapsed, toggle]
}

/* ── Floating module card: module header · page search · page folders ──── */
export function ModuleSidebarCard({ module, model, collapsed, onToggleCollapsed }) {
  const { groups, activeItem, counts, totalPages, alerts } = model
  return (
    <aside
      aria-label={`${module.label} pages`}
      className={`hidden min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-[var(--shadow-card)] transition-[width] duration-150 md:flex ${collapsed ? 'w-[64px]' : 'w-[230px]'}`}
    >
      <div className="shrink-0 p-2.5 pb-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <ModuleMark module={module} size="sm" />
            <button type="button" onClick={onToggleCollapsed} aria-label="Expand page list" title="Expand page list" className={headerBtn}>
              <ChevronsIcon dir="right" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-mist-200 bg-white p-2.5 shadow-[0_1px_2px_rgba(17,20,58,0.05)]">
            <ModuleHeader current={module} full alerts={alerts} pageCount={totalPages} />
            <button type="button" onClick={onToggleCollapsed} aria-label="Collapse page list" title="Collapse page list" className={headerBtn}>
              <ChevronsIcon dir="left" />
            </button>
          </div>
        )}
      </div>
      <PageSidebar
        moduleKey={module.module}
        groups={groups}
        activeGroupId={activeItem.item.group.id}
        counts={counts}
        collapsed={collapsed}
        onExpand={() => { if (collapsed) onToggleCollapsed() }}
      />
    </aside>
  )
}

/* ── Row above the page card: pages menu (phones) · breadcrumb · trial · shortcut ── */
export function ModuleTopRow({ module, model, daysLeft, trialTotal, onUpgrade, saved, onToggleSave }) {
  const { groups, activeItem, counts, totalPages, isActivePage } = model
  return (
    <div className="flex min-h-[56px] shrink-0 items-center gap-3 px-1">
      {totalPages > 1 && <PagesMenu groups={groups} counts={counts} isActivePage={isActivePage} />}
      {activeItem && (
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-[15px] sm:flex">
          {groups.length > 1 && (
            <>
              <NavLink to={activeItem.item.group.items[0].to} end className="truncate font-medium text-mist-600 no-underline hover:text-ink-950">{activeItem.item.group.label}</NavLink>
              <UiIcon name="chevronRight" className="h-4 w-4 shrink-0 text-mist-400" />
            </>
          )}
          {activeItem.detail
            ? <NavLink to={activeItem.item.to} end className="truncate font-medium text-mist-600 no-underline hover:text-ink-950">{activeItem.item.label}</NavLink>
            : <span className="truncate font-semibold text-ink-950">{activeItem.item.label}</span>}
        </nav>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <TrialCard daysLeft={daysLeft} total={trialTotal} onUpgrade={onUpgrade} />
        <SaveShortcutButton saved={saved} onToggle={onToggleSave} sectionLabel={module.label} />
      </div>
    </div>
  )
}

/* ── Left folder sidebar (desktop) ─────────────────────────────────────── */
const COLLAPSE_KEY = 'utessa.pageNav.collapsed'
const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
const writeJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
}

function PageSidebar({ moduleKey, groups, activeGroupId, counts, collapsed, onExpand }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const focusSearch = useCallback(() => {
    onExpand()
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [onExpand])
  // Press / anywhere (outside a text field) to search the pages
  useEffect(() => {
    const k = (e) => {
      const t = e.target
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      e.preventDefault()
      focusSearch()
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [focusSearch])
  const term = q.trim().toLowerCase()
  const matches = term ? groups.flatMap((g) => g.items.filter((i) => `${i.label} ${g.label} ${(PAGE_META[i.id] || [])[1] || ''}`.toLowerCase().includes(term))) : []
  const openKey = `utessa.pageNav.open.${moduleKey}`
  const [openIds, setOpenIds] = useState(() => readJson(openKey, []))
  const toggleGroup = (id, isOpen) => setOpenIds((ids) => {
    const next = isOpen ? ids.filter((x) => x !== id) : [...new Set([...ids, id])]
    writeJson(openKey, next)
    return next
  })
  const foldered = groups.length > 1

  const pageLink = (item, flat = false) => {
    const [icon, desc] = PAGE_META[item.id] || ['dot', '']
    const c = counts[item.id]
    return (
      <NavLink
        key={item.id}
        to={item.to}
        end={item.end ?? true}
        title={collapsed ? `${item.label}${desc ? ` · ${desc}` : ''}` : desc}
        className={({ isActive }) => `relative flex items-center gap-2.5 rounded-lg py-[7px] text-[13.5px] no-underline transition-colors ${
          collapsed ? 'justify-center px-0' : foldered && !flat ? 'pl-7 pr-2.5' : 'px-3'
        } ${isActive ? 'bg-brand-600 font-semibold text-white shadow-[0_4px_10px_-4px_rgba(30,142,148,0.6)]' : 'font-medium text-mist-700 hover:bg-mist-25 hover:text-ink-950'}`}
      >
        {({ isActive }) => (
          <>
            <UiIcon name={icon} className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-mist-500'}`} />
            {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
            {!collapsed && <Count c={c} active={isActive} />}
            {collapsed && c?.n ? <span className={`absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full ${c.danger ? 'bg-danger-600' : 'bg-brand-600'}`} /> : null}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <>
      <div className="shrink-0 px-2 pt-3">
        {collapsed ? (
          <button type="button" onClick={focusSearch} aria-label="Find a page" title="Find a page (/)" className="flex h-9 w-full items-center justify-center rounded-lg text-mist-500 transition-colors hover:bg-mist-25 hover:text-ink-950">
            <UiIcon name="search" className="h-4 w-4" />
          </button>
        ) : (
          <label className="flex h-9 items-center gap-2 rounded-lg border border-mist-200 bg-mist-25 px-2.5 transition-colors focus-within:border-brand-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-400/10 hover:border-mist-300">
            <UiIcon name="search" className="h-4 w-4 shrink-0 text-mist-500" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && matches[0]) { navigate(matches[0].to); setQ(''); e.currentTarget.blur() }
                if (e.key === 'Escape') { setQ(''); e.currentTarget.blur() }
              }}
              placeholder="Find a page"
              aria-label="Find a page"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink-950 outline-none placeholder:text-mist-500"
            />
            {q
              ? <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="text-mist-400 hover:text-ink-950"><UiIcon name="x" className="h-3.5 w-3.5" /></button>
              : <kbd className="rounded border border-mist-200 bg-white px-1.5 font-sans text-[11px] leading-[18px] text-mist-500">/</kbd>}
          </label>
        )}
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3 pt-2">
        {term && !collapsed && (matches.length
          ? matches.map((i) => pageLink(i, true))
          : <p className="m-0 px-3 py-3 text-[12.5px] text-mist-500">No page matches “{q.trim()}”.</p>)}
        {!term && !foldered && groups[0].items.map((i) => pageLink(i))}
        {!term && foldered && groups.map((g, gi) => {
          const isOpen = g.id === activeGroupId || openIds.includes(g.id)
          const alert = g.items.reduce((n, i) => n + (counts[i.id]?.danger ? counts[i.id].n || 0 : 0), 0)
          if (collapsed) {
            return (
              <div key={g.id} className={`flex flex-col gap-0.5 ${gi ? 'mt-1 border-t border-mist-100 pt-1' : ''}`} title={g.label}>
                {g.items.map((i) => pageLink(i))}
              </div>
            )
          }
          return (
            <div key={g.id} className={gi ? 'mt-1 border-t border-mist-100 pt-1' : ''}>
              <button
                type="button"
                aria-expanded={isOpen}
                disabled={g.id === activeGroupId}
                onClick={() => toggleGroup(g.id, isOpen)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-[7px] text-left text-[13px] font-semibold text-ink-950 transition-colors enabled:hover:bg-mist-25 disabled:cursor-default"
              >
                <UiIcon name={isOpen ? 'chevronDown' : 'chevronRight'} className="h-3 w-3 shrink-0 text-mist-400" />
                <span className="min-w-0 flex-1 truncate">{g.label}</span>
                {!isOpen && (alert > 0
                  ? <span className="rounded-md bg-danger-100 px-1.5 text-[11px] font-semibold text-danger-700">{alert}</span>
                  : <span className="text-[11.5px] font-medium text-mist-400">{g.items.length}</span>)}
              </button>
              {isOpen && <div className="flex flex-col gap-0.5">{g.items.map((i) => pageLink(i))}</div>}
            </div>
          )
        })}
      </nav>
    </>
  )
}
