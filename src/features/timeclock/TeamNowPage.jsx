import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Avatar, DataTable, Kpi, PageHeader, Pill, SearchInput, Toolbar } from '../crm/ui'
import { roleLabel } from '../../shared/security/roles'
import { tc } from './timeclockApi'
import { STATE, fmtClock, fmtMins } from './tcShared'

/** Live board: who's working, on break or out, with today's and this week's hours. Refreshes every 30 s. */
export default function TeamNowPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [tz, setTz] = useState(undefined)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([tc.teamNow(), tc.settings()])
      setRows(r)
      setTz(s.timezone)
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load the team.')
    }
  }, [])
  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const counts = useMemo(() => {
    const c = { IN: 0, BREAK: 0, OUT: 0, long: 0, off: 0 }
    ;(rows || []).forEach((r) => { c[r.state] += 1; if (r.longShift) c.long += 1; if (r.timeOffToday) c.off += 1 })
    return c
  }, [rows])

  const order = { IN: 0, BREAK: 1, OUT: 2 }
  const visible = useMemo(() => (rows || [])
    .filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => order[a.state] - order[b.state] || a.name.localeCompare(b.name)), [rows, q]) // eslint-disable-line react-hooks/exhaustive-deps

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
      key: 'state',
      label: 'Status',
      sortValue: (r) => order[r.state],
      render: (r) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <Pill tone={STATE[r.state].tone} dot>{STATE[r.state].label}</Pill>
          {r.longShift && <Pill tone="red">Over 12h — missed clock-out?</Pill>}
          {r.timeOffToday && <Pill tone="ink">{r.timeOffToday}</Pill>}
        </span>
      ),
    },
    {
      key: 'since',
      label: 'Since',
      nowrap: true,
      render: (r) => (r.since ? `${r.state === 'OUT' ? 'Left ' : ''}${fmtClock(r.since, tz)}` : '—'),
    },
    { key: 'todayMinutes', label: 'Today', align: 'right', render: (r) => <span className="font-mono">{fmtMins(r.todayMinutes)}</span> },
    { key: 'weekMinutes', label: 'This week', align: 'right', render: (r) => <span className="font-mono">{fmtMins(r.weekMinutes)}</span> },
  ]

  return (
    <div>
      <PageHeader title="Who's working" subtitle="Updates every 30 seconds. Click someone to open their timesheet." />
      <Alert>{error}</Alert>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Working now" value={counts.IN} tone="teal" />
        <Kpi label="On break" value={counts.BREAK} tone="amber" />
        <Kpi label="Off today" value={counts.off} tone="ink" hint="Approved time off" />
        <Kpi label="Possible missed clock-outs" value={counts.long} tone={counts.long ? 'red' : 'gray'} hint={counts.long ? 'Open for over 12 hours' : 'None'} />
      </div>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search people" />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={visible.map((r) => ({ ...r, id: r.userId }))}
        loading={!rows && !error}
        empty="No team members yet."
        onRowClick={(r) => navigate(`/app/timeclock/timesheet?user=${r.userId}`)}
      />
    </div>
  )
}
