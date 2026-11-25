import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, DataTable, Modal, PageHeader, Pill, Tabs, useToast } from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { tc } from './timeclockApi'
import { PTO_STATUS, PTO_TYPES, addDays, fmtDateTime, fmtDay, ptoLabel, todayIn } from './tcShared'

const INPUT = 'mt-1 w-full rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15'

/** Time off: request it, track it; managers approve or deny the team's requests. */
export default function TimeOffPage() {
  const [settings, setSettings] = useState(null)
  const [tab, setTab] = useState('mine')
  const [mine, setMine] = useState(null)
  const [team, setTeam] = useState(null)
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(false)
  const [deciding, setDeciding] = useState(null) // { request, approve }
  const [toast, showToast] = useToast()
  const manager = Boolean(settings?.manager)
  const tz = settings?.timezone

  const load = useCallback(async () => {
    try {
      const s = await tc.settings()
      setSettings(s)
      const [m, t] = await Promise.all([tc.pto('mine'), s.manager ? tc.pto('team') : Promise.resolve(null)])
      setMine(m)
      setTeam(t)
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load time off.')
    }
  }, [])
  useEffect(() => { load() }, [load])

  const pending = useMemo(() => (team || []).filter((r) => r.status === 'PENDING'), [team])

  async function cancel(r) {
    try {
      await tc.cancelPto(r.id)
      showToast('Request cancelled')
      load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const columns = (showName) => [
    ...(showName ? [{ key: 'userName', label: 'Person', render: (r) => <span className="font-semibold">{r.userName}</span> }] : []),
    { key: 'type', label: 'Type', render: (r) => ptoLabel(r.type) },
    {
      key: 'startDate',
      label: 'Dates',
      nowrap: true,
      render: (r) => (r.startDate === r.endDate ? fmtDay(r.startDate) : `${fmtDay(r.startDate)} – ${fmtDay(r.endDate)}`),
    },
    { key: 'hours', label: 'Hours', align: 'right', sortValue: (r) => Number(r.hours), render: (r) => Number(r.hours).toFixed(2).replace(/\.00$/, '') },
    { key: 'reason', label: 'Reason', render: (r) => r.reason },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className="flex flex-col items-start gap-0.5">
          <Pill tone={PTO_STATUS[r.status].tone} dot>{PTO_STATUS[r.status].label}</Pill>
          {r.decidedByName && <span className="text-[11.5px] text-mist-500">by {r.decidedByName} · {fmtDateTime(r.decidedAt, tz)}</span>}
          {r.decisionNote && <span className="text-[11.5px] text-mist-600">“{r.decisionNote}”</span>}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      align: 'right',
      render: (r) => (
        <span className="flex justify-end gap-1.5">
          {r.canDecide && <Button size="sm" onClick={() => setDeciding({ request: r, approve: true })}>Approve</Button>}
          {r.canDecide && <Button size="sm" variant="danger" onClick={() => setDeciding({ request: r, approve: false })}>Deny</Button>}
          {r.canCancel && <Button size="sm" variant="secondary" onClick={() => cancel(r)}>Cancel</Button>}
        </span>
      ),
    },
  ]

  return (
    <div>
      {toast}
      <PageHeader
        title="Time off"
        subtitle="Approved time off shows on timesheets and counts in payroll (except unpaid leave)."
        actions={<Button onClick={() => setAsking(true)}><Icon name="plus" className="h-4 w-4" /> Request time off</Button>}
      />
      <Alert>{error}</Alert>
      {manager && (
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'mine', label: 'My requests', count: mine?.length },
            { value: 'pending', label: 'To approve', count: pending.length },
            { value: 'team', label: 'All team requests', count: team?.length },
          ]}
        />
      )}
      {tab === 'mine' && (
        <DataTable columns={columns(false)} rows={mine || []} loading={!mine && !error} empty="You haven't requested any time off." />
      )}
      {tab === 'pending' && (
        <DataTable columns={columns(true)} rows={pending} loading={!team && !error} empty="Nothing waiting for approval." />
      )}
      {tab === 'team' && (
        <DataTable columns={columns(true)} rows={team || []} loading={!team && !error} empty="No time off requests yet." />
      )}

      <RequestModal
        open={asking}
        tz={tz}
        onClose={() => setAsking(false)}
        onSaved={() => { setAsking(false); setTab('mine'); showToast('Request sent'); load() }}
      />
      <DecideModal
        state={deciding}
        onClose={() => setDeciding(null)}
        onDone={(msg) => { setDeciding(null); showToast(msg); load() }}
      />
    </div>
  )
}

function RequestModal({ open, tz, onClose, onSaved }) {
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [hoursTouched, setHoursTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    const start = addDays(todayIn(tz), 1)
    setForm({ type: 'VACATION', startDate: start, endDate: start, hours: '8', reason: '' })
    setHoursTouched(false)
    setError('')
  }, [open, tz])

  // Suggest 8 hours per weekday until the person types their own number.
  const workdays = useMemo(() => countWeekdays(form.startDate, form.endDate), [form.startDate, form.endDate])
  useEffect(() => {
    if (open && !hoursTouched && workdays > 0) setForm((f) => ({ ...f, hours: String(workdays * 8) }))
  }, [workdays, hoursTouched, open])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e?.preventDefault()
    if (!form.startDate || !form.endDate) return setError('Choose the first and last day off.')
    if (form.endDate < form.startDate) return setError('The last day can’t be before the first day.')
    if (!(Number(form.hours) > 0)) return setError('Enter how many hours you’ll be off.')
    setSaving(true)
    setError('')
    try {
      await tc.requestPto({ type: form.type, startDate: form.startDate, endDate: form.endDate, hours: Number(form.hours), reason: form.reason })
      onSaved()
    } catch (err) {
      setError(err.message || 'Could not send the request.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Request time off"
      footer={(
        <>
          {error && <p className="mr-auto max-w-[60%] text-[13px] font-semibold text-danger-600" role="alert">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Sending…' : 'Send request'}</Button>
        </>
      )}
    >
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <label className="text-[13px] font-medium text-ink-900 sm:col-span-2">
          Type
          <select className={INPUT} value={form.type || 'VACATION'} onChange={set('type')}>
            {PTO_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="text-[13px] font-medium text-ink-900">
          First day
          <input type="date" className={INPUT} value={form.startDate || ''} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate }))} required />
        </label>
        <label className="text-[13px] font-medium text-ink-900">
          Last day
          <input type="date" className={INPUT} min={form.startDate} value={form.endDate || ''} onChange={set('endDate')} required />
        </label>
        <label className="text-[13px] font-medium text-ink-900">
          Total hours
          <input type="number" min="0.5" step="0.5" className={INPUT} value={form.hours || ''} onChange={(e) => { setHoursTouched(true); set('hours')(e) }} required />
          <span className="mt-1 block text-[12px] text-mist-600">{workdays} weekday{workdays === 1 ? '' : 's'} selected</span>
        </label>
        <label className="text-[13px] font-medium text-ink-900">
          Reason <span className="font-normal text-mist-500">(optional)</span>
          <input className={INPUT} value={form.reason || ''} onChange={set('reason')} maxLength={500} placeholder="Family trip" />
        </label>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}

function DecideModal({ state, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (state) { setNote(''); setError('') } }, [state])
  if (!state) return null
  const r = state.request
  async function go() {
    setBusy(true)
    setError('')
    try {
      if (state.approve) await tc.approvePto(r.id, note)
      else await tc.denyPto(r.id, note)
      onDone(state.approve ? 'Time off approved' : 'Time off denied')
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
      onClose={onClose}
      title={`${state.approve ? 'Approve' : 'Deny'} ${r.userName}'s time off?`}
      footer={(
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-danger-600">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={state.approve ? 'primary' : 'danger'} onClick={go} disabled={busy}>{busy ? 'Working…' : state.approve ? 'Approve' : 'Deny'}</Button>
        </>
      )}
    >
      <p className="m-0 mb-3 text-[13.5px] text-ink-900">
        {ptoLabel(r.type)}, {r.startDate === r.endDate ? fmtDay(r.startDate) : `${fmtDay(r.startDate)} – ${fmtDay(r.endDate)}`} · {Number(r.hours)} hours
        {r.reason && <span className="block text-mist-600">“{r.reason}”</span>}
      </p>
      <textarea
        className="min-h-[70px] w-full rounded-lg border border-mist-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
        placeholder="Note for them (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
      />
    </Modal>
  )
}

function countWeekdays(start, end) {
  if (!start || !end || end < start) return 0
  let n = 0
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const [y, m, day] = d.split('-').map(Number)
    const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay()
    if (dow !== 0 && dow !== 6) n += 1
    if (n > 400) break
  }
  return n
}
