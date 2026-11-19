import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import {
  APPT_STATUSES, CALLER_TYPES, CALL_DOC_OUTCOMES, CALL_REASONS, LEAD_REASONS, OPP_STAGES, REFERRAL_STATUSES, crm,
} from './crmApi'
import { useCrmEditors } from './CrmEditors'
import NewPatientWizard, { SyncList } from './NewPatientWizard'
import {
  Alert, Avatar, Button, Card, EnumPill, Field, Loading, PageHeader, Pill, ageFrom, formatPhone, fmtDate, fmtDateTime, fmtRelative,
  useAsync, useToast,
} from './ui'
import Select from '../../shared/ui/Select'
import { LogoMark } from '../../shared/ui/LogoLoader'

const LINES = [
  { value: 'MAIN', label: 'Main line' },
  { value: 'REFERRAL', label: 'Referral line' },
]
const KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', ''],
]

export { formatPhone } from './ui'
const isCall = (a) => a.type === 'CALL_INBOUND' || a.type === 'CALL_OUTBOUND'

export default function CallDeskPage() {
  const [params, setParams] = useSearchParams()
  const [toastNode, toast] = useToast()
  const [phase, setPhase] = useState('idle') // idle | ringing | live | ended
  const [direction, setDirection] = useState('INBOUND')
  const [line, setLine] = useState('MAIN')
  const [number, setNumber] = useState('')
  const [lookup, setLookup] = useState(null)
  const [looking, setLooking] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState(null) // patient | new | other | created
  const [selectedId, setSelectedId] = useState(null)
  const [linkedNote, setLinkedNote] = useState(null)
  const [callNotes, setCallNotes] = useState('')
  const [created, setCreated] = useState(null)
  const [startedAt, setStartedAt] = useState(null)
  const [endedAt, setEndedAt] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const recent = useAsync(() => crm.recentCalls(15), [])
  const editors = useCrmEditors({ toast, onSaved: () => refreshLookup() })

  useEffect(() => {
    if (!startedAt || endedAt) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [startedAt, endedAt])

  useEffect(() => {
    const p = params.get('phone')
    if (p) start(p, params.get('direction') === 'OUTBOUND' ? 'OUTBOUND' : 'INBOUND')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const elapsed = startedAt ? Math.max(0, Math.round(((endedAt || now) - startedAt) / 1000)) : 0
  const timer = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  async function runLookup(phone) {
    setLooking(true)
    setError('')
    try {
      const data = await crm.lookupCaller(phone)
      setLookup(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLooking(false)
    }
  }

  async function refreshLookup() {
    if (lookup?.phone) await runLookup(lookup.phone)
  }

  async function start(phone, dir) {
    const value = String(phone || '').trim()
    if (value.replace(/\D/g, '').length < 7) {
      setError('Enter at least 7 digits.')
      return
    }
    setDirection(dir)
    setNumber(value)
    setMode(null)
    setSelectedId(null)
    setLinkedNote(null)
    setCallNotes('')
    setCreated(null)
    setEndedAt(null)
    setParams({ phone: value, direction: dir }, { replace: true })
    if (dir === 'INBOUND') {
      setPhase('ringing')
      await runLookup(value)
    } else {
      const data = await runLookup(value)
      if (data) answer(data)
    }
  }

  function answer(data = lookup) {
    setPhase('live')
    setStartedAt(Date.now())
    setNow(Date.now())
    if (!data) return
    if (data.newCaller) setMode('new')
    else {
      setMode('patient')
      if (data.matches.length === 1) setSelectedId(data.matches[0].patient.id)
    }
  }

  async function sendToVoicemail() {
    try {
      const match = lookup?.matches?.length === 1 ? lookup.matches[0].patient : null
      await crm.documentCall({
        phone: number,
        direction: 'INBOUND',
        patientId: match?.id || null,
        callerName: match ? null : formatPhone(number),
        callerType: match ? null : 'NEW_CALLER',
        outcome: 'Missed',
        notes: 'Sent to voicemail',
        phoneLine: line,
      })
      toast('Sent to voicemail and logged as a missed call')
    } catch (err) {
      toast(err.message, 'error')
    }
    reset()
  }

  function endCall() {
    setEndedAt(Date.now())
    setPhase('ended')
  }

  function reset() {
    setPhase('idle')
    setLookup(null)
    setMode(null)
    setSelectedId(null)
    setStartedAt(null)
    setEndedAt(null)
    setNumber('')
    setCallNotes('')
    setLinkedNote(null)
    setCreated(null)
    setError('')
    setParams({}, { replace: true })
    recent.reload()
  }

  const selected = lookup?.matches?.find((m) => m.patient.id === selectedId) || null
  const callerLabel = mode === 'patient' && selected
    ? selected.patient.fullName
    : mode === 'created' && created
      ? created.patient.fullName
      : mode === 'other' ? 'Other caller' : 'New caller'

  return (
    <div className="space-y-4">
      {(phase === 'live' || phase === 'ended') && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] bg-brand-900 px-4 py-2.5 text-white">
          <span className={`h-2.5 w-2.5 rounded-full ${phase === 'live' ? 'bg-success-500' : 'bg-mist-400'}`} aria-hidden="true" />
          <span className="text-[14px] font-semibold">
            {phase === 'live' ? (direction === 'INBOUND' ? 'On call' : 'Calling') : 'Call ended'} · {callerLabel}
          </span>
          <span className="font-mono text-[13px] text-brand-100">{formatPhone(number)}</span>
          <span className="font-mono text-[17px]" aria-label="Call length">{timer}</span>
          <span className="ml-auto flex items-center gap-2">
            {phase === 'live' ? (
              <button type="button" onClick={endCall} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-danger-600 px-3.5 text-[13px] font-semibold text-white hover:bg-danger-700">
                <Icon name="phone" className="h-4 w-4 rotate-[135deg]" /> End call
              </button>
            ) : (
              <span className="text-[13px] text-brand-100">Finish the documentation below.</span>
            )}
          </span>
        </div>
      )}

      {phase === 'idle' || phase === 'ringing' ? (
        <>
          <PageHeader
            title="Calls"
            subtitle="Every call is matched against your patients and leads before you answer — existing patients open their profile, new numbers start intake."
          />
          <Alert>{error}</Alert>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-4">
              {phase === 'ringing' ? (
                <RingCard number={number} line={line} lookup={lookup} looking={looking} onAnswer={() => answer()} onVoicemail={sendToVoicemail} />
              ) : (
                <Card bodyClassName="flex flex-wrap items-center gap-4 p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Icon name="phone" className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[16px] font-semibold text-navy">Waiting for the next call</p>
                    <p className="m-0 mt-0.5 text-[13px] text-mist-600">
                      Type the caller’s number on the keypad and choose <b>Incoming</b>. When the phone system is connected, calls ring here automatically.
                    </p>
                  </div>
                </Card>
              )}
              <RecentCalls state={recent} onCall={(c) => start(c.phone, 'OUTBOUND')} />
            </div>
            <Keypad
              number={number}
              setNumber={setNumber}
              line={line}
              setLine={setLine}
              disabled={phase === 'ringing'}
              onIncoming={() => start(number, 'INBOUND')}
              onOutgoing={() => start(number, 'OUTBOUND')}
            />
          </div>
        </>
      ) : (
        <>
          <Alert>{error}</Alert>
          {looking && !lookup && <Loading label="Matching caller…" />}

          {mode === 'patient' && lookup && !selected && (
            <ChooseCaller matches={lookup.matches} onPick={setSelectedId} onNew={() => setMode('new')} />
          )}

          {mode === 'patient' && selected && (
            <ExistingCaller
              match={selected}
              number={number}
              direction={direction}
              line={line}
              elapsed={elapsed}
              linkedNote={linkedNote}
              editors={editors}
              onDone={reset}
              toast={toast}
            />
          )}

          {mode === 'new' && (
            <NewCaller
              number={number}
              line={line}
              callNotes={callNotes}
              setCallNotes={setCallNotes}
              elapsed={elapsed}
              timer={timer}
              onLinked={async (patient, oldPhone) => {
                setLinkedNote({ name: patient.fullName, phone: formatPhone(number), oldPhone: oldPhone ? formatPhone(oldPhone) : null })
                const data = await runLookup(number)
                if (data) {
                  setMode('patient')
                  setSelectedId(patient.id)
                }
              }}
              onCreated={(res) => {
                setCreated(res)
                setMode('created')
              }}
              onLeadSaved={() => toast('Lead saved with the call notes')}
              onOther={() => setMode('other')}
              onDone={reset}
            />
          )}

          {mode === 'other' && (
            <OtherCaller number={number} line={line} elapsed={elapsed} notes={callNotes} setNotes={setCallNotes} onBack={() => setMode('new')} onDone={reset} />
          )}

          {mode === 'created' && created && <CreatedPatient result={created} timer={timer} onDone={reset} />}
        </>
      )}
      {editors.node}
      {toastNode}
    </div>
  )
}

/* ─── Ringing ──────────────────────────────────────────────────────────── */
function RingCard({ number, line, lookup, looking, onAnswer, onVoicemail }) {
  const match = lookup?.matches?.[0]
  const p = match?.patient
  const next = match?.upcomingAppointments?.[0]
  return (
    <section role="dialog" aria-labelledby="ring-h" className="rounded-[14px] border border-brand-100 bg-white p-5 shadow-[0_18px_50px_rgba(16,19,46,0.12)]">
      <div className="flex items-center gap-4">
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-600/40" aria-hidden="true" />
          <Icon name="phoneIn" className="relative h-5 w-5" />
        </span>
        <div>
          <h2 id="ring-h" className="m-0 text-[12px] font-semibold text-brand-700">Incoming call</h2>
          <p className="m-0 font-mono text-[22px] font-medium text-navy">{formatPhone(number)}</p>
          <p className="m-0 text-[13px] text-mist-600">{LINES.find((l) => l.value === line)?.label}</p>
        </div>
      </div>
      <div className="mt-4 rounded-[10px] bg-mist-50 p-4">
        {looking && (
          <p className="m-0 flex items-center gap-2 text-[14px] text-navy">
            <LogoMark size={22} />
            Checking patients and leads for this number…
          </p>
        )}
        {!looking && p && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={p.lifecycleStage === 'PATIENT' ? 'green' : 'blue'}>{p.lifecycleStage === 'PATIENT' ? 'Existing patient' : 'Existing lead'}</Pill>
              {lookup.matches.length > 1 && <Pill tone="amber">{lookup.matches.length} people on this number</Pill>}
            </div>
            <p className="m-0 mt-2 text-[18px] font-bold text-navy">{p.fullName}</p>
            <p className="m-0 mt-0.5 text-[13px] text-mist-600">
              {[p.dateOfBirth && `DOB ${fmtDate(p.dateOfBirth)}`, p.mrn && `MRN ${p.mrn}`, p.insurancePayer].filter(Boolean).join(' · ') || 'No demographics on file'}
            </p>
            <p className="m-0 mt-2 text-[13px] text-navy">Next visit: {next ? `${fmtDateTime(next.startsAt)} · ${next.providerName || next.title}` : 'none booked'}</p>
          </>
        )}
        {!looking && lookup?.newCaller && (
          <>
            <Pill tone="amber">New number</Pill>
            <p className="m-0 mt-2 text-[14px] leading-relaxed text-navy">
              No patient or lead uses this number. After you answer you’ll check whether it’s an existing patient calling from another phone.
            </p>
          </>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="lg" className="flex-1" onClick={onAnswer} disabled={looking}>
          <Icon name="phone" /> Answer
        </Button>
        <Button size="lg" variant="secondary" onClick={onVoicemail} disabled={looking}>Send to voicemail</Button>
      </div>
    </section>
  )
}

/* ─── Keypad (phone panel) ─────────────────────────────────────────────── */
function Keypad({ number, setNumber, line, setLine, disabled, onIncoming, onOutgoing }) {
  const ready = number.replace(/\D/g, '').length >= 7
  return (
    <aside aria-label="Phone" className="rounded-[14px] border border-mist-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <strong className="text-[16px] text-navy">Phone</strong>
        <Link to="/app/crm/integrations" className="text-[12px] font-semibold text-brand-700">Phone system settings</Link>
      </div>
      <label className="block text-[12px] font-bold text-mist-800" htmlFor="kp">Number</label>
      <input
        id="kp"
        type="tel"
        inputMode="tel"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && ready && onIncoming()}
        placeholder="Type or tap a number"
        className="mt-1 h-[52px] w-full rounded-lg border border-mist-300 bg-white px-3 text-center font-mono text-[20px] text-navy outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
      />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {KEYS.map(([d, l]) => (
          <button
            key={d}
            type="button"
            aria-label={`Digit ${d}`}
            onClick={() => setNumber((n) => n + d)}
            className="flex min-h-[54px] flex-col items-center justify-center rounded-[12px] border border-mist-200 bg-white text-navy transition hover:bg-mist-50"
          >
            <span className="text-[20px] font-semibold leading-none">{d}</span>
            <span className="mt-0.5 min-h-[12px] text-[9.5px] tracking-[0.12em] text-mist-600">{l}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1fr_44px] gap-2">
        <Button onClick={onOutgoing} disabled={!ready || disabled}><Icon name="phoneOut" /> Call</Button>
        <Button variant="secondary" onClick={onIncoming} disabled={!ready || disabled}><Icon name="phoneIn" /> Incoming</Button>
        <button type="button" aria-label="Delete last digit" onClick={() => setNumber((n) => n.slice(0, -1))} className="flex items-center justify-center rounded-lg text-mist-600 hover:bg-mist-50">
          <Icon name="backspace" className="h-5 w-5" />
        </button>
      </div>
      <label className="mt-3 block text-[12px] font-bold text-mist-800" htmlFor="line">
        Line
        <Select id="line" value={line} onChange={(e) => setLine(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-mist-300 bg-white px-3 text-[13px] font-normal text-navy">
          {LINES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </Select>
      </label>
    </aside>
  )
}

/* ─── Recent calls ─────────────────────────────────────────────────────── */
function RecentCalls({ state, onCall }) {
  const outcomeTone = (o) => (!o ? 'gray' : /missed|no answer/i.test(o) ? 'red' : /booked|resolved|reached|rebooked/i.test(o) ? 'green' : /call back|voicemail/i.test(o) ? 'amber' : 'blue')
  return (
    <Card title="Recent calls" actions={<Button size="sm" variant="ghost" onClick={state.reload}><Icon name="refresh" /> Refresh</Button>} bodyClassName="p-0">
      {state.loading ? <div className="px-4"><Loading /></div> : !state.data?.length ? (
        <p className="m-0 px-4 py-6 text-sm text-mist-600">No calls logged yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-[13.5px]">
            <thead>
              <tr className="text-[12px] text-mist-600">
                {['Caller', 'Number', 'When', 'Outcome', 'Handled by', ''].map((h) => <th key={h} className="border-b border-mist-200 px-4 py-2.5 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {state.data.map((c) => (
                <tr key={c.id} className="hover:bg-mist-25">
                  <td className="border-b border-mist-200 px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${c.callOutcome === 'Missed' ? 'bg-danger-100 text-danger-700' : c.type === 'CALL_INBOUND' ? 'bg-brand-50 text-brand-900' : 'bg-mist-100 text-ink-700'}`}>
                        <Icon name={c.callOutcome === 'Missed' ? 'phoneMissed' : c.type === 'CALL_INBOUND' ? 'phoneIn' : 'phoneOut'} className="h-3.5 w-3.5" />
                      </span>
                      {c.patientId ? <Link to={`/app/crm/patients/${c.patientId}`} className="font-semibold text-navy hover:text-brand-700">{c.patientName}</Link> : <span className="font-semibold">{c.callerName || 'Unknown'}</span>}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-mist-200 px-4 py-2.5 font-mono">{formatPhone(c.phone)}</td>
                  <td className="whitespace-nowrap border-b border-mist-200 px-4 py-2.5 text-mist-600">{fmtRelative(c.occurredAt)}</td>
                  <td className="border-b border-mist-200 px-4 py-2.5"><Pill tone={outcomeTone(c.callOutcome)}>{c.callOutcome || c.callReason || 'Logged'}</Pill></td>
                  <td className="border-b border-mist-200 px-4 py-2.5">{c.actorName}</td>
                  <td className="border-b border-mist-200 px-4 py-2.5 text-right">
                    {c.phone && (
                      <button type="button" aria-label={`Call ${formatPhone(c.phone)}`} onClick={() => onCall(c)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-50">
                        <Icon name="phone" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

/* ─── Several people share the number ──────────────────────────────────── */
function ChooseCaller({ matches, onPick, onNew }) {
  return (
    <Card title="Who is calling?" subtitle="Several people use this number. Confirm the caller’s name and date of birth.">
      <ul className="m-0 list-none space-y-2 p-0">
        {matches.map((m) => (
          <li key={m.patient.id}>
            <button type="button" onClick={() => onPick(m.patient.id)} className="flex w-full items-center gap-3 rounded-[10px] border border-mist-200 px-3 py-2.5 text-left hover:border-brand-600 hover:bg-brand-50">
              <Avatar name={m.patient.fullName} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-navy">{m.patient.fullName}</span>
                <span className="block text-[12.5px] text-mist-600">{m.patient.dateOfBirth ? `DOB ${fmtDate(m.patient.dateOfBirth)}` : 'DOB not on file'}{m.patient.mrn ? ` · MRN ${m.patient.mrn}` : ''}</span>
              </span>
              <Pill tone={m.patient.lifecycleStage === 'PATIENT' ? 'green' : 'blue'}>{m.patient.lifecycleStage === 'PATIENT' ? 'Patient' : 'Lead'}</Pill>
            </button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" className="mt-2" onClick={onNew}><Icon name="userPlus" /> Someone else is calling</Button>
    </Card>
  )
}

/* ─── Existing patient / lead ──────────────────────────────────────────── */
function ExistingCaller({ match, number, direction, line, elapsed, linkedNote, editors, onDone, toast }) {
  const p = match.patient
  const navigate = useNavigate()
  const history = useAsync(() => crm.timeline(p.id), [p.id])
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [outcome, setOutcome] = useState('')
  const [callBackBy, setCallBackBy] = useState('')
  const [fileToEhr, setFileToEhr] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const age = ageFrom(p.dateOfBirth)
  const calls = (history.data || []).filter(isCall).slice(0, 5)
  const next = match.upcomingAppointments[0]
  const ctx = { patientId: p.id, __patientIdLabel: p.fullName }

  async function save() {
    if (!reason) return setError('Pick the reason for the call.')
    if (!outcome) return setError('Choose the outcome.')
    if (outcome === 'Call back needed' && !callBackBy) return setError('Choose the date to call back by.')
    setSaving(true)
    setError('')
    try {
      const res = await crm.documentCall({
        phone: number, direction, patientId: p.id, reason, outcome, notes: notes || null,
        durationSeconds: elapsed || null, callBackBy: callBackBy || null, fileToEhr, phoneLine: line,
      })
      setSaved(res)
      toast('Call saved to the profile')
      history.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {linkedNote && (
        <div role="status" className="flex items-center gap-2 rounded-[12px] border border-brand-100 bg-brand-50 px-4 py-3 text-[13.5px] text-brand-900">
          <Icon name="link" />
          <span>Linked <b className="font-mono">{linkedNote.phone}</b> to {linkedNote.name}’s profile as a second phone number. The number on file{linkedNote.oldPhone ? <>, <b className="font-mono">{linkedNote.oldPhone}</b>,</> : ''} is kept.</span>
        </div>
      )}
      <section className="flex flex-wrap items-center gap-4 rounded-[14px] border border-mist-200 bg-white p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[20px] font-bold text-white">
          {p.fullName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-[24px] font-bold tracking-[-0.01em] text-navy">{p.fullName}</h1>
            <Pill tone={p.lifecycleStage === 'PATIENT' ? 'green' : 'blue'}>{p.lifecycleStage === 'PATIENT' ? 'Existing patient' : 'Existing lead'}</Pill>
            {p.insurancePayer && <Pill tone="ink">{p.insurancePayer}</Pill>}
            {p.doNotContact && <Pill tone="red">Do not contact</Pill>}
          </div>
          <p className="m-0 mt-1 text-[13.5px] text-mist-600">
            {[p.dateOfBirth && `DOB ${fmtDate(p.dateOfBirth)}${age != null ? ` (${age})` : ''}`, p.mrn && `MRN ${p.mrn}`, p.phone && formatPhone(p.phone), p.preferredProvider].filter(Boolean).join(' · ') || 'No demographics on file'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(`/app/crm/patients/${p.id}`)}>Open profile</Button>
          <Button variant="secondary" disabled={!p.ehrPatientId} title={p.ehrPatientId ? '' : 'Available once the EHR is connected'}>Open chart in EHR</Button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Card title="Appointments">
            <dl className="m-0 grid gap-3 text-[13.5px] sm:grid-cols-2">
              <div>
                <dt className="text-[12px] text-mist-600">Next</dt>
                <dd className="m-0 font-semibold text-navy">{next ? `${fmtDateTime(next.startsAt)}` : 'None booked'}</dd>
                {next && <dd className="m-0 text-[12.5px] text-mist-600">{next.title}{next.providerName ? ` · ${next.providerName}` : ''} <EnumPill list={APPT_STATUSES} value={next.status} dot={false} /></dd>}
              </div>
              <div>
                <dt className="text-[12px] text-mist-600">Last contact</dt>
                <dd className="m-0 text-navy">{p.lastContactAt ? `${fmtRelative(p.lastContactAt)}${p.callOutcome ? ` · ${p.callOutcome}` : ''}` : 'Never'}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => editors.open.appointment(null, ctx)}><Icon name="calendar" /> Book or change</Button>
              <Button size="sm" variant="secondary" onClick={() => editors.open.task(null, { ...ctx, title: `Call back ${p.fullName}` })}>Add task</Button>
              <Button size="sm" variant="secondary" onClick={() => editors.open.opportunity(null, ctx)}>Opportunity</Button>
              <Button size="sm" variant="secondary" onClick={() => editors.open.referral(null, { ...ctx, mode: 'existing' })}>Referral</Button>
            </div>
          </Card>

          {(match.openTasks.length > 0 || match.openOpportunities.length > 0 || match.openReferrals.length > 0) && (
            <Card title="Open items">
              <ul className="m-0 list-none space-y-2 p-0 text-[13.5px]">
                {match.openTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span>{t.title}</span>
                    <span className={`whitespace-nowrap text-[12.5px] ${t.overdue ? 'font-semibold text-danger-600' : 'text-mist-600'}`}>{fmtDateTime(t.dueAt)}</span>
                  </li>
                ))}
                {match.openOpportunities.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2">
                    <Link to={`/app/crm/opportunities/${o.id}`} className="text-navy hover:text-brand-700">{o.name}</Link>
                    <EnumPill list={OPP_STAGES} value={o.stage} dot={false} />
                  </li>
                ))}
                {match.openReferrals.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span>Referral · {r.serviceRequested || r.referralPartnerName || 'Referral'}</span>
                    <EnumPill list={REFERRAL_STATUSES} value={r.status} dot={false} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Call history">
            {history.loading ? <Loading /> : calls.length === 0 ? <p className="m-0 text-sm text-mist-600">No earlier calls.</p> : (
              <ul className="m-0 list-none p-0">
                {calls.map((c) => (
                  <li key={c.id} className="border-t border-mist-200 py-2.5 first:border-0 first:pt-0">
                    <p className="m-0 text-[12.5px] text-mist-600">
                      <b className="text-navy">{fmtDateTime(c.occurredAt)}</b> · {c.type === 'CALL_INBOUND' ? 'Inbound' : 'Outbound'} · {c.actorName}
                    </p>
                    <p className="m-0 mt-0.5 text-[13.5px] text-navy">{c.callReason || c.subject}{c.callOutcome ? ` — ${c.callOutcome}` : ''}</p>
                    {c.body && <p className="m-0 mt-0.5 text-[13px] text-mist-700">{c.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Document this call" subtitle={`Saved to ${p.fullName}’s profile with the call length.`}>
          {saved ? (
            <>
              <SyncList steps={[
                { label: `Saved to ${p.fullName}’s profile`, detail: 'Reason, notes, outcome and call length', state: 'DONE' },
                fileToEhr
                  ? { label: 'Filed in the EHR', detail: 'As a telephone encounter — queued until the EHR integration is connected', state: 'WAITING' }
                  : { label: 'Not sent to the EHR', detail: 'You chose to keep this call in Utessa only', state: 'SKIPPED' },
                ...(callBackBy ? [{ label: 'Call-back task created', detail: `Due ${fmtDate(callBackBy)}`, state: 'DONE' }] : []),
              ]} />
              <Button className="mt-4 w-full" variant="secondary" onClick={onDone}>Done, back to calls</Button>
            </>
          ) : (
            <>
              <p className="m-0 mb-1.5 text-[12px] font-bold text-mist-800">Reason for the call</p>
              <div className="grid grid-cols-2 gap-2">
                {CALL_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={reason === r}
                    onClick={() => setReason(r)}
                    className={`min-h-11 rounded-lg border px-3 text-left text-[13px] font-semibold transition ${reason === r ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-[inset_0_0_0_1px_#1E8E94]' : 'border-mist-300 bg-white text-navy hover:border-mist-400'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-3">
                <Field field={{ name: 'notes', label: 'Notes', type: 'textarea', rows: 4, placeholder: 'What the caller needed and what you told them' }} value={notes} onChange={setNotes} />
                <Field field={{ name: 'outcome', label: 'Outcome', type: 'select', options: CALL_DOC_OUTCOMES, emptyLabel: 'Choose…' }} value={outcome} onChange={setOutcome} />
                {outcome === 'Call back needed' && (
                  <Field field={{ name: 'cb', label: 'Call back by *', type: 'date', min: new Date().toISOString().slice(0, 10) }} value={callBackBy} onChange={setCallBackBy} />
                )}
                <Field field={{ name: 'ehr', label: 'Also file in the EHR as a telephone encounter', type: 'checkbox' }} value={fileToEhr} onChange={setFileToEhr} />
              </div>
              {error && <p role="alert" className="m-0 mt-2 text-[13px] font-semibold text-warn">{error}</p>}
              <Button size="lg" className="mt-3 w-full" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save to patient profile'}</Button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ─── New number ───────────────────────────────────────────────────────── */
function NewCaller({ number, line, callNotes, setCallNotes, elapsed, timer, onLinked, onCreated, onLeadSaved, onOther, onDone }) {
  const [q, setQ] = useState({ first: '', last: '', dob: '' })
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState('')
  const [found, setFound] = useState(null)
  const [wizard, setWizard] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [leadWhy, setLeadWhy] = useState('')
  const [leadFu, setLeadFu] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [leadErr, setLeadErr] = useState('')
  const [leadSaved, setLeadSaved] = useState(null)
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  async function search() {
    if (!q.first.trim() || !q.last.trim() || !q.dob) {
      setSearchErr('Enter first name, last name and date of birth.')
      return
    }
    setSearching(true)
    setSearchErr('')
    try {
      setFound(await crm.matchIdentity({ firstName: q.first.trim(), lastName: q.last.trim(), dateOfBirth: q.dob }))
    } catch (err) {
      setSearchErr(err.message)
    } finally {
      setSearching(false)
    }
  }

  async function link(p) {
    try {
      await crm.linkPhone(p.id, formatPhone(number))
      await onLinked(p, p.phone)
    } catch (err) {
      setSearchErr(err.message)
    }
  }

  async function saveLead() {
    if (!q.first.trim() || !q.last.trim()) return setLeadErr('Enter the caller’s first and last name.')
    if (!leadWhy) return setLeadErr('Choose why they called.')
    setSaving(true)
    setLeadErr('')
    try {
      const res = await crm.intake({
        mode: 'LEAD', phone: number, firstName: q.first.trim(), lastName: q.last.trim(), dateOfBirth: q.dob || null,
        leadReason: leadWhy, followUpOn: leadFu || null, callNotes: callNotes || null, durationSeconds: elapsed || null, phoneLine: line,
      })
      setLeadSaved(res)
      onLeadSaved()
    } catch (err) {
      setLeadErr(err.message)
    } finally {
      setSaving(false)
    }
  }

  const noMatch = Array.isArray(found) && found.length === 0
  const input = 'mt-1 h-11 w-full rounded-lg border border-mist-300 bg-white px-3 text-[14px] text-navy outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15'

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center gap-4 rounded-[14px] border border-mist-200 bg-white p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sun-50 text-sun-700">
          <Icon name="user" className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-[24px] font-bold text-navy">{leadSaved ? leadSaved.patient.fullName : 'New caller'}</h1>
            <Pill tone={leadSaved ? 'blue' : 'amber'}>{leadSaved ? 'Patient lead' : 'New number'}</Pill>
          </div>
          <p className="m-0 mt-1 font-mono text-[13.5px] text-mist-600">{formatPhone(number)} · {LINES.find((l) => l.value === line)?.label}</p>
        </div>
        <Button variant="ghost" onClick={onOther}><Icon name="building" /> Not a patient</Button>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card title="1 · Is this an existing patient on another phone?" subtitle="Ask for their name and date of birth.">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-[12px] font-bold text-mist-800">First name *<input className={input} value={q.first} onChange={(e) => setQ({ ...q, first: e.target.value })} /></label>
              <label className="text-[12px] font-bold text-mist-800">Last name *<input className={input} value={q.last} onChange={(e) => setQ({ ...q, last: e.target.value })} /></label>
              <label className="text-[12px] font-bold text-mist-800">Date of birth *<input className={input} type="date" max={today} value={q.dob} onChange={(e) => setQ({ ...q, dob: e.target.value })} /></label>
            </div>
            {searchErr && <p role="alert" className="m-0 mt-2 text-[13px] font-semibold text-warn">{searchErr}</p>}
            <Button variant="secondary" className="mt-3" onClick={search} disabled={searching}><Icon name="search" /> {searching ? 'Searching…' : 'Search patients'}</Button>
            {found?.length > 0 && found.map((p) => (
              <div key={p.id} className="mt-3 flex flex-wrap items-center gap-3 rounded-[10px] border border-brand-100 bg-brand-50 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-semibold text-navy">{p.fullName}</p>
                  <p className="m-0 text-[12.5px] text-mist-600">DOB {fmtDate(p.dateOfBirth)}{p.mrn ? ` · MRN ${p.mrn}` : ''} · on file <span className="font-mono">{p.phone ? formatPhone(p.phone) : '—'}</span></p>
                </div>
                <Button onClick={() => link(p)}><Icon name="link" /> That’s the caller: link this number</Button>
              </div>
            ))}
            {noMatch && (
              <p className="m-0 mt-3 rounded-[10px] bg-mist-50 px-3.5 py-3 text-[13.5px] text-navy">No match in Utessa. Treat this caller as a new patient.</p>
            )}
          </Card>

          {noMatch && (
            <Card title="2 · Does the caller want to book an appointment?">
              {leadSaved ? (
                <div className="space-y-3">
                  <p role="status" className="m-0 text-[13.5px] font-semibold text-brand-800">
                    Saved to Patient leads with the call notes. {leadFu ? `A follow-up task was created for ${fmtDate(leadFu)}.` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/app/crm/patients/${leadSaved.patient.id}`}><Button variant="secondary">Open lead</Button></Link>
                    <Button variant="secondary" onClick={onDone}>Done, back to calls</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setWizard(true)}><Icon name="calendar" /> Yes, book a new patient appointment</Button>
                    <Button variant={leadOpen ? 'dark' : 'secondary'} aria-pressed={leadOpen} onClick={() => setLeadOpen(true)}>Not now, save as a lead</Button>
                  </div>
                  {leadOpen && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field field={{ name: 'why', label: 'Why they called *', type: 'select', options: LEAD_REASONS, emptyLabel: 'Choose…', span: 2 }} value={leadWhy} onChange={setLeadWhy} />
                      <Field field={{ name: 'fu', label: 'Follow up on', type: 'date', min: today }} value={leadFu} onChange={setLeadFu} />
                      {leadErr && <p role="alert" className="m-0 text-[13px] font-semibold text-warn sm:col-span-2">{leadErr}</p>}
                      <div className="sm:col-span-2"><Button onClick={saveLead} disabled={saving}>{saving ? 'Saving…' : 'Save lead with call notes'}</Button></div>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}
        </div>

        <Card title="Call notes" subtitle="Type as you talk. They move to the profile when the patient or lead is created.">
          <textarea
            aria-label="Call notes"
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="e.g. Referred by Dr. Patel for palpitations. Prefers mornings."
            className="min-h-[240px] w-full rounded-lg border border-mist-300 bg-white px-3 py-2.5 text-[14px] leading-relaxed text-navy outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
          />
        </Card>
      </div>

      <NewPatientWizard
        open={wizard}
        onClose={() => setWizard(false)}
        number={number}
        line={line}
        timer={timer}
        elapsed={elapsed}
        initial={q}
        callNotes={callNotes}
        onCreated={(res) => {
          setWizard(false)
          onCreated(res)
        }}
      />
    </div>
  )
}

/* ─── Not a patient ────────────────────────────────────────────────────── */
function OtherCaller({ number, line, elapsed, notes, setNotes, onBack, onDone }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('REFERRING_OFFICE')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  async function save() {
    if (!name.trim()) return setError('Enter who called.')
    setSaving(true)
    setError('')
    try {
      await crm.documentCall({ phone: number, direction: 'INBOUND', callerName: name.trim(), callerType: type, notes: notes || null, durationSeconds: elapsed || null, phoneLine: line })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Card title="Not a patient" subtitle="Nothing is filed to a chart. The call is kept in the call log." className="max-w-3xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field field={{ name: 'n', label: 'Who called *', placeholder: 'e.g. Plano Family Medicine' }} value={name} onChange={setName} />
        <Field field={{ name: 't', label: 'Caller type', type: 'select', options: CALLER_TYPES, noEmpty: true }} value={type} onChange={setType} />
        <Field field={{ name: 'note', label: 'Call note', type: 'textarea', placeholder: 'e.g. Confirmed the referral for Sofia Ramirez was faxed' }} value={notes} onChange={setNotes} />
      </div>
      {error && <p role="alert" className="m-0 mt-2 text-[13px] font-semibold text-warn">{error}</p>}
      {saved ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p role="status" className="m-0 text-[13.5px] font-semibold text-brand-800">Saved to the call log.</p>
          <Button variant="secondary" onClick={onDone}>Done, back to calls</Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save to call log'}</Button>
          <Button variant="ghost" onClick={onBack}><Icon name="arrowLeft" /> It’s a patient after all</Button>
        </div>
      )}
    </Card>
  )
}

/* ─── After the wizard ─────────────────────────────────────────────────── */
function CreatedPatient({ result, timer, onDone }) {
  const p = result.patient
  const a = result.appointment
  const call = result.call
  const message = `${p.fullName} was created and the appointment is booked. Records are queued for the EHR.`
  return (
    <div className="space-y-4">
      <div role="status" className="flex items-center gap-2 rounded-[12px] border border-brand-100 bg-brand-50 px-4 py-3 text-[13.5px] text-brand-900"><Icon name="check" /> {message}</div>
      <section className="flex flex-wrap items-center gap-4 rounded-[14px] border border-mist-200 bg-white p-5">
        <Avatar name={p.fullName} size="lg" tone="ink" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-[24px] font-bold text-navy">{p.fullName}</h1>
            <Pill tone="ink">New patient</Pill>
            <Pill tone="amber" dot>EHR: queued</Pill>
          </div>
          <p className="m-0 mt-1 text-[13.5px] text-mist-600">
            DOB {fmtDate(p.dateOfBirth)} · <span className="font-mono">{formatPhone(p.phone)}</span> · {p.coverageType === 'SELF_PAY' ? 'Self-pay' : p.insurancePayer}
          </p>
        </div>
        <Link to={`/app/crm/patients/${p.id}`}><Button variant="secondary">Open profile</Button></Link>
      </section>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Appointment">
          {a ? (
            <>
              <p className="m-0 text-[15px] font-semibold text-navy">{fmtDateTime(a.startsAt)}</p>
              <p className="m-0 mt-1 text-[13.5px] text-navy">{a.title} · {a.durationMinutes} min{a.providerName ? ` · ${a.providerName}` : ''}{a.location ? ` · ${a.location}` : ''}</p>
              <p className="m-0 mt-2 text-[13px] text-mist-600">Reason: {p.reasonForVisit || '—'}</p>
              <p className="m-0 mt-1 text-[13px] text-mist-600">{p.smsReminders ? 'Reminders & intake forms by text once the phone system is connected' : 'No texts — caller did not agree'}</p>
            </>
          ) : <p className="m-0 text-sm text-mist-600">No appointment.</p>}
        </Card>
        <Card title="Call documentation">
          <p className="m-0 text-[12.5px] text-mist-600"><b className="text-navy">Today · Inbound</b> · {timer} · {call.actorName}</p>
          <p className="m-0 mt-1 whitespace-pre-line text-[13.5px] text-navy">{call.body || 'No notes'}</p>
          <p className="m-0 mt-1 text-[13px] text-mist-600">Outcome: new patient appointment booked</p>
        </Card>
        <Card title="Sent to the EHR">
          <SyncList steps={result.steps} />
        </Card>
      </div>
      <Button variant="secondary" onClick={onDone}>Done, back to calls</Button>
    </div>
  )
}
