import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { crm, labelOf, toneOf } from './crmApi'
import Select from '../../shared/ui/Select'
import LogoLoader from '../../shared/ui/LogoLoader'

/* ═══════════════════════════════════════════════════════════════════════
   Formatting
   ═══════════════════════════════════════════════════════════════════════ */
/** (972) 555-0100 for 10-digit US numbers; anything else is returned as typed. */
export function formatPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '').slice(-10)
  if (d.length !== 10) return raw
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function fmtDate(value) {
  if (!value) return '—'
  const d = typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export function fmtDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
export function fmtTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
export function fmtMoney(value) {
  const n = Number(value || 0)
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}
export function fmtRelative(value) {
  if (!value) return '—'
  const diff = new Date(value).getTime() - Date.now()
  const abs = Math.abs(diff)
  const mins = Math.round(abs / 60000)
  const unit = mins < 60 ? [mins, 'min'] : mins < 1440 ? [Math.round(mins / 60), 'hr'] : [Math.round(mins / 1440), 'day']
  const label = `${unit[0]} ${unit[1]}${unit[0] === 1 ? '' : 's'}`
  if (mins < 1) return 'just now'
  return diff < 0 ? `${label} ago` : `in ${label}`
}
export function ageFrom(dob) {
  if (!dob) return null
  const d = new Date(`${dob}T00:00:00`)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age
}
export function initials(name) {
  return (name || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}
/** datetime-local input value <-> ISO instant */
export function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export function fromLocalInput(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
export function nullify(values) {
  const out = {}
  Object.entries(values).forEach(([k, v]) => {
    if (k.startsWith('__')) return
    out[k] = v === '' ? null : v
  })
  return out
}

/* ═══════════════════════════════════════════════════════════════════════
   Data hooks
   ═══════════════════════════════════════════════════════════════════════ */
export function useAsync(loader, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await loaderRef.current()
      setData(result)
      return result
    } catch (err) {
      setError(err.message || 'Could not load data')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, reload, setData }
}

let refsCache = null
let refsPromise = null
/** Team members + referral partners for selects (cached per page load). */
export function useCrmRefs() {
  const [refs, setRefs] = useState(refsCache || { team: [], partners: [] })
  const load = useCallback(async (force = false) => {
    if (refsCache && !force) {
      setRefs(refsCache)
      return refsCache
    }
    if (!refsPromise || force) {
      refsPromise = Promise.all([crm.team().catch(() => []), crm.partners().catch(() => [])])
        .then(([team, partners]) => {
          refsCache = { team, partners }
          return refsCache
        })
        .finally(() => {
          refsPromise = null
        })
    }
    const result = await refsPromise
    setRefs(result)
    return result
  }, [])
  useEffect(() => {
    load()
  }, [load])
  return { ...refs, refreshRefs: () => load(true) }
}

export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const show = useCallback((message, tone = 'ok') => {
    setToast({ message, tone })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 3200)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  const node = toast ? (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-[70] max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${
        toast.tone === 'error' ? 'bg-danger-700 text-white' : 'bg-ink-950 text-white'
      }`}
    >
      {toast.message}
    </div>
  ) : null
  return [node, show]
}

export function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

/* ═══════════════════════════════════════════════════════════════════════
   Primitives
   ═══════════════════════════════════════════════════════════════════════ */
const TONES = {
  green: 'bg-brand-50 text-brand-800',
  amber: 'bg-sun-50 text-sun-700',
  red: 'bg-danger-100 text-danger-700',
  blue: 'bg-info-100 text-info-700',
  gray: 'bg-mist-100 text-mist-800',
  teal: 'bg-brand-50 text-brand-700',
  ink: 'bg-iris-100 text-iris-700',
}
const DOTS = {
  green: 'bg-brand-800',
  amber: 'bg-sun-600',
  red: 'bg-danger-600',
  blue: 'bg-info-700',
  gray: 'bg-mist-400',
  teal: 'bg-brand-600',
  ink: 'bg-iris-700',
}

// Accent strip colour for fully coloured table cells (matches DOTS).
const ACCENTS = {
  green: 'var(--color-brand-800)',
  amber: 'var(--color-sun-600)',
  red: 'var(--color-danger-600)',
  blue: 'var(--color-info-700)',
  gray: 'var(--color-mist-400)',
  teal: 'var(--color-brand-600)',
  ink: 'var(--color-iris-700)',
}

export function Pill({ tone = 'gray', children, dot = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-semibold ${TONES[tone] || TONES.gray} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone] || DOTS.gray}`} />}
      {children}
    </span>
  )
}

export function EnumPill({ list, value, dot = true }) {
  if (!value) return <span className="text-mist-500">—</span>
  return <Pill tone={toneOf(list, value)} dot={dot}>{labelOf(list, value)}</Pill>
}

export function Dot({ tone = 'teal' }) {
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DOTS[tone] || DOTS.teal}`} />
}

const BTN = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 border border-brand-600',
  secondary: 'bg-white text-ink-950 border border-mist-300 hover:bg-mist-25',
  ghost: 'bg-transparent text-brand-700 border border-transparent hover:bg-brand-50',
  danger: 'bg-white text-danger-600 border border-danger-200 hover:bg-danger-50',
  dark: 'bg-ink-950 text-white border border-ink-950 hover:bg-ink-800',
}
export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const sizes = { sm: 'min-h-8 px-2.5 text-[12.5px]', md: 'min-h-9 px-3.5 text-[13.5px]', lg: 'min-h-10 px-5 text-sm' }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-55 ${sizes[size]} ${BTN[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

/*
 * Page title row. The module name is already in the navigation above, so the small
 * label over the title is opt-in (pass `eyebrow`). `count` shows a chip like "12 open".
 */
export function PageHeader({ eyebrow, title, subtitle, actions, count }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[13px] font-semibold text-brand-700">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="m-0 text-[24px] font-semibold tracking-[-0.02em] text-ink-950">{title}</h1>
          {count != null && count !== '' && (
            <span className="rounded-md bg-mist-100 px-2.5 py-0.5 text-[12.5px] font-medium text-mist-700">{count}</span>
          )}
        </div>
        {subtitle && <p className="mt-1 max-w-3xl text-[13.5px] text-mist-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, actions, children, className = '', bodyClassName = '', subtitle }) {
  return (
    <section className={`min-w-0 rounded-[12px] border border-mist-200 bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mist-200 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="m-0 text-[15px] font-semibold text-ink-950">{title}</h2>}
            {subtitle && <p className="m-0 mt-0.5 text-[12.5px] text-mist-600">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  )
}

/* Note under a KPI takes the meaning color of its tone (teal = normal, red = needs action …) */
const KPI_NOTE = {
  teal: 'text-brand-700',
  green: 'text-success-600',
  amber: 'text-sun-600',
  red: 'text-danger-600',
  blue: 'text-info-600',
  ink: 'text-iris-600',
  gray: 'text-mist-600',
}

export function Kpi({ label, value, hint, tone = 'teal', onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`group rounded-[12px] border border-mist-200 bg-white px-5 py-4 text-left ${
        onClick ? 'transition-colors hover:border-brand-300 focus-visible:outline-2 focus-visible:outline-brand-500' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-mist-600">{label}</span>
        {onClick && <Icon name="arrowRight" className="h-3.5 w-3.5 text-mist-300 transition-colors group-hover:text-brand-600" />}
      </div>
      <div className="mt-1.5 font-mono text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink-950">{value ?? '—'}</div>
      {hint && <div className={`mt-1 text-[12.5px] font-medium ${KPI_NOTE[tone] || KPI_NOTE.teal}`}>{hint}</div>}
    </Tag>
  )
}

export function Alert({ tone = 'error', children }) {
  if (!children) return null
  const cls = tone === 'error'
    ? 'border-danger-200 bg-danger-50 text-danger-600'
    : tone === 'warn'
      ? 'border-sun-100 bg-sun-50 text-sun-700'
      : 'border-brand-100 bg-brand-50 text-brand-800'
  return <div role="alert" className={`mb-4 rounded-lg border px-3.5 py-3 text-sm font-medium ${cls}`}>{children}</div>
}

export function Empty({ title = 'Nothing here yet', children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-mist-200 bg-mist-25 px-4 py-10 text-center">
      <p className="m-0 text-sm font-semibold text-navy">{title}</p>
      {children && <p className="m-0 mt-1 max-w-md text-[13px] text-mist-700">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Loading({ label = 'Loading…' }) {
  return <LogoLoader label={label} className="px-1 py-8" />
}

const AVATAR_TONES = {
  teal: 'bg-brand-100 text-brand-800',
  blue: 'bg-info-100 text-info-700',
  ink: 'bg-iris-100 text-iris-700',
  sun: 'bg-sun-100 text-sun-700',
  green: 'bg-success-100 text-success-700',
}
const AVATAR_CYCLE = ['teal', 'ink', 'sun', 'green', 'blue']

export function Avatar({ name, size = 'md', tone }) {
  const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-[12px]', lg: 'h-14 w-14 text-[18px]' }
  const key = tone || AVATAR_CYCLE[[...String(name || '?')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR_CYCLE.length]
  const bg = AVATAR_TONES[key] || AVATAR_TONES.teal
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${bg}`}>
      {initials(name)}
    </span>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-mist-200" role="tablist">
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`relative px-3.5 pb-2.5 pt-2 text-[13px] font-medium transition-colors ${active ? 'font-semibold text-ink-950' : 'text-mist-600 hover:text-ink-950'}`}
          >
            {t.label}
            {t.count != null && (
              <span className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[11px] ${active ? 'bg-brand-50 text-brand-700' : 'bg-mist-100 text-mist-500'}`}>
                {t.count}
              </span>
            )}
            {active && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-sm bg-brand-600" />}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-mist-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition ${
            value === o.value ? 'bg-white text-ink-950 shadow-[0_1px_2px_rgba(17,20,58,0.1)]' : 'text-mist-600 hover:text-ink-950'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Toolbar & filters
   ═══════════════════════════════════════════════════════════════════════ */
export function Toolbar({ children, right }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative min-w-[200px] flex-1 sm:max-w-xs ${className}`}>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-lg border border-mist-200 bg-white pl-8 pr-3 text-[13px] outline-none transition placeholder:text-mist-500 hover:border-mist-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-400/15"
      />
    </div>
  )
}

export function FilterSelect({ value, onChange, options, allLabel = 'All', label }) {
  const isAll = value === 'ALL' || value === '' || value == null
  const filtering = allLabel != null && !isAll
  const current = isAll ? allLabel : (options.find((o) => String(o.value) === String(value))?.label ?? value)
  const showValue = !isAll || allLabel == null || !label
  return (
    <label
      className={`relative inline-flex h-8 max-w-[260px] cursor-pointer items-center gap-1 rounded-lg border px-3 text-[12.5px] transition-colors focus-within:ring-4 focus-within:ring-brand-400/15 ${
        filtering
          ? 'border-brand-200 bg-brand-50 text-brand-800'
          : isAll && allLabel != null
            ? 'border-dashed border-mist-300 bg-white text-mist-700 hover:border-mist-400 hover:text-ink-950'
            : 'border-mist-200 bg-white text-ink-950 hover:border-mist-300'
      }`}
    >
      {label && <span className="shrink-0 font-medium">{label}{showValue ? ':' : ''}</span>}
      {showValue && <span className="truncate font-semibold">{current}</span>}
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 opacity-70" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label || allLabel || 'Filter'}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        {allLabel != null && <option value="ALL">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </label>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Table
   ═══════════════════════════════════════════════════════════════════════ */
export function DataTable({ columns, rows, loading, empty = 'No records yet.', onRowClick, selectable, selected = [], onSelect, pageSize = 25 }) {
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState(null)
  useEffect(() => setPage(0), [rows])

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    const get = col?.sortValue || ((r) => r[sort.key])
    return [...rows].sort((a, b) => {
      const va = get(a) ?? ''
      const vb = get(b) ?? ''
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort, columns])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize)
  const allChecked = selectable && visible.length > 0 && visible.every((r) => selected.includes(r.id))

  return (
    <div className="overflow-hidden rounded-[12px] border border-mist-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-mist-25">
              {selectable && (
                <th className="w-10 border-b border-mist-200 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allChecked}
                    onChange={(e) => {
                      const ids = visible.map((r) => r.id)
                      onSelect(e.target.checked ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.includes(id)))
                    }}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap border-b border-mist-200 px-3 py-2.5 text-[12px] font-semibold text-mist-600 ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.sortable === false ? col.label : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-ink-950"
                      onClick={() => setSort((s) => (s?.key === col.key ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: col.key, dir: 'asc' }))}
                    >
                      {col.label}
                      {sort?.key === col.key && <Icon name={sort.dir === 'asc' ? 'chevronUp' : 'chevronDown'} className="h-3 w-3" strokeWidth={2.4} />}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="px-3"><Loading /></td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="px-3 py-10 text-center text-sm text-mist-700">{empty}</td></tr>
            )}
            {!loading && visible.map((row) => (
              <tr
                key={row.id}
                className={`transition hover:bg-mist-25 ${onRowClick ? 'cursor-pointer' : ''} ${selected.includes(row.id) ? 'bg-brand-50' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selectable && (
                  <td className="border-b border-mist-200 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label="Select row"
                      checked={selected.includes(row.id)}
                      onChange={(e) => onSelect(e.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-b border-mist-100 px-3 py-3 text-[13.5px] text-ink-950 ${col.align === 'right' ? 'text-right' : ''} ${col.nowrap ? 'whitespace-nowrap' : ''} ${col.toneList && row[col.key] ? `tone-cell ${TONES[toneOf(col.toneList, row[col.key])] || TONES.gray}` : ''}`}
                    style={col.toneList && row[col.key] ? { '--tone-accent': ACCENTS[toneOf(col.toneList, row[col.key])] || ACCENTS.gray } : undefined}
                  >
                    {(() => {
                      const v = col.render ? col.render(row) : row[col.key]
                      return v === null || v === undefined || v === '' || v === '—' ? <span className="text-mist-300">—</span> : v
                    })()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length > pageSize && (
        <div className="flex items-center justify-between border-t border-mist-200 px-3 py-2 text-[12.5px] text-mist-700">
          <span>
            {page * pageSize + 1}–{Math.min(rows.length, (page + 1) * pageSize)} of {rows.length}
          </span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Modal + config-driven form
   ═══════════════════════════════════════════════════════════════════════ */
export function Modal({ open, title, subtitle, onClose, children, footer, size = 'lg' }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/45 px-3 py-6 sm:py-10" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" className={`flex max-h-[calc(100vh-48px)] w-full ${widths[size]} flex-col overflow-hidden rounded-[14px] border border-mist-200 bg-white shadow-[0_24px_48px_-16px_rgba(17,20,58,0.28)]`}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-mist-200 px-5 py-4">
          <div>
            <h2 className="m-0 text-lg font-semibold text-ink-950">{title}</h2>
            {subtitle && <p className="m-0 mt-0.5 text-[13px] text-mist-700">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-semibold text-mist-700 hover:bg-mist-50 hover:text-navy" aria-label="Close">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-mist-200 bg-white px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/**
 * Config-driven form in a modal.
 * sections: [{ title, hint, fields: [{ name, label, type, required, options, span, placeholder, hint, show(values) }] }]
 * Field types: text, email, tel, number, date, datetime, textarea, select, checkbox, patient, member, partner, heading
 */
export function FormModal({ open, title, subtitle, sections, initial, onSubmit, onClose, submitLabel = 'Save', size = 'lg', extraFooter }) {
  const [values, setValues] = useState(initial || {})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { team, partners } = useCrmRefs()

  useEffect(() => {
    if (open) {
      setValues(initial || {})
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (name, v) => setValues((prev) => ({ ...prev, [name]: v }))

  async function run(fn) {
    setSaving(true)
    setError('')
    try {
      await fn(values)
    } catch (err) {
      setError(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  async function submit(e) {
    e?.preventDefault()
    const missing = sections
      .flatMap((s) => s.fields)
      .filter((f) => f.required && (!f.show || f.show(values)))
      .filter((f) => values[f.name] === undefined || values[f.name] === null || String(values[f.name]).trim() === '')
    if (missing.length) {
      setError(`Please complete: ${missing.map((f) => f.label.replace(' *', '')).join(', ')}`)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit(values, setValues)
    } catch (err) {
      setError(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      size={size}
      footer={
        <>
          {error && <p className="mr-auto max-w-[60%] text-[13px] font-semibold text-warn" role="alert">{error}</p>}
          {typeof extraFooter === 'function' ? extraFooter(values, run, saving) : extraFooter}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : submitLabel}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {sections.map((section, i) => {
          const fields = section.fields.filter((f) => !f.show || f.show(values))
          if (!fields.length) return null
          return (
            <section key={section.title || i}>
              {section.title && <h3 className="m-0 mb-0.5 text-[12px] font-semibold text-brand-700">{section.title}</h3>}
              {section.hint && <p className="m-0 mb-2 text-[12.5px] text-mist-700">{section.hint}</p>}
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {fields.map((field) => (
                  <Field key={field.name} field={field} value={values[field.name]} values={values} onChange={(v) => set(field.name, v)} team={team} partners={partners} />
                ))}
              </div>
            </section>
          )
        })}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}

const INPUT = 'mt-1 w-full rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm font-normal text-navy outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15'

export function Field({ field, value, values, onChange, team = [], partners = [] }) {
  const span = field.span === 2 || field.type === 'textarea' ? 'sm:col-span-2' : ''
  if (field.type === 'heading') {
    return <p className="m-0 text-[12px] font-semibold text-mist-700 sm:col-span-2">{field.label}</p>
  }
  if (field.type === 'checkbox') {
    return (
      <label className={`flex items-center gap-2 pt-1 text-[13px] font-semibold text-navy ${span}`}>
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    )
  }
  let control
  if (field.type === 'select' || field.type === 'member' || field.type === 'partner') {
    const options = field.type === 'member'
      ? team.map((m) => ({ value: m.userId, label: m.fullName }))
      : field.type === 'partner'
        ? partners.map((p) => ({ value: p.id, label: p.name }))
        : (typeof field.options === 'function' ? field.options(values) : field.options) || []
    const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
    control = (
      <Select className={INPUT} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {!field.noEmpty && <option value="">{field.emptyLabel || (field.type === 'member' ? 'Unassigned' : '—')}</option>}
        {normalized.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    )
  } else if (field.type === 'textarea') {
    control = <textarea className={INPUT} rows={field.rows || 3} value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
  } else if (field.type === 'patient') {
    control = <PatientPicker value={value} label={values?.[`__${field.name}Label`]} onChange={onChange} lifecycle={field.lifecycle} />
  } else {
    const type = field.type === 'datetime' ? 'datetime-local' : field.type || 'text'
    control = (
      <input
        className={INPUT}
        type={type}
        value={value ?? ''}
        placeholder={field.placeholder}
        step={field.step}
        min={field.min}
        max={field.max}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <label className={`block text-[12.5px] font-semibold text-navy ${span}`}>
      {field.label}
      {control}
      {field.hint && <span className="mt-1 block text-[11.5px] font-normal text-mist-500">{field.hint}</span>}
    </label>
  )
}

/** Async patient/lead search select. */
export function PatientPicker({ value, label, onChange, lifecycle }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [current, setCurrent] = useState(label || '')
  const debounced = useDebounced(query, 250)
  const ref = useRef(null)

  useEffect(() => {
    setCurrent(label || '')
  }, [label])

  useEffect(() => {
    if (value && !current) {
      crm.patient(value).then((p) => setCurrent(`${p.fullName}${p.phone ? ` · ${p.phone}` : ''}`)).catch(() => {})
    }
  }, [value, current])

  useEffect(() => {
    if (!open) return
    let alive = true
    crm.patients({ q: debounced || undefined, lifecycle })
      .then((rows) => alive && setResults(rows.slice(0, 12)))
      .catch(() => alive && setResults([]))
    return () => {
      alive = false
    }
  }, [debounced, open, lifecycle])

  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <input
        className={INPUT}
        value={open ? query : current}
        placeholder="Search patient or lead by name, phone, MRN…"
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="menu-surface absolute left-0 right-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto">
          {results.length === 0 && <p className="m-0 px-3 py-3 text-[13px] text-mist-500">No matches</p>}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="menu-item justify-between"
              onClick={() => {
                onChange(p.id)
                setCurrent(`${p.fullName}${p.phone ? ` · ${p.phone}` : ''}`)
                setOpen(false)
              }}
            >
              <span>
                <b className="text-navy">{p.fullName}</b>
                <span className="ml-2 text-mist-500">{p.phone || p.email || ''}</span>
              </span>
              <Pill tone={p.lifecycleStage === 'PATIENT' ? 'green' : 'blue'}>{p.lifecycleStage === 'PATIENT' ? 'Patient' : 'Lead'}</Pill>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Small prompt for a single reason / note (status changes, cancellations). */
export function PromptModal({ open, title, label, required, confirmLabel = 'Confirm', onConfirm, onClose, options }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (open) {
      setValue('')
      setError('')
    }
  }, [open])
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-warn">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              if (required && !value.trim()) {
                setError('This is required.')
                return
              }
              setBusy(true)
              try {
                await onConfirm(value.trim())
              } catch (err) {
                setError(err.message || 'Failed')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Saving…' : confirmLabel}
          </Button>
        </>
      }
    >
      <label className="block text-[12.5px] font-semibold text-navy">
        {label}
        {options ? (
          <Select className={INPUT} value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">Select…</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        ) : (
          <textarea className={INPUT} rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
        )}
      </label>
    </Modal>
  )
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Delete', onConfirm, onClose, danger = true }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="m-0 text-sm text-mist-700">{message}</p>
    </Modal>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Activity timeline
   ═══════════════════════════════════════════════════════════════════════ */
const ACTIVITY_ICON = {
  CALL_INBOUND: 'phoneIn',
  CALL_OUTBOUND: 'phoneOut',
  NOTE: 'note',
  SMS: 'message',
  EMAIL: 'mail',
  MEETING: 'calendar',
  STATUS_CHANGE: 'swap',
  SYSTEM: 'info',
}
const ACTIVITY_TONE = {
  CALL_INBOUND: 'bg-brand-50 text-brand-700',
  CALL_OUTBOUND: 'bg-brand-50 text-brand-700',
  NOTE: 'bg-sun-50 text-sun-700',
  SMS: 'bg-info-100 text-info-700',
  EMAIL: 'bg-info-100 text-info-700',
  MEETING: 'bg-iris-100 text-iris-700',
  STATUS_CHANGE: 'bg-mist-100 text-mist-800',
  SYSTEM: 'bg-mist-100 text-mist-500',
}

export function Timeline({ items, loading, showPatient = false, empty = 'No activity yet.' }) {
  if (loading) return <Loading />
  if (!items?.length) return <p className="m-0 py-4 text-sm text-mist-500">{empty}</p>
  return (
    <ol className="relative m-0 list-none space-y-0 p-0">
      {items.map((a, i) => (
        <li key={a.id} className="relative flex gap-3 pb-4">
          {i < items.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-mist-200" />}
          <span className={`z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold ${ACTIVITY_TONE[a.type] || ACTIVITY_TONE.SYSTEM}`}>
            <Icon name={a.callOutcome === 'Missed' ? 'phoneMissed' : ACTIVITY_ICON[a.type] || 'info'} className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="m-0 text-[13.5px] font-semibold text-navy">
                {a.subject}
                {showPatient && a.patientName && <span className="font-normal text-mist-500"> · {a.patientName}</span>}
              </p>
              <span className="text-[11.5px] text-mist-500" title={fmtDateTime(a.occurredAt)}>{fmtRelative(a.occurredAt)}</span>
            </div>
            {a.body && <p className="m-0 mt-0.5 whitespace-pre-line text-[13px] text-mist-700">{a.body}</p>}
            <p className="m-0 mt-0.5 text-[11.5px] text-mist-500">
              {a.actorName || 'System'}
              {a.durationSeconds ? ` · ${Math.round(a.durationSeconds / 60)} min` : ''}
              {a.phone && (a.type === 'CALL_INBOUND' || a.type === 'CALL_OUTBOUND') ? ` · ${a.phone}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Simple horizontal bars (dashboard). */
export function BarList({ rows, color = '#1E8E94', format = (v) => v }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0))
  if (!rows.length) return <p className="m-0 text-sm text-mist-500">No data yet.</p>
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[minmax(0,1.1fr)_minmax(80px,1.6fr)_auto] items-center gap-2.5 text-[13px]">
          <span className="truncate font-medium text-navy" title={row.label}>{row.label}</span>
          <span className="h-2 overflow-hidden rounded-sm bg-mist-100">
            <i className="block h-full rounded-sm" style={{ width: `${row.value ? Math.max(4, (row.value / max) * 100) : 0}%`, background: row.color || color }} />
          </span>
          <b className="min-w-[3ch] text-right font-mono font-semibold text-ink-950">{format(row.value)}</b>
        </div>
      ))}
    </div>
  )
}

/** Health-care style stage path (chevrons). */
export function StagePath({ stages, value, onSelect, disabled }) {
  const idx = stages.findIndex((s) => s.value === value)
  return (
    <div className="flex w-full gap-1 overflow-x-auto rounded-[12px] border border-mist-200 bg-white p-1">
      {stages.map((s, i) => {
        const current = i === idx
        const done = idx > -1 && i < idx
        const lost = s.value === 'LOST' || s.value === 'DECLINED' || s.value === 'CANCELLED' || s.value === 'NOT_QUALIFIED'
        return (
          <button
            key={s.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.(s.value)}
            className={`relative flex min-w-[110px] flex-1 items-center justify-center gap-1 rounded-[8px] px-3 py-2 text-[12px] font-semibold transition ${
              current
                ? lost ? 'bg-danger-600 text-white' : 'bg-brand-600 text-white'
                : done
                  ? 'bg-brand-50 text-brand-800 hover:bg-brand-100'
                  : 'bg-mist-50 text-mist-500 hover:bg-mist-100'
            } ${disabled ? 'cursor-default' : ''}`}
            title={s.label}
          >
            {done && <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />}
            <span className="truncate">{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function DetailGrid({ items }) {
  return (
    <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.filter(Boolean).map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[12.5px] font-medium text-mist-600">{label}</dt>
          <dd className="m-0 mt-0.5 break-words text-[13.5px] text-navy">{value === null || value === undefined || value === '' ? '—' : value}</dd>
        </div>
      ))}
    </dl>
  )
}
