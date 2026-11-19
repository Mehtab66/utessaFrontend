import { useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { crm } from './crmApi'
import { Alert, Card, DataTable, FilterSelect, Kpi, Loading, PageHeader, Pill, Segmented, Toolbar, fmtDateTime, useAsync, useCrmRefs } from './ui'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7)
const PRESETS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
]

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mmss = (s) => `${Math.floor((s || 0) / 60)}:${String((s || 0) % 60).padStart(2, '0')}`
const hourLabel = (h) => (h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`)

export default function CallAnalyticsPage() {
  const { team } = useCrmRefs()
  const [preset, setPreset] = useState('14')
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 13); return iso(d) })
  const [to, setTo] = useState(() => iso(new Date()))
  const [user, setUser] = useState('ALL')
  const [line, setLine] = useState('ALL')
  const [chartView, setChartView] = useState('chart')
  const { data, loading, error } = useAsync(
    () => crm.callAnalytics({ from, to, userId: user, line }),
    [from, to, user, line],
  )

  function applyPreset(p) {
    setPreset(p)
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - (Number(p) - 1))
    setFrom(iso(start))
    setTo(iso(end))
  }

  const d = data
  const peak = d ? Math.max(1, ...d.perDay.map((x) => x.total)) : 1
  const heatMax = d ? Math.max(1, ...d.heatmap.flat()) : 1
  const peakCell = d ? (() => {
    let best = { v: 0 }
    d.heatmap.forEach((row, di) => row.forEach((v, hi) => { if (v > best.v) best = { v, di, hi } }))
    return best.v ? `Busiest: ${DAYS[best.di]} around ${hourLabel(HOURS[best.hi])}m` : 'Not enough calls yet to show a pattern.'
  })() : ''

  return (
    <div className="space-y-4">
      <PageHeader title="Call analytics" subtitle="How calls are answered, documented and turned into booked patients." />
      <Toolbar>
        <Segmented value={preset} onChange={applyPreset} options={PRESETS} />
        <label className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-mist-700">From
          <input type="date" value={from} max={to} onChange={(e) => { setPreset(''); setFrom(e.target.value) }} className="h-9 rounded-lg border border-mist-200 bg-white px-2 text-[13px]" />
        </label>
        <label className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-mist-700">To
          <input type="date" value={to} min={from} onChange={(e) => { setPreset(''); setTo(e.target.value) }} className="h-9 rounded-lg border border-mist-200 bg-white px-2 text-[13px]" />
        </label>
        <FilterSelect label="Line" value={line} onChange={setLine} allLabel="All lines" options={[{ value: 'MAIN', label: 'Main line' }, { value: 'REFERRAL', label: 'Referral line' }]} />
        <FilterSelect label="Answered by" value={user} onChange={setUser} allLabel="Everyone" options={team.map((m) => ({ value: m.userId, label: m.fullName }))} />
      </Toolbar>
      <Alert>{error}</Alert>
      {loading && !d && <Loading />}

      {d && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
            <Kpi label="Calls received" value={d.callsReceived} hint={`${d.callsMade} outbound`} />
            <Kpi label="Answer rate" value={`${d.answerRate}%`} tone={d.answerRate < 90 ? 'amber' : 'green'} />
            <Kpi label="Avg call length" value={mmss(d.avgDurationSeconds)} hint="Talk time" tone="ink" />
            <Kpi label="Calls documented" value={`${d.documentedRate}%`} hint="Saved with a reason or notes" tone={d.documentedRate < 80 ? 'amber' : 'teal'} />
            <Kpi label="New patients booked" value={d.newPatientsBooked} hint={`${d.leadsCreated} saved as leads`} tone="green" />
            <Kpi label="Matched on a new phone" value={d.matchedOnNewPhone} hint="Duplicates avoided" tone="blue" />
          </div>

          <Card
            title="Calls per day"
            subtitle="Inbound calls · answered vs missed"
            actions={<Segmented value={chartView} onChange={setChartView} options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]} />}
          >
            {chartView === 'chart' ? (
              <>
                <div className="flex h-44 items-end gap-1">
                  {d.perDay.map((p) => (
                    <div key={p.date} className="group flex h-full flex-1 flex-col justify-end" title={`${p.date}: ${p.answered} answered, ${p.missed} missed`}>
                      <div className="flex flex-col-reverse overflow-hidden rounded-t-[4px]" style={{ height: `${(p.total / peak) * 100}%`, minHeight: p.total ? 3 : 0 }}>
                        <span className="bg-brand-600" style={{ height: `${p.total ? (p.answered / p.total) * 100 : 0}%` }} />
                        <span className="bg-danger-500" style={{ height: `${p.total ? (p.missed / p.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex gap-1 text-[10.5px] text-mist-500">
                  {d.perDay.map((p, i) => (
                    <span key={p.date} className="flex-1 truncate text-center">
                      {i % Math.ceil(d.perDay.length / 10) === 0 ? new Date(`${p.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-4 text-[12px] text-mist-700">
                  <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> Answered</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-danger-500" /> Missed or abandoned</span>
                </div>
              </>
            ) : (
              <DataTable
                rows={d.perDay.map((p) => ({ ...p, id: p.date }))}
                pageSize={31}
                columns={[
                  { key: 'date', label: 'Date', render: (p) => new Date(`${p.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) },
                  { key: 'total', label: 'Calls', align: 'right' },
                  { key: 'answered', label: 'Answered', align: 'right' },
                  { key: 'missed', label: 'Missed', align: 'right' },
                  { key: 'rate', label: 'Answer rate', align: 'right', render: (p) => (p.total ? `${Math.round((p.answered * 100) / p.total)}%` : '—') },
                ]}
              />
            )}
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="What happened to calls from new numbers" subtitle="Each step as a share of the step before it">
              <div className="space-y-3">
                {d.newNumberFunnel.map((f, i) => {
                  const base = d.newNumberFunnel[0].count || 1
                  return (
                    <div key={f.label}>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="font-semibold text-navy">{f.label}</span>
                        <span className="font-mono text-navy">{f.count}{i > 0 && <span className="ml-2 text-mist-500">{f.pctOfPrevious}%</span>}</span>
                      </div>
                      <div className="mt-1 h-2.5 overflow-hidden rounded-sm bg-mist-50">
                        <i className="block h-full rounded-sm bg-brand-600" style={{ width: `${(f.count / base) * 100}%`, opacity: 1 - i * 0.15 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
            <Card title="Why existing patients called" subtitle="From the reason picked when the call was documented">
              {d.reasons.length === 0 ? <p className="m-0 text-sm text-mist-600">No documented calls from existing patients yet.</p> : (
                <div className="space-y-2.5">
                  {d.reasons.map((r) => (
                    <div key={r.label} className="grid grid-cols-[minmax(0,1.3fr)_minmax(80px,1.4fr)_auto] items-center gap-2.5 text-[13px]">
                      <span className="truncate font-medium text-navy" title={r.label}>{r.label}</span>
                      <span className="h-2.5 overflow-hidden rounded-sm bg-mist-50"><i className="block h-full rounded-sm bg-iris-700" style={{ width: `${r.pct}%` }} /></span>
                      <span className="font-mono text-navy">{r.count} · {r.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="When calls come in" subtitle={peakCell}>
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-1 text-[11px]">
                <thead>
                  <tr><th />{HOURS.map((h) => <th key={h} className="w-9 font-semibold text-mist-500">{hourLabel(h)}</th>)}</tr>
                </thead>
                <tbody>
                  {DAYS.map((day, di) => (
                    <tr key={day}>
                      <th className="pr-2 text-right font-semibold text-mist-600">{day}</th>
                      {HOURS.map((h, hi) => {
                        const v = d.heatmap[di][hi]
                        return (
                          <td key={h} title={`${day} ${hourLabel(h)}m: ${v} call${v === 1 ? '' : 's'}`} className="h-7 w-9 rounded-[5px] text-center font-mono text-[10.5px]"
                            style={{ background: v ? `rgba(10,122,130,${0.12 + (v / heatMax) * 0.78})` : '#F4F5FA', color: v / heatMax > 0.55 ? '#fff' : '#1B1F4B' }}>
                            {v || ''}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11.5px] text-mist-600">
              Fewer <span className="h-2.5 w-24 rounded-sm" style={{ background: 'linear-gradient(90deg,#F4F5FA,#1E8E94)' }} /> More calls per hour
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card title="By staff member" bodyClassName="p-0">
              <DataTable
                rows={d.byStaff.map((r) => ({ ...r, id: r.name }))}
                empty="No calls in this range."
                columns={[
                  { key: 'name', label: 'Staff', render: (r) => <b>{r.name}</b> },
                  { key: 'calls', label: 'Calls', align: 'right' },
                  { key: 'avgHandleSeconds', label: 'Avg handle', align: 'right', render: (r) => <span className="font-mono">{mmss(r.avgHandleSeconds)}</span> },
                  { key: 'documentedPct', label: 'Documented', align: 'right', render: (r) => `${r.documentedPct}%` },
                  { key: 'newPatientsBooked', label: 'New patients booked', align: 'right' },
                ]}
              />
            </Card>
            <Card title="Sending to the EHR" subtitle="New patients, appointments and call notes sent from Utessa">
              {d.ehrLog.length === 0 ? <p className="m-0 text-sm text-mist-600">Nothing queued for the EHR yet.</p> : (
                <ul className="m-0 list-none p-0">
                  {d.ehrLog.map((r, i) => (
                    <li key={`${r.what}-${i}`} className="flex items-start gap-3 border-t border-mist-200 py-2.5 first:border-0 first:pt-0">
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${r.status === 'SYNCED' ? 'bg-brand-600 text-white' : r.status === 'FAILED' ? 'bg-danger-600 text-white' : 'bg-sun-50 text-sun-700'}`}>
                        <Icon name={r.status === 'SYNCED' ? 'check' : r.status === 'FAILED' ? 'alert' : 'clock'} className="h-3.5 w-3.5" strokeWidth={2.4} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-navy">{r.what}</span>
                        <span className="block text-[12px] text-mist-600">{fmtDateTime(r.when)}</span>
                      </span>
                      <Pill tone={r.status === 'SYNCED' ? 'green' : r.status === 'FAILED' ? 'red' : 'amber'}>{r.status === 'SYNCED' ? 'Sent' : r.status === 'FAILED' ? 'Failed' : 'Queued'}</Pill>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
