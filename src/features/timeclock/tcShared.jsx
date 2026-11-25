import { useEffect, useState } from 'react'
import { Button, Modal, Pill } from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { tc } from './timeclockApi'

/* ═══════════════════════════════════════════════════════════════════════
   Formatting — every time is shown in the practice's time zone
   ═══════════════════════════════════════════════════════════════════════ */

/** 450 → "7h 30m" */
export function fmtMins(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}m`
  return r === 0 ? `${h}h` : `${h}h ${r}m`
}

/** 450 → "7.50" (decimal hours, as payroll uses) */
export const fmtHours = (minutes) => ((Number(minutes) || 0) / 60).toFixed(2)

export function fmtClock(iso, tz) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz || undefined })
}

/** 'YYYY-MM-DD' → "Mon, Nov 3" (no time zone shifting: it's a calendar date). */
export function fmtDay(date, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  if (!date) return '—'
  const [y, m, d] = String(date).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], opts)
}

export function fmtRange(start, end) {
  if (!start || !end) return ''
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  return `${fmtDay(start, { month: 'short', day: 'numeric' })} – ${fmtDay(end, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })}${sameYear ? `, ${end.slice(0, 4)}` : ''}`
}

export function fmtDateTime(iso, tz) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz || undefined })
}

/** Today's calendar date in a time zone, as 'YYYY-MM-DD'. */
export function todayIn(tz) {
  return partsIn(new Date(), tz).date
}

function partsIn(date, tz) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || undefined, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]))
  const hour = p.hour === '24' ? '00' : p.hour
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` }
}

/** ISO instant → { date: 'YYYY-MM-DD', time: 'HH:mm' } as seen in the practice's time zone. */
export function zonedParts(iso, tz) {
  return iso ? partsIn(new Date(iso), tz) : { date: '', time: '' }
}

/** Wall-clock date + time in a time zone → ISO instant (handles daylight saving). */
export function zonedIso(date, time, tz) {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const wanted = Date.UTC(y, mo - 1, d, h, mi)
  let guess = wanted
  for (let i = 0; i < 2; i += 1) {
    const p = partsIn(new Date(guess), tz)
    const [py, pm, pd] = p.date.split('-').map(Number)
    const [ph, pmi] = p.time.split(':').map(Number)
    const seen = Date.UTC(py, pm - 1, pd, ph, pmi)
    guess += wanted - seen
  }
  return new Date(guess).toISOString()
}

export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

/* ═══════════════════════════════════════════════════════════════════════
   Status pills
   ═══════════════════════════════════════════════════════════════════════ */

export const SHEET_STATUS = {
  OPEN: { label: 'Not submitted', tone: 'gray' },
  SUBMITTED: { label: 'Waiting for approval', tone: 'blue' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Sent back', tone: 'red' },
}

export function SheetStatus({ status }) {
  const s = SHEET_STATUS[status] || SHEET_STATUS.OPEN
  return <Pill tone={s.tone} dot>{s.label}</Pill>
}

export const PTO_TYPES = [
  { value: 'VACATION', label: 'Vacation' },
  { value: 'SICK', label: 'Sick' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'BEREAVEMENT', label: 'Bereavement' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'UNPAID', label: 'Unpaid leave' },
]
export const ptoLabel = (v) => PTO_TYPES.find((t) => t.value === v)?.label || v

export const PTO_STATUS = {
  PENDING: { label: 'Pending', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'green' },
  DENIED: { label: 'Denied', tone: 'red' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
}

export const STATE = {
  IN: { label: 'Working', tone: 'green' },
  BREAK: { label: 'On break', tone: 'amber' },
  OUT: { label: 'Clocked out', tone: 'gray' },
}

/* ═══════════════════════════════════════════════════════════════════════
   Pay period navigation
   ═══════════════════════════════════════════════════════════════════════ */

export function PeriodNav({ start, end, prev, next, onChange, isCurrent, onToday }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="secondary" size="sm" onClick={() => onChange(prev)} aria-label="Previous pay period">
        <Icon name="chevronLeft" className="h-4 w-4" />
      </Button>
      <span className="min-w-[180px] text-center text-[13.5px] font-semibold text-ink-950">{fmtRange(start, end)}</span>
      <Button variant="secondary" size="sm" onClick={() => onChange(next)} aria-label="Next pay period">
        <Icon name="chevronRight" className="h-4 w-4" />
      </Button>
      {!isCurrent && onToday && (
        <Button variant="ghost" size="sm" onClick={onToday}>Current period</Button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Add / correct a shift
   ═══════════════════════════════════════════════════════════════════════ */

const INPUT = 'mt-1 w-full rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15'

/**
 * entry: existing shift to edit (or null to add one). userId: whose time (null = yourself).
 * Times are entered in the practice's time zone. A clock-out earlier than clock-in means the next day.
 */
export function EntryModal({ open, entry, userId, userName, tz, defaultDate, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const editingOpen = Boolean(entry && !entry.clockOut)

  useEffect(() => {
    if (!open) return
    const inP = zonedParts(entry?.clockIn, tz)
    const outP = zonedParts(entry?.clockOut, tz)
    setForm({
      date: inP.date || defaultDate || todayIn(tz),
      inTime: inP.time || '09:00',
      outTime: entry ? outP.time : '17:00',
      breakMinutes: entry ? String(entry.breakMinutes ?? 0) : '30',
      note: entry?.note || '',
      reason: '',
    })
    setError('')
  }, [open, entry, tz, defaultDate])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e?.preventDefault()
    if (!form.date || !form.inTime) return setError('Enter the date and clock-in time.')
    if (!editingOpen && !form.outTime) return setError('Enter the clock-out time.')
    if (!form.reason.trim()) return setError('Add a short reason. It is kept in the history.')
    const clockIn = zonedIso(form.date, form.inTime, tz)
    let clockOut = null
    if (form.outTime) {
      const outDate = form.outTime <= form.inTime ? addDays(form.date, 1) : form.date
      clockOut = zonedIso(outDate, form.outTime, tz)
    }
    const body = {
      userId: userId || undefined,
      clockIn,
      clockOut,
      breakMinutes: Number(form.breakMinutes) || 0,
      note: form.note,
      reason: form.reason,
    }
    setSaving(true)
    setError('')
    try {
      const saved = entry ? await tc.updateEntry(entry.id, body) : await tc.createEntry(body)
      onSaved?.(saved)
    } catch (err) {
      setError(err.message || 'Could not save the shift.')
    } finally {
      setSaving(false)
    }
  }

  const overnight = form.outTime && form.inTime && form.outTime <= form.inTime

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={entry ? 'Correct shift' : 'Add a missed shift'}
      subtitle={`${userName ? `${userName} · ` : ''}Times are in ${tz}`}
      footer={(
        <>
          {error && <p className="mr-auto max-w-[60%] text-[13px] font-semibold text-danger-600" role="alert">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : entry ? 'Save changes' : 'Add shift'}</Button>
        </>
      )}
    >
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <label className="text-[13px] font-medium text-ink-900 sm:col-span-2">
          Date
          <input type="date" className={INPUT} value={form.date || ''} onChange={set('date')} required />
        </label>
        <label className="text-[13px] font-medium text-ink-900">
          Clock in
          <input type="time" className={INPUT} value={form.inTime || ''} onChange={set('inTime')} required />
        </label>
        <label className="text-[13px] font-medium text-ink-900">
          Clock out{editingOpen && <span className="font-normal text-mist-500"> (leave empty if still working)</span>}
          <input type="time" className={INPUT} value={form.outTime || ''} onChange={set('outTime')} required={!editingOpen} />
          {overnight && <span className="mt-1 block text-[12px] text-mist-600">Ends the next day</span>}
        </label>
        <label className="text-[13px] font-medium text-ink-900">
          Breaks (minutes)
          <input type="number" min="0" step="5" className={INPUT} value={form.breakMinutes ?? ''} onChange={set('breakMinutes')} />
        </label>
        <label className="text-[13px] font-medium text-ink-900">
          Note <span className="font-normal text-mist-500">(optional)</span>
          <input className={INPUT} value={form.note || ''} onChange={set('note')} maxLength={500} placeholder="Front desk cover" />
        </label>
        <label className="text-[13px] font-medium text-ink-900 sm:col-span-2">
          Reason for the change
          <input className={INPUT} value={form.reason || ''} onChange={set('reason')} maxLength={500} placeholder="Forgot to clock in" required />
        </label>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Shift history (audit trail)
   ═══════════════════════════════════════════════════════════════════════ */

export function HistoryModal({ entryId, tz, onClose }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!entryId) return
    setItems(null)
    setError('')
    tc.history(entryId).then(setItems).catch((e) => setError(e.message))
  }, [entryId])
  return (
    <Modal open={Boolean(entryId)} onClose={onClose} size="md" title="Shift history" subtitle="Every change, who made it and why">
      {error && <p className="text-sm text-danger-600">{error}</p>}
      {!items && !error && <p className="text-sm text-mist-600">Loading…</p>}
      {items && (
        <ol className="space-y-3">
          {items.map((h, i) => (
            <li key={i} className="rounded-lg border border-mist-200 px-3.5 py-2.5">
              <p className="m-0 text-[13.5px] font-semibold text-ink-950">{h.summary}</p>
              <p className="m-0 mt-0.5 text-[12.5px] text-mist-600">
                {h.actorName || 'Someone'} · {fmtDateTime(h.at, tz)}
              </p>
              {h.reason && <p className="m-0 mt-1 text-[12.5px] text-ink-900">Reason: {h.reason}</p>}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}

/** Prompt for a required reason (used when deleting a shift). */
export function ReasonModal({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setReason(''); setError('') } }, [open])
  async function go() {
    if (reason.trim().length < 3) return setError('Add a short reason.')
    setBusy(true)
    try {
      await onConfirm(reason.trim())
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={(
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-danger-600">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={go} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
        </>
      )}
    >
      {message && <p className="m-0 mb-3 text-[13.5px] text-ink-900">{message}</p>}
      <label className="text-[13px] font-medium text-ink-900">
        Reason
        <textarea className={`${INPUT} min-h-[80px]`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} autoFocus />
      </label>
    </Modal>
  )
}
