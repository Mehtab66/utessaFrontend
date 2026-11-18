import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, matchPath, useLocation, useNavigate } from 'react-router-dom'
import UiIcon from '../shared/ui/Icon'
import { crm } from '../features/crm/crmApi'

/*
 * Grouped horizontal module navigation.
 *   Row 1: module switcher · page groups (hover = menu of that group) · trial card · save shortcut
 *   Row 2: pages of the active group as pills, with live counts
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
    { id: 'people', label: 'People', items: ['creds', 'staff', 'training'] },
    { id: 'compliance', label: 'Compliance', items: ['vendors', 'docvault'] },
    { id: 'resources', label: 'Resources', items: ['resources', 'inventory'] },
  ],
  mkt: [
    { id: 'prospecting', label: 'Prospecting', items: ['leads', 'cms'] },
    { id: 'campaigns', label: 'Campaigns', items: ['email', 'social'] },
    { id: 'automation', label: 'Automation', items: ['agents'] },
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
  timeclock: ['clock', 'Clock in and out, timesheets'],
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
  return <span className={`rounded-full px-1.5 py-px text-[11px] font-semibold leading-4 ${tone}`}>{c.n}</span>
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
      <span className={`h-1 w-11 overflow-hidden rounded-full ${urgent ? 'bg-danger-100' : 'bg-sun-100'}`} aria-hidden="true">
        <span className={`block h-full rounded-full ${urgent ? 'bg-danger-500' : 'bg-sun-400'}`} style={{ width: `${pct}%` }} />
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

/* ── Module switcher ───────────────────────────────────────────────────── */
function ModuleSwitcher({ current, modules }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[14px] font-semibold text-ink-950 transition-colors ${open ? 'border-mist-300 bg-mist-50' : 'border-mist-200 bg-white hover:bg-mist-50'}`}
      >
        <span className="h-3.5 w-3.5 rounded-[4px]" style={{ backgroundColor: current.color }} />
        {current.label}
        <UiIcon name="chevronDown" className={`h-3.5 w-3.5 text-mist-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-11 z-50 w-56 rounded-xl border border-mist-200 bg-white p-1.5 shadow-[0_16px_32px_-12px_rgba(17,20,58,0.22)]">
          <p className="m-0 px-2.5 pb-1 pt-1.5 text-[12px] font-semibold text-mist-600">Switch module</p>
          {modules.map((m) => {
            const isCurrent = m.id === current.id
            return (
              <button
                key={m.id}
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); navigate(m.to) }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors ${isCurrent ? 'bg-mist-50 font-semibold text-ink-950' : 'text-ink-950 hover:bg-mist-50'}`}
              >
                <span className="h-3 w-3 rounded-[4px]" style={{ backgroundColor: m.color }} />
                {m.label}
                {isCurrent && <UiIcon name="check" className="ml-auto h-4 w-4 text-brand-600" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Group button with hover menu ──────────────────────────────────────── */
function GroupTab({ group, active, counts, onSelect, isActivePage }) {
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const show = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 120) }
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 160) }
  useEffect(() => () => clearTimeout(timer.current), [])
  const alert = group.items.reduce((n, item) => n + (counts[item.id]?.danger ? counts[item.id].n || 0 : 0), 0)

  return (
    <div className="relative h-full" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        onClick={() => { setOpen(false); onSelect(group) }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true) } if (e.key === 'Escape') setOpen(false) }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative flex h-full items-center gap-1.5 px-3 text-[13.5px] transition-colors ${
          active ? 'font-semibold text-ink-950' : 'font-medium text-mist-600 hover:text-ink-950'
        } ${open && !active ? 'bg-mist-25 text-ink-950' : ''}`}
      >
        {group.label}
        {alert > 0 && <span className="rounded-full bg-danger-100 px-1.5 text-[11px] font-semibold text-danger-700">{alert}</span>}
        <UiIcon name="chevronDown" className={`h-3 w-3 text-mist-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        {active && <span className="absolute inset-x-2.5 bottom-0 h-[3px] rounded-t-full bg-brand-600" />}
      </button>
      {open && (
        <div
          role="menu"
          onMouseEnter={show}
          onMouseLeave={hide}
          className="absolute left-0 top-full z-50 mt-1 w-[300px] rounded-xl border border-mist-200 bg-white p-1.5 shadow-[0_16px_32px_-12px_rgba(17,20,58,0.22)]"
        >
          <p className="m-0 px-2.5 pb-1 pt-1.5 text-[12px] font-semibold text-mist-600">{group.label}</p>
          {group.items.map((item) => {
            const [icon, desc] = PAGE_META[item.id] || ['dot', '']
            const current = isActivePage(item)
            const c = counts[item.id]
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.end ?? true}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 rounded-lg px-2.5 py-2 no-underline transition-colors ${current ? 'bg-brand-50' : 'hover:bg-mist-50'}`}
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c?.danger ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-700'}`}>
                  <UiIcon name={icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-950">
                    {item.label}
                    <Count c={c} active={current} />
                  </span>
                  {desc && <span className="block text-[12px] leading-snug text-mist-600">{c?.n && c.hint ? `${c.n} ${c.hint} · ${desc}` : desc}</span>}
                </span>
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────────── */
export default function ModuleNav({ module, items, modules, daysLeft, trialTotal, onUpgrade, saved, onToggleSave }) {
  const location = useLocation()
  const navigate = useNavigate()
  const counts = useCrmCounts(module.module === 'crm', location.pathname)

  const isActivePage = useCallback(
    (item) => Boolean(matchPath({ path: item.to, end: item.end ?? true }, location.pathname)),
    [location.pathname],
  )

  /* Build groups from the pages this role can actually open */
  const groups = useMemo(() => {
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
  }, [items, module.module, module.label])

  const activeGroup = groups.find((g) => g.items.some(isActivePage)) || groups[0]
  const [shownGroupId, setShownGroupId] = useState(activeGroup?.id)
  useEffect(() => { setShownGroupId(activeGroup?.id) }, [activeGroup?.id])
  const shown = groups.find((g) => g.id === shownGroupId) || activeGroup
  const grouped = groups.length > 1

  const pill = (active) =>
    `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[13px] no-underline transition-colors ${
      active ? 'border-brand-200 bg-white font-semibold text-brand-800 shadow-[0_1px_2px_rgba(17,20,58,0.06)]' : 'border-transparent font-medium text-mist-600 hover:bg-white hover:text-ink-950'
    }`

  const pages = (list) => list.map((item) => (
    <NavLink key={item.id} to={item.to} end={item.end ?? true} className={({ isActive }) => pill(isActive)}>
      {({ isActive }) => (<>{item.label}<Count c={counts[item.id]} active={isActive} /></>)}
    </NavLink>
  ))

  return (
    <div className="shrink-0 border-b border-mist-200">
      {/* Row 1 */}
      <div className="flex h-[52px] items-center gap-2 px-5">
        <ModuleSwitcher current={module} modules={modules} />
        {grouped ? (
          <nav aria-label={`${module.label} sections`} className="ml-2 flex h-full items-stretch">
            {groups.map((g) => (
              <GroupTab
                key={g.id}
                group={g}
                active={g.id === activeGroup?.id}
                counts={counts}
                isActivePage={isActivePage}
                onSelect={(grp) => { setShownGroupId(grp.id); if (!grp.items.some(isActivePage)) navigate(grp.items[0].to) }}
              />
            ))}
          </nav>
        ) : (
          <nav aria-label={`${module.label} pages`} className="hide-scrollbar ml-2 flex min-w-0 items-center gap-1 overflow-x-auto">
            {pages(shown?.items || [])}
          </nav>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <TrialCard daysLeft={daysLeft} total={trialTotal} onUpgrade={onUpgrade} />
          <SaveShortcutButton saved={saved} onToggle={onToggleSave} sectionLabel={module.label} />
        </div>
      </div>

      {/* Row 2: pages of the selected group */}
      {grouped && shown && (
        <nav aria-label={`${shown.label} pages`} className="hide-scrollbar flex items-center gap-1 overflow-x-auto border-t border-mist-100 bg-mist-25 px-5 py-2">
          {pages(shown.items)}
        </nav>
      )}
    </div>
  )
}
