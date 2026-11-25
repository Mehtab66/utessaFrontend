import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Kpi, Loading, PageHeader, Pill, useToast } from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { tc } from './timeclockApi'
import { EntryModal, STATE, SheetStatus, fmtClock, fmtDay, fmtMins, fmtRange, todayIn } from './tcShared'

/** Clock in & out: live shift timer, breaks, and today's and this week's hours. */
export default function TimeClockPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [toast, showToast] = useToast()
  const fetchedAt = useRef(Date.now())
  const [, tick] = useState(0)

  const load = useCallback(async () => {
    try {
      const s = await tc.status()
      fetchedAt.current = Date.now()
      setStatus(s)
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load your time.')
    }
  }, [])

  useEffect(() => { load() }, [load])
  // Tick every second for the live timer; refresh from the server every minute.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    const r = setInterval(load, 60000)
    return () => { clearInterval(t); clearInterval(r) }
  }, [load])

  async function act(fn, done) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const s = await fn()
      fetchedAt.current = Date.now()
      setStatus(s)
      setNote('')
      if (done) showToast(done)
    } catch (e) {
      setError(e.message || 'That didn’t work. Try again.')
      load()
    } finally {
      setBusy(false)
    }
  }

  if (!status && !error) return <Loading label="Loading your time…" />
  if (!status) return <Alert>{error}</Alert>

  const tz = status.timezone
  const elapsedMin = (Date.now() - fetchedAt.current) / 60000
  const state = status.state
  const live = (m) => (state === 'IN' ? m + elapsedMin : m)
  const currentWorked = status.current ? live(status.current.workedMinutes) : 0
  const breakSeconds = state === 'BREAK' && status.current?.onBreakSince ? (Date.now() - new Date(status.current.onBreakSince).getTime()) / 1000 : 0
  const locked = status.timesheetStatus === 'SUBMITTED' || status.timesheetStatus === 'APPROVED'

  return (
    <div>
      {toast}
      <PageHeader
        title="Clock in & out"
        subtitle={`${fmtDay(todayIn(tz), { weekday: 'long', month: 'long', day: 'numeric' })} · times in ${tz}`}
        actions={(
          <>
            {status.manualEntriesAllowed && (
              <Button variant="secondary" onClick={() => setAdding(true)}><Icon name="plus" className="h-4 w-4" /> Add a missed shift</Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/app/timeclock/timesheet')}>My timesheet</Button>
          </>
        )}
      />
      <Alert>{error}</Alert>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Punch card */}
        <section className="rounded-[14px] border border-mist-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <Pill tone={STATE[state].tone} dot>{STATE[state].label}</Pill>
            {status.since && (
              <span className="text-[13px] text-mist-600">
                {state === 'BREAK' ? 'Break started' : 'Clocked in'} at <b className="font-semibold text-ink-950">{fmtClock(status.since, tz)}</b>
              </span>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="m-0 text-[13px] font-medium text-mist-600">
              {state === 'OUT' ? 'You’re not clocked in' : state === 'BREAK' ? 'On break for' : 'This shift'}
            </p>
            <p className="m-0 mt-1 font-mono text-[52px] font-semibold leading-none tracking-[-0.03em] text-ink-950 tabular-nums" aria-live="polite">
              {state === 'OUT' ? '0:00:00' : state === 'BREAK' ? hms(breakSeconds) : hms(currentWorked * 60)}
            </p>
            {state === 'BREAK' && (
              <p className="m-0 mt-2 text-[13px] text-mist-600">Shift so far: {fmtMins(currentWorked)} worked</p>
            )}
          </div>

          {state === 'OUT' ? (
            <div className="mx-auto mt-6 max-w-sm">
              {locked ? (
                <Alert tone="warn">This pay period&apos;s timesheet is {status.timesheetStatus === 'APPROVED' ? 'approved' : 'submitted'}. Ask a manager to reopen it to clock in.</Alert>
              ) : (
                <>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    placeholder="Note for this shift (optional)"
                    className="mb-3 w-full rounded-lg border border-mist-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                  />
                  <Button size="lg" className="w-full" disabled={busy} onClick={() => act(() => tc.clockIn(note), 'Clocked in')}>
                    <Icon name="clock" className="h-4 w-4" /> Clock in
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-2">
              {state === 'IN' ? (
                <Button variant="secondary" size="lg" disabled={busy} onClick={() => act(tc.startBreak, 'Break started')}>Start break</Button>
              ) : (
                <Button variant="secondary" size="lg" disabled={busy} onClick={() => act(tc.endBreak, 'Welcome back')}>End break</Button>
              )}
              <Button variant="dark" size="lg" disabled={busy} onClick={() => act(() => tc.clockOut(), 'Clocked out')}>Clock out</Button>
            </div>
          )}
        </section>

        {/* Totals */}
        <div className="grid content-start gap-3">
          <Kpi label="Today" value={fmtMins(live(status.todayMinutes))} tone="teal" />
          <Kpi
            label="This week"
            value={fmtMins(live(status.weekMinutes))}
            hint={status.weekOvertimeMinutes > 0 ? `${fmtMins(status.weekOvertimeMinutes)} overtime` : 'No overtime'}
            tone={status.weekOvertimeMinutes > 0 ? 'amber' : 'gray'}
          />
          <div className="rounded-[12px] border border-mist-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-mist-600">Pay period · {fmtRange(status.periodStart, status.periodEnd)}</span>
              <SheetStatus status={status.timesheetStatus} />
            </div>
            <div className="mt-1.5 font-mono text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink-950">{fmtMins(live(status.periodMinutes))}</div>
          </div>
        </div>
      </div>

      <Card title="Today's shifts" className="mt-4" actions={<Button variant="ghost" size="sm" onClick={() => navigate('/app/timeclock/timesheet')}>Full timesheet</Button>}>
        {status.today.length === 0 ? (
          <p className="m-0 text-[13.5px] text-mist-600">No shifts yet today.</p>
        ) : (
          <ul className="divide-y divide-mist-100">
            {status.today.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[13.5px]">
                <span className="font-semibold text-ink-950">
                  {fmtClock(e.clockIn, tz)} – {e.clockOut ? fmtClock(e.clockOut, tz) : 'now'}
                </span>
                <span className="text-mist-600">
                  {e.breakMinutes > 0 && `${fmtMins(e.breakMinutes)} break · `}
                  <b className="font-semibold text-ink-950">{fmtMins(e.clockOut ? e.workedMinutes : live(e.workedMinutes))}</b> worked
                  {e.note && <span className="ml-2 text-mist-500">“{e.note}”</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EntryModal
        open={adding}
        tz={tz}
        onClose={() => setAdding(false)}
        onSaved={() => { setAdding(false); showToast('Shift added'); load() }}
      />
    </div>
  )
}

function hms(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
