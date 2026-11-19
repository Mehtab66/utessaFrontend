import { useEffect, useRef, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { useNavigate } from 'react-router-dom'
import { crm } from './crmApi'
import { Pill, useDebounced } from './ui'

const TYPE = {
  LEAD: ['blue', 'Lead'],
  PATIENT: ['green', 'Patient'],
  OPPORTUNITY: ['ink', 'Opportunity'],
  PARTNER: ['amber', 'Partner'],
}

/** Header search across patients, leads, opportunities and referral partners. */
export default function GlobalSearch({ enabled = true }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const debounced = useDebounced(q, 250)
  const ref = useRef(null)
  const inputRef = useRef(null)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

  /* Ctrl+K / ⌘K focuses the search from anywhere */
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!enabled || debounced.trim().length < 2) {
      setResults([])
      return undefined
    }
    let alive = true
    setLoading(true)
    crm.search(debounced.trim())
      .then((r) => alive && (setResults(r), setActive(0)))
      .catch(() => alive && setResults([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [debounced, enabled])

  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function go(r) {
    setOpen(false)
    setQ('')
    navigate(r.link)
  }

  const digits = q.replace(/\D/g, '')
  return (
    <div className="relative mx-auto flex w-full max-w-lg items-center" ref={ref}>
      <span className="pointer-events-none absolute left-3.5 text-mist-500">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
        </svg>
      </span>
      <input
        ref={inputRef}
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1))
          if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
          if (e.key === 'Enter' && results[active]) go(results[active])
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder={enabled ? 'Search patients, leads, phone, MRN, opportunities…' : 'Search…'}
        aria-label="Global search"
        className="h-10 w-full rounded-lg border border-mist-200 bg-mist-50 pl-10 pr-16 text-[13.5px] text-ink-950 placeholder-mist-500 outline-none transition hover:border-mist-300 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-400/15"
      />
      <kbd className="pointer-events-none absolute right-3 hidden items-center gap-0.5 rounded-md border border-mist-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-mist-600 sm:inline-flex">
        {isMac ? '⌘' : 'Ctrl'} K
      </kbd>
      {open && enabled && q.trim().length >= 2 && (
        <div className="menu-panel absolute left-0 right-0 top-12 z-50">
          {loading && results.length === 0 && <p className="m-0 px-4 py-3 text-[13px] text-mist-500">Searching…</p>}
          {!loading && results.length === 0 && <p className="m-0 px-4 py-3 text-[13px] text-mist-500">No matches for “{q}”.</p>}
          <ul className="m-0 max-h-80 list-none overflow-y-auto p-1.5">
            {results.map((r, i) => {
              const [tone, label] = TYPE[r.type] || TYPE.LEAD
              return (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    data-active={i === active || undefined}
                    className="menu-item justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-ink-950">{r.title}</span>
                      <span className="block truncate text-[12px] text-mist-500">{r.subtitle}</span>
                    </span>
                    <Pill tone={tone}>{label}</Pill>
                  </button>
                </li>
              )
            })}
          </ul>
          {digits.length >= 7 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate(`/app/crm/call-desk?phone=${encodeURIComponent(q.trim())}`)
              }}
              className="w-full border-t border-mist-100 px-4 py-2.5 text-left text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50"
            >
              <span className="inline-flex items-center gap-1.5"><Icon name="phone" /> Look up {q.trim()} on Calls</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
