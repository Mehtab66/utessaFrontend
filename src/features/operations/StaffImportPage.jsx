import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, DataTable, PageHeader, Pill, useToast } from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { downloadCsv, readSpreadsheet, toIsoDate } from '../crm/spreadsheet'
import { ops } from './opsApi'
import { staffDefaults, toStaffPayload } from './staffFormConfig'

/* Column headers we recognise (lower-case, spaces and punctuation removed) → staff field. */
const HEADERS = {
  firstname: 'firstName', first: 'firstName', givenname: 'firstName',
  lastname: 'lastName', last: 'lastName', surname: 'lastName', familyname: 'lastName',
  email: 'email', workemail: 'email',
  mobile: 'mobilePhone', mobilephone: 'mobilePhone', cell: 'mobilePhone', phone: 'mobilePhone',
  jobtitle: 'jobTitle', title: 'jobTitle', position: 'jobTitle',
  department: 'department', dept: 'department',
  designation: 'designation', stafftype: 'designation', role: 'designation',
  category: 'category',
  location: 'location', office: 'location',
  startdate: 'startDate', hiredate: 'startDate', start: 'startDate',
  employmenttype: 'employmentType', type: 'employmentType',
  manager: 'managerName', supervisor: 'managerName',
  licensenumber: 'licenseNumber', license: 'licenseNumber',
  licenseexpires: 'licenseExpiresOn', licenseexpiration: 'licenseExpiresOn',
}
const key = (h) => String(h || '').toLowerCase().replace(/[^a-z]/g, '')

/** Bulk import staff from a CSV or Excel export (HR system, payroll, spreadsheet). */
export default function StaffImportPage() {
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState([])
  const [mapped, setMapped] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [toast, showToast] = useToast()

  async function pick(f) {
    setFile(f)
    setDone(null)
    setError('')
    try {
      const sheet = await readSpreadsheet(f)
      const [head = [], ...body] = sheet
      const map = head.map((h) => HEADERS[key(h)] || null)
      if (!map.includes('firstName') || !map.includes('lastName')) {
        throw new Error('The first row needs at least “First name” and “Last name” columns.')
      }
      setMapped(head.map((h, i) => ({ header: h, field: map[i] })))
      const out = body
        .filter((r) => r.some((c) => String(c || '').trim()))
        .map((r, idx) => {
          const v = {}
          map.forEach((field, i) => { if (field && r[i] != null && String(r[i]).trim()) v[field] = String(r[i]).trim() })
          if (v.startDate) v.startDate = toIsoDate(v.startDate) || ''
          if (v.licenseExpiresOn) v.licenseExpiresOn = toIsoDate(v.licenseExpiresOn) || ''
          const problems = []
          if (!v.firstName) problems.push('first name')
          if (!v.lastName) problems.push('last name')
          return { id: idx, ...v, problems }
        })
      setRows(out)
    } catch (e) {
      setRows([])
      setError(e.message)
    }
  }

  async function run() {
    setBusy(true)
    let ok = 0
    const failed = []
    for (const r of rows.filter((x) => !x.problems.length)) {
      const v = { ...staffDefaults(false), status: 'ONBOARDING' }
      Object.keys(r).forEach((k) => { if (k in v && r[k]) v[k] = r[k] })
      if (!v.jobTitle) v.jobTitle = r.designation || 'Staff'
      if (!v.category) v.category = 'Administrative'
      try {
        await ops.createStaff(toStaffPayload(v))
        ok++
      } catch (e) {
        failed.push(`${r.firstName} ${r.lastName}: ${e.message}`)
      }
    }
    setBusy(false)
    setDone({ ok, failed })
    showToast(`${ok} staff member${ok === 1 ? '' : 's'} added`)
  }

  const valid = rows.filter((r) => !r.problems.length).length

  return (
    <div>
      <PageHeader
        title="Bulk import staff"
        subtitle="Add many staff at once from a CSV or Excel file — for example an export from your payroll or HR system. Everyone imported starts as Onboarding."
        actions={<Button variant="secondary" onClick={() => downloadCsv('staff-import-template.csv', [['First name', 'Last name', 'Email', 'Mobile', 'Job title', 'Designation', 'Department', 'Location', 'Start date', 'Employment type', 'Manager'], ['Jordan', 'Lee', 'jordan.lee@example.com', '555-0100', 'Front desk coordinator', 'Front desk', 'Front office', 'Main office', '2026-12-01', 'Full-time', '']])}><Icon name="download" className="h-4 w-4" /> Download template</Button>}
      />
      <Alert>{error}</Alert>
      {done && (
        <Alert tone="info">
          {done.ok} added. {done.failed.length ? `${done.failed.length} could not be added: ${done.failed.join('; ')}` : ''} <Link to="/app/staff" className="font-semibold underline">Open the staff directory</Link>
        </Alert>
      )}
      <Card title="1 · Choose a file" subtitle="The first row must be column headers. Recognised columns: first name, last name, email, mobile, job title, designation, department, location, start date, employment type, manager, license number.">
        <input type="file" accept=".csv,.txt,.xlsx,.xls,.xlsm,.ods" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} className="block w-full max-w-md rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-mist-100 file:px-3 file:py-1 file:text-[12.5px] file:font-semibold" />
        {mapped.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {mapped.map((m, i) => <Pill key={i} tone={m.field ? 'green' : 'gray'}>{m.header || '(blank)'}{m.field ? ` → ${m.field}` : ' · skipped'}</Pill>)}
          </div>
        )}
      </Card>
      {rows.length > 0 && (
        <Card className="mt-4" title={`2 · Review ${rows.length} row${rows.length === 1 ? '' : 's'}`} subtitle={`${valid} ready to import${rows.length - valid ? ` · ${rows.length - valid} need fixing in the file` : ''}`} actions={<Button onClick={run} disabled={busy || !valid}>{busy ? 'Importing…' : `Import ${valid} staff`}</Button>} bodyClassName="p-0">
          <DataTable
            columns={[
              { key: 'name', label: 'Name', render: (r) => <b className="font-semibold">{`${r.firstName || ''} ${r.lastName || ''}`.trim() || '—'}</b> },
              { key: 'email', label: 'Email' },
              { key: 'jobTitle', label: 'Job title' },
              { key: 'department', label: 'Department' },
              { key: 'location', label: 'Location' },
              { key: 'startDate', label: 'Start' },
              { key: 'problems', label: 'Check', render: (r) => (r.problems.length ? <Pill tone="red">Missing {r.problems.join(', ')}</Pill> : <Pill tone="green">Ready</Pill>) },
            ]}
            rows={rows}
          />
        </Card>
      )}
      {!file && <p className="mt-4 text-[13px] text-mist-600">Logins are not created by the import. Invite people to sign in from <Link to="/app/team" className="font-semibold text-brand-700">Team</Link> when they are ready.</p>}
      {toast}
    </div>
  )
}
