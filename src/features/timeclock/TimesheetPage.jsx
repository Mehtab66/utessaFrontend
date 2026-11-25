import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, Kpi, Loading, Modal, PageHeader, Pill, useToast } from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { tc } from './timeclockApi'
import {
  EntryModal, HistoryModal, PeriodNav, ReasonModal, SheetStatus, fmtClock, fmtDateTime, fmtDay, fmtMins, todayIn,
} from './tcShared'

/**
 * A pay period day by day. Yourself by default; managers open someone else's with ?user=<id>.
 * Staff fix and submit their time; managers correct, approve or send it back.
 */
export default function TimesheetPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const userId = params.get('user') || undefined
  const periodStart = params.get('period') || undefined
  const [sheet, setSheet] = useState(null)
  const [tz, setTz] = useState('UTC')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // { entry?, date? }
  const [deleting, setDeleting] = useState(null)
  const [historyId, setHistoryId] = useState(null)
  const [deciding, setDeciding] = useState(null) // 'submit' | 'approve' | 'reject'
  const [toast, showToast] = useToast()

  const load = useCallback(async () => {
    try {
      const [s, settings] = await Promise.all([tc.timesheet({ userId, periodStart }), tc.settings()])
      setSheet(s)
      setTz(settings.timezone)
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load the timesheet.')
    }
  }, [userId, periodStart])

  useEffect(() => { load() }, [load])

  const goPeriod = (start) => {
    const next = new URLSearchParams(params)
    if (start) next.set('period', start)
    else next.delete('period')
    setParams(next)
  }

  if (!sheet && !error) return <Loading label="Loading timesheet…" />
  if (!sheet) return <Alert>{error}</Alert>

  const today = todayIn(tz)
  const isCurrent = sheet.periodStart <= today && today <= sheet.periodEnd
  const t = sheet.totals
  const title = sheet.self ? 'My timesheet' : `${sheet.userName}'s timesheet`

  return (
    <div>
      {toast}
      {!sheet.self && (
        <button type="button" onClick={() => navigate(`/app/timeclock/approvals?period=${sheet.periodStart}`)} className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700 hover:underline">
          <Icon name="arrowLeft" className="h-3.5 w-3.5" /> Back to approvals
        </button>
      )}
      <PageHeader
        title={title}
        subtitle={`Times in ${tz}. A shift counts on the day it started.`}
        actions={(
          <PeriodNav
            start={sheet.periodStart}
            end={sheet.periodEnd}
            prev={sheet.previousStart}
            next={sheet.nextStart}
            onChange={goPeriod}
            isCurrent={isCurrent}
            onToday={() => goPeriod(null)}
          />
        )}
      />
      <Alert>{error}</Alert>

      <StatusBanner sheet={sheet} tz={tz} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Worked" value={fmtMins(t.workedMinutes)} tone="gray" hint={t.breakMinutes ? `${fmtMins(t.breakMinutes)} of breaks` : undefined} />
        <Kpi label="Regular" value={fmtMins(t.regularMinutes)} tone="gray" />
        <Kpi label="Overtime" value={fmtMins(t.overtimeMinutes)} tone={t.overtimeMinutes ? 'amber' : 'gray'} hint={t.overtimeMinutes ? 'Paid at overtime rate' : undefined} />
        <Kpi label="Time off" value={fmtMins(t.ptoMinutes)} tone="gray" />
        <Kpi label="Total paid" value={fmtMins(t.paidMinutes)} tone="teal" hint="Regular + overtime + paid time off" />
      </div>

      <div className="overflow-hidden rounded-[12px] border border-mist-200 bg-white">
        {sheet.days.map((d) => {
          const isToday = d.date === today
          const future = d.date > today
          return (
            <div key={d.date} className={`border-b border-mist-100 px-4 py-3 last:border-b-0 ${isToday ? 'bg-brand-50/40' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-28 text-[13.5px] font-semibold ${future ? 'text-mist-400' : 'text-ink-950'}`}>{fmtDay(d.date)}</span>
                  {isToday && <Pill tone="teal">Today</Pill>}
                  {d.timeOff.map((label, i) => <Pill key={i} tone="ink">{label}{d.ptoMinutes ? ` · ${fmtMins(d.ptoMinutes)}` : ''}</Pill>)}
                </div>
                <div className="flex items-center gap-3 text-[13px]">
                  {d.overtimeMinutes > 0 && <Pill tone="amber">{fmtMins(d.overtimeMinutes)} OT</Pill>}
                  <span className={`font-mono font-semibold ${d.workedMinutes ? 'text-ink-950' : 'text-mist-300'}`}>{fmtMins(d.workedMinutes)}</span>
                  {sheet.canEdit && !future && (
                    <button type="button" onClick={() => setEditing({ date: d.date })} className="rounded-md px-1.5 py-1 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50" aria-label={`Add a shift on ${fmtDay(d.date)}`}>
                      <Icon name="plus" className="inline h-3.5 w-3.5" /> Add
                    </button>
                  )}
                </div>
              </div>
              {d.entries.length > 0 && (
                <ul className="mt-2 space-y-1.5 pl-0 sm:pl-[120px]">
                  {d.entries.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-mist-25 px-3 py-2 text-[13px]">
                      <span className="flex flex-wrap items-center gap-2">
                        <b className="font-semibold text-ink-950">{fmtClock(e.clockIn, tz)} – {e.clockOut ? fmtClock(e.clockOut, tz) : 'still clocked in'}</b>
                        {e.breakMinutes > 0 && <span className="text-mist-600">{fmtMins(e.breakMinutes)} break</span>}
                        {e.source === 'MANUAL' && <Pill tone="blue">Added</Pill>}
                        {e.source !== 'MANUAL' && e.edited && <Pill tone="blue">Edited</Pill>}
                        {e.note && <span className="text-mist-500">“{e.note}”</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="mr-2 font-mono font-semibold text-ink-950">{fmtMins(e.workedMinutes)}</span>
                        <IconBtn label="History" icon="history" onClick={() => setHistoryId(e.id)} />
                        {sheet.canEdit && <IconBtn label="Correct" icon="edit" onClick={() => setEditing({ entry: e })} />}
                        {sheet.canEdit && e.clockOut && <IconBtn label="Delete" icon="trash" danger onClick={() => setDeleting(e)} />}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {/* Workflow */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {sheet.hasOpenEntry && <span className="mr-auto text-[13px] text-sun-700">A shift in this period is still running. Clock out before submitting or approving.</span>}
        {sheet.self && sheet.canSubmit && (
          <Button onClick={() => setDeciding('submit')}><Icon name="check" className="h-4 w-4" /> Submit for approval</Button>
        )}
        {sheet.canDecide && sheet.status !== 'APPROVED' && (
          <>
            {sheet.status === 'SUBMITTED' && <Button variant="danger" onClick={() => setDeciding('reject')}>Send back</Button>}
            <Button onClick={() => setDeciding('approve')} disabled={sheet.hasOpenEntry}><Icon name="check" className="h-4 w-4" /> Approve</Button>
          </>
        )}
        {sheet.canDecide && sheet.status === 'APPROVED' && (
          <Button variant="secondary" onClick={() => setDeciding('reject')}>Reopen</Button>
        )}
      </div>

      <EntryModal
        open={Boolean(editing)}
        entry={editing?.entry}
        defaultDate={editing?.date}
        userId={sheet.self ? undefined : sheet.userId}
        userName={sheet.self ? undefined : sheet.userName}
        tz={tz}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); showToast('Shift saved'); load() }}
      />
      <ReasonModal
        open={Boolean(deleting)}
        title="Delete this shift?"
        message={deleting ? `${fmtDay(deleting.workDate)}, ${fmtClock(deleting.clockIn, tz)} – ${fmtClock(deleting.clockOut, tz)}. The deletion is kept in the history.` : ''}
        confirmLabel="Delete shift"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={async (reason) => { await tc.deleteEntry(deleting.id, reason); setDeleting(null); showToast('Shift deleted'); load() }}
      />
      <HistoryModal entryId={historyId} tz={tz} onClose={() => setHistoryId(null)} />
      <DecisionModal
        mode={deciding}
        sheet={sheet}
        onClose={() => setDeciding(null)}
        onDone={(s, msg) => { setDeciding(null); setSheet(s); showToast(msg) }}
      />
    </div>
  )
}

function StatusBanner({ sheet, tz }) {
  if (sheet.status === 'OPEN') {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-mist-600">
        <SheetStatus status="OPEN" />
        {sheet.self ? 'Check your hours, then submit them for approval at the end of the pay period.' : 'Not submitted yet. You can still approve it directly.'}
      </div>
    )
  }
  const tone = sheet.status === 'REJECTED' ? 'error' : sheet.status === 'APPROVED' ? 'ok' : 'warn'
  return (
    <Alert tone={tone}>
      <span className="flex flex-wrap items-center gap-2">
        <SheetStatus status={sheet.status} />
        {sheet.status === 'SUBMITTED' && `Submitted ${fmtDateTime(sheet.submittedAt, tz)}. ${sheet.self ? 'Your manager will review it.' : 'Ready for your review.'}`}
        {sheet.status === 'APPROVED' && `Approved by ${sheet.decidedByName || 'a manager'} on ${fmtDateTime(sheet.decidedAt, tz)}. The time is locked.`}
        {sheet.status === 'REJECTED' && `Sent back by ${sheet.decidedByName || 'a manager'}${sheet.self ? '. Fix it and submit again.' : '.'}`}
      </span>
      {sheet.note && <span className="mt-1 block font-normal">“{sheet.note}”</span>}
    </Alert>
  )
}

function DecisionModal({ mode, sheet, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (mode) { setNote(''); setError('') } }, [mode])
  if (!mode) return null
  const copy = {
    submit: { title: 'Submit timesheet for approval?', label: 'Submit', hint: 'You won’t be able to change this period after submitting unless it’s sent back.', notePh: 'Anything your manager should know (optional)' },
    approve: { title: `Approve ${sheet.userName}'s timesheet?`, label: 'Approve', hint: 'Approved time is locked and ready for payroll.', notePh: 'Note (optional)' },
    reject: { title: sheet.status === 'APPROVED' ? 'Reopen this timesheet?' : `Send ${sheet.userName}'s timesheet back?`, label: sheet.status === 'APPROVED' ? 'Reopen' : 'Send back', hint: 'Tell them what needs fixing. They can then edit and resubmit.', notePh: 'What needs fixing' },
  }[mode]
  async function go() {
    if (mode === 'reject' && !note.trim()) return setError('Tell them what needs fixing.')
    setBusy(true)
    setError('')
    try {
      const s = mode === 'submit'
        ? await tc.submit(sheet.periodStart, note)
        : mode === 'approve'
          ? await tc.approve(sheet.userId, sheet.periodStart, note)
          : await tc.reject(sheet.userId, sheet.periodStart, note)
      onDone(s, mode === 'submit' ? 'Timesheet submitted' : mode === 'approve' ? 'Timesheet approved' : 'Timesheet sent back')
    } catch (e) {
      setError(e.message || 'That didn’t work.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open
      size="sm"
      title={copy.title}
      onClose={onClose}
      footer={(
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-danger-600">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={mode === 'reject' ? 'danger' : 'primary'} onClick={go} disabled={busy}>{busy ? 'Working…' : copy.label}</Button>
        </>
      )}
    >
      <p className="m-0 mb-1 text-[13.5px] text-ink-900">Total paid time: <b>{fmtMins(sheet.totals.paidMinutes)}</b>{sheet.totals.overtimeMinutes ? ` (${fmtMins(sheet.totals.overtimeMinutes)} overtime)` : ''}</p>
      <p className="m-0 mb-3 text-[13px] text-mist-600">{copy.hint}</p>
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-mist-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
        placeholder={copy.notePh}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
      />
    </Modal>
  )
}

function IconBtn({ label, icon, onClick, danger }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition ${danger ? 'text-mist-500 hover:bg-danger-50 hover:text-danger-600' : 'text-mist-500 hover:bg-white hover:text-ink-950'}`}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  )
}
