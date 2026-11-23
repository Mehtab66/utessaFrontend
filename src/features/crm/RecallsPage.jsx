import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import { RECALL_CLOSE_REASONS, RECALL_STATUSES, crm } from './crmApi'
import { formatPhone } from './CallDeskPage'
import {
  Alert, Button, Card, DataTable, EnumPill, Field, FilterSelect, Kpi, Loading, Modal, PageHeader, Pill, SearchInput,
  Toolbar, fmtDate, fmtDateTime, fmtRelative, useAsync, useDebounced, useToast,
} from './ui'
import Select from '../../shared/ui/Select'

const SOURCE_LABEL = { UTESSA: 'Marked in Utessa', EHR: 'From EHR', UPLOAD: 'File upload' }

export default function RecallsPage() {
  const [toastNode, toast] = useToast()
  const { data, loading, error, reload } = useAsync(() => crm.recalls(), [])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('OPEN')
  const [visitType, setVisitType] = useState('ALL')
  const [source, setSource] = useState('ALL')
  const [calling, setCalling] = useState(null)
  const [importing, setImporting] = useState(false)
  const needle = useDebounced(q).toLowerCase()
  const all = data || []

  const visitTypes = useMemo(() => [...new Set(all.map((r) => r.visitType).filter(Boolean))], [all])
  const rows = all
    .filter((r) => (status === 'ALL' ? true : status === 'OPEN' ? r.status === 'TO_CALL' || r.status === 'NOT_REACHED' : r.status === status))
    .filter((r) => visitType === 'ALL' || r.visitType === visitType)
    .filter((r) => source === 'ALL' || r.source === source)
    .filter((r) => !needle || [r.patientName, r.patientPhone, r.mrn, r.providerName].some((v) => v?.toLowerCase().includes(needle)))

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const today = new Date().toISOString().slice(0, 10)
  const kpis = {
    toCall: all.filter((r) => r.status === 'TO_CALL' || (r.status === 'NOT_REACHED' && (!r.nextAttemptOn || r.nextAttemptOn <= today))).length,
    notReached: all.filter((r) => r.status === 'NOT_REACHED').length,
    rebooked: all.filter((r) => r.status === 'REBOOKED' && r.lastAttemptAt && new Date(r.lastAttemptAt) >= monthStart).length,
    total: all.length,
  }
  const rebookRate = all.length ? Math.round((all.filter((r) => r.status === 'REBOOKED').length * 100) / all.length) : 0

  return (
    <div>
      <PageHeader
        title="No-shows & cancellations"
        subtitle="Missed and cancelled visits become one call list. Every call is logged to the patient, and rebooked visits go straight onto the schedule."
        actions={<Button onClick={() => setImporting(true)}><Icon name="upload" /> Upload a file</Button>}
      />
      <Alert>{error}</Alert>

      <div className="mb-4 grid gap-3 lg:grid-cols-2">
        <Card bodyClassName="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist-100 text-ink-700"><Icon name="refresh" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[14px] font-semibold text-navy">From the EHR</p>
            <p className="m-0 mt-0.5 text-[13px] text-mist-600">
              Once your <Link to="/app/crm/integrations" className="font-semibold text-brand-700">EHR is connected</Link>, no-shows and cancellations are pulled every weekday morning. Visits you mark as no-show or cancelled in Utessa are added automatically today.
            </p>
          </div>
        </Card>
        <Card bodyClassName="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name="upload" className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[14px] font-semibold text-navy">Upload a file (.csv)</p>
            <p className="m-0 mt-0.5 text-[13px] text-mist-600">Export your appointment status report (No Show and Cancelled) and upload it. Each row is matched to the patient by MRN, name + date of birth, or phone.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setImporting(true)}>Choose file</Button>
        </Card>
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <Kpi label="To call today" value={kpis.toCall} tone="blue" onClick={() => setStatus('OPEN')} />
        <Kpi label="Not reached yet" value={kpis.notReached} tone="amber" onClick={() => setStatus('NOT_REACHED')} />
        <Kpi label="Rebooked this month" value={kpis.rebooked} tone="green" onClick={() => setStatus('REBOOKED')} />
        <Kpi label="Rebook rate" value={`${rebookRate}%`} hint={`${kpis.total} visits on the list`} tone="teal" />
      </div>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Patient, phone, MRN, provider…" />
        <FilterSelect label="Status" value={status} onChange={setStatus} allLabel="All" options={[{ value: 'OPEN', label: 'Still to call' }, ...RECALL_STATUSES]} />
        <FilterSelect label="Visit type" value={visitType} onChange={setVisitType} allLabel="All visit types" options={visitTypes.map((v) => ({ value: v, label: v }))} />
        <FilterSelect label="Source" value={source} onChange={setSource} allLabel="All sources" options={Object.entries(SOURCE_LABEL).map(([value, label]) => ({ value, label }))} />
      </Toolbar>

      <DataTable
        rows={rows}
        loading={loading}
        empty="Nothing to call with these filters."
        columns={[
          {
            key: 'patientName',
            label: 'Patient',
            render: (r) => (
              <div>
                <Link to={`/app/crm/patients/${r.patientId}`} className="font-semibold text-navy hover:text-brand-700">{r.patientName}</Link>
                <p className="m-0 text-[12px] text-mist-600">{r.patientDob ? `DOB ${fmtDate(r.patientDob)}` : 'DOB not on file'}{r.mrn ? ` · ${r.mrn}` : ''}</p>
              </div>
            ),
          },
          {
            key: 'missedAt',
            label: 'Missed visit',
            nowrap: true,
            sortValue: (r) => r.missedAt,
            render: (r) => (
              <div>
                <p className="m-0">{fmtDateTime(r.missedAt)}</p>
                <p className="m-0 text-[12px] text-mist-600">{[r.visitType, r.providerName].filter(Boolean).join(' · ') || '—'}</p>
              </div>
            ),
          },
          {
            key: 'missType',
            label: 'Reason',
            render: (r) => (
              <div className="space-y-1">
                <Pill tone={r.missType === 'NO_SHOW' ? 'red' : 'amber'}>{r.missType === 'NO_SHOW' ? 'No-show' : 'Cancelled'}</Pill>
                <p className="m-0 text-[11.5px] text-mist-500">{SOURCE_LABEL[r.source]}</p>
              </div>
            ),
          },
          { key: 'patientPhone', label: 'Phone', nowrap: true, render: (r) => <span className="font-mono">{r.patientPhone ? formatPhone(r.patientPhone) : '—'}</span> },
          { key: 'attempts', label: 'Attempts', align: 'right', render: (r) => <span className="font-mono">{r.attempts}</span> },
          {
            key: 'lastOutcome',
            label: 'Last outcome',
            render: (r) => (
              <div>
                <p className="m-0">{r.lastOutcome || '—'}</p>
                {r.status === 'NOT_REACHED' && r.nextAttemptOn && <p className="m-0 text-[12px] text-mist-600">Try again {fmtDate(r.nextAttemptOn)}</p>}
                {r.status === 'REBOOKED' && r.rebookedAt && <p className="m-0 text-[12px] text-brand-800">New visit {fmtDateTime(r.rebookedAt)}</p>}
                {r.lastAttemptAt && <p className="m-0 text-[11.5px] text-mist-500">{fmtRelative(r.lastAttemptAt)}</p>}
              </div>
            ),
          },
          { key: 'status', label: 'Status', toneList: RECALL_STATUSES, render: (r) => <EnumPill list={RECALL_STATUSES} value={r.status} /> },
          {
            key: 'actions',
            label: '',
            sortable: false,
            render: (r) => (r.status === 'TO_CALL' || r.status === 'NOT_REACHED' ? (
              <Button size="sm" onClick={() => setCalling(r)}><Icon name="phone" /> Call</Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={async () => {
                await crm.recallReopen(r.id)
                toast('Back on the call list')
                reload()
              }}>Reopen</Button>
            )),
          },
        ]}
      />

      <RecallCallModal recall={calling} onClose={() => setCalling(null)} onSaved={async (msg) => {
        setCalling(null)
        toast(msg)
        await reload()
      }} />
      <ImportModal open={importing} onClose={() => setImporting(false)} onDone={async (res) => {
        setImporting(false)
        toast(`${res.added} visit${res.added === 1 ? '' : 's'} added to the call list`)
        await reload()
      }} />
      {toastNode}
    </div>
  )
}

/* ─── Calling a patient from the list ──────────────────────────────────── */
function RecallCallModal({ recall, onClose, onSaved }) {
  const [outcome, setOutcome] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [provider, setProvider] = useState('')
  const [tryAgain, setTryAgain] = useState('')
  const [closeReason, setCloseReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [openings, setOpenings] = useState(null)
  const [startedAt] = useState(() => Date.now())

  async function loadOpenings(prov, from) {
    setOpenings(null)
    try {
      setOpenings(await crm.openings({ provider: prov || undefined, from: from || undefined, duration: 30, days: 3 }))
    } catch {
      setOpenings([])
    }
  }

  if (!recall) return null
  const reset = () => {
    setOutcome(''); setDate(''); setSlot(''); setProvider(''); setTryAgain(''); setCloseReason(''); setNotes(''); setError(''); setOpenings(null)
  }

  async function save() {
    if (!outcome) return setError('Choose the outcome.')
    if (outcome === 'REBOOKED' && !slot) return setError('Pick the new visit time.')
    if (outcome === 'CLOSED' && !closeReason) return setError('Choose why this visit won’t be rebooked.')
    setBusy(true)
    setError('')
    try {
      await crm.recallAttempt(recall.id, {
        outcome,
        newStartsAt: outcome === 'REBOOKED' ? slot : null,
        providerName: provider || recall.providerName || null,
        tryAgainOn: tryAgain || null,
        closeReason: closeReason || null,
        notes: notes || null,
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
      })
      reset()
      onSaved(outcome === 'REBOOKED' ? 'Rebooked — the new visit is on the schedule' : outcome === 'CLOSED' ? 'Closed and logged' : 'Attempt logged')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const choice = (on) => `min-h-10 rounded-lg border px-3 text-[13px] font-semibold transition ${on ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-[inset_0_0_0_1px_#1E8E94]' : 'border-mist-300 bg-white text-navy hover:border-mist-400'}`
  const OUTCOMES = [['REBOOKED', 'Rebooked'], ['NOT_REACHED', 'No answer'], ['LEFT_VOICEMAIL', 'Left voicemail'], ['CLOSED', 'Won’t rebook']]

  return (
    <Modal
      open
      size="lg"
      title={`Call ${recall.patientName}`}
      subtitle={<span className="font-mono">{recall.patientPhone ? formatPhone(recall.patientPhone) : 'No phone on file'}</span>}
      onClose={() => { reset(); onClose() }}
      footer={
        <>
          {error && <p role="alert" className="mr-auto text-[13px] font-semibold text-warn">{error}</p>}
          <Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'End call and save'}</Button>
        </>
      }
    >
      <div className="mb-4 rounded-[10px] bg-mist-50 px-3.5 py-3 text-[13.5px] text-navy">
        {recall.missType === 'NO_SHOW' ? 'Missed' : 'Cancelled'} {recall.visitType || 'visit'} on <b>{fmtDateTime(recall.missedAt)}</b>
        {recall.providerName ? ` with ${recall.providerName}` : ''}. {recall.attempts ? `${recall.attempts} earlier attempt${recall.attempts === 1 ? '' : 's'}${recall.lastOutcome ? ` · last: ${recall.lastOutcome}` : ''}.` : 'First attempt.'}
      </div>
      <p className="m-0 mb-1.5 text-[12px] font-bold text-mist-800">Outcome *</p>
      <div className="flex flex-wrap gap-2">
        {OUTCOMES.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={outcome === v} className={choice(outcome === v)} onClick={() => {
            setOutcome(v)
            if (v === 'REBOOKED' && openings === null) loadOpenings(provider || recall.providerName, date)
          }}>{l}</button>
        ))}
      </div>

      {outcome === 'REBOOKED' && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              field={{ name: 'prov', label: 'Provider', placeholder: recall.providerName || 'Any provider', type: 'text' }}
              value={provider}
              onChange={(v) => { setProvider(v); setSlot('') }}
            />
            <Field field={{ name: 'from', label: 'Openings from', type: 'date', min: new Date().toISOString().slice(0, 10) }} value={date} onChange={(v) => { setDate(v); setSlot(''); loadOpenings(provider || recall.providerName, v) }} />
          </div>
          <Button size="sm" variant="ghost" onClick={() => loadOpenings(provider || recall.providerName, date)}><Icon name="refresh" /> Refresh openings</Button>
          {openings === null ? <Loading label="Finding openings…" /> : openings.length === 0 ? (
            <p className="m-0 text-[13px] text-mist-600">No openings found. Try another date or provider.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {openings.map((d) => (
                <div key={d.date} className="rounded-[10px] border border-mist-200 p-2.5">
                  <p className="m-0 mb-1.5 text-[12.5px] font-bold text-navy">{new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  <div className="flex flex-wrap gap-1">
                    {d.slots.slice(0, 8).map((s) => (
                      <button key={s} type="button" aria-pressed={slot === s} onClick={() => setSlot(s)} className={`${choice(slot === s)} min-h-8 px-2 font-mono text-[12px]`}>
                        {new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {(outcome === 'NOT_REACHED' || outcome === 'LEFT_VOICEMAIL') && (
        <div className="mt-4 max-w-xs">
          <Field field={{ name: 'again', label: 'Try again on', type: 'date', min: new Date().toISOString().slice(0, 10), hint: 'Default: next business day' }} value={tryAgain} onChange={setTryAgain} />
        </div>
      )}
      {outcome === 'CLOSED' && (
        <div className="mt-4 max-w-sm">
          <Field field={{ name: 'cr', label: 'Why it won’t be rebooked *', type: 'select', options: RECALL_CLOSE_REASONS, emptyLabel: 'Choose…' }} value={closeReason} onChange={setCloseReason} />
        </div>
      )}
      <div className="mt-4">
        <Field field={{ name: 'notes', label: 'Notes', type: 'textarea' }} value={notes} onChange={setNotes} />
      </div>
      <p className="m-0 mt-2 text-[12px] text-mist-500">The call is logged to {recall.patientName}’s timeline. Rebooked visits are queued for the EHR when that integration is enabled.</p>
    </Modal>
  )
}

/* ─── File import with column mapping ──────────────────────────────────── */
const COLUMNS = [
  { key: 'firstName', label: 'First name', req: true, guess: ['first name', 'first', 'fname', 'patient first name', 'given name'] },
  { key: 'lastName', label: 'Last name', req: true, guess: ['last name', 'last', 'lname', 'patient last name', 'surname', 'family name'] },
  { key: 'dateOfBirth', label: 'Date of birth', req: false, guess: ['dob', 'date of birth', 'birth date', 'birthdate', 'patient dob'] },
  { key: 'phone', label: 'Phone', req: false, guess: ['phone', 'mobile', 'cell', 'phone number', 'home phone', 'contact number'] },
  { key: 'missedAt', label: 'Appointment date', req: true, guess: ['appointment date', 'appt date', 'date', 'visit date', 'appointment', 'date of service', 'start'] },
  { key: 'visitType', label: 'Visit type', req: false, guess: ['visit type', 'appointment type', 'appt type', 'type', 'reason'] },
  { key: 'status', label: 'Status', req: false, guess: ['status', 'appointment status', 'appt status'] },
  { key: 'providerName', label: 'Provider', req: false, guess: ['provider', 'doctor', 'physician', 'rendering provider', 'resource'] },
  { key: 'mrn', label: 'MRN', req: false, guess: ['mrn', 'chart', 'chart number', 'patient id', 'account', 'account number'] },
]

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

function toIsoDate(v) {
  if (!v) return null
  const s = v.trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (m) {
    const y = m[3].length === 2 ? (Number(m[3]) > 30 ? `19${m[3]}` : `20${m[3]}`) : m[3]
    return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}
function toInstant(v) {
  if (!v) return null
  const s = v.trim()
  const date = toIsoDate(s)
  if (!date) return null
  const t = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i)
  let h = 9
  let min = 0
  if (t) {
    h = Number(t[1]) % 12 + (t[3] && t[3].toLowerCase() === 'pm' ? 12 : 0)
    if (!t[3] && Number(t[1]) >= 12) h = Number(t[1])
    min = Number(t[2])
  }
  const d = new Date(`${date}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function ImportModal({ open, onClose, onDone }) {
  const [step, setStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [data, setData] = useState([])
  const [map, setMap] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  function close() {
    setStep(0); setFileName(''); setHeaders([]); setData([]); setMap({}); setError(''); setResult(null)
    onClose()
  }

  async function pick(file) {
    setError('')
    if (!file) return
    if (!/\.csv$/i.test(file.name)) {
      setError('Save the report as .csv (in Excel: File → Save As → CSV) and upload that file.')
      return
    }
    const rows = parseCsv(await file.text())
    if (rows.length < 2) {
      setError('The file has no data rows.')
      return
    }
    if (rows.length - 1 > 5000) {
      setError('Up to 5,000 rows per file.')
      return
    }
    const hdr = rows[0].map((h) => h.trim())
    const auto = {}
    COLUMNS.forEach((c) => {
      const idx = hdr.findIndex((h) => c.guess.includes(h.toLowerCase()))
      if (idx >= 0) auto[c.key] = idx
    })
    setFileName(file.name)
    setHeaders(hdr)
    setData(rows.slice(1))
    setMap(auto)
    setStep(1)
  }

  const mapped = useMemo(() => data.map((r, i) => {
    const get = (k) => (map[k] === undefined || map[k] === '' ? '' : (r[map[k]] || '').trim())
    const row = {
      firstName: get('firstName'),
      lastName: get('lastName'),
      dateOfBirth: toIsoDate(get('dateOfBirth')),
      phone: get('phone'),
      missedAt: toInstant(get('missedAt')),
      visitType: get('visitType') || null,
      status: get('status') || null,
      providerName: get('providerName') || null,
      mrn: get('mrn') || null,
    }
    const problems = []
    if (!row.firstName || !row.lastName) problems.push('Name missing')
    if (!row.missedAt) problems.push('Visit date unreadable')
    if (!row.dateOfBirth && row.phone.replace(/\D/g, '').length < 10) problems.push('Needs DOB or phone')
    const warn = row.status && !/no.?show|cancel|missed/i.test(row.status) ? 'Status isn’t no-show/cancelled' : null
    return { n: i + 2, row, problems, warn }
  }), [data, map])

  const ready = mapped.filter((m) => m.problems.length === 0)
  const missingRequired = COLUMNS.filter((c) => c.req && (map[c.key] === undefined || map[c.key] === ''))

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const res = await crm.recallImport({ source: 'UPLOAD', rows: ready.map((m) => m.row) })
      setResult(res)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const stepLabels = ['Choose file', 'Match columns', 'Review', 'Done']
  return (
    <Modal
      open={open}
      size="xl"
      title={fileName ? `Import ${fileName}` : 'Import missed & cancelled visits'}
      onClose={close}
      footer={
        <>
          {error && <p role="alert" className="mr-auto max-w-[55%] text-[13px] font-semibold text-warn">{error}</p>}
          {step === 1 && <Button variant="secondary" onClick={close}>Cancel</Button>}
          {step === 1 && <Button disabled={missingRequired.length > 0} onClick={() => setStep(2)}>Next: review patients</Button>}
          {step === 2 && <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>}
          {step === 2 && <Button disabled={busy || ready.length === 0} onClick={submit}>{busy ? 'Adding…' : `Add ${ready.length} visit${ready.length === 1 ? '' : 's'} to the call list`}</Button>}
          {step === 3 && <Button onClick={() => { onDone(result); close() }}>Done</Button>}
          {step === 0 && <Button variant="secondary" onClick={close}>Cancel</Button>}
        </>
      }
    >
      <ol className="m-0 mb-4 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-[12.5px] font-semibold">
        {stepLabels.map((s, i) => <li key={s} className={i === step ? 'text-navy' : i < step ? 'text-brand-700' : 'text-mist-500'}>{i + 1} · {s}</li>)}
      </ol>

      {step === 0 && (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-mist-300 bg-mist-25 px-6 py-10 text-center hover:border-brand-600">
          <Icon name="upload" className="h-7 w-7 text-brand-700" />
          <span className="mt-2 text-[14px] font-semibold text-navy">Choose a .csv file</span>
          <span className="mt-1 max-w-lg text-[12.5px] text-mist-600">Up to 5,000 rows, one row per missed or cancelled visit. Columns we look for: first name, last name, date of birth, phone, appointment date, visit type, status, provider, MRN. Other columns are ignored.</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      )}

      {step === 1 && (
        <div>
          <p className="m-0 mb-3 text-[13.5px] text-mist-700">We found <b>{data.length}</b> rows. We filled in the columns we recognised — check them and change any that are wrong. Nothing is saved yet.</p>
          <div className="overflow-hidden rounded-[12px] border border-mist-200">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="bg-mist-25 text-[12px] text-mist-600">
                <tr><th className="px-3 py-2">Information</th><th className="px-3 py-2">Column in your file</th><th className="px-3 py-2">First row</th></tr>
              </thead>
              <tbody>
                {COLUMNS.map((c) => (
                  <tr key={c.key} className="border-t border-mist-200">
                    <td className="px-3 py-2 font-semibold text-navy">{c.label}{c.req && <span className="text-danger-600"> *</span>}</td>
                    <td className="px-3 py-2">
                      <Select
                        value={map[c.key] ?? ''}
                        onChange={(e) => setMap((m) => ({ ...m, [c.key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                        className="h-9 w-full max-w-xs rounded-lg border border-mist-300 bg-white px-2 text-[13px]"
                      >
                        <option value="">My file doesn’t have this</option>
                        {headers.map((h, i) => <option key={`${h}-${i}`} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </Select>
                    </td>
                    <td className="px-3 py-2 font-mono text-[12.5px] text-mist-600">{map[c.key] === undefined || map[c.key] === '' ? '—' : data[0]?.[map[c.key]] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {missingRequired.length > 0 && <p className="m-0 mt-2 text-[13px] font-semibold text-warn">Match: {missingRequired.map((c) => c.label).join(', ')}</p>}
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mb-3 flex flex-wrap gap-2 text-[12.5px]">
            <Pill tone="green">{ready.length} ready to add</Pill>
            <Pill tone="red">{mapped.length - ready.length} need fixing in the file</Pill>
            <Pill tone="amber">{mapped.filter((m) => m.warn).length} with a warning</Pill>
          </div>
          <p className="m-0 mb-2 text-[12.5px] text-mist-600">Utessa links each row to an existing patient (MRN, name + date of birth, or phone) or creates the patient. Visits already on the list aren’t added twice.</p>
          <div className="max-h-[420px] overflow-auto rounded-[12px] border border-mist-200">
            <table className="w-full min-w-[720px] border-collapse text-left text-[12.5px]">
              <thead className="sticky top-0 bg-mist-25 text-[12px] text-mist-600">
                <tr>{['Row', 'Patient', 'DOB', 'Phone', 'Missed visit', 'Status', 'Flags'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
              </thead>
              <tbody>
                {mapped.slice(0, 500).map((m) => (
                  <tr key={m.n} className={`border-t border-mist-200 ${m.problems.length ? 'bg-danger-50' : ''}`}>
                    <td className="px-3 py-2 font-mono text-mist-500">{m.n}</td>
                    <td className="px-3 py-2 font-semibold text-navy">{`${m.row.firstName} ${m.row.lastName}`.trim() || '—'}</td>
                    <td className="px-3 py-2">{m.row.dateOfBirth ? fmtDate(m.row.dateOfBirth) : '—'}</td>
                    <td className="px-3 py-2 font-mono">{m.row.phone || '—'}</td>
                    <td className="px-3 py-2">{m.row.missedAt ? fmtDateTime(m.row.missedAt) : '—'}{m.row.visitType ? ` · ${m.row.visitType}` : ''}</td>
                    <td className="px-3 py-2">{m.row.status || '—'}</td>
                    <td className="px-3 py-2">
                      {m.problems.map((p) => <span key={p} className="mr-1 inline-block text-danger-700">{p}</span>)}
                      {m.warn && <span className="text-sun-700">{m.warn}</span>}
                      {!m.problems.length && !m.warn && <span className="text-brand-800">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mapped.length > 500 && <p className="m-0 mt-2 text-[12px] text-mist-600">Showing the first 500 rows; all {ready.length} ready rows will be added.</p>}
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <Kpi label="Added" value={result.added} tone="green" />
            <Kpi label="Linked to patients" value={result.linkedToExisting} tone="teal" />
            <Kpi label="New patients" value={result.newPatients} tone="ink" />
            <Kpi label="Already on list" value={result.skippedDuplicates} tone="gray" />
          </div>
          {result.messages.length > 0 && (
            <ul className="m-0 list-disc pl-5 text-[12.5px] text-sun-700">{result.messages.map((m) => <li key={m}>{m}</li>)}</ul>
          )}
        </div>
      )}
    </Modal>
  )
}
