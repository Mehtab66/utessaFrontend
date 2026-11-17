import { Link, useNavigate } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import { APPT_STATUSES, LEAD_STATUSES, OPP_STAGES, PRIORITIES, crm, labelOf } from './crmApi'
import { useCrmEditors } from './CrmEditors'
import {
  Alert, BarList, Button, Card, EnumPill, Kpi, Loading, PageHeader, Pill, Timeline, fmtDateTime, fmtMoney, fmtTime,
  useAsync, useToast,
} from './ui'

export default function CrmDashboardPage() {
  const navigate = useNavigate()
  const [toastNode, toast] = useToast()
  const { data, loading, error, reload } = useAsync(() => crm.dashboard(), [])
  const editors = useCrmEditors({ toast, onSaved: () => reload() })
  const k = data?.kpis

  return (
    <div className="space-y-5">
      <PageHeader
        title="CRM dashboard"
        subtitle="Patient acquisition, referrals, follow-ups and visit pipeline — live for your practice."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/app/crm/call-desk')}><Icon name="phone" /> Calls</Button>
            <Button variant="secondary" onClick={() => editors.open.referral()}><Icon name="plus" /> Referral</Button>
            <Button onClick={() => editors.open.patient()}><Icon name="plus" /> New lead</Button>
          </>
        }
      />
      <Alert>{error}</Alert>
      {loading && !data && <Loading />}

      {k && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="New leads (month)" value={k.newLeadsThisMonth} hint={`${k.openLeads} open in pipeline`} onClick={() => navigate('/app/crm/leads')} />
            <Kpi label="Conversion rate" value={`${k.conversionRate}%`} hint="Leads → patients" tone="green" />
            <Kpi label="Follow-ups due" value={k.tasksDueToday} hint={k.tasksOverdue ? `${k.tasksOverdue} overdue` : 'None overdue'} tone={k.tasksOverdue ? 'red' : 'amber'} onClick={() => navigate('/app/crm/tasks')} />
            <Kpi label="Appointments today" value={k.appointmentsToday} hint={`${k.appointmentsUpcoming} upcoming`} tone="ink" onClick={() => navigate('/app/crm/appointments')} />
            <Kpi label="Open referrals" value={k.openReferrals} tone="blue" onClick={() => navigate('/app/crm/referrals')} />
            <Kpi label="Calls today" value={k.callsToday} tone="teal" onClick={() => navigate('/app/crm/call-desk')} />
            <Kpi label="Open pipeline" value={fmtMoney(k.openPipelineValue)} hint={`${fmtMoney(k.wonValueThisMonth)} won this month`} tone="green" onClick={() => navigate('/app/crm/opportunities')} />
            <Kpi label="No-show rate" value={`${k.noShowRate}%`} hint="Last 90 days" tone={k.noShowRate > 15 ? 'red' : 'gray'} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="Lead funnel" subtitle="All records by lead status" className="xl:col-span-2">
              <BarList rows={data.leadFunnel.map((r) => ({ label: r.label, value: r.count, color: r.key === 'LOST' || r.key === 'NOT_QUALIFIED' ? '#C4321F' : r.key === 'CONVERTED' ? '#155E62' : '#0A7A82' }))} />
            </Card>
            <Card title="Open leads by priority">
              <BarList rows={data.priorities.map((r) => ({ label: r.label, value: r.count, color: { URGENT: '#C4321F', HIGH: '#C97A12', MEDIUM: '#1D4E9A', LOW: '#8A8DA8' }[r.key] }))} />
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="Lead sources">
              <BarList rows={data.sources.map((r) => ({ label: r.label, value: r.count }))} color="#4A3D8F" />
            </Card>
            <Card title="Opportunity pipeline" subtitle="Count · value by stage">
              <div className="space-y-2">
                {data.pipeline.map((p) => (
                  <div key={p.stage} className="flex items-center justify-between gap-2 text-[13px]">
                    <EnumPill list={OPP_STAGES} value={p.stage} />
                    <span className="font-mono text-navy">{p.count} · {fmtMoney(p.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="6-month trend" subtitle="New leads · conversions · bookings">
              <Trend rows={data.trend} />
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="Follow-ups due" actions={<Link className="text-[12.5px] font-semibold text-[#0A7A82]" to="/app/crm/tasks">Open queue</Link>}>
              {data.dueTasks.length === 0 && <p className="m-0 text-sm text-[#687699]">You're caught up — no follow-ups due today.</p>}
              <ul className="m-0 list-none space-y-2 p-0">
                {data.dueTasks.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-2 rounded-lg border border-[#F0F1F7] px-3 py-2">
                    <div className="min-w-0">
                      <p className="m-0 truncate text-[13px] font-semibold text-navy">{t.title}</p>
                      <p className="m-0 text-[12px] text-[#687699]">
                        {t.patientId ? <Link to={`/app/crm/patients/${t.patientId}`} className="text-[#0A7A82]">{t.patientName}</Link> : 'General'} · {fmtDateTime(t.dueAt)}
                      </p>
                    </div>
                    {t.overdue ? <Pill tone="red">Overdue</Pill> : <EnumPill list={PRIORITIES} value={t.priority} dot={false} />}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Upcoming appointments" actions={<Link className="text-[12.5px] font-semibold text-[#0A7A82]" to="/app/crm/appointments">Schedule</Link>}>
              {data.upcomingAppointments.length === 0 && <p className="m-0 text-sm text-[#687699]">No upcoming appointments.</p>}
              <ul className="m-0 list-none space-y-2 p-0">
                {data.upcomingAppointments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg border border-[#F0F1F7] px-3 py-2">
                    <div className="w-16 shrink-0 text-center">
                      <p className="m-0 text-[11px] font-bold uppercase text-[#8A8DA8]">{new Date(a.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      <p className="m-0 font-mono text-[13px] font-semibold text-navy">{fmtTime(a.startsAt)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link to={`/app/crm/patients/${a.patientId}`} className="block truncate text-[13px] font-semibold text-navy">{a.patientName}</Link>
                      <p className="m-0 truncate text-[12px] text-[#687699]">{a.title}{a.providerName ? ` · ${a.providerName}` : ''}</p>
                    </div>
                    <EnumPill list={APPT_STATUSES} value={a.status} dot={false} />
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Hot leads" subtitle="Urgent & high priority, still open" actions={<Link className="text-[12.5px] font-semibold text-[#0A7A82]" to="/app/crm/leads">All leads</Link>}>
              {data.hotLeads.length === 0 && <p className="m-0 text-sm text-[#687699]">No urgent or high-priority leads open.</p>}
              <ul className="m-0 list-none space-y-2 p-0">
                {data.hotLeads.map((p) => (
                  <li key={p.id}>
                    <Link to={`/app/crm/patients/${p.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-[#F0F1F7] px-3 py-2 hover:bg-[#F7F8FB]">
                      <div className="min-w-0">
                        <p className="m-0 truncate text-[13px] font-semibold text-navy">{p.fullName}</p>
                        <p className="m-0 truncate text-[12px] text-[#687699]">{p.interestedService || p.source || '—'} · {labelOf(LEAD_STATUSES, p.leadStatus)}</p>
                      </div>
                      <EnumPill list={PRIORITIES} value={p.priority} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Recent activity">
            <Timeline items={data.recentActivity} showPatient />
          </Card>
        </>
      )}
      {editors.node}
      {toastNode}
    </div>
  )
}

function Trend({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.leads, r.conversions, r.appointments]))
  return (
    <div>
      <div className="flex h-36 items-end gap-2">
        {rows.map((r) => (
          <div key={r.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-28 w-full items-end justify-center gap-0.5">
              {[['leads', '#0A7A82'], ['conversions', '#155E62'], ['appointments', '#4A3D8F']].map(([key, color]) => (
                <span
                  key={key}
                  title={`${key}: ${r[key]}`}
                  className="w-2.5 rounded-t-[3px]"
                  style={{ height: `${(r[key] / max) * 100}%`, minHeight: r[key] ? 4 : 0, background: key === 'conversions' ? '#8FD9D2' : color }}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-[#687699]">{r.month}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-[#4C5076]">
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#0A7A82]" /> Leads</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#8FD9D2]" /> Conversions</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#4A3D8F]" /> Bookings</span>
      </div>
    </div>
  )
}
