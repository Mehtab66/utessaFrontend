import { useEffect, useRef } from 'react'
import { LogoCRM, LogoMarketing, LogoOps, LogoTimeClock } from '../shared/ui/ModuleLogos'

/*
 * First-dashboard loader ("dashboard builder"), shown once right after signup over the real,
 * blurred dashboard. A miniature of the app is assembled from pieces that fly in from outside
 * the screen: top bar, rail, then — for every module the practice picked, in catalog order —
 * that module's page list and first page. CRM builds Patient leads, its table one column at a time.
 * Cards are grey skeletons only; the caption under the frame is the only text.
 * Styles live in index.css under "Dashboard loader".
 */

const FADE_MS = 450
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ── What each module builds ─────────────────────────────────────────── */
const LEAD_COLS = [
  { label: null, flex: '0 0 32px', cell: 'chk' },
  { label: 'Lead', flex: '2.6 1 0', cell: 'lead' },
  { label: 'Status', flex: '1.5 1 0', cell: 'tone' },
  { label: 'Priority', flex: '1.1 1 0', cell: 'tone' },
  { label: 'Source', flex: '.9 1 0', cell: 'text', sm: true },
  { label: 'Interest', flex: '1 1 0', cell: 'text', sm: true },
  { label: 'Insurance', flex: '1 1 0', cell: 'text', sm: true },
  { label: 'Owner', flex: '1.3 1 0', cell: 'owner' },
  { label: 'Next follow-up', flex: '1.1 1 0', cell: 'text', sm: true },
]

const BUILD = {
  crm: {
    name: 'CRM', full: 'CRM', Icon: LogoCRM, nav: [5, 5], page: 'leads',
    navLine: 'Adding Pipeline and Patient care pages',
    headLine: 'Adding search, filters and actions',
    doneLine: 'Patient leads is ready',
  },
  ops: {
    name: 'Operations', full: 'Practice Operations', Icon: LogoOps, nav: [5, 4],
    page: [['kpi', 3], ['kpi', 3], ['kpi', 3], ['kpi', 3], ['table', 7], ['donut', 5]],
    lines: ['Setting up provider credentialing', 'Adding staff onboarding and training', 'Organizing vendors, BAAs and documents'],
  },
  mkt: {
    name: 'Marketing', full: 'Marketing', Icon: LogoMarketing, nav: [2, 2, 1],
    page: [['kpi', 6], ['kpi', 6], ['area', 8], ['list', 4]],
    lines: ['Preparing referral-partner outreach', 'Setting up email and social campaigns', 'Getting your outreach agents ready'],
  },
  tc: {
    name: 'Time Clock', full: 'Time Clock', Icon: LogoTimeClock, nav: [3, 2, 2],
    page: [['kpi', 4], ['kpi', 4], ['kpi', 4], ['donut', 4], ['bars', 8]],
    lines: ['Setting up clock in and clock out', 'Creating timesheets and time off', 'Preparing approvals and payroll export'],
  },
}
const ORDER = ['crm', 'ops', 'mkt', 'tc']

/* ── Skeleton pieces ─────────────────────────────────────────────────── */
// `fly` marks an element that enters from outside the screen; data-from picks the edge.
const Sk = ({ w, h, r, fly, from, style, className = '' }) => (
  <i
    className={`db-sk ${className}`}
    data-fly={fly ? '' : undefined}
    data-from={from}
    style={{ width: w, height: h, borderRadius: r, ...style }}
  />
)
const P = ({ from = 'left', className = '', style, children }) => (
  <div className={`db-p ${className}`} data-fly="" data-from={from} style={style}>{children}</div>
)

const LogoMark = ({ size = 24 }) => (
  <svg className="db-lw" width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
    <rect style={{ animationDelay: '0s' }} x="44" y="6" width="32" height="32" rx="9" fill="#BDEFF1" />
    <rect style={{ animationDelay: '.12s' }} x="82" y="44" width="32" height="32" rx="9" fill="#2BB5BB" />
    <rect style={{ animationDelay: '.24s' }} x="44" y="82" width="32" height="32" rx="9" fill="#0F7F86" />
    <rect style={{ animationDelay: '.36s' }} x="6" y="44" width="32" height="32" rx="9" fill="#6FD3D8" />
    <rect style={{ animationDelay: '.48s' }} x="44" y="44" width="32" height="32" rx="9" fill="#FFC83D" />
  </svg>
)

const CheckMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" strokeWidth="1.8" />
    <path d="m7.5 12.3 3 3 6-6.3" />
  </svg>
)

function ModuleNav({ groups, id }) {
  let n = 0
  return (
    <div className="db-card db-nav" data-mod={id} data-fly="" data-from="left">
      <P className="db-nav-head">
        <div className="db-row"><Sk w="24px" h="24px" r="8px" /><div className="db-stack"><Sk w="50%" h="8px" /><Sk w="75%" h="6px" /></div></div>
      </P>
      <P><Sk w="100%" h="22px" r="7px" /></P>
      {groups.map((count, g) => (
        <div key={g} className="db-nav-group">
          <P className="db-nav-title"><Sk w={`${40 + g * 8}%`} h="8px" /></P>
          {Array.from({ length: count }, (_, i) => (
            <P key={i} className={`db-nav-item ${g === 0 && i === 1 ? 'is-on' : ''}`}>
              <div className="db-row" style={{ height: '100%' }}><Sk w="12px" h="12px" r="4px" /><Sk w={`${45 + ((n++ * 17) % 35)}%`} h="6px" /></div>
            </P>
          ))}
        </div>
      ))}
    </div>
  )
}

const ROW_W = [[62, 44], [78, 50], [55, 38], [70, 46], [48, 40], [66, 52]]
function Cell({ kind, r }) {
  const [a, b] = ROW_W[r % ROW_W.length]
  if (kind === 'chk') return <Sk w="12px" h="12px" r="4px" />
  if (kind === 'lead') return <><Sk w="20px" h="20px" r="50%" /><div className="db-stack"><Sk w={`${a}%`} h="8px" /><Sk w={`${b}%`} h="6px" /></div></>
  if (kind === 'tone') return <><Sk w="7px" h="7px" r="50%" /><Sk w={`${a}%`} h="7px" /></>
  if (kind === 'owner') return <Sk w={`${b + 30}%`} h="7px" />
  return <Sk w={`${a}%`} h="7px" />
}

function LeadsPage() {
  return (
    <div className="db-card db-page" data-mod="crm" data-fly="" data-from="right">
      <div className="db-hrow"><P><Sk w="140px" h="8px" /></P></div>
      <div className="db-hrow">
        <P>
          <div className="db-row"><Sk w="130px" h="15px" /><Sk w="46px" h="15px" r="7px" /></div>
          <Sk w="220px" h="6px" style={{ marginTop: 8, maxWidth: '100%' }} />
        </P>
        <div className="db-row">
          <P from="right" className="db-hide-sm"><Sk w="58px" h="24px" r="8px" /></P>
          <P from="right" className="db-hide-sm"><Sk w="66px" h="24px" r="8px" /></P>
          <P from="right"><Sk w="74px" h="24px" r="8px" /></P>
        </div>
      </div>
      <div className="db-frow">
        <P style={{ flex: '0 1 150px', minWidth: 50 }}><Sk w="100%" h="24px" r="8px" /></P>
        {[76, 52, 48, 50, 54].map((w, i) => (
          <P key={i} from="top" className={i ? 'db-hide-sm' : ''}><Sk w={`${w}px`} h="24px" r="8px" /></P>
        ))}
        <span className="db-grow" />
        <P from="right" className="db-hide-sm"><Sk w="64px" h="24px" r="8px" /></P>
      </div>
      <div className="db-table">
        {LEAD_COLS.map((c, i) => (
          <div key={i} className={`db-col ${c.sm ? 'db-hide-sm' : ''}`} data-col={i} data-fly="" style={{ flex: c.flex }}>
            <div className="db-th">{c.label ? <Sk w={`${30 + ((i * 13) % 30)}%`} h="7px" /> : <Sk w="12px" h="12px" r="4px" />}</div>
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <div key={r} className={`db-td ${c.cell === 'tone' ? 'is-tone' : ''}`}><Cell kind={c.cell} r={r + i} /></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const BAR_SETS = [[40, 58, 46, 72, 62, 90, 54, 78], [82, 76, 88, 70, 64, 34, 28, 80]]
function Block({ type, span, n }) {
  const Q = (props) => <Sk fly className="db-q" {...props} />
  const QRow = ({ children, className = 'db-row' }) => <div className={`${className} db-q`} data-fly="">{children}</div>
  let inner = null
  if (type === 'kpi') inner = <><QRow><Sk w="18px" h="18px" r="6px" /><Sk w="55%" h="7px" /></QRow><Q w="70%" h="16px" style={{ marginTop: 12 }} /><Q w="42%" h="6px" style={{ marginTop: 8 }} /></>
  if (type === 'bars') inner = <><Q w="34%" h="8px" /><div className="db-bars">{BAR_SETS[n % 2].map((h, i) => <Q key={i} w="auto" h={`${h}%`} />)}</div></>
  if (type === 'list') inner = <><Q w="55%" h="8px" /><div className="db-list">{[70, 58, 76, 50].map((w, i) => <QRow key={i}><Sk w="18px" h="18px" r="50%" /><Sk w={`${w}%`} h="7px" /></QRow>)}</div></>
  if (type === 'table') inner = <><Q w="30%" h="8px" style={{ marginBottom: 8 }} />{[0, 1, 2, 3, 4].map((i) => <QRow key={i} className="db-tr"><Sk w="80%" h="7px" /><Sk w="65%" h="7px" /><Sk w="55%" h="7px" /></QRow>)}</>
  if (type === 'donut') inner = (
    <><Q w="40%" h="8px" />
      <div className="db-donut">
        <svg className="db-q" data-fly="" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="36" fill="none" stroke="#ECEEF6" strokeWidth="14" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="#DEE1EE" strokeWidth="14" strokeDasharray="120 226" transform="rotate(-90 50 50)" strokeLinecap="round" />
        </svg>
        <div className="db-stack" style={{ gap: 10 }}>{[70, 55, 62].map((w, i) => <QRow key={i}><Sk w="10px" h="10px" r="3px" /><Sk w={`${w}%`} h="7px" /></QRow>)}</div>
      </div></>
  )
  if (type === 'area') inner = (
    <><Q w="30%" h="8px" />
      <svg className="db-area db-q" data-fly="" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 82 C30 70 55 76 85 58 S140 30 170 44 S230 34 260 20 S290 14 300 12 V100 H0Z" fill="#ECEEF6" />
        <path d="M0 82 C30 70 55 76 85 58 S140 30 170 44 S230 34 260 20 S290 14 300 12" fill="none" stroke="#DEE1EE" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg></>
  )
  return <div className="db-blk" data-fly="" data-type={type} style={{ gridColumn: `span ${span}` }}>{inner}</div>
}

function GridPage({ id, layout }) {
  return (
    <div className="db-card db-page" data-mod={id} data-fly="" data-from="right">
      <div className="db-hrow"><P><Sk w="120px" h="8px" /></P></div>
      <div className="db-hrow">
        <P><Sk w="130px" h="15px" /><Sk w="200px" h="6px" style={{ marginTop: 8, maxWidth: '100%' }} /></P>
        <div className="db-row">
          <P from="right" className="db-hide-sm"><Sk w="66px" h="24px" r="8px" /></P>
          <P from="right"><Sk w="76px" h="24px" r="8px" /></P>
        </div>
      </div>
      <div className="db-grid">{layout.map(([t, s], n) => <Block key={n} type={t} span={s} n={n} />)}</div>
    </div>
  )
}

/* ── Motion ──────────────────────────────────────────────────────────── */
const CANCEL = Symbol('cancel')
const SHELL_EDGES = ['top', 'bottom', 'top', 'bottom']
const INNER_EDGE = { bars: 'bottom', list: 'right', table: 'left', donut: 'top', area: 'bottom' }
const OPP = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

function offscreen(el, from, drift = 1) {
  const r = el.getBoundingClientRect()
  const W = window.innerWidth, H = window.innerHeight, pad = 80, d = (Math.random() - 0.5) * drift
  if (from === 'left') return [-(r.right + pad), d * 200]
  if (from === 'right') return [W - r.left + pad, d * 200]
  if (from === 'top') return [d * 240, -(r.bottom + pad)]
  return [d * 240, H - r.top + pad]
}

function makeTimeline(root, modules, isLive, adding) {
  const anims = []
  const $ = (s) => root.querySelector(s)
  const $$ = (s, r = root) => [...r.querySelectorAll(s)]
  const wait = (ms) => new Promise((res, rej) => setTimeout(() => (isLive() ? res() : rej(CANCEL)), ms))
  const visible = (el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed'

  function fly(el, from, { dur = 1150, spin = 12, drift = 1 } = {}) {
    if (!el) return Promise.resolve()
    el.classList.add('is-in')
    if (!visible(el)) return Promise.resolve()
    const [dx, dy] = offscreen(el, from || el.dataset.from || 'left', drift)
    const rot = (Math.random() - 0.5) * spin
    const a = el.animate([
      { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(.92)` },
      { transform: `translate(${-dx * 0.01}px, ${-dy * 0.01}px) rotate(${-rot * 0.05}deg) scale(1.005)`, offset: 0.82 },
      { transform: 'none' },
    ], { duration: dur, easing: 'cubic-bezier(.22,.8,.32,1)', fill: 'backwards' })
    anims.push(a)
    return a.finished.catch(() => {})
  }
  function flyOut(el, to) {
    if (!el || !visible(el)) return Promise.resolve()
    const [dx, dy] = offscreen(el, to)
    const a = el.animate(
      [{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) rotate(${(Math.random() - 0.5) * 14}deg) scale(.92)` }],
      { duration: 800, easing: 'cubic-bezier(.55,0,.8,.3)', fill: 'forwards' },
    )
    anims.push(a)
    return a.finished.catch(() => {})
  }
  async function stagger(list, edge, gap, opts) {
    const landed = []
    for (const [i, el] of list.entries()) {
      landed.push(fly(el, typeof edge === 'function' ? edge(el, i) : edge, opts))
      await wait(gap)
    }
    await Promise.all(landed)
  }
  const snap = (el) => { el.classList.remove('is-snap'); void el.offsetWidth; el.classList.add('is-snap') }

  const capTitle = $('.db-cap-h'), capSub = $('.db-cap-sub')
  async function swap(el, text, icon) {
    const box = el === capTitle ? el.parentElement : el
    if (el.textContent === text && (!icon || box.dataset.icon === icon)) return
    box.classList.add('is-out')
    await wait(300)
    el.textContent = text
    if (icon) box.dataset.icon = icon
    box.classList.remove('is-out'); box.classList.add('is-pre')
    void box.offsetWidth
    box.classList.remove('is-pre')
  }

  async function buildLeads(m, k) {
    await swap(capSub, m.navLine)
    const nav = $('.db-nav.is-current'), page = $('.db-page.is-current')
    const navIn = fly(nav)
    await wait(380 * k)
    await Promise.all([navIn, fly(page)])
    const navItems = stagger($$('.db-p', nav), 'left', 110 * k, { dur: 900, spin: 6 })
    await wait(500 * k)
    await swap(capSub, m.headLine)
    await stagger($$('.db-hrow .db-p, .db-frow .db-p', page), null, 170 * k, { dur: 950, spin: 8 })
    await navItems
    snap(nav)
    // every table column is its own piece — they slot in left to right
    const cols = $$('.db-col', page).filter(visible)
    const landed = []
    for (const [i, c] of cols.entries()) {
      const label = LEAD_COLS[+c.dataset.col].label
      if (label) swap(capSub, `Adding the ${label} column`).catch(() => {})
      landed.push(fly(c, i % 2 ? 'bottom' : 'top', { dur: 1050, spin: 4, drift: 0.3 }).then(() => c.classList.add('is-joined')))
      await wait((label ? 720 : 400) * k)
    }
    await Promise.all(landed)
    snap(page)
    await swap(capSub, m.doneLine)
    await wait(900 * k)
  }

  async function buildGrid(m, k) {
    const rotate = (async () => { for (const l of m.lines) { await swap(capSub, l); await wait(1900 * k) } })()
    rotate.catch(() => {})
    const nav = $('.db-nav.is-current'), page = $('.db-page.is-current')
    const navIn = fly(nav)
    await wait(380 * k)
    await Promise.all([navIn, fly(page)])
    const navItems = stagger($$('.db-p', nav), 'left', 110 * k, { dur: 900, spin: 6 })
    await stagger($$('.db-hrow .db-p', page), null, 170 * k, { dur: 950, spin: 8 })
    const jobs = $$('.db-blk', page).map(async (b, i) => {
      await wait(i * 480 * k)
      const type = b.dataset.type
      const edge = type === 'kpi' ? SHELL_EDGES[i % 4] : (i % 2 ? 'right' : 'left')
      await fly(b, edge)
      await stagger($$('.db-q', b), INNER_EDGE[type] || OPP[edge], 100 * k, { dur: 950, spin: 8 })
      snap(b)
    })
    await Promise.all([...jobs, navItems, rotate])
    snap(nav)
  }

  function show(key) {
    $$('[data-mod].is-current').forEach((el) => el.classList.remove('is-current'))
    $$(`.db-nav[data-mod="${key}"], .db-page[data-mod="${key}"]`).forEach((el) => el.classList.add('is-current'))
  }

  async function play() {
    await wait(150)
    $('.db-frame').classList.add('is-in')
    fly($('.db-cap'), 'bottom', { spin: 0, dur: 900 })
    await wait(450)
    await fly($('.db-tb'), 'top')
    const tbPieces = stagger($$('.db-tb .db-p'), 'top', 150, { dur: 950, spin: 8 })
    await stagger($$('.db-rail .db-p'), 'left', 200, { dur: 950, spin: 8 })
    await tbPieces
    if (!modules.length) { await swap(capSub, 'Your workspace is ready to use'); await wait(1200) }

    for (const [i, key] of modules.entries()) {
      const m = BUILD[key]
      const k = i === 0 ? 1 : (modules.length > 2 ? 0.6 : 0.75)
      swap(capTitle, `${i === 0 && !adding ? 'Building your' : 'Now adding'} ${m.full}`, 'logo').catch(() => {})
      if (i > 0) {
        flyOut($('.db-nav.is-current'), 'left')
        flyOut($('.db-page.is-current'), 'right')
        await wait(950)
      }
      $$('.db-mod').forEach((x) => x.classList.remove('is-active'))
      const ic = $(`.db-mod[data-key="${key}"]`)
      fly(ic, 'left', { dur: 1000 }).then(() => ic.classList.add('is-active'))
      show(key)
      await wait(400)
      if (m.page === 'leads') await buildLeads(m, k)
      else await buildGrid(m, k)
    }

    const names = modules.map((key) => BUILD[key].name)
    const many = names.length > 1
    const list = many ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]
    if (adding) {
      await swap(capTitle, many ? 'Your new modules are ready' : 'Your new module is ready', 'check')
      await swap(capSub, `${list} ${many ? 'are' : 'is'} now in your sidebar`)
    } else {
      await swap(capTitle, 'Your dashboard is ready', 'check')
      await swap(capSub, names.length ? `${many ? list : BUILD[modules[0]].full} ${many ? 'are' : 'is'} set up for your practice` : 'Welcome to Utessa')
    }
    await wait(2200)
  }

  return { play, cancel: () => anims.forEach((a) => a.cancel()), CANCEL }
}

/* ── Component ───────────────────────────────────────────────────────── */
/*
 * modules   the modules to build (signup: everything picked; later: only the ones just added)
 * existing  modules the practice already had — shown in the mini rail from the start (add mode)
 * mode      'signup' (default) or 'add' — only changes the caption wording
 */
export default function DashboardLoader({ onDone, modules = [], existing = [], mode = 'signup' }) {
  const adding = mode === 'add'
  const already = ORDER.filter((id) => existing.includes(id) && !modules.includes(id))
  const rootRef = useRef(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const mods = ORDER.filter((id) => modules.includes(id))
  const modsKey = mods.join(',')

  const finish = () => {
    const root = rootRef.current
    if (!root || root.classList.contains('is-hiding')) return
    root.classList.add('is-hiding')
    setTimeout(() => doneRef.current?.(), FADE_MS)
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const list = modsKey ? modsKey.split(',') : []
    // Reset, so a re-run (React dev double effects) starts clean
    root.classList.remove('is-hiding')
    root.querySelectorAll('.is-in, .is-joined, .is-snap, .is-active, .is-current').forEach((el) =>
      el.classList.remove('is-in', 'is-joined', 'is-snap', 'is-active', 'is-current'))

    if (reducedMotion()) {
      root.querySelectorAll('[data-fly], .db-frame').forEach((el) => el.classList.add('is-in'))
      if (list[0]) root.querySelectorAll(`[data-mod="${list[0]}"]`).forEach((el) => el.classList.add('is-current'))
      const t = setTimeout(finish, 2500)
      return () => clearTimeout(t)
    }

    let live = true
    const tl = makeTimeline(root, list, () => live, adding)
    tl.play().then(finish, (e) => { if (e !== tl.CANCEL) finish() })
    return () => { live = false; tl.cancel() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modsKey, adding])

  return (
    <div ref={rootRef} className="dash-loader" role="status" aria-live="polite" aria-label="Building your dashboard">
      <div className="db-stage">
        <div className="db-frame">
          <div className="db-card db-tb" data-fly="" data-from="top">
            <P from="top"><div className="db-row"><LogoMark size={20} /><Sk w="56px" h="12px" /></div></P>
            <P from="top" className="db-hide-sm"><Sk w="72px" h="24px" r="8px" /></P>
            <P from="top" className="db-hide-sm"><Sk w="96px" h="24px" r="8px" /></P>
            <P from="top" className="db-hide-sm"><Sk w="min(150px, 14vw)" h="24px" r="8px" /></P>
            <span className="db-grow" />
            <P from="top" className="db-hide-sm"><Sk w="52px" h="24px" r="8px" /></P>
            <P from="top" className="db-hide-sm"><Sk w="64px" h="24px" r="8px" /></P>
            <P from="top" className="db-hide-sm"><div className="db-row">{[0, 1, 2, 3].map((i) => <Sk key={i} w="14px" h="14px" r="5px" />)}</div></P>
            <P from="top"><Sk w="26px" h="26px" r="50%" /></P>
          </div>
          <div className="db-body">
            <div className="db-rail">
              <P><Sk w="18px" h="18px" r="6px" /></P>
              <div className="db-mods">
                {already.map((key) => {
                  const { Icon } = BUILD[key]
                  return <span key={key} className="db-mod"><Icon className="h-4 w-4" /></span>
                })}
                {mods.map((key) => {
                  const { Icon } = BUILD[key]
                  return <span key={key} className="db-mod" data-key={key} data-fly="" data-from="left"><Icon className="h-4 w-4" /></span>
                })}
              </div>
              <P className="db-divider" />
              {[0, 1, 2].map((i) => <P key={i}><Sk w="18px" h="18px" r="6px" /></P>)}
            </div>
            <div className="db-slot db-slot-nav">
              {mods.map((key) => <ModuleNav key={key} id={key} groups={BUILD[key].nav} />)}
            </div>
            <div className="db-slot db-slot-page">
              {mods.map((key) => (BUILD[key].page === 'leads'
                ? <LeadsPage key={key} />
                : <GridPage key={key} id={key} layout={BUILD[key].page} />))}
            </div>
          </div>
        </div>

        <div className="db-cap" data-fly="" data-from="bottom">
          <div className="db-cap-title" data-icon="logo">
            <span className="db-cap-ic db-ic-logo"><LogoMark /></span>
            <span className="db-cap-ic db-ic-check"><CheckMark /></span>
            <span className="db-cap-h">{adding ? 'Updating your workspace' : 'Setting up your workspace'}</span>
          </div>
          <div className="db-cap-sub">{adding ? 'Making room in your sidebar' : 'Getting Home, My work, Calendar and Notes ready'}</div>
        </div>
      </div>
    </div>
  )
}
