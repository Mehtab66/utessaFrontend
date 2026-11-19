import { useMemo, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import Select from '../../shared/ui/Select'
import { LEAD_SOURCES, LEAD_STATUSES, PRIORITIES, crm } from './crmApi'
import { downloadCsv, readSpreadsheet, toIsoDate } from './spreadsheet'
import { Button, Kpi, Modal, Pill, fmtDate } from './ui'

/*
 * Import patient leads from a CSV or Excel (.xlsx) file:
 *   1 Choose file → 2 Match columns → 3 Review → 4 Done
 * Every row is saved as a Lead (status New unless the file says otherwise).
 */

const MAX_ROWS = 5000

const FIELDS = [
  { key: 'fullName', label: 'Full name', hint: 'Split into first and last name', guess: ['name', 'full name', 'patient name', 'lead name', 'contact name', 'patient', 'lead'] },
  { key: 'firstName', label: 'First name', guess: ['first name', 'first', 'fname', 'firstname', 'given name', 'patient first name'] },
  { key: 'lastName', label: 'Last name', guess: ['last name', 'last', 'lname', 'lastname', 'surname', 'family name', 'patient last name'] },
  { key: 'phone', label: 'Phone', guess: ['phone', 'mobile', 'cell', 'phone number', 'mobile phone', 'cell phone', 'contact number', 'telephone', 'tel'] },
  { key: 'email', label: 'Email', guess: ['email', 'e-mail', 'email address', 'mail'] },
  { key: 'dateOfBirth', label: 'Date of birth', guess: ['dob', 'date of birth', 'birth date', 'birthdate', 'birthday'] },
  { key: 'gender', label: 'Sex / gender', guess: ['gender', 'sex'] },
  { key: 'source', label: 'Lead source', guess: ['source', 'lead source', 'channel', 'how did you hear'] },
  { key: 'sourceDetail', label: 'Source detail', guess: ['source detail', 'source details', 'referrer', 'referred by'] },
  { key: 'campaign', label: 'Campaign', guess: ['campaign', 'campaign name', 'utm campaign'] },
  { key: 'interestedService', label: 'Service interest', guess: ['service', 'service interest', 'interested service', 'interest', 'treatment', 'specialty'] },
  { key: 'reasonForVisit', label: 'Reason for visit', guess: ['reason', 'reason for visit', 'chief complaint', 'complaint', 'concern'] },
  { key: 'insurancePayer', label: 'Insurance', guess: ['insurance', 'payer', 'insurance payer', 'insurance company', 'carrier'] },
  { key: 'insuranceMemberId', label: 'Member ID', guess: ['member id', 'insurance id', 'policy number', 'subscriber id'] },
  { key: 'priority', label: 'Priority', guess: ['priority'] },
  { key: 'leadStatus', label: 'Lead status', guess: ['status', 'lead status', 'stage'] },
  { key: 'preferredLanguage', label: 'Language', guess: ['language', 'preferred language'] },
  { key: 'street', label: 'Street', guess: ['street', 'address', 'street address', 'address 1', 'address line 1'] },
  { key: 'city', label: 'City', guess: ['city', 'town'] },
  { key: 'state', label: 'State', guess: ['state', 'province', 'region'] },
  { key: 'zip', label: 'ZIP', guess: ['zip', 'zip code', 'zipcode', 'postal code', 'postcode'] },
  { key: 'notes', label: 'Notes', guess: ['notes', 'note', 'comments', 'comment', 'description'] },
]

const TEMPLATE = [
  ['First name', 'Last name', 'Phone', 'Email', 'Date of birth', 'Lead source', 'Service interest', 'Insurance', 'Priority', 'Lead status', 'Notes'],
  ['Jane', 'Doe', '(555) 555-0100', 'jane.doe@example.com', '05/03/1990', 'Web form', 'Physical therapy', 'Aetna', 'Medium', 'New', 'Asked for an evening appointment'],
]

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const pickOption = (list, text) => {
  if (!text) return null
  const t = norm(text)
  return list.find((o) => norm(o.value) === t || norm(o.label) === t)?.value || null
}

export default function LeadImportModal({ open, onClose, onDone }) {
  const [step, setStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [data, setData] = useState([])
  const [map, setMap] = useState({})
  const [defaultSource, setDefaultSource] = useState('Other')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  function close() {
    setStep(0); setFileName(''); setHeaders([]); setData([]); setMap({}); setError(''); setResult(null); setBusy(false)
    onClose()
  }

  async function pick(file) {
    setError('')
    if (!file) return
    let rows
    try {
      rows = await readSpreadsheet(file)
    } catch (err) {
      setError(err.message || 'Couldn’t read this file.')
      return
    }
    if (rows.length < 2) { setError('The file has a header row but no leads under it.'); return }
    if (rows.length - 1 > MAX_ROWS) { setError(`Up to ${MAX_ROWS.toLocaleString()} leads per file — split the file and import each part.`); return }
    const hdr = rows[0].map((h) => String(h).trim())
    const auto = {}
    const used = new Set()
    FIELDS.forEach((f) => {
      const idx = hdr.findIndex((h, i) => !used.has(i) && f.guess.some((g) => norm(g) === norm(h)))
      if (idx >= 0) { auto[f.key] = idx; used.add(idx) }
    })
    // A full-name column is only needed when the file has no separate first-name column.
    if (auto.firstName !== undefined) delete auto.fullName
    setFileName(file.name)
    setHeaders(hdr)
    setData(rows.slice(1))
    setMap(auto)
    setStep(1)
  }

  const mapped = useMemo(() => data.map((r, i) => {
    const get = (k) => (map[k] === undefined || map[k] === '' ? '' : String(r[map[k]] ?? '').trim())
    let firstName = get('firstName')
    let lastName = get('lastName')
    if (!firstName && get('fullName')) {
      const full = get('fullName')
      if (full.includes(',')) {
        const [last, first] = full.split(',', 2)
        firstName = first.trim(); lastName = lastName || last.trim()
      } else {
        const parts = full.split(/\s+/)
        firstName = parts.shift() || ''
        lastName = lastName || parts.join(' ')
      }
    }
    const email = get('email')
    const statusText = get('leadStatus')
    const priorityText = get('priority')
    const leadStatus = pickOption(LEAD_STATUSES, statusText)
    const priority = pickOption(PRIORITIES, priorityText)
    const dobText = get('dateOfBirth')
    const dateOfBirth = toIsoDate(dobText)
    const sourceText = get('source')
    const source = LEAD_SOURCES.find((s) => norm(s) === norm(sourceText)) || sourceText || defaultSource

    const row = {
      firstName, lastName, phone: get('phone'), email, dateOfBirth,
      gender: get('gender'), source, sourceDetail: get('sourceDetail'), campaign: get('campaign'),
      interestedService: get('interestedService'), reasonForVisit: get('reasonForVisit'),
      insurancePayer: get('insurancePayer'), insuranceMemberId: get('insuranceMemberId'),
      preferredLanguage: get('preferredLanguage'), street: get('street'), city: get('city'), state: get('state'), zip: get('zip'),
      notes: get('notes'),
      leadStatus: leadStatus && leadStatus !== 'CONVERTED' ? leadStatus : 'NEW',
      priority: priority || 'MEDIUM',
      lifecycleStage: 'LEAD',
      preferredContact: 'Mobile',
      consentCall: true,
    }
    Object.keys(row).forEach((k) => { if (row[k] === '') row[k] = null })

    const problems = []
    if (!row.firstName) problems.push('No name')
    if (email && !EMAIL.test(email)) problems.push('Email not valid')
    if (row.firstName && row.firstName.length > 100) problems.push('Name too long')
    const warns = []
    if (dobText && !dateOfBirth) warns.push('DOB unreadable — left empty')
    if (statusText && !leadStatus) warns.push(`Status “${statusText}” → New`)
    if (leadStatus === 'CONVERTED') warns.push('Converted → New (use Convert to patient)')
    if (priorityText && !priority) warns.push(`Priority “${priorityText}” → Medium`)
    if (!row.phone && !row.email) warns.push('No phone or email')
    return { n: i + 2, row, problems, warns }
  }), [data, map, defaultSource])

  const ready = mapped.filter((m) => m.problems.length === 0)
  const has = (k) => map[k] !== undefined && map[k] !== ''
  const noName = !has('firstName') && !has('fullName')

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const res = await crm.importLeads({ skipDuplicates, rows: ready.map((m) => m.row) })
      setResult(res)
      setStep(3)
    } catch (err) {
      setError(err.message || 'Import failed — nothing was saved.')
    } finally {
      setBusy(false)
    }
  }

  const stepLabels = ['Choose file', 'Match columns', 'Review', 'Done']
  return (
    <Modal
      open={open}
      size="xl"
      title={fileName ? `Import ${fileName}` : 'Import patient leads'}
      onClose={close}
      footer={
        <>
          {error && <p role="alert" className="mr-auto max-w-[55%] text-[13px] font-semibold text-warn">{error}</p>}
          {step === 0 && <Button variant="secondary" onClick={close}>Cancel</Button>}
          {step === 1 && <Button variant="secondary" onClick={() => { setStep(0); setFileName('') }}>Choose another file</Button>}
          {step === 1 && <Button disabled={noName} onClick={() => setStep(2)}>Next: review leads</Button>}
          {step === 2 && <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>}
          {step === 2 && (
            <Button disabled={busy || ready.length === 0} onClick={submit}>
              {busy ? 'Importing…' : `Import ${ready.length.toLocaleString()} lead${ready.length === 1 ? '' : 's'}`}
            </Button>
          )}
          {step === 3 && <Button onClick={() => { onDone(result); close() }}>Done</Button>}
        </>
      }
    >
      <ol className="m-0 mb-4 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-[12.5px] font-semibold">
        {stepLabels.map((s, i) => <li key={s} className={i === step ? 'text-navy' : i < step ? 'text-brand-700' : 'text-mist-500'}>{i + 1} · {s}</li>)}
      </ol>

      {step === 0 && (
        <div className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-mist-300 bg-mist-25 px-6 py-10 text-center hover:border-brand-600">
            <Icon name="upload" className="h-7 w-7 text-brand-700" />
            <span className="mt-2 text-[14px] font-semibold text-navy">Choose a CSV or Excel file</span>
            <span className="mt-1 max-w-lg text-[12.5px] text-mist-600">
              One lead per row, with column names in the first row. Up to {MAX_ROWS.toLocaleString()} leads. Only a name is required —
              phone, email, date of birth, source, service, insurance, priority, status and notes are picked up when present.
              Every row is added to Patient leads.
            </span>
            <input type="file" accept=".csv,.txt,.xlsx,.xlsm,.xltx,.xltm,.xls,.xlsb,.ods,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <button type="button" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline" onClick={() => downloadCsv('utessa-lead-import-template.csv', TEMPLATE)}>
            <Icon name="download" className="h-4 w-4" /> Download a sample file
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="m-0 mb-3 text-[13.5px] text-mist-700">
            We found <b>{data.length.toLocaleString()}</b> rows and matched the columns we recognised. Check them and change any that are wrong. Nothing is saved yet.
          </p>
          <div className="max-h-[420px] overflow-auto rounded-[12px] border border-mist-200">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="sticky top-0 bg-mist-25 text-[12px] text-mist-600">
                <tr><th className="px-3 py-2">Lead field</th><th className="px-3 py-2">Column in your file</th><th className="px-3 py-2">First row</th></tr>
              </thead>
              <tbody>
                {FIELDS.map((f) => (
                  <tr key={f.key}>
                    <td className="px-3 py-2 font-semibold text-navy">
                      {f.label}
                      {f.hint && <span className="block text-[11.5px] font-normal text-mist-500">{f.hint}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={map[f.key] ?? ''}
                        onChange={(e) => setMap((m) => ({ ...m, [f.key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                        className="h-9 w-full max-w-xs rounded-lg border border-mist-300 bg-white px-2 text-[13px]"
                      >
                        <option value="">My file doesn’t have this</option>
                        {headers.map((h, i) => <option key={`${h}-${i}`} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </Select>
                    </td>
                    <td className="px-3 py-2 font-mono text-[12.5px] text-mist-600">{map[f.key] === undefined || map[f.key] === '' ? '—' : data[0]?.[map[f.key]] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {noName && <p className="m-0 mt-2 text-[13px] font-semibold text-warn">Match the First name column (or Full name) to continue.</p>}
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
            <Pill tone="green">{ready.length.toLocaleString()} ready to import</Pill>
            {mapped.length - ready.length > 0 && <Pill tone="red">{mapped.length - ready.length} will be skipped</Pill>}
            {mapped.some((m) => m.warns.length) && <Pill tone="amber">{mapped.filter((m) => m.warns.length).length} with a note</Pill>}
          </div>
          <div className="mb-3 grid gap-3 rounded-[12px] border border-mist-200 bg-mist-25 p-3 sm:grid-cols-2">
            <label className="flex items-start gap-2 text-[13px] text-navy">
              <input type="checkbox" className="mt-0.5" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
              <span>
                <b>Skip duplicates</b>
                <span className="block text-[12px] text-mist-600">Don’t add a row whose phone or email already belongs to a lead or patient.</span>
              </span>
            </label>
            {map.source === undefined || map.source === '' ? (
              <label className="text-[13px] text-navy">
                <b>Lead source for these leads</b>
                <Select value={defaultSource} onChange={(e) => setDefaultSource(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-mist-300 bg-white px-2 text-[13px]">
                  {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </label>
            ) : (
              <p className="m-0 text-[12.5px] text-mist-600">Lead source comes from your file. Rows without one get “{defaultSource}”.</p>
            )}
          </div>
          <div className="max-h-[380px] overflow-auto rounded-[12px] border border-mist-200">
            <table className="w-full min-w-[760px] border-collapse text-left text-[12.5px]">
              <thead className="sticky top-0 bg-mist-25 text-[12px] text-mist-600">
                <tr>{['Row', 'Lead', 'Phone', 'Email', 'DOB', 'Source', 'Status', 'Check'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
              </thead>
              <tbody>
                {mapped.slice(0, 500).map((m) => (
                  <tr key={m.n} className={m.problems.length ? 'bg-danger-50' : ''}>
                    <td className="px-3 py-2 font-mono text-mist-500">{m.n}</td>
                    <td className="px-3 py-2 font-semibold text-navy">{`${m.row.firstName || ''} ${m.row.lastName || ''}`.trim() || '—'}</td>
                    <td className="px-3 py-2 font-mono">{m.row.phone || '—'}</td>
                    <td className="px-3 py-2">{m.row.email || '—'}</td>
                    <td className="px-3 py-2">{m.row.dateOfBirth ? fmtDate(m.row.dateOfBirth) : '—'}</td>
                    <td className="px-3 py-2">{m.row.source || '—'}</td>
                    <td className="px-3 py-2">{LEAD_STATUSES.find((s) => s.value === m.row.leadStatus)?.label}</td>
                    <td className="px-3 py-2">
                      {m.problems.map((p) => <span key={p} className="mr-2 inline-block font-semibold text-danger-700">{p}</span>)}
                      {m.warns.map((w) => <span key={w} className="mr-2 inline-block text-sun-700">{w}</span>)}
                      {!m.problems.length && !m.warns.length && <span className="text-brand-800">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mapped.length > 500 && <p className="m-0 mt-2 text-[12px] text-mist-600">Showing the first 500 rows; all {ready.length.toLocaleString()} ready rows will be imported.</p>}
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label="Leads added" value={result.created} tone="green" />
            <Kpi label="Duplicates skipped" value={result.duplicates} tone="gray" />
            <Kpi label="Rows not imported" value={mapped.length - ready.length + (result.skipped.length - result.duplicates)} tone="amber" />
          </div>
          <p className="m-0 text-[13px] text-mist-700">The new leads are in <b>Patient leads</b>, ready to work.</p>
          {result.skipped.length > 0 && (
            <details className="rounded-[12px] border border-mist-200 bg-mist-25 p-3 text-[12.5px] text-mist-700">
              <summary className="cursor-pointer font-semibold text-navy">Skipped rows ({result.skipped.length})</summary>
              <ul className="m-0 mt-2 max-h-48 list-disc overflow-auto pl-5">
                {result.skipped.map((s) => {
                  // The server numbers rows within what was sent; show the row number from the file.
                  const [, n, rest] = s.match(/^Row (\d+): (.*)$/) || []
                  return <li key={s}>{n ? `Row ${ready[Number(n) - 1]?.n ?? n}: ${rest}` : s}</li>
                })}
              </ul>
            </details>
          )}
        </div>
      )}
    </Modal>
  )
}
