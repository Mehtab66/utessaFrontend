import { useCallback, useEffect, useState } from 'react'
import { Alert, Avatar, Button, DataTable, Kpi, PageHeader, Pill, Toolbar, useToast } from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { roleLabel } from '../../shared/security/roles'
import { tc } from './timeclockApi'
import { SheetStatus, addDays, fmtHours, fmtMins, fmtRange } from './tcShared'

const INPUT = 'h-8 rounded-lg border border-mist-200 bg-white px-2.5 text-[13px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-400/15'

/** Hours per person for a pay period (or any range up to 62 days), with a CSV for the payroll provider. */
export default function PayrollPage() {
  const [range, setRange] = useState({ from: '', to: '' })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [toast, showToast] = useToast()

  const load = useCallback(async (from, to) => {
    setLoading(true)
    try {
      const d = await tc.payroll(from || undefined, to || undefined)
      setData(d)
      setRange({ from: d.from, to: d.to })
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load payroll.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  // Step a whole pay period back or forward (when the range is a pay period).
  async function shiftPeriod(dir) {
    if (!data) return
    const anchor = dir < 0 ? addDays(data.from, -1) : addDays(data.to, 1)
    try {
      const d = await tc.payroll(anchor, undefined)
      // The server snaps a lone "from" to the pay period that contains it.
      setData(d)
      setRange({ from: d.from, to: d.to })
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  async function downloadCsv() {
    setDownloading(true)
    try {
      const res = await fetch(tc.payrollCsvUrl(data.from, data.to), { credentials: 'include', headers: { 'X-Requested-With': 'Utessa' } })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Could not download the CSV.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll-${data.from}-to-${data.to}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast('CSV downloaded')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setDownloading(false)
    }
  }

  const unapproved = data?.payPeriod ? data.rows.filter((r) => r.timesheetStatus !== 'APPROVED').length : 0
  const open = data ? data.rows.filter((r) => r.hasOpenEntry).length : 0
  const t = data?.totals

  const columns = [
    {
      key: 'name',
      label: 'Employee',
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
    { key: 'regularMinutes', label: 'Regular', align: 'right', render: (r) => <span className="font-mono">{fmtHours(r.regularMinutes)}</span> },
    { key: 'overtimeMinutes', label: 'Overtime', align: 'right', render: (r) => <span className={`font-mono ${r.overtimeMinutes ? 'font-semibold text-sun-700' : ''}`}>{fmtHours(r.overtimeMinutes)}</span> },
    { key: 'ptoMinutes', label: 'Time off', align: 'right', render: (r) => <span className="font-mono">{fmtHours(r.ptoMinutes)}</span> },
    { key: 'paidMinutes', label: 'Total paid', align: 'right', render: (r) => <span className="font-mono font-semibold">{fmtHours(r.paidMinutes)}</span> },
    { key: 'shifts', label: 'Shifts', align: 'right' },
    ...(data?.payPeriod ? [{
      key: 'timesheetStatus',
      label: 'Timesheet',
      render: (r) => (
        <span className="flex flex-wrap gap-1.5">
          <SheetStatus status={r.timesheetStatus} />
          {r.hasOpenEntry && <Pill tone="amber">Still clocked in</Pill>}
        </span>
      ),
    }] : []),
  ]

  return (
    <div>
      {toast}
      <PageHeader
        title="Payroll export"
        subtitle="Hours in decimal, ready for your payroll provider. Overtime follows your time clock settings."
        actions={<Button onClick={downloadCsv} disabled={!data || downloading || !data.rows.length}><Icon name="download" className="h-4 w-4" /> {downloading ? 'Preparing…' : 'Download CSV'}</Button>}
      />
      <Alert>{error}</Alert>

      <Toolbar>
        {data?.payPeriod && (
          <Button variant="secondary" size="sm" onClick={() => shiftPeriod(-1)} aria-label="Previous pay period"><Icon name="chevronLeft" className="h-4 w-4" /></Button>
        )}
        <label className="flex items-center gap-1.5 text-[12.5px] font-medium text-mist-700">
          From <input type="date" className={INPUT} value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </label>
        <label className="flex items-center gap-1.5 text-[12.5px] font-medium text-mist-700">
          To <input type="date" className={INPUT} value={range.to} min={range.from} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </label>
        <Button size="sm" variant="secondary" onClick={() => load(range.from, range.to)}>Show</Button>
        {data?.payPeriod && (
          <Button variant="secondary" size="sm" onClick={() => shiftPeriod(1)} aria-label="Next pay period"><Icon name="chevronRight" className="h-4 w-4" /></Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => load()}>Current pay period</Button>
      </Toolbar>

      {data && (
        <p className="m-0 mb-3 text-[13px] text-mist-600">
          {data.payPeriod ? 'Pay period' : 'Custom range'} {fmtRange(data.from, data.to)} · {data.rows.length} {data.rows.length === 1 ? 'person' : 'people'} with time
        </p>
      )}
      {unapproved > 0 && (
        <Alert tone="warn">{unapproved} timesheet{unapproved === 1 ? ' isn’t' : 's aren’t'} approved yet. Approve them before you run payroll so nobody&apos;s hours change afterwards.</Alert>
      )}
      {open > 0 && <Alert tone="warn">{open} {open === 1 ? 'person is' : 'people are'} still clocked in. Their open shift counts up to now.</Alert>}

      {t && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Regular hours" value={fmtHours(t.regularMinutes)} tone="gray" />
          <Kpi label="Overtime hours" value={fmtHours(t.overtimeMinutes)} tone={t.overtimeMinutes ? 'amber' : 'gray'} />
          <Kpi label="Paid time off" value={fmtHours(t.ptoMinutes)} tone="gray" />
          <Kpi label="Total paid hours" value={fmtHours(t.paidMinutes)} tone="teal" hint={fmtMins(t.paidMinutes)} />
        </div>
      )}

      <DataTable
        columns={columns}
        rows={(data?.rows || []).map((r) => ({ ...r, id: r.userId }))}
        loading={loading && !data}
        empty="Nobody recorded time in this range."
      />
    </div>
  )
}
