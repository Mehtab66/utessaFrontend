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
    <div className="relative mx-auto flex w-full max-w-md items-center" ref={ref}>
      <span className="pointer-events-none absolute left-3 text-[#9aaac8]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
        </svg>
      </span>
      <input
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
        className="h-9 w-full rounded-lg border border-[#d8dae5] bg-white pl-9 pr-3 text-[13px] text-[#171d39] placeholder-[#9aaac8] outline-none transition focus:border-[#2f54eb] focus:ring-2 focus:ring-[#2f54eb]/15"
      />
      {open && enabled && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-2xl border border-[#e0e2e9] bg-white shadow-xl">
          {loading && results.length === 0 && <p className="m-0 px-4 py-3 text-[13px] text-[#687699]">Searching…</p>}
          {!loading && results.length === 0 && <p className="m-0 px-4 py-3 text-[13px] text-[#687699]">No matches for “{q}”.</p>}
          <ul className="m-0 max-h-80 list-none overflow-y-auto p-1">
            {results.map((r, i) => {
              const [tone, label] = TYPE[r.type] || TYPE.LEAD
              return (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left ${i === active ? 'bg-[#F3FAFA]' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-[#171d39]">{r.title}</span>
                      <span className="block truncate text-[12px] text-[#687699]">{r.subtitle}</span>
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
              className="w-full border-t border-[#f0f1f7] px-4 py-2.5 text-left text-[12.5px] font-semibold text-[#0A7A82] hover:bg-[#F3FAFA]"
            >
              <span className="inline-flex items-center gap-1.5"><Icon name="phone" /> Look up {q.trim()} on Calls</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
