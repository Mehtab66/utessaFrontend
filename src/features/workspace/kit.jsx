import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import { workspace } from './workspaceApi'

/* Shared building blocks for the always-on workspace pages. */

const INPUT = 'mt-1 w-full rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm text-navy outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15'

export function TextField({ label, value, onChange, type = 'text', placeholder, autoFocus, className = '' }) {
  return (
    <label className={`block text-[12.5px] font-semibold text-navy ${className}`}>
      {label}
      <input className={INPUT} type={type} value={value ?? ''} placeholder={placeholder} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

export function TextArea({ label, value, onChange, rows = 4, placeholder, className = '' }) {
  return (
    <label className={`block text-[12.5px] font-semibold text-navy ${className}`}>
      {label}
      <textarea className={INPUT} rows={rows} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

export function SelectField({ label, value, onChange, options, className = '', emptyLabel }) {
  return (
    <label className={`block text-[12.5px] font-semibold text-navy ${className}`}>
      {label}
      <select className={INPUT} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {emptyLabel && <option value="">{emptyLabel}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-mist-200 px-3 py-2.5 text-left transition hover:bg-mist-25">
      <span>
        <span className="block text-[13px] font-semibold text-navy">{label}</span>
        {hint && <span className="block text-[11.5px] text-mist-500">{hint}</span>}
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-mist-200'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

/** Page header used at the top of each workspace page. */
export function Hero({ icon, eyebrow = 'Workspace', title, subtitle, actions, accent = '#1E8E94' }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
          style={{ backgroundColor: `${accent}12`, borderColor: `${accent}33`, color: accent }}
        >
          <Icon name={icon} className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-[12px] font-semibold text-mist-500">{eyebrow}</p>
          <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em] text-navy">{title}</h1>
          {subtitle && <p className="m-0 mt-0.5 max-w-2xl text-[13.5px] text-mist-600">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatTile({ label, value, icon, tone = '#1E8E94', hint, onClick, active }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border bg-white p-4 text-left transition ${
        active ? 'border-brand-600 ring-2 ring-brand-600/10' : 'border-mist-200'
      } ${onClick ? 'hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(17,24,52,0.25)]' : ''}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${tone}1A`, color: tone }}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[22px] font-semibold leading-none tracking-[-0.03em] text-navy">{value ?? '—'}</span>
        <span className="mt-1 block text-[12px] font-medium text-mist-500">{label}</span>
        {hint && <span className="block text-[11px] text-mist-500">{hint}</span>}
      </span>
    </Tag>
  )
}

export function Chip({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
        active ? 'border-ink-950 bg-ink-950 text-white' : 'border-mist-200 bg-white text-mist-600 hover:border-mist-300'
      }`}
    >
      {children}
      {count != null && <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20' : 'bg-mist-50'}`}>{count}</span>}
    </button>
  )
}

/** Team members for assignee pickers (workspace endpoint — works without CRM). */
let teamCache = null
export function useTeam() {
  const [team, setTeam] = useState(teamCache || [])
  useEffect(() => {
    if (teamCache) return
    workspace.team().then((t) => { teamCache = t; setTeam(t) }).catch(() => {})
  }, [])
  return team
}

/** Opens a "create" modal when the URL carries ?new=1 (used by the top-bar New menu). */
export function useNewParam(open) {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('new') === '1') {
      open(Object.fromEntries(params.entries()))
      navigate(location.pathname, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])
}

export function relativeDay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date - today) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${-diff} days overdue`
  if (diff < 7) return date.toLocaleDateString([], { weekday: 'long' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function timeAgo(value) {
  if (!value) return ''
  const s = Math.round((Date.now() - new Date(value).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })
}
