import { useMemo, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { Link } from 'react-router-dom'
import { APPT_MODES, APPT_STATUSES, APPT_TYPES, crm, labelOf } from './crmApi'
import { useCrmEditors } from './CrmEditors'
import { EhrBadge } from './PatientDetailPage'
import {
  Alert, Button, Card, DataTable, EnumPill, FilterSelect, Kpi, Loading, PageHeader, PromptModal, SearchInput,
  Segmented, Toolbar, fmtDateTime, fmtTime, useAsync, useDebounced, useToast,
} from './ui'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export default function AppointmentsPage() {
  const [toastNode, toast] = useToast()
  const [range, setRange] = useState('week')
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [status, setStatus] = useState('ALL')
  const [provider, setProvider] = useState('')
  const [view, setView] = useState('agenda')
  const [reasonFor, setReasonFor] = useState(null)
  const debouncedProvider = useDebounced(provider)

  const from = range === 'day' ? anchor : range === 'week' ? addDays(anchor, -((anchor.getDay() + 6) % 7)) : new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const to = range === 'day' ? addDays(from, 1) : range === 'week' ? addDays(from, 7) : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)

  const { data, loading, error, reload } = useAsync(
    () => crm.appointments({ from: from.toISOString(), to: to.toISOString(), status, provider: debouncedProvider }),
    [from.getTime(), to.getTime(), status, debouncedProvider],
  )
  const rows = data || []
  const editors = useCrmEditors({ toast, onSaved: () => reload() })

  const byDay = useMemo(() => {
    const map = new Map()
    rows.forEach((a) => {
      const key = startOfDay(new Date(a.startsAt)).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(a)
    })
    return [...map.entries()]
  }, [rows])

  async function setApptStatus(a, next, reason) {
    if ((next === 'CANCELLED' || next === 'NO_SHOW') && reason === undefined) {
      setReasonFor({ a, next })
      return
    }
    try {
      await crm.appointmentStatus(a.id, { status: next, reason: reason || null })
      toast(next === 'NO_SHOW'
        ? 'Marked no-show — added to the No-shows & cancellations call list'
        : next === 'CANCELLED'
          ? 'Cancelled — added to the No-shows & cancellations call list'
          : `Marked ${labelOf(APPT_STATUSES, next).toLowerCase()}`)
      reload()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const label = range === 'day'
    ? from.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : range === 'week'
      ? `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(to, -1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : from.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const step = (dir) => setAnchor((a) => (range === 'day' ? addDays(a, dir) : range === 'week' ? addDays(a, 7 * dir) : new Date(a.getFullYear(), a.getMonth() + dir, 1)))

  const active = rows.filter((a) => ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'].includes(a.status))
  return (
    <div>
      <PageHeader
        title="Appointments & meetings"
        subtitle="Book consults, new-patient visits, telehealth and callbacks. Bookings advance the lead, opportunity and referral automatically."
        actions={<Button onClick={() => editors.open.appointment()}><Icon name="plus" /> Schedule</Button>}
      />
      <Alert>{error}</Alert>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <Kpi label="In range" value={rows.length} />
        <Kpi label="Still to confirm" value={rows.filter((a) => a.status === 'SCHEDULED').length} tone="amber" />
        <Kpi label="Confirmed" value={rows.filter((a) => a.status === 'CONFIRMED').length} tone="teal" />
        <Kpi label="No-shows" value={rows.filter((a) => a.status === 'NO_SHOW').length} tone="red" />
      </div>

      <Toolbar right={<Segmented value={view} onChange={setView} options={[{ value: 'agenda', label: 'Agenda' }, { value: 'table', label: 'Table' }]} />}>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="secondary" onClick={() => step(-1)} aria-label="Previous"><Icon name="chevronLeft" /></Button>
          <Button size="sm" variant="secondary" onClick={() => setAnchor(startOfDay(new Date()))}>Today</Button>
          <Button size="sm" variant="secondary" onClick={() => step(1)} aria-label="Next"><Icon name="chevronRight" /></Button>
        </div>
        <span className="text-[14px] font-semibold text-navy">{label}</span>
        <Segmented value={range} onChange={setRange} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={APPT_STATUSES} />
        <SearchInput value={provider} onChange={setProvider} placeholder="Provider…" className="sm:max-w-[180px]" />
      </Toolbar>

      {view === 'table' ? (
        <DataTable
          rows={rows}
          loading={loading}
          onRowClick={(a) => editors.open.appointment(a)}
          empty="No appointments in this range."
          columns={[
            { key: 'startsAt', label: 'When', nowrap: true, render: (a) => fmtDateTime(a.startsAt) },
            { key: 'patientName', label: 'Patient', render: (a) => <Link onClick={(e) => e.stopPropagation()} to={`/app/crm/patients/${a.patientId}`} className="font-semibold text-brand-700">{a.patientName}</Link> },
            { key: 'appointmentType', label: 'Type', render: (a) => labelOf(APPT_TYPES, a.appointmentType) },
            { key: 'mode', label: 'Mode', render: (a) => labelOf(APPT_MODES, a.mode) },
            { key: 'providerName', label: 'Provider' },
            { key: 'status', label: 'Status', toneList: APPT_STATUSES, render: (a) => <EnumPill list={APPT_STATUSES} value={a.status} /> },
            { key: 'ehrSyncStatus', label: 'EHR', render: (a) => <EhrBadge status={a.ehrSyncStatus} /> },
          ]}
        />
      ) : loading ? <Loading /> : byDay.length === 0 ? (
        <Card><p className="m-0 py-6 text-center text-sm text-mist-500">No appointments in this range.</p></Card>
      ) : (
        <div className="space-y-4">
          {byDay.map(([day, items]) => (
            <Card key={day} title={new Date(day).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} subtitle={`${items.length} appointment${items.length === 1 ? '' : 's'}`} bodyClassName="p-0">
              <ul className="m-0 list-none divide-y divide-mist-100 p-0">
                {items.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="w-20 shrink-0">
                      <p className="m-0 font-mono text-[14px] font-semibold text-navy">{fmtTime(a.startsAt)}</p>
                      <p className="m-0 text-[11.5px] text-mist-500">{a.durationMinutes} min</p>
                    </div>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => editors.open.appointment(a)}>
                      <p className="m-0 text-[13.5px] font-semibold text-navy">{a.patientName}</p>
                      <p className="m-0 text-[12.5px] text-mist-500">
                        {labelOf(APPT_TYPES, a.appointmentType)} · {labelOf(APPT_MODES, a.mode)}{a.providerName ? ` · ${a.providerName}` : ''}{a.location ? ` · ${a.location}` : ''}
                      </p>
                    </button>
                    <EnumPill list={APPT_STATUSES} value={a.status} />
                    <div className="flex flex-wrap gap-1.5">
                      {a.status === 'SCHEDULED' && <Button size="sm" variant="secondary" onClick={() => setApptStatus(a, 'CONFIRMED')}>Confirm</Button>}
                      {(a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && <Button size="sm" variant="secondary" onClick={() => setApptStatus(a, 'CHECKED_IN')}>Check in</Button>}
                      {['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'].includes(a.status) && <Button size="sm" onClick={() => setApptStatus(a, 'COMPLETED')}>Complete</Button>}
                      {['SCHEDULED', 'CONFIRMED'].includes(a.status) && <Button size="sm" variant="ghost" onClick={() => setApptStatus(a, 'NO_SHOW')}>No-show</Button>}
                      {['SCHEDULED', 'CONFIRMED'].includes(a.status) && <Button size="sm" variant="ghost" onClick={() => setApptStatus(a, 'CANCELLED')}>Cancel</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
      {active.length > 0 && <p className="mt-3 text-[12px] text-mist-500">{active.length} active appointment{active.length === 1 ? '' : 's'} in this range.</p>}

      <PromptModal
        open={Boolean(reasonFor)}
        title={reasonFor?.next === 'NO_SHOW' ? 'Mark as no-show' : 'Cancel appointment'}
        label="Reason"
        options={reasonFor?.next === 'NO_SHOW'
          ? ['No call / no show', 'Arrived too late', 'Transportation issue', 'Forgot', 'Other']
          : ['Patient request', 'Provider unavailable', 'Insurance issue', 'Illness', 'Weather / emergency', 'Rescheduled', 'Other']}
        onClose={() => setReasonFor(null)}
        onConfirm={async (reason) => {
          await setApptStatus(reasonFor.a, reasonFor.next, reason)
          setReasonFor(null)
        }}
      />
      {editors.node}
      {toastNode}
    </div>
  )
}
