import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import Icon from '../../shared/ui/Icon'
import { MODULES, enabledModuleIds, permissionsFor } from '../../shared/security/roles'
import { workspace } from '../workspace/workspaceApi'
import { relativeDay, timeAgo } from '../workspace/kit'

const DOT = {
  teal: 'bg-brand-600',
  amber: 'bg-sun-600',
  red: 'bg-danger-600',
  green: 'bg-brand-800',
  blue: 'bg-info-700',
  ink: 'bg-iris-700',
}

/** Widgets the user can show/hide in "Edit dashboard" mode (saved per user in this browser). */
const WIDGETS = [
  { id: 'overview', label: 'Module overview', hint: 'Live numbers from the modules you use' },
  { id: 'mywork', label: 'My work', hint: 'Tasks assigned to you' },
  { id: 'calendar', label: 'Coming up', hint: 'Events in the next two weeks' },
  { id: 'attention', label: 'Needs attention', hint: 'Alerts from your modules' },
  { id: 'actions', label: 'Quick actions', hint: 'Shortcuts for common work' },
  { id: 'board', label: 'Team board', hint: 'Latest announcements' },
  { id: 'discover', label: 'Discover modules', hint: 'Modules you have not turned on' },
]
const DEFAULT_WIDGETS = WIDGETS.map((w) => w.id)

/* Module KPI cards — only rendered for modules the practice picked */
const MODULE_KPIS = {
  crm: [
    { key: 'leads', field: 'activePatientLeads', label: 'Open patient leads', to: '/app/crm/leads', perm: 'patients' },
    { key: 'followups', field: 'openLeadFollowUps', label: 'Leads awaiting contact', to: '/app/crm/tasks', perm: 'patients' },
  ],
  ops: [
    { key: 'providers', field: 'providerCount', label: 'Providers registered', to: '/app/providers', perm: 'creds' },
    { key: 'onboarding', field: 'staffOnboarding', label: 'Staff onboarding', to: '/app/staff', perm: 'staff' },
    { key: 'licenses', field: 'expiringLicenses', label: 'Licenses ≤ 60 days', to: '/app/providers', perm: 'creds' },
    { key: 'vendors', field: 'vendorsNeedingBaa', label: 'Vendors needing BAA', to: '/app/vendors', perm: 'vendors' },
  ],
}

const ACTIONS = [
  { to: '/app/crm/call-desk', label: 'Take a patient call', icon: 'phoneIn', module: 'crm', perm: 'patients' },
  { to: '/app/crm/leads?new=1', label: 'Add a patient lead', icon: 'userPlus', module: 'crm', perm: 'patients' },
  { to: '/app/providers', label: 'Register a provider', icon: 'stethoscope', module: 'ops', perm: 'creds' },
  { to: '/app/staff', label: 'Add staff member', icon: 'userPlus', module: 'ops', perm: 'staff' },
  { to: '/app/vendors', label: 'Add vendor + BAA', icon: 'building', module: 'ops', perm: 'vendors' },
  { to: '/app/email-campaigns', label: 'Plan an email campaign', icon: 'mail', module: 'mkt', perm: 'email' },
  { to: '/app/timeclock', label: 'Open the time clock', icon: 'clock', module: 'tc', perm: 'timeclock' },
  { to: '/app/my-work?new=1', label: 'Add a task', icon: 'checkSquare', always: true },
  { to: '/app/calendar?new=1', label: 'Schedule a team event', icon: 'calendar', always: true },
  { to: '/app/board?new=1', label: 'Post a team update', icon: 'board', always: true },
]

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function readWidgets(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : DEFAULT_WIDGETS
  } catch {
    return DEFAULT_WIDGETS
  }
}

export default function HomePage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [ws, setWs] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const widgetKey = `utessa.home.${user?.userId}.widgets`
  const [shown, setShown] = useState(() => readWidgets(widgetKey))

  const enabled = enabledModuleIds(user?.enabledServices)
  const perms = permissionsFor(user?.role)
  const myModules = MODULES.filter((m) => enabled.includes(m.id))
  const otherModules = MODULES.filter((m) => !enabled.includes(m.id))

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError('')
      const [dash, work] = await Promise.allSettled([api('/api/v1/dashboard/summary'), workspace.summary()])
      if (!alive) return
      if (dash.status === 'fulfilled') setSummary(dash.value)
      else setError(dash.reason?.message || 'Could not load dashboard')
      if (work.status === 'fulfilled') setWs(work.value)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  function toggleWidget(id) {
    setShown((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try { localStorage.setItem(widgetKey, JSON.stringify(next)) } catch { /* optional */ }
      return next
    })
  }
  /* In edit mode every widget is rendered (hidden ones dimmed) so it can be switched back on in place */
  const show = (id) => editing || shown.includes(id)
  const wprops = (id) => ({ editing, visible: shown.includes(id), onToggle: () => toggleWidget(id) })
  const hiddenCount = WIDGETS.filter((w) => !shown.includes(w.id)).length

  const kpiGroups = myModules
    .map((m) => ({ module: m, kpis: (MODULE_KPIS[m.id] || []).filter((k) => perms.has(k.perm)) }))
    .filter((g) => g.kpis.length)
  const actions = ACTIONS.filter((a) => a.always || (enabled.includes(a.module) && perms.has(a.perm))).slice(0, 6)
  const attention = (summary?.attention || []).filter((a) => !a.module || enabled.includes(a.module))
  const today = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  const firstName = (user?.fullName || '').split(/\s+/)[0]

  return (
    <div className="mx-auto w-full max-w-[1180px] pb-6">
      {!user?.emailVerified && (
        <div className="mb-5 rounded-[16px] border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <b>Verify your email</b> to unlock patient-information features for this practice.
        </div>
      )}

      {/* Greeting header */}
      <div className="mb-7 mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-[15px] text-mist-500">{today}</p>
          <h1 className="m-0 mt-1 text-[30px] font-semibold tracking-[-0.02em] text-ink-950">{greeting()}, {firstName}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {myModules.map((m) => (
              <Link key={m.id} to={m.home} className="inline-flex items-center gap-1.5 rounded-full border border-mist-200 bg-white px-3 py-1 text-[12px] font-semibold text-mist-600 no-underline transition hover:border-brand-200">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.accent }} />
                {m.name}
              </Link>
            ))}
          </div>
        </div>
        {editing ? (
          <button type="button" onClick={() => setEditing(false)} className="flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-[14px] font-semibold text-white transition hover:bg-brand-700">
            <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
            Done editing
          </button>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="flex h-10 items-center gap-2 rounded-lg border border-mist-200 bg-white px-3.5 text-[14px] font-medium text-ink-950 transition hover:bg-mist-50">
            <Icon name="edit" className="h-4 w-4" />
            Edit dashboard
            {hiddenCount > 0 && <span className="rounded-full bg-mist-50 px-1.5 text-[11px] text-mist-500">{hiddenCount} hidden</span>}
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-6 flex items-center gap-3 rounded-[16px] border border-dashed border-brand-200 bg-mist-25 px-4 py-3 text-[13px] text-mist-600">
          <Icon name="info" className="h-4 w-4 shrink-0 text-brand-700" />
          Use the eye button on each card to show or hide it. Hidden cards are dimmed while you edit and disappear when you are done.
        </div>
      )}

      {error && (
        <p className="mb-5 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-semibold text-danger-500">{error}</p>
      )}

      <div className="space-y-5">
        {/* Module overview — only modules the practice picked */}
        {show('overview') && kpiGroups.map(({ module: m, kpis }) => (
          <Widget key={m.id} {...wprops('overview')} icon={m.icon} title={`${m.name} overview`} right={<Link to={m.home} className="text-[14px] text-mist-600 no-underline hover:text-ink-950">Open {m.name} →</Link>}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
              {kpis.map((k) => (
                <Link key={k.key} to={k.to} className="group rounded-[16px] border border-mist-200 bg-white p-4 no-underline transition hover:border-brand-200">
                  <div className="font-mono text-[28px] font-semibold tracking-[-0.04em] text-ink-950">
                    {loading && summary == null ? '—' : (summary?.[k.field] ?? 0)}
                  </div>
                  <div className="mt-1 text-[13px] text-mist-600">{k.label}</div>
                </Link>
              ))}
            </div>
          </Widget>
        ))}

        {/* My work */}
        {show('mywork') && (
          <Widget {...wprops('mywork')} icon="checkSquare" title="My work" right={<Link to="/app/my-work" className="text-[14px] text-mist-600 no-underline hover:text-ink-950">Open My work →</Link>}>
            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
              <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                <MiniStat label="Open" value={ws?.myOpenTasks} />
                <MiniStat label="Due today" value={ws?.dueToday} />
                <MiniStat label="Overdue" value={ws?.overdue} danger={ws?.overdue > 0} />
              </div>
              <div className="rounded-[16px] border border-mist-200">
                {(ws?.myTasks || []).length ? (
                  <ul className="m-0 list-none p-0">
                    {ws.myTasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 border-b border-info-50 px-4 py-3 last:border-0">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.priority === 'URGENT' ? DOT.red : t.priority === 'HIGH' ? DOT.amber : DOT.teal}`} />
                        <Link to="/app/my-work" className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-950 no-underline">{t.title}</Link>
                        {t.dueDate && <span className="shrink-0 text-[12px] text-mist-500">{relativeDay(t.dueDate)}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Promo
                    title="Plan your day in one place"
                    text="Add personal to-dos or hand work to a teammate. Everything assigned to you lands here."
                    cta="Add a task"
                    to="/app/my-work?new=1"
                  />
                )}
              </div>
            </div>
          </Widget>
        )}

        {/* Coming up */}
        {show('calendar') && (
          <Widget {...wprops('calendar')} icon="calendar" title="Coming up" right={<Link to="/app/calendar" className="text-[14px] text-mist-600 no-underline hover:text-ink-950">Open calendar →</Link>}>
            {(ws?.upcomingEvents || []).length ? (
              <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
                {ws.upcomingEvents.map((e) => {
                  const d = new Date(e.startsAt)
                  return (
                    <li key={e.id} className="flex items-center gap-3 rounded-[16px] border border-mist-200 p-3">
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-mist-50 leading-none">
                        <span className="text-[12px] font-semibold text-danger-600">{d.toLocaleDateString([], { month: 'short' })}</span>
                        <span className="text-[17px] font-bold text-ink-950">{d.getDate()}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink-950">{e.title}</span>
                        <span className="block text-[12.5px] text-mist-500">{e.allDay ? 'All day' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{e.location ? ` · ${e.location}` : ''}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="overflow-hidden rounded-[16px] border border-mist-200">
                <div className="grid md:grid-cols-[1fr_300px]">
                  <Promo
                    title="Keep the whole practice in sync"
                    text="Schedule huddles, trainings and time off on the shared calendar. CRM appointments show up there too."
                    cta="Schedule an event"
                    to="/app/calendar?new=1"
                  />
                  <CalendarArt />
                </div>
              </div>
            )}
          </Widget>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Needs attention */}
          {show('attention') && (
            <Widget {...wprops('attention')} icon="alert" title="Needs attention" right={<span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700">Live</span>}>
              <ul className="m-0 list-none p-0">
                {attention.map((item) => (
                  <li key={item.title} className="flex gap-3 border-b border-info-50 py-3 last:border-0">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[item.tone] || DOT.teal}`} />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm font-semibold text-ink-950">{item.title}</p>
                      <p className="m-0 mt-0.5 text-[13px] text-mist-600">{item.meta}</p>
                    </div>
                  </li>
                ))}
                {!loading && !attention.length && <li className="py-3 text-sm text-mist-600">You&apos;re all caught up.</li>}
              </ul>
            </Widget>
          )}

          {/* Quick actions */}
          {show('actions') && (
            <Widget {...wprops('actions')} icon="sparkles" title="Quick actions">
              <div className="grid gap-2 sm:grid-cols-2">
                {actions.map((a) => (
                  <Link key={a.label} to={a.to} className="group flex items-center gap-3 rounded-[14px] border border-mist-200 px-3 py-2.5 text-sm font-semibold text-ink-950 no-underline transition hover:border-brand-200 hover:bg-mist-25">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <Icon name={a.icon} className="h-4 w-4" />
                    </span>
                    <span className="flex-1">{a.label}</span>
                    <span className="text-mist-500 transition group-hover:translate-x-0.5 group-hover:text-ink-950">→</span>
                  </Link>
                ))}
              </div>
            </Widget>
          )}
        </div>

        {/* Team board */}
        {show('board') && (
          <Widget {...wprops('board')} icon="board" title="Team board" right={<Link to="/app/board" className="text-[14px] text-mist-600 no-underline hover:text-ink-950">View all →</Link>}>
            {(ws?.announcements || []).length ? (
              <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
                {ws.announcements.map((a) => (
                  <li key={a.id} className={`rounded-[16px] border p-4 ${a.category === 'URGENT' ? 'border-danger-200 bg-danger-50' : 'border-mist-200'}`}>
                    <p className="m-0 flex items-center gap-1.5 text-[12px] font-semibold text-mist-500">
                      {a.pinned && <Icon name="pin" className="h-3 w-3 text-brand-700" />}{a.category.toLowerCase()} · {timeAgo(a.createdAt)}
                    </p>
                    <p className="m-0 mt-1.5 text-[15px] font-semibold text-ink-950">{a.title}</p>
                    <p className="m-0 mt-1 line-clamp-2 text-[13px] text-mist-600">{a.body}</p>
                    <p className="m-0 mt-2 text-[12px] text-mist-500">— {a.authorName || 'Team'}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-[16px] border border-mist-200">
                <Promo title="Share updates with everyone" text="Post schedule changes, policy reminders and team wins. Everyone sees them here and on the Team board." cta="Post an update" to="/app/board?new=1" />
              </div>
            )}
          </Widget>
        )}

        {/* Discover modules */}
        {show('discover') && otherModules.length > 0 && (
          <Widget {...wprops('discover')} icon="apps" title="Discover modules" right={<Link to="/app/modules" className="text-[14px] text-mist-600 no-underline hover:text-ink-950">Apps & modules →</Link>}>
            <div className="grid gap-3 md:grid-cols-3">
              {otherModules.map((m) => (
                <Link key={m.id} to="/app/modules" className="flex items-start gap-3 rounded-[16px] border border-mist-200 p-4 no-underline transition hover:border-brand-200">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${m.accent}1F`, color: m.accent }}>
                    <Icon name={m.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink-950">{m.fullName}</span>
                    <span className="block text-[12.5px] text-mist-500">{m.tagline}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Widget>
        )}

        {!editing && !shown.length && (
          <div className="rounded-[20px] border border-dashed border-mist-200 px-6 py-14 text-center">
            <p className="m-0 text-[15px] font-semibold text-ink-950">Your Home is empty</p>
            <p className="m-0 mt-1 text-sm text-mist-500">Click <b>Edit dashboard</b> to bring cards back.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* Card frame used by every widget. In edit mode it shows a show/hide control and dims when hidden. */
function Widget({ icon, title, right, children, editing, visible = true, onToggle }) {
  return (
    <section className={`relative rounded-[20px] border bg-white p-5 transition md:p-6 ${editing ? (visible ? 'border-brand-200 ring-2 ring-brand-200/25' : 'border-dashed border-mist-200 opacity-50') : 'border-mist-200'}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="m-0 flex items-center gap-2.5 text-[19px] font-semibold text-ink-950">
          <Icon name={icon} className="h-5 w-5 text-mist-600" />
          {title}
        </h2>
        {editing ? (
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition ${visible ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-mist-200 bg-white text-mist-500'}`}
          >
            <EyeIcon off={!visible} />
            {visible ? 'Shown' : 'Hidden'}
          </button>
        ) : right}
      </div>
      {children}
    </section>
  )
}

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  )
}

function MiniStat({ label, value, danger }) {
  return (
    <Link to="/app/my-work" className="rounded-[14px] border border-mist-200 bg-mist-25 px-4 py-3 no-underline transition hover:border-brand-200">
      <span className={`block font-mono text-[24px] font-semibold leading-none ${danger ? 'text-danger-600' : 'text-ink-950'}`}>{value ?? '—'}</span>
      <span className="mt-1 block text-[12.5px] text-mist-500">{label}</span>
    </Link>
  )
}

function Promo({ title, text, cta, to }) {
  return (
    <div className="p-6">
      <p className="m-0 text-[17px] font-semibold text-ink-950">{title}</p>
      <p className="m-0 mt-1.5 max-w-md text-[14px] leading-relaxed text-mist-600">{text}</p>
      <Link to={to} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-mist-200 px-3.5 py-2 text-[14px] font-medium text-ink-950 no-underline transition hover:bg-mist-50">
        <Icon name="plus" className="h-4 w-4" />
        {cta}
      </Link>
    </div>
  )
}

/* Small decorative calendar mock for the empty "Coming up" state */
function CalendarArt() {
  return (
    <div className="relative hidden min-h-[180px] overflow-hidden bg-brand-50 md:block">
      <div className="absolute right-0 top-5 w-[230px] rounded-l-xl bg-white p-3">
        <p className="m-0 flex items-center gap-1.5 text-[11px] font-semibold text-mist-600"><Icon name="calendar" className="h-3.5 w-3.5" /> This week</p>
        {[['Mon', 'Team huddle', '#1E8E94'], ['Wed', 'HIPAA training', '#6D74C9'], ['Fri', 'Provider meeting', '#2E7FD9']].map(([day, label, color]) => (
          <div key={day} className="mt-2 flex items-center gap-2">
            <span className="w-7 text-[10px] font-semibold text-mist-500">{day}</span>
            <span className="flex-1 truncate rounded-md px-2 py-1 text-[10.5px] font-semibold" style={{ backgroundColor: `${color}1F`, color }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
