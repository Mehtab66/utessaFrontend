import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Avatar, Button, DataTable, Kpi, PageHeader, Pill, Segmented, Toolbar, useToast } from '../crm/ui'
import { roleLabel } from '../../shared/security/roles'
import { useAuth } from '../../shared/auth/AuthContext'
import { tc } from './timeclockApi'
import { PeriodNav, SheetStatus, fmtDateTime, fmtMins, todayIn } from './tcShared'

/** Every team member's timesheet for one pay period: review, approve (one by one or all submitted). */
export default function ApprovalsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const periodStart = params.get('period') || undefined
  const [data, setData] = useState(null)
  const [tz, setTz] = useState('UTC')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [toast, showToast] = useToast()

  const load = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([tc.teamTimesheets(periodStart), tc.settings()])
      setData(d)
      setTz(s.timezone)
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load timesheets.')
    }
  }, [periodStart])
  useEffect(() => { load() }, [load])

  const rows = useMemo(() => {
    const list = (data?.rows || []).map((r) => ({ ...r, id: r.userId }))
    if (filter === 'submitted') return list.filter((r) => r.status === 'SUBMITTED')
    if (filter === 'open') return list.filter((r) => r.status === 'OPEN' || r.status === 'REJECTED')
    return list
  }, [data, filter])

  const counts = useMemo(() => {
    const c = { SUBMITTED: 0, APPROVED: 0, OPEN: 0, REJECTED: 0, paid: 0, ot: 0 }
    ;(data?.rows || []).forEach((r) => { c[r.status] += 1; c.paid += r.totals.paidMinutes; c.ot += r.totals.overtimeMinutes })
    return c
  }, [data])

  const goPeriod = (start) => {
    const next = new URLSearchParams(params)
    if (start) next.set('period', start)
    else next.delete('period')
    setParams(next)
  }

  // Approve every submitted timesheet you're allowed to approve (not your own unless you're the owner).
  async function approveAllSubmitted() {
    const isOwner = String(user?.role || '').toUpperCase() === 'OWNER'
    const targets = (data?.rows || []).filter((r) => r.status === 'SUBMITTED' && !r.hasOpenEntry && (isOwner || r.userId !== user?.userId))
    if (!targets.length) return
    setBusy(true)
    let ok = 0
    const failed = []
    for (const r of targets) {
      try {
        await tc.approve(r.userId, data.periodStart)
        ok += 1
      } catch (e) {
        failed.push(`${r.name}: ${e.message}`)
      }
    }
    setBusy(false)
    showToast(failed.length ? `Approved ${ok}. ${failed.length} couldn't be approved.` : `Approved ${ok} timesheet${ok === 1 ? '' : 's'}`, failed.length ? 'error' : 'ok')
    if (failed.length) setError(failed.join(' · '))
    load()
  }

  const today = todayIn(tz)
  const isCurrent = data && data.periodStart <= today && today <= data.periodEnd

  const columns = [
    {
      key: 'name',
      label: 'Person',
      render: (r) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={r.name} size="sm" />
          <span>
            <span className="block font-semibold">{r.name}</span>
            <span className="block text-[12px] text-mist-500">{roleLabel(r.role)}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className="flex flex-col items-start gap-0.5">
          <span className="flex flex-wrap gap-1.5">
            <SheetStatus status={r.status} />
            {r.hasOpenEntry && <Pill tone="amber">Still clocked in</Pill>}
          </span>
          {r.submittedAt && r.status === 'SUBMITTED' && <span className="text-[11.5px] text-mist-500">Submitted {fmtDateTime(r.submittedAt, tz)}</span>}
        </span>
      ),
    },
    { key: 'shifts', label: 'Shifts', align: 'right' },
    { key: 'regular', label: 'Regular', align: 'right', sortValue: (r) => r.totals.regularMinutes, render: (r) => <span className="font-mono">{fmtMins(r.totals.regularMinutes)}</span> },
    {
      key: 'overtime',
      label: 'Overtime',
      align: 'right',
      sortValue: (r) => r.totals.overtimeMinutes,
      render: (r) => <span className={`font-mono ${r.totals.overtimeMinutes ? 'font-semibold text-sun-700' : ''}`}>{fmtMins(r.totals.overtimeMinutes)}</span>,
    },
    { key: 'pto', label: 'Time off', align: 'right', sortValue: (r) => r.totals.ptoMinutes, render: (r) => <span className="font-mono">{fmtMins(r.totals.ptoMinutes)}</span> },
    { key: 'paid', label: 'Total paid', align: 'right', sortValue: (r) => r.totals.paidMinutes, render: (r) => <span className="font-mono font-semibold">{fmtMins(r.totals.paidMinutes)}</span> },
    {
      key: 'open',
      label: '',
      sortable: false,
      align: 'right',
      render: (r) => <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); navigate(`/app/timeclock/timesheet?user=${r.userId}&period=${data.periodStart}`) }}>Review</Button>,
    },
  ]

  return (
    <div>
      {toast}
      <PageHeader
        title="Timesheet approvals"
        subtitle="Review each person's pay period, fix mistakes, then approve. Approved time is locked for payroll."
        actions={data && (
          <PeriodNav start={data.periodStart} end={data.periodEnd} prev={data.previousStart} next={data.nextStart} onChange={goPeriod} isCurrent={isCurrent} onToday={() => goPeriod(null)} />
        )}
      />
      <Alert>{error}</Alert>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Waiting for approval" value={counts.SUBMITTED} tone={counts.SUBMITTED ? 'blue' : 'gray'} onClick={() => setFilter('submitted')} />
        <Kpi label="Approved" value={counts.APPROVED} tone="teal" />
        <Kpi label="Not submitted or sent back" value={counts.OPEN + counts.REJECTED} tone="gray" onClick={() => setFilter('open')} />
        <Kpi label="Team paid hours" value={fmtMins(counts.paid)} tone={counts.ot ? 'amber' : 'gray'} hint={counts.ot ? `${fmtMins(counts.ot)} overtime` : 'No overtime'} />
      </div>
      <Toolbar
        right={(
          <Button onClick={approveAllSubmitted} disabled={busy || !counts.SUBMITTED}>
            {busy ? 'Approving…' : 'Approve all submitted'}
          </Button>
        )}
      >
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all', label: 'Everyone' }, { value: 'submitted', label: 'Waiting' }, { value: 'open', label: 'Not submitted' }]}
        />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={rows}
        loading={!data && !error}
        empty="Nobody matches this filter."
        onRowClick={(r) => navigate(`/app/timeclock/timesheet?user=${r.userId}&period=${data.periodStart}`)}
      />
    </div>
  )
}
