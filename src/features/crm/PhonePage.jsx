import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import { useAuth } from '../../shared/auth/AuthContext'
import { roleLabel } from '../../shared/security/roles'
import { FAX_DOC_TYPES, PHI_PATTERN, PRESENCE, QUICK_REPLIES, crm, labelOf, toneOf } from './crmApi'
import { RingCentralCallLog, formatPhone } from './CallDeskPage'
import { useRingCentralPhone } from './RingCentralPhone'
import { useCrmEditors } from './CrmEditors'
import {
  Alert, Avatar, Button, Card, DataTable, Field, Loading, Modal, PatientPicker, Pill, SearchInput, Segmented,
  fmtDateTime, fmtRelative, useAsync, useCrmRefs, useDebounced, useToast,
} from './ui'
import Select from '../../shared/ui/Select'

const SECTIONS = [
  { id: 'calls', label: 'Calls', icon: 'phone' },
  { id: 'texts', label: 'Texts', icon: 'message', badge: 'unreadTexts' },
  { id: 'voicemail', label: 'Voicemail', icon: 'voicemail', badge: 'newVoicemails' },
  { id: 'fax', label: 'Fax', icon: 'note', badge: 'unfiledFaxes' },
  { id: 'recordings', label: 'Recordings', icon: 'play' },
  { id: 'contacts', label: 'Contacts', icon: 'users' },
  { id: 'video', label: 'Video visits', icon: 'calendar' },
  { id: 'handling', label: 'Call handling', icon: 'swap' },
  { id: 'system', label: 'Phone system', icon: 'link' },
]
const PRESENCE_DOT = { AVAILABLE: 'bg-success-600', BUSY: 'bg-sun-600', DND: 'bg-danger-600', AWAY: 'bg-mist-400' }
const mmss = (s) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)

export default function PhonePage() {
  const [params, setParams] = useSearchParams()
  const section = SECTIONS.some((s) => s.id === params.get('s')) ? params.get('s') : 'calls'
  const go = (id, extra = {}) => setParams({ s: id, ...extra })
  const { user } = useAuth()
  const [toastNode, toast] = useToast()
  const overview = useAsync(() => crm.phone(), [])
  const [ctx, setCtx] = useState(null)
  const o = overview.data
  const rc = useRingCentralPhone()
  const navigate = useNavigate()
  const rcConnected = Boolean(rc.status?.connected)
  const connected = o?.phoneStatus === 'CONNECTED' || rcConnected

  async function savePrefs(patch) {
    try {
      await crm.savePhoneMine({ ...o.myPrefs, ...patch })
      overview.reload()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const lines = o?.practice?.lines || []
  const queues = (o?.practice?.queues || []).map((q) => q.name)
  const myQueues = o?.myPrefs?.queues || []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[14px] border border-mist-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="relative">
            <Avatar name={user?.fullName} />
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${PRESENCE_DOT[o?.myPrefs?.presence] || PRESENCE_DOT.AVAILABLE}`} />
          </span>
          <div>
            <p className="m-0 text-[14px] font-semibold text-navy">{user?.fullName}</p>
            <p className="m-0 text-[12px] text-mist-600">{roleLabel(user?.role)}{o?.myPrefs?.extension ? ` · ext. ${o.myPrefs.extension}` : ''}</p>
          </div>
        </div>
        {o && (
          <>
            <label className="text-[12px] font-semibold text-mist-800">
              Status
              <Select value={o.myPrefs.presence} onChange={(e) => savePrefs({ presence: e.target.value })} className="ml-2 h-9 rounded-lg border border-mist-200 bg-white px-2 text-[13px] font-normal">
                {PRESENCE.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </label>
            <label className="text-[12px] font-semibold text-mist-800">
              Calling from
              <Select value={o.myPrefs.line} onChange={(e) => savePrefs({ line: e.target.value })} className="ml-2 h-9 rounded-lg border border-mist-200 bg-white px-2 text-[13px] font-normal">
                {lines.map((l) => <option key={l.id} value={l.id}>{l.label}{l.number ? ` · ${l.number}` : ''}</option>)}
              </Select>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] font-semibold text-mist-800">Taking calls from</span>
              {queues.map((q) => {
                const on = myQueues.includes(q)
                return (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={on}
                    onClick={() => savePrefs({ queues: on ? myQueues.filter((x) => x !== q) : [...myQueues, q] })}
                    className={`min-h-8 rounded-lg border px-3 text-[12.5px] font-medium transition ${on ? 'border-ink-950 bg-ink-950 text-white' : 'border-mist-300 bg-white text-navy hover:border-mist-400'}`}
                  >
                    {q}
                  </button>
                )
              })}
            </div>
            <span className="ml-auto">
              {rcConnected ? (
                <Pill tone={rc.ready ? 'green' : rc.phase === 'error' ? 'red' : 'amber'} dot>
                  {`RingCentral${rc.status.extensionNumber ? ` · ext ${rc.status.extensionNumber}` : ''} · ${rc.ready ? 'browser phone ready' : rc.phase === 'error' ? 'browser phone error' : 'starting…'}`}
                </Pill>
              ) : (
                <Pill tone={connected ? 'green' : o.phoneStatus === 'PENDING' ? 'amber' : 'gray'} dot>
                  {connected ? `Connected · ${o.phoneProvider}` : o.phoneStatus === 'PENDING' ? 'Connection requested' : 'Phone system not connected'}
                </Pill>
              )}
            </span>
          </>
        )}
      </div>
      {o?.myPrefs?.presence === 'DND' && (
        <Alert tone="warn">Do not disturb is on. Queue calls skip you and direct calls go to voicemail.</Alert>
      )}
      <Alert>{overview.error}</Alert>

      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Phone sections" className="flex gap-1 overflow-x-auto rounded-[14px] border border-mist-200 bg-white p-2 lg:flex-col lg:self-start">
          {SECTIONS.map((s) => {
            const n = s.badge ? o?.[s.badge] : 0
            const active = s.id === section
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setCtx(null); go(s.id) }}
                className={`flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-left text-[13.5px] transition ${active ? 'bg-brand-50 font-semibold text-brand-900' : 'text-mist-800 hover:bg-mist-50'}`}
              >
                <Icon name={s.icon} />
                <span className="flex-1 whitespace-nowrap">{s.label}</span>
                {n > 0 && <span className="min-w-5 rounded-md bg-danger-600 px-1.5 text-center text-[11px] font-semibold text-white">{n}</span>}
              </button>
            )
          })}
        </nav>

        <div className={`grid min-w-0 gap-4 ${ctx ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : ''}`}>
          <div className="min-w-0">
            {!o && overview.loading && <Loading />}
            {o && section === 'calls' && <CallsSection onDetails={setCtx} onText={(phone, name) => go('texts', { to: phone, name: name || '' })} />}
            {o && section === 'calls' && rcConnected && (
              <div className="mt-4">
                <RingCentralCallLog onCall={(n) => navigate(`/app/crm/call-desk?phone=${encodeURIComponent(n)}&direction=OUTBOUND`)} />
              </div>
            )}
            {o && section === 'texts' && <TextsSection overview={o} params={params} toast={toast} onChanged={overview.reload} onDetails={setCtx} />}
            {o && section === 'voicemail' && <VoicemailSection toast={toast} onChanged={overview.reload} onText={(phone, name) => go('texts', { to: phone, name: name || '' })} />}
            {o && section === 'fax' && <FaxSection overview={o} toast={toast} onChanged={overview.reload} />}
            {o && section === 'recordings' && <RecordingsSection overview={o} />}
            {o && section === 'contacts' && <ContactsSection onDetails={setCtx} onText={(c) => go('texts', { to: c.phone, name: c.name })} onFax={(c) => go('fax', { to: c.fax, name: c.name })} />}
            {o && section === 'video' && <VideoSection toast={toast} />}
            {o && section === 'handling' && <HandlingSection overview={o} toast={toast} onSaved={overview.reload} />}
            {o && section === 'system' && <SystemSection overview={o} />}
          </div>
          {ctx && <DetailsPanel item={ctx} onClose={() => setCtx(null)} onText={() => go('texts', { to: ctx.phone, name: ctx.name || '' })} />}
        </div>
      </div>
      {toastNode}
    </div>
  )
}

/* ─── Shared ───────────────────────────────────────────────────────────── */
function CallButton({ phone, small = true }) {
  const navigate = useNavigate()
  if (!phone) return null
  return (
    <Button
      size={small ? 'sm' : 'md'}
      variant="secondary"
      aria-label={`Call ${formatPhone(phone)}`}
      onClick={() => navigate(`/app/crm/call-desk?phone=${encodeURIComponent(phone)}&direction=OUTBOUND`)}
    >
      <Icon name="phone" /> Call
    </Button>
  )
}

function DetailsPanel({ item, onClose, onText }) {
  return (
    <aside className="self-start rounded-[14px] border border-mist-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar name={item.name || formatPhone(item.phone)} />
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-semibold text-navy">{item.name || 'Unknown caller'}</p>
          {item.tag && <Pill tone={item.tone || 'gray'}>{item.tag}</Pill>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close details" className="rounded-lg p-1 text-mist-600 hover:bg-mist-50"><Icon name="x" /></button>
      </div>
      <dl className="m-0 mt-4 space-y-2.5 text-[13px]">
        {(item.rows || []).filter(([, v]) => v).map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11.5px] text-mist-500">{k}</dt>
            <dd className="m-0 text-navy">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <CallButton phone={item.phone} />
        {item.canText && <Button size="sm" variant="secondary" onClick={onText}><Icon name="message" /> Text</Button>}
        {item.link && <Link to={item.link}><Button size="sm" variant="secondary">Open record</Button></Link>}
      </div>
    </aside>
  )
}

/* ─── Calls ────────────────────────────────────────────────────────────── */
const KEYS = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']]

function CallsSection({ onDetails, onText }) {
  const navigate = useNavigate()
  const [dial, setDial] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('ALL')
  const calls = useAsync(() => crm.recentCalls(100), [])
  const needle = useDebounced(q).toLowerCase()
  const digits = needle.replace(/\D/g, '')
  const rows = (calls.data || [])
    .filter((c) => filter === 'ALL'
      || (filter === 'MISSED' && c.callOutcome === 'Missed')
      || (filter === 'IN' && c.type === 'CALL_INBOUND' && c.callOutcome !== 'Missed')
      || (filter === 'OUT' && c.type === 'CALL_OUTBOUND'))
    .filter((c) => !needle || (c.patientName || c.callerName || '').toLowerCase().includes(needle) || (digits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(digits)))
  const ready = dial.replace(/\D/g, '').length >= 7

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card title="Dial">
        <input
          value={dial}
          onChange={(e) => setDial(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ready && navigate(`/app/crm/call-desk?phone=${encodeURIComponent(dial)}&direction=OUTBOUND`)}
          inputMode="tel"
          aria-label="Number to dial"
          placeholder="Type or tap a number"
          className="h-12 w-full rounded-lg border border-mist-300 px-3 text-center font-mono text-[20px] text-navy outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {KEYS.map(([d, l]) => (
            <button key={d} type="button" aria-label={`Digit ${d}`} onClick={() => setDial((v) => v + d)} className="flex min-h-[52px] flex-col items-center justify-center rounded-[12px] border border-mist-200 bg-white hover:bg-mist-50">
              <span className="text-[19px] font-semibold leading-none text-navy">{d}</span>
              <span className="mt-0.5 min-h-[11px] text-[9.5px] tracking-[0.12em] text-mist-600">{l}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_44px] gap-2">
          <Button disabled={!ready} onClick={() => navigate(`/app/crm/call-desk?phone=${encodeURIComponent(dial)}&direction=OUTBOUND`)}><Icon name="phone" /> Call</Button>
          <button type="button" aria-label="Delete last digit" onClick={() => setDial((v) => v.slice(0, -1))} className="flex items-center justify-center rounded-lg text-mist-600 hover:bg-mist-50"><Icon name="backspace" className="h-5 w-5" /></button>
        </div>
      </Card>
      <Card
        title="Call history"
        actions={<SearchInput value={q} onChange={setQ} placeholder="Name or number" className="sm:max-w-[220px]" />}
        bodyClassName="p-0"
      >
        <div className="flex gap-1.5 border-b border-mist-100 px-4 py-2.5">
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'ALL', label: 'All' }, { value: 'MISSED', label: 'Missed' }, { value: 'IN', label: 'Incoming' }, { value: 'OUT', label: 'Outgoing' }]} />
        </div>
        {calls.loading ? <div className="px-4"><Loading /></div> : rows.length === 0 ? <p className="m-0 px-4 py-6 text-sm text-mist-600">No calls match.</p> : (
          <ul className="m-0 list-none p-0">
            {rows.map((c) => {
              const missed = c.callOutcome === 'Missed'
              const name = c.patientName || c.callerName || formatPhone(c.phone)
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 border-b border-mist-100 px-4 py-3 last:border-0">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${missed ? 'bg-danger-100 text-danger-700' : c.type === 'CALL_INBOUND' ? 'bg-brand-50 text-brand-900' : 'bg-mist-100 text-ink-700'}`}>
                    <Icon name={missed ? 'phoneMissed' : c.type === 'CALL_INBOUND' ? 'phoneIn' : 'phoneOut'} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`m-0 text-[14px] ${missed ? 'font-semibold text-danger-700' : 'font-semibold text-navy'}`}>{name}</p>
                    <p className="m-0 text-[12.5px] text-mist-600">
                      {missed ? 'Missed' : c.type === 'CALL_INBOUND' ? 'Incoming' : 'Outgoing'} · {fmtRelative(c.occurredAt)} · {mmss(c.durationSeconds)}{c.callReason ? ` · ${c.callReason}` : ''}
                    </p>
                    {c.body && <p className="m-0 mt-0.5 truncate text-[12.5px] text-mist-700">{c.body}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <CallButton phone={c.phone} />
                    <Button size="sm" variant="secondary" onClick={() => onText(c.phone, c.patientName || c.callerName)}><Icon name="message" /> Text</Button>
                    <Button size="sm" variant="ghost" onClick={() => onDetails({
                      name, phone: c.phone, tag: c.patientId ? 'Patient record' : c.callerType ? c.callerType.replace('_', ' ').toLowerCase() : 'Caller', tone: c.patientId ? 'green' : 'gray',
                      canText: true, link: c.patientId ? `/app/crm/patients/${c.patientId}` : null,
                      rows: [['Number', formatPhone(c.phone)], ['When', fmtDateTime(c.occurredAt)], ['Length', mmss(c.durationSeconds)], ['Outcome', c.callOutcome], ['Reason', c.callReason], ['Handled by', c.actorName], ['Notes', c.body]],
                    })}>Details</Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

/* ─── Texts ────────────────────────────────────────────────────────────── */
function TextsSection({ overview, params, toast, onChanged, onDetails }) {
  const threads = useAsync(() => crm.threads(), [])
  const [active, setActive] = useState(() => (params.get('to') ? params.get('to').replace(/\D/g, '').slice(-10) : null))
  const [presetName] = useState(params.get('name') || '')
  const [newOpen, setNewOpen] = useState(false)
  const [newTo, setNewTo] = useState('')
  const [newErr, setNewErr] = useState('')
  const thread = useAsync(() => (active ? crm.thread(active) : Promise.resolve(null)), [active])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = thread.data?.thread
    if (t?.unread) crm.markThreadRead(t.phoneNormalized).then(() => { threads.reload(); onChanged() }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.data])

  async function start() {
    const digits = newTo.replace(/\D/g, '')
    if (digits.length >= 10) {
      setActive(digits.slice(-10))
      setNewOpen(false)
      setNewTo('')
      return
    }
    try {
      const matches = await crm.phoneContacts({ q: newTo })
      const m = matches.find((c) => c.phone)
      if (!m) return setNewErr('No contact with a mobile number matches. Type the 10-digit number instead.')
      setActive(m.phone.replace(/\D/g, '').slice(-10))
      setNewOpen(false)
      setNewTo('')
    } catch (err) {
      setNewErr(err.message)
    }
  }

  async function send() {
    if (!draft.trim()) return
    setSending(true)
    setError('')
    try {
      const t = thread.data?.thread
      await crm.sendText({ phone: active, patientId: t?.patientId || null, contactName: t?.name || presetName || null, body: draft.trim(), line: overview.myPrefs.line })
      setDraft('')
      toast(overview.phoneStatus === 'CONNECTED' ? 'Text sent' : 'Text queued — it sends once the phone system is connected')
      await Promise.all([thread.reload(), threads.reload()])
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const t = thread.data?.thread
  const name = t?.name || presetName || (active ? formatPhone(active) : '')
  const first = (t?.name || presetName || '').split(' ')[0] || 'there'
  const phi = PHI_PATTERN.test(draft)
  const list = threads.data || []

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card title="Texts" actions={<Button size="sm" onClick={() => { setNewOpen((v) => !v); setNewErr('') }}><Icon name="plus" /> New text</Button>} bodyClassName="p-0">
        {newOpen && (
          <div className="border-b border-mist-100 p-3">
            <label className="text-[12px] font-semibold text-mist-800" htmlFor="newto">To (name or mobile number)</label>
            <div className="mt-1 flex gap-2">
              <input id="newto" value={newTo} onChange={(e) => setNewTo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && start()} placeholder="e.g. Sofia Ramirez" className="h-10 min-w-0 flex-1 rounded-lg border border-mist-300 px-3 text-[14px]" />
              <Button onClick={start}>Start</Button>
            </div>
            {newErr && <p className="m-0 mt-1.5 text-[12.5px] font-semibold text-warn">{newErr}</p>}
          </div>
        )}
        {threads.loading ? <div className="px-4"><Loading /></div> : list.length === 0 ? (
          <p className="m-0 px-4 py-6 text-sm text-mist-600">No conversations yet.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {list.map((c) => (
              <li key={c.phoneNormalized}>
                <button type="button" onClick={() => setActive(c.phoneNormalized)} className={`flex w-full items-start gap-3 border-b border-mist-100 px-4 py-3 text-left ${active === c.phoneNormalized ? 'bg-brand-50' : 'hover:bg-mist-25'}`}>
                  <Avatar name={c.name || formatPhone(c.phone)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-[13.5px] ${c.unread ? 'font-bold' : 'font-semibold'} text-navy`}>{c.name || formatPhone(c.phone)}</span>
                      <span className="shrink-0 text-[11.5px] text-mist-500">{fmtRelative(c.lastAt)}</span>
                    </span>
                    <span className="block truncate text-[12.5px] text-mist-600">{c.lastDirection === 'OUT' ? 'You: ' : ''}{c.lastBody}</span>
                  </span>
                  {c.unread > 0 && <span className="mt-1.5 h-2 w-2 rounded-full bg-info-500" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card bodyClassName="flex min-h-[460px] flex-col p-0">
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <Icon name="message" className="h-8 w-8 text-mist-500" />
            <p className="m-0 mt-2 text-[14px] font-semibold text-navy">Pick a conversation or start a new text</p>
            <p className="m-0 mt-1 max-w-sm text-[13px] text-mist-600">Patients can only be texted when SMS consent is on their profile.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-mist-100 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[15px] font-semibold text-navy">{name} {t?.patientType && <Pill tone={t.patientType === 'PATIENT' ? 'green' : 'blue'}>{t.patientType === 'PATIENT' ? 'Patient' : 'Lead'}</Pill>}</p>
                <p className="m-0 font-mono text-[12.5px] text-mist-600">{formatPhone(active)}</p>
              </div>
              <CallButton phone={active} />
              <Button size="sm" variant="ghost" onClick={() => onDetails({ name, phone: active, tag: t?.patientType === 'PATIENT' ? 'Patient' : t?.patientType === 'LEAD' ? 'Lead' : 'Contact', tone: t?.patientId ? 'green' : 'gray', link: t?.patientId ? `/app/crm/patients/${t.patientId}` : null, rows: [['Mobile', formatPhone(active)], ['Texting', t?.blockedReason || 'Allowed']] })}>Details</Button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-mist-25 px-4 py-4">
              {thread.loading && <Loading />}
              {!thread.loading && !thread.data?.messages?.length && <p className="m-0 text-center text-[13px] text-mist-500">No messages yet.</p>}
              {(thread.data?.messages || []).map((m) => (
                <div key={m.id} className={`flex ${m.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-[14px] px-3.5 py-2 text-[14px] ${m.direction === 'OUT' ? 'rounded-br-[4px] bg-brand-600 text-white' : 'rounded-bl-[4px] border border-mist-200 bg-white text-navy'}`}>
                    <p className="m-0 whitespace-pre-line">{m.body}</p>
                    <p className={`m-0 mt-1 text-[11px] ${m.direction === 'OUT' ? 'text-brand-100' : 'text-mist-500'}`}>
                      {fmtDateTime(m.createdAt)}{m.direction === 'OUT' ? ` · ${m.sentByName} · ${m.status === 'QUEUED' ? 'Queued' : m.status.toLowerCase()}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {t?.blockedReason ? (
              <div className="border-t border-danger-200 bg-danger-50 px-4 py-3 text-[13px] font-semibold text-danger-700">{t.blockedReason}</div>
            ) : (
              <div className="border-t border-mist-100 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] text-mist-600">Quick replies:</span>
                  {QUICK_REPLIES.map(([label, text]) => (
                    <button key={label} type="button" onClick={() => setDraft(text.replace('{first}', first))} className="min-h-7 rounded-lg border border-mist-300 px-2.5 text-[12px] text-navy hover:border-brand-600">{label}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={640} placeholder="Write a text. No test results or diagnoses." className="min-w-0 flex-1 resize-none rounded-lg border border-mist-300 px-3 py-2 text-[14px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15" />
                  <Button onClick={send} disabled={sending || !draft.trim()} className="self-end">{sending ? 'Sending…' : 'Send'}</Button>
                </div>
                <div className="mt-1.5 flex justify-between text-[11.5px] text-mist-500">
                  <span>From {labelOf((overview.practice.lines || []).map((l) => ({ value: l.id, label: l.label })), overview.myPrefs.line)} · “Reply STOP to opt out” is added to the first text{overview.phoneStatus !== 'CONNECTED' ? ' · queued until the phone system is connected' : ''}</span>
                  <span>{draft.length}/640</span>
                </div>
                {phi && <p className="m-0 mt-1.5 text-[12.5px] font-semibold text-sun-700">This mentions a test or medical detail. Texts aren’t private — ask the patient to call instead.</p>}
                {error && <p className="m-0 mt-1.5 text-[12.5px] font-semibold text-warn">{error}</p>}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

/* ─── Voicemail ────────────────────────────────────────────────────────── */
function VoicemailSection({ toast, onChanged, onText }) {
  const vms = useAsync(() => crm.voicemails(), [])
  const [selId, setSelId] = useState(null)
  const [logOpen, setLogOpen] = useState(false)
  const [show, setShow] = useState('OPEN')
  const list = (vms.data || []).filter((v) => (show === 'OPEN' ? v.status !== 'HANDLED' : true))
  const sel = (vms.data || []).find((v) => v.id === selId) || list[0]

  async function setStatus(v, status) {
    try {
      await crm.voicemailStatus(v.id, status)
      toast(status === 'HANDLED' ? 'Marked as handled' : 'Moved back to new')
      await vms.reload()
      onChanged()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card
        title="Voicemail"
        actions={<Button size="sm" variant="secondary" onClick={() => setLogOpen(true)}><Icon name="plus" /> Log voicemail</Button>}
        bodyClassName="p-0"
      >
        <div className="border-b border-mist-100 px-4 py-2.5">
          <Segmented value={show} onChange={setShow} options={[{ value: 'OPEN', label: 'To handle' }, { value: 'ALL', label: 'All' }]} />
        </div>
        {vms.loading ? <div className="px-4"><Loading /></div> : list.length === 0 ? (
          <p className="m-0 px-4 py-6 text-sm text-mist-600">No voicemail to handle.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {list.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => { setSelId(v.id); if (v.status === 'NEW') crm.voicemailStatus(v.id, 'HEARD').then(() => vms.reload()).catch(() => {}) }} className={`flex w-full items-center gap-3 border-b border-mist-100 px-4 py-3 text-left ${sel?.id === v.id ? 'bg-brand-50' : 'hover:bg-mist-25'}`}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${v.status === 'NEW' ? 'bg-info-500' : 'bg-transparent'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-navy">{v.patientName || v.callerName || formatPhone(v.fromPhone)}</span>
                    <span className="block text-[12px] text-mist-600">{fmtRelative(v.receivedAt)} · {mmss(v.durationSeconds)} · {v.mailbox}</span>
                  </span>
                  {v.status === 'HANDLED' ? <Pill tone="green">Handled</Pill> : v.patientType ? <Pill tone={v.patientType === 'PATIENT' ? 'green' : 'blue'}>{v.patientType === 'PATIENT' ? 'Patient' : 'Lead'}</Pill> : <Pill tone="amber">New number</Pill>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        {!sel ? <p className="m-0 py-6 text-center text-sm text-mist-600">No voicemail. Nice work.</p> : (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="m-0 text-[17px] font-semibold text-navy">{sel.patientName || sel.callerName || 'Unknown caller'}</h3>
              <span className="font-mono text-[13px] text-mist-600">{formatPhone(sel.fromPhone)}</span>
            </div>
            <p className="m-0 mt-0.5 text-[12.5px] text-mist-600">{fmtDateTime(sel.receivedAt)} · left in {sel.mailbox} · {mmss(sel.durationSeconds)}</p>
            <div className="mt-4 rounded-[10px] bg-mist-50 p-3.5">
              {sel.recordingUrl ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <audio controls src={sel.recordingUrl} className="w-full" />
              ) : (
                <p className="m-0 text-[12.5px] text-mist-600">Audio plays here when voicemail comes from the connected phone system.</p>
              )}
              <p className="m-0 mt-3 text-[12px] font-semibold text-mist-600">Transcript</p>
              <p className="m-0 mt-1 text-[14px] leading-relaxed text-navy">{sel.transcript || 'No transcript.'}</p>
              <p className="m-0 mt-2 text-[12.5px] text-mist-600">
                {sel.patientId ? <>Matched to <Link to={`/app/crm/patients/${sel.patientId}`} className="font-semibold text-brand-700">{sel.patientName}</Link> by phone number.</> : 'This number isn’t on any patient or lead.'}
              </p>
            </div>
            {sel.status === 'HANDLED' && <p className="m-0 mt-3 text-[12.5px] text-brand-800">Handled by {sel.handledByName} · {fmtRelative(sel.handledAt)}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <CallButton phone={sel.fromPhone} small={false} />
              <Button variant="secondary" onClick={() => onText(sel.fromPhone, sel.patientName || sel.callerName)}><Icon name="message" /> Reply by text</Button>
              {sel.status === 'HANDLED'
                ? <Button variant="ghost" onClick={() => setStatus(sel, 'NEW')}>Mark as not handled</Button>
                : <Button onClick={() => setStatus(sel, 'HANDLED')}><Icon name="check" /> Mark as handled</Button>}
            </div>
          </div>
        )}
      </Card>
      <LogVoicemailModal open={logOpen} onClose={() => setLogOpen(false)} onSaved={async () => { setLogOpen(false); toast('Voicemail logged'); await vms.reload(); onChanged() }} />
    </div>
  )
}

function LogVoicemailModal({ open, onClose, onSaved }) {
  const [v, setV] = useState({ fromPhone: '', callerName: '', mailbox: 'Main line', duration: '', transcript: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }))
  return (
    <Modal
      open={open}
      size="md"
      title="Log a voicemail"
      subtitle="For messages left on a desk phone or answering service."
      onClose={onClose}
      footer={<>
        {error && <span className="mr-auto text-[13px] font-semibold text-warn">{error}</span>}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={busy} onClick={async () => {
          setBusy(true)
          setError('')
          try {
            await crm.logVoicemail({ fromPhone: v.fromPhone, callerName: v.callerName || null, mailbox: v.mailbox, durationSeconds: v.duration ? Number(v.duration) : null, transcript: v.transcript || null })
            setV({ fromPhone: '', callerName: '', mailbox: 'Main line', duration: '', transcript: '' })
            await onSaved()
          } catch (err) {
            setError(err.message)
          } finally {
            setBusy(false)
          }
        }}>{busy ? 'Saving…' : 'Save'}</Button>
      </>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field field={{ name: 'p', label: 'Caller’s number *', type: 'tel' }} value={v.fromPhone} onChange={set('fromPhone')} />
        <Field field={{ name: 'n', label: 'Caller name', hint: 'Filled in automatically when the number matches a patient.' }} value={v.callerName} onChange={set('callerName')} />
        <Field field={{ name: 'm', label: 'Mailbox', type: 'select', noEmpty: true, options: ['Main line', 'Front desk', 'Clinical', 'Billing', 'After hours'] }} value={v.mailbox} onChange={set('mailbox')} />
        <Field field={{ name: 'd', label: 'Length (seconds)', type: 'number', min: 0 }} value={v.duration} onChange={set('duration')} />
        <Field field={{ name: 't', label: 'What they said', type: 'textarea' }} value={v.transcript} onChange={set('transcript')} />
      </div>
    </Modal>
  )
}

/* ─── Fax ──────────────────────────────────────────────────────────────── */
const FAX_STATUS = {
  QUEUED: ['amber', 'Queued'],
  SENT: ['green', 'Sent'],
  FAILED: ['red', 'Failed'],
  RECEIVED: ['blue', 'Needs filing'],
  FILED: ['green', 'Filed'],
}

function FaxSection({ overview, toast, onChanged }) {
  const [params] = useSearchParams()
  const faxes = useAsync(() => crm.faxes(), [])
  const [tab, setTab] = useState('IN')
  const [selId, setSelId] = useState(null)
  const [sendOpen, setSendOpen] = useState(Boolean(params.get('to')))
  const [receiveOpen, setReceiveOpen] = useState(false)
  const list = (faxes.data || []).filter((f) => tab === 'ALL' || f.direction === tab)
  const sel = (faxes.data || []).find((f) => f.id === selId) || list[0]
  const faxNumber = overview.practice.faxNumber

  const refresh = async () => { await faxes.reload(); onChanged() }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card title="Fax" actions={<Button size="sm" onClick={() => setSendOpen(true)}><Icon name="plus" /> Send a fax</Button>} bodyClassName="p-0">
        <div className="flex items-center justify-between gap-2 border-b border-mist-100 px-4 py-2.5">
          <Segmented value={tab} onChange={setTab} options={[{ value: 'IN', label: 'Received' }, { value: 'OUT', label: 'Sent' }, { value: 'ALL', label: 'All' }]} />
          <button type="button" className="text-[12.5px] font-semibold text-brand-700" onClick={() => setReceiveOpen(true)}>Add scanned</button>
        </div>
        <p className="m-0 border-b border-mist-100 px-4 py-2 text-[12px] text-mist-600">{faxNumber ? `Fax number ${faxNumber}` : 'Set the practice fax number under Call handling.'}</p>
        {faxes.loading ? <div className="px-4"><Loading /></div> : list.length === 0 ? <p className="m-0 px-4 py-6 text-sm text-mist-600">No faxes here.</p> : (
          <ul className="m-0 list-none p-0">
            {list.map((f) => {
              const [tone, label] = FAX_STATUS[f.status] || FAX_STATUS.RECEIVED
              return (
                <li key={f.id}>
                  <button type="button" onClick={() => setSelId(f.id)} className={`flex w-full items-center gap-3 border-b border-mist-100 px-4 py-3 text-left ${sel?.id === f.id ? 'bg-brand-50' : 'hover:bg-mist-25'}`}>
                    <Icon name={f.direction === 'IN' ? 'download' : 'upload'} className="h-4 w-4 text-mist-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-navy">{f.partyName || formatPhone(f.faxNumber)}</span>
                      <span className="block truncate text-[12px] text-mist-600">{fmtRelative(f.createdAt)} · {f.pages || 1} page{f.pages === 1 ? '' : 's'}{f.subject ? ` · ${f.subject}` : ''}</span>
                    </span>
                    <Pill tone={tone}>{label}</Pill>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        {!sel ? <p className="m-0 py-6 text-center text-sm text-mist-600">Select a fax.</p> : <FaxDetail fax={sel} toast={toast} onChanged={refresh} />}
      </Card>

      <SendFaxModal open={sendOpen} direction="OUT" initialTo={params.get('to') || ''} initialName={params.get('name') || ''} onClose={() => setSendOpen(false)} onSaved={async (f) => { setSendOpen(false); toast(overview.phoneStatus === 'CONNECTED' ? 'Fax sent' : 'Fax queued — it sends once the phone system is connected'); setTab('OUT'); setSelId(f.id); await refresh() }} />
      <SendFaxModal open={receiveOpen} direction="IN" onClose={() => setReceiveOpen(false)} onSaved={async (f) => { setReceiveOpen(false); toast('Fax added'); setTab('IN'); setSelId(f.id); await refresh() }} />
    </div>
  )
}

function FaxDetail({ fax, toast, onChanged }) {
  const [patientId, setPatientId] = useState('')
  const [docType, setDocType] = useState('Referral')
  const [fwdOpen, setFwdOpen] = useState(false)
  const [fwd, setFwd] = useState({ faxNumber: '', partyName: '' })
  const [error, setError] = useState('')
  const [tone, label] = FAX_STATUS[fax.status] || FAX_STATUS.RECEIVED
  const [url, setUrl] = useState(null)
  const isImage = fax.contentType?.startsWith('image/') && fax.contentType !== 'image/tiff'

  useEffect(() => {
    setPatientId('')
    setError('')
    setFwdOpen(false)
    let objectUrl = null
    let alive = true
    setUrl(null)
    crm.faxDocumentBlob(fax.id)
      .then((u) => {
        objectUrl = u
        if (alive) setUrl(u)
        else URL.revokeObjectURL(u)
      })
      .catch(() => alive && setError('The document could not be loaded.'))
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fax.id])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 flex-1 text-[17px] font-semibold text-navy">{fax.subject || (fax.direction === 'IN' ? 'Received fax' : 'Sent fax')}</h3>
        <Pill tone={tone} dot>{label}</Pill>
      </div>
      <p className="m-0 mt-0.5 text-[12.5px] text-mist-600">
        {fax.direction === 'IN' ? 'From' : 'To'} {fax.partyName || 'unknown'} · <span className="font-mono">{formatPhone(fax.faxNumber)}</span> · {fmtDateTime(fax.createdAt)} · {fax.pages || 1} page{fax.pages === 1 ? '' : 's'}
        {fax.coverPage ? ' · with cover page' : ''}
      </p>
      <div className="mt-3 overflow-hidden rounded-[10px] border border-mist-200 bg-mist-50">
        {!url ? (
          <div className="p-6"><Loading label="Loading document…" /></div>
        ) : isImage ? (
          <img src={url} alt={`Fax ${fax.fileName || ''}`} className="max-h-[420px] w-full object-contain" />
        ) : fax.contentType === 'application/pdf' ? (
          <iframe title="Fax document" src={url} className="h-[420px] w-full bg-white" />
        ) : (
          <p className="m-0 p-6 text-center text-[13px] text-mist-600">Preview isn’t available for TIFF files — download it below.</p>
        )}
      </div>
      <a href={url || undefined} download={fax.fileName || 'fax'} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700"><Icon name="download" className="h-3.5 w-3.5" /> {fax.fileName || 'Open document'}</a>

      {fax.direction === 'IN' && (
        fax.status === 'FILED' ? (
          <p className="m-0 mt-3 rounded-[10px] bg-brand-50 px-3.5 py-2.5 text-[13px] text-brand-900">
            Filed to <Link className="font-semibold" to={`/app/crm/patients/${fax.patientId}`}>{fax.patientName}</Link> as {fax.documentType || 'a document'} by {fax.filedByName} · {fmtRelative(fax.filedAt)}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 rounded-[10px] border border-mist-200 p-3.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-end">
            <label className="block text-[12.5px] font-semibold text-navy">File to patient<PatientPicker value={patientId} onChange={setPatientId} /></label>
            <Field field={{ name: 'dt', label: 'Document type', type: 'select', options: FAX_DOC_TYPES, noEmpty: true }} value={docType} onChange={setDocType} />
            <Button disabled={!patientId} onClick={async () => {
              try {
                await crm.fileFax(fax.id, { patientId, documentType: docType })
                toast('Filed to the patient’s timeline')
                await onChanged()
              } catch (err) {
                setError(err.message)
              }
            }}>File to chart</Button>
          </div>
        )
      )}
      {error && <p className="m-0 mt-2 text-[13px] font-semibold text-warn">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setFwdOpen((v) => !v)}><Icon name="arrowRight" /> Forward</Button>
        <CallButton phone={fax.faxNumber} small={false} />
        <span className="text-[12px] text-mist-500">{fax.createdByName ? `Added by ${fax.createdByName}` : ''}</span>
      </div>
      {fwdOpen && (
        <div className="mt-3 grid gap-3 rounded-[10px] border border-mist-200 p-3.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field field={{ name: 'fn', label: 'Fax number *', type: 'tel' }} value={fwd.faxNumber} onChange={(v) => setFwd((p) => ({ ...p, faxNumber: v }))} />
          <Field field={{ name: 'pn', label: 'Recipient' }} value={fwd.partyName} onChange={(v) => setFwd((p) => ({ ...p, partyName: v }))} />
          <Button onClick={async () => {
            try {
              await crm.forwardFax(fax.id, { faxNumber: fwd.faxNumber, partyName: fwd.partyName || null })
              toast('Forward queued')
              setFwdOpen(false)
              setFwd({ faxNumber: '', partyName: '' })
              await onChanged()
            } catch (err) {
              setError(err.message)
            }
          }}>Forward</Button>
        </div>
      )}
    </div>
  )
}

function SendFaxModal({ open, direction, initialTo = '', initialName = '', onClose, onSaved }) {
  const [f, setF] = useState({ faxNumber: initialTo, partyName: initialName, patientId: '', subject: '', documentType: 'Medical records', coverPage: true, coverNote: '' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))
  const out = direction === 'OUT'

  async function submit() {
    if (!file) return setError('Attach the document.')
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('direction', direction)
      form.append('faxNumber', f.faxNumber)
      if (f.partyName) form.append('partyName', f.partyName)
      if (f.patientId) form.append('patientId', f.patientId)
      if (f.subject) form.append('subject', f.subject)
      if (f.documentType) form.append('documentType', f.documentType)
      form.append('coverPage', String(out && f.coverPage))
      if (out && f.coverPage && f.coverNote) form.append('coverNote', f.coverNote)
      form.append('file', file)
      const res = await crm.createFax(form)
      setFile(null)
      setF({ faxNumber: '', partyName: '', patientId: '', subject: '', documentType: 'Medical records', coverPage: true, coverNote: '' })
      await onSaved(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      size="md"
      title={out ? 'Send a fax' : 'Add a received fax'}
      subtitle={out ? null : 'For faxes that arrived on a fax machine — scan and upload them here to file to a chart.'}
      onClose={onClose}
      footer={<>
        {error && <span className="mr-auto max-w-[60%] text-[13px] font-semibold text-warn">{error}</span>}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={busy}>{busy ? 'Uploading…' : out ? 'Send fax' : 'Add fax'}</Button>
      </>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field field={{ name: 'fn', label: out ? 'Fax number *' : 'Sender’s fax number *', type: 'tel', placeholder: '(972) 555-0191' }} value={f.faxNumber} onChange={set('faxNumber')} />
        <Field field={{ name: 'pn', label: out ? 'Recipient name' : 'Sender', placeholder: 'e.g. Plano Family Medicine' }} value={f.partyName} onChange={set('partyName')} />
        <label className="block text-[12.5px] font-semibold text-navy sm:col-span-2">About patient (optional)<PatientPicker value={f.patientId} onChange={set('patientId')} /></label>
        <Field field={{ name: 's', label: 'Subject' }} value={f.subject} onChange={set('subject')} />
        <Field field={{ name: 'dt', label: 'Document type', type: 'select', options: FAX_DOC_TYPES, noEmpty: true }} value={f.documentType} onChange={set('documentType')} />
        <label className="block text-[12.5px] font-semibold text-navy sm:col-span-2">
          Document * <span className="font-normal text-mist-600">PDF, TIFF, JPG or PNG · up to 10 MB</span>
          <input type="file" accept=".pdf,.tif,.tiff,.jpg,.jpeg,.png,application/pdf,image/tiff,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-[13px] file:mr-3 file:rounded-lg file:border file:border-mist-300 file:bg-white file:px-3 file:py-2 file:text-[13px] file:font-semibold" />
        </label>
        {out && <Field field={{ name: 'cp', label: 'Add a cover page with the confidentiality notice', type: 'checkbox' }} value={f.coverPage} onChange={set('coverPage')} />}
        {out && f.coverPage && <Field field={{ name: 'cn', label: 'Cover page note', type: 'textarea', placeholder: 'e.g. Records request for upcoming visit' }} value={f.coverNote} onChange={set('coverNote')} />}
      </div>
    </Modal>
  )
}

/* ─── Recordings ───────────────────────────────────────────────────────── */
function RecordingsSection({ overview }) {
  const days = overview.practice.recordingRetentionDays || 90
  return (
    <Card title="Call recordings" subtitle={`Kept for ${days} days, then deleted automatically · only owners and managers can download`}>
      <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-mist-200 bg-mist-25 px-4 py-10 text-center">
        <Icon name="play" className="h-7 w-7 text-mist-500" />
        <p className="m-0 mt-2 text-[14px] font-semibold text-navy">No recordings yet</p>
        <p className="m-0 mt-1 max-w-md text-[13px] text-mist-600">
          {overview.practice.recordAll
            ? 'Recording is turned on. Recordings attach to each call once the phone system is connected.'
            : 'Turn on recording under Call handling → Recording. Recordings attach to each call once the phone system is connected.'}
        </p>
      </div>
    </Card>
  )
}

/* ─── Contacts ─────────────────────────────────────────────────────────── */
const CONTACT_TAG = { PATIENT: ['green', 'Patient'], LEAD: ['blue', 'Lead'], PARTNER: ['amber', 'Referring office'], STAFF: ['ink', 'Staff'] }

function ContactsSection({ onDetails, onText, onFax }) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('ALL')
  const needle = useDebounced(q)
  const list = useAsync(() => crm.phoneContacts({ q: needle || undefined, group }), [needle, group])
  return (
    <Card title="Contacts" actions={<SearchInput value={q} onChange={setQ} placeholder="Name or number" className="sm:max-w-[240px]" />} bodyClassName="p-0">
      <div className="border-b border-mist-100 px-4 py-2.5">
        <Segmented value={group} onChange={setGroup} options={[{ value: 'ALL', label: 'All' }, { value: 'PATIENTS', label: 'Patients' }, { value: 'REFERRING', label: 'Referring offices' }, { value: 'STAFF', label: 'Staff' }]} />
      </div>
      {list.loading ? <div className="px-4"><Loading /></div> : !list.data?.length ? <p className="m-0 px-4 py-6 text-sm text-mist-600">No contacts match.</p> : (
        <ul className="m-0 list-none p-0">
          {list.data.map((c) => {
            const [tone, tag] = CONTACT_TAG[c.type] || ['gray', c.type]
            return (
              <li key={`${c.type}-${c.id}`} className="flex flex-wrap items-center gap-3 border-b border-mist-100 px-4 py-3 last:border-0">
                <Avatar name={c.name} size="sm" tone={c.type === 'STAFF' ? 'ink' : 'teal'} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[14px] font-semibold text-navy">{c.name} <Pill tone={tone}>{tag}</Pill></p>
                  <p className="m-0 text-[12.5px] text-mist-600">{c.subtitle}{c.phone ? <> · <span className="font-mono">{formatPhone(c.phone)}</span></> : ''}</p>
                </div>
                <div className="flex gap-1.5">
                  <CallButton phone={c.phone} />
                  {c.canText && <Button size="sm" variant="secondary" onClick={() => onText(c)}><Icon name="message" /> Text</Button>}
                  {c.fax && <Button size="sm" variant="secondary" onClick={() => onFax(c)}><Icon name="note" /> Fax</Button>}
                  <Button size="sm" variant="ghost" onClick={() => onDetails({ name: c.name, phone: c.phone, tag, tone, canText: c.canText, link: c.link, rows: [['Phone', c.phone && formatPhone(c.phone)], ['Fax', c.fax && formatPhone(c.fax)], ['Email', c.email], ['About', c.subtitle]] })}>Details</Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/* ─── Video visits ─────────────────────────────────────────────────────── */
function VideoSection({ toast }) {
  const appts = useAsync(() => crm.appointments(), [])
  const editors = useCrmEditors({ toast, onSaved: () => appts.reload() })
  const now = Date.now()
  const rows = useMemo(() => (appts.data || [])
    .filter((a) => a.mode === 'TELEHEALTH' || a.appointmentType === 'TELEHEALTH')
    .filter((a) => new Date(a.startsAt).getTime() > now - 2 * 3600 * 1000 && a.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)), [appts.data, now])

  return (
    <Card
      title="Video visits"
      subtitle="Telehealth visits booked in Utessa. Patients join from a texted link — no app needed."
      actions={<Button onClick={() => editors.open.appointment(null, { appointmentType: 'TELEHEALTH', mode: 'TELEHEALTH', durationMinutes: 30 })}><Icon name="plus" /> Schedule video visit</Button>}
    >
      <Alert tone="info">Video rooms open from here once a HIPAA-eligible video provider is connected under Integrations. Until then, visits are booked and appear on the schedule as telehealth.</Alert>
      <DataTable
        rows={rows}
        loading={appts.loading}
        empty="No upcoming video visits."
        onRowClick={(a) => editors.open.appointment(a)}
        columns={[
          { key: 'patientName', label: 'Patient', render: (a) => <b>{a.patientName}</b> },
          { key: 'startsAt', label: 'When', nowrap: true, render: (a) => fmtDateTime(a.startsAt) },
          { key: 'providerName', label: 'With', render: (a) => a.providerName || '—' },
          { key: 'status', label: 'Status', render: (a) => <Pill tone={a.status === 'CONFIRMED' ? 'green' : 'blue'}>{a.status === 'CONFIRMED' ? 'Confirmed' : 'Link not sent'}</Pill> },
          { key: 'join', label: '', sortable: false, render: () => <Button size="sm" variant="secondary" disabled title="Needs a video provider">Join</Button> },
        ]}
      />
      {editors.node}
    </Card>
  )
}

/* ─── Call handling ────────────────────────────────────────────────────── */
const HANDLING_TABS = [
  { value: 'hours', label: 'Hours' },
  { value: 'menu', label: 'Phone menu' },
  { value: 'queues', label: 'Queues' },
  { value: 'mine', label: 'My calls' },
  { value: 'recording', label: 'Recording' },
  { value: 'numbers', label: 'Numbers' },
]

function HandlingSection({ overview, toast, onSaved }) {
  const { team } = useCrmRefs()
  const [tab, setTab] = useState('hours')
  const [p, setP] = useState(() => structuredClone(overview.practice))
  const [me, setMe] = useState(() => structuredClone(overview.myPrefs))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const canEdit = overview.canEditPractice || tab === 'mine'
  const queueNames = (p.queues || []).map((q) => q.name)
  const destOptions = [...queueNames, 'Practice voicemail', 'Answering service', 'On-call provider']
  const setP2 = (k, v) => setP((prev) => ({ ...prev, [k]: v }))
  const input = 'h-9 rounded-lg border border-mist-300 bg-white px-2.5 text-[13px] text-navy disabled:bg-mist-50 disabled:text-mist-500'

  async function save() {
    setSaving(true)
    setError('')
    try {
      if (tab === 'mine') await crm.savePhoneMine(me)
      else await crm.savePhonePractice(p)
      toast('Saved')
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      title="Call handling"
      subtitle={tab === 'mine' ? 'How calls reach you' : overview.canEditPractice ? 'Practice-wide settings for the main line' : 'Owners, admins and office managers can change these'}
    >
      <div className="mb-4 flex flex-wrap gap-1 border-b border-mist-200">
        {HANDLING_TABS.map((t) => (
          <button key={t.value} type="button" onClick={() => setTab(t.value)} className={`relative px-3 pb-2.5 pt-1.5 text-[13px] font-medium ${tab === t.value ? 'text-navy' : 'text-mist-500 hover:text-mist-700'}`}>
            {t.label}
            {tab === t.value && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-sm bg-brand-600" />}
          </button>
        ))}
      </div>

      <fieldset disabled={!canEdit} className="m-0 border-0 p-0">
        {tab === 'hours' && (
          <div className="space-y-4">
            <table className="w-full max-w-xl border-collapse text-[13px]">
              <thead><tr className="text-left text-[12px] text-mist-600"><th className="py-1.5">Day</th><th>Open</th><th>From</th><th>To</th></tr></thead>
              <tbody>
                {(p.hours || []).map((h, i) => (
                  <tr key={h.day} className="border-t border-mist-100">
                    <td className="py-2 font-medium text-navy">{h.day}</td>
                    <td><input type="checkbox" aria-label={`${h.day} open`} checked={Boolean(h.open)} onChange={(e) => setP2('hours', p.hours.map((x, j) => (j === i ? { ...x, open: e.target.checked } : x)))} /></td>
                    <td><input type="time" className={input} value={h.from} disabled={!h.open} onChange={(e) => setP2('hours', p.hours.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} /></td>
                    <td><input type="time" className={input} value={h.to} disabled={!h.open} onChange={(e) => setP2('hours', p.hours.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <Field field={{ name: 'ah', label: 'After hours, calls go to', type: 'select', noEmpty: true, options: [{ value: 'ANSWERING_SERVICE', label: 'Answering service' }, { value: 'VOICEMAIL', label: 'Practice voicemail' }, { value: 'ON_CALL', label: 'On-call provider’s mobile' }] }} value={p.afterHours} onChange={(v) => setP2('afterHours', v)} />
              <Field field={{ name: 'asn', label: p.afterHours === 'ON_CALL' ? 'On-call number' : 'Answering service number', type: 'tel' }} value={p.answeringServiceNumber} onChange={(v) => setP2('answeringServiceNumber', v)} />
              <Field field={{ name: 'hol', label: 'Closed for a holiday', type: 'date' }} value={p.holidayDate} onChange={(v) => setP2('holidayDate', v)} />
              <Field field={{ name: 'ahg', label: 'After-hours greeting', type: 'textarea' }} value={p.afterHoursGreeting} onChange={(v) => setP2('afterHoursGreeting', v)} />
            </div>
          </div>
        )}

        {tab === 'menu' && (
          <div className="space-y-3">
            <Field field={{ name: 'gr', label: 'What callers hear first', type: 'textarea' }} value={p.greeting} onChange={(v) => setP2('greeting', v)} />
            <table className="w-full border-collapse text-[13px]">
              <thead><tr className="text-left text-[12px] text-mist-600"><th className="w-16 py-1.5">Key</th><th>Caller hears</th><th>Sends the call to</th><th /></tr></thead>
              <tbody>
                {(p.menu || []).map((m, i) => (
                  <tr key={`${m.key}-${i}`} className="border-t border-mist-100">
                    <td className="py-2">
                      <Select className={input} value={m.key} onChange={(e) => setP2('menu', p.menu.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}>
                        {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => <option key={k} value={k}>{k}</option>)}
                      </Select>
                    </td>
                    <td className="pr-2"><input className={`${input} w-full`} value={m.label} onChange={(e) => setP2('menu', p.menu.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} /></td>
                    <td className="pr-2">
                      <Select className={`${input} w-full`} value={m.dest} onChange={(e) => setP2('menu', p.menu.map((x, j) => (j === i ? { ...x, dest: e.target.value } : x)))}>
                        {destOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                      </Select>
                    </td>
                    <td><Button size="sm" variant="ghost" onClick={() => setP2('menu', p.menu.filter((_, j) => j !== i))}>Remove</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button size="sm" variant="secondary" disabled={(p.menu || []).length >= 10} onClick={() => {
              const used = new Set((p.menu || []).map((m) => m.key))
              const key = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].find((k) => !used.has(k))
              setP2('menu', [...(p.menu || []), { key, label: '', dest: queueNames[0] || 'Practice voicemail' }])
            }}><Icon name="plus" /> Add option</Button>
            <div className="max-w-sm">
              <Field field={{ name: 'ni', label: 'No key pressed after 8 seconds, send to', type: 'select', noEmpty: true, options: destOptions }} value={p.noInputDest} onChange={(v) => setP2('noInputDest', v)} />
            </div>
          </div>
        )}

        {tab === 'queues' && (
          <div className="grid gap-3 lg:grid-cols-2">
            {(p.queues || []).map((q, i) => {
              const upd = (k, v) => setP2('queues', p.queues.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
              return (
                <div key={i} className="rounded-[12px] border border-mist-200 p-3.5">
                  <input className={`${input} mb-3 w-full font-semibold`} value={q.name} onChange={(e) => upd('name', e.target.value)} aria-label="Queue name" />
                  <p className="m-0 mb-1 text-[12px] font-semibold text-mist-800">Members</p>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {team.map((m) => {
                      const on = (q.members || []).includes(m.userId)
                      return (
                        <button key={m.userId} type="button" aria-pressed={on} onClick={() => upd('members', on ? q.members.filter((x) => x !== m.userId) : [...(q.members || []), m.userId])}
                          className={`min-h-8 rounded-lg border px-3 text-[12.5px] ${on ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-mist-300 text-navy'}`}>
                          {m.fullName}
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field field={{ name: 'st', label: 'Ring members', type: 'select', noEmpty: true, options: [{ value: 'ALL', label: 'All at once' }, { value: 'ROUND_ROBIN', label: 'Taking turns' }, { value: 'LONGEST_IDLE', label: 'Free longest' }] }} value={q.strategy} onChange={(v) => upd('strategy', v)} />
                    <Field field={{ name: 'w', label: 'If no answer within', type: 'select', noEmpty: true, options: [{ value: 60, label: '1 minute' }, { value: 120, label: '2 minutes' }, { value: 300, label: '5 minutes' }] }} value={q.waitSeconds} onChange={(v) => upd('waitSeconds', Number(v))} />
                    <Field field={{ name: 'o', label: 'then send to', type: 'select', noEmpty: true, options: [{ value: 'VOICEMAIL', label: 'Queue voicemail' }, { value: 'CALLBACK', label: 'Offer a callback' }, { value: 'OTHER_QUEUE', label: 'Another queue' }] }} value={q.overflow} onChange={(v) => upd('overflow', v)} />
                  </div>
                  <Button size="sm" variant="ghost" className="mt-2" onClick={() => setP2('queues', p.queues.filter((_, j) => j !== i))}>Remove queue</Button>
                </div>
              )
            })}
            <div>
              <Button variant="secondary" onClick={() => setP2('queues', [...(p.queues || []), { name: 'New queue', members: [], strategy: 'ALL', waitSeconds: 120, overflow: 'VOICEMAIL' }])}><Icon name="plus" /> Add queue</Button>
            </div>
          </div>
        )}

        {tab === 'mine' && (
          <div className="max-w-2xl space-y-3">
            <Field field={{ name: 'app', label: 'Ring me in Utessa (this browser)', type: 'checkbox' }} value={me.ringApp} onChange={(v) => setMe((x) => ({ ...x, ringApp: v }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field field={{ name: 'desk', label: 'Ring my desk phone', type: 'checkbox' }} value={me.ringDesk} onChange={(v) => setMe((x) => ({ ...x, ringDesk: v }))} />
              <Field field={{ name: 'ext', label: 'My extension' }} value={me.extension} onChange={(v) => setMe((x) => ({ ...x, extension: v }))} />
              <Field field={{ name: 'mob', label: 'Then ring my mobile', type: 'checkbox' }} value={me.ringMobile} onChange={(v) => setMe((x) => ({ ...x, ringMobile: v }))} />
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <Field field={{ name: 'mn', label: 'Mobile number', type: 'tel' }} value={me.mobileNumber} onChange={(v) => setMe((x) => ({ ...x, mobileNumber: v }))} />
                <Field field={{ name: 'r', label: 'after', type: 'select', noEmpty: true, options: [{ value: 2, label: '2 rings' }, { value: 4, label: '4 rings' }, { value: 6, label: '6 rings' }] }} value={me.mobileAfterRings} onChange={(v) => setMe((x) => ({ ...x, mobileAfterRings: Number(v) }))} />
              </div>
            </div>
            <Field field={{ name: 'g', label: 'My voicemail greeting', type: 'select', noEmpty: true, options: [{ value: 'STANDARD', label: 'Standard greeting' }, { value: 'AWAY', label: 'Out of office' }, { value: 'CUSTOM', label: 'Record my own (in the phone system)' }] }} value={me.greeting} onChange={(v) => setMe((x) => ({ ...x, greeting: v }))} />
            <Field field={{ name: 'em', label: 'Email me when I get a voicemail (transcript only, no audio)', type: 'checkbox' }} value={me.emailVoicemail} onChange={(v) => setMe((x) => ({ ...x, emailVoicemail: v }))} />
          </div>
        )}

        {tab === 'recording' && (
          <div className="max-w-2xl space-y-3">
            <Field field={{ name: 'ra', label: 'Record all calls on the main line automatically', type: 'checkbox' }} value={p.recordAll} onChange={(v) => setP2('recordAll', v)} />
            <Field field={{ name: 'rn', label: 'Play “This call may be recorded for quality” before connecting', type: 'checkbox' }} value={p.recordingNotice} onChange={(v) => setP2('recordingNotice', v)} />
            <div className="max-w-xs">
              <Field field={{ name: 'rk', label: 'Keep recordings for', type: 'select', noEmpty: true, options: [{ value: 30, label: '30 days' }, { value: 90, label: '90 days' }, { value: 365, label: '1 year' }] }} value={p.recordingRetentionDays} onChange={(v) => setP2('recordingRetentionDays', Number(v))} />
            </div>
            <p className="m-0 rounded-[10px] bg-mist-50 px-3.5 py-3 text-[12.5px] text-mist-800">Some states require every party’s consent to record. The notice covers callers from two-party-consent states — check with your compliance officer.</p>
          </div>
        )}

        {tab === 'numbers' && (
          <div className="max-w-2xl space-y-3">
            {(p.lines || []).map((l, i) => (
              <div key={l.id} className="grid gap-3 sm:grid-cols-2">
                <Field field={{ name: `ll${i}`, label: 'Line name' }} value={l.label} onChange={(v) => setP2('lines', p.lines.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                <Field field={{ name: `ln${i}`, label: 'Number', type: 'tel' }} value={l.number} onChange={(v) => setP2('lines', p.lines.map((x, j) => (j === i ? { ...x, number: v } : x)))} />
              </div>
            ))}
            <div className="max-w-xs"><Field field={{ name: 'fx', label: 'Practice fax number', type: 'tel' }} value={p.faxNumber} onChange={(v) => setP2('faxNumber', v)} /></div>
          </div>
        )}
      </fieldset>

      <div className="mt-5 flex items-center gap-3 border-t border-mist-100 pt-4">
        {canEdit ? <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button> : <span className="text-[13px] text-mist-600">View only</span>}
        {error && <span className="text-[13px] font-semibold text-warn">{error}</span>}
        <span className="ml-auto text-[12px] text-mist-500">Routing takes effect in the phone system once it is connected.</span>
      </div>
    </Card>
  )
}

/* ─── Phone system ─────────────────────────────────────────────────────── */
function SystemSection({ overview }) {
  const status = overview.phoneStatus
  return (
    <Card title={`Phone system${overview.phoneProvider ? ` · ${overview.phoneProvider}` : ''}`} actions={<Pill tone={toneOf([{ value: 'CONNECTED', tone: 'green' }, { value: 'PENDING', tone: 'amber' }], status)} dot>{status === 'CONNECTED' ? 'Connected' : status === 'PENDING' ? 'Connection requested' : 'Not connected'}</Pill>}>
      <p className="m-0 max-w-2xl text-[14px] leading-relaxed text-mist-800">
        Connect the practice’s phone provider so every extension, call queue and phone menu shows up in Utessa with live status. An admin approves the connection once on the provider’s own website — Utessa never sees the password.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Texts waiting to send', overview.queuedTexts],
          ['Faxes waiting to send', overview.queuedFaxes],
          ['Voicemail to handle', overview.newVoicemails],
          ['Faxes to file', overview.unfiledFaxes],
        ].map(([l, v]) => (
          <div key={l} className="rounded-[12px] bg-mist-50 px-3.5 py-3">
            <p className="m-0 font-mono text-[20px] font-semibold text-navy">{v}</p>
            <p className="m-0 text-[12.5px] text-mist-600">{l}</p>
          </div>
        ))}
      </div>
      <p className="m-0 mt-4 text-[13px] font-semibold text-navy">What the connection turns on</p>
      <ul className="m-0 mt-1.5 grid list-none gap-1.5 p-0 text-[13px] text-mist-800 sm:grid-cols-2">
        {['Incoming calls ring here and open the caller’s record', 'Click-to-call from any record', 'Queued texts and faxes are sent', 'Voicemail audio and transcripts arrive automatically', 'Call recordings attach to each call', 'Extensions and live status for the whole team'].map((t) => (
          <li key={t} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 text-brand-700" strokeWidth={2.2} />{t}</li>
        ))}
      </ul>
      <Link to="/app/crm/integrations" className="mt-4 inline-block"><Button>{status === 'NOT_CONNECTED' ? 'Connect a phone system' : 'Manage the connection'}</Button></Link>
    </Card>
  )
}
