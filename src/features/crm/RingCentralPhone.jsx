import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import { crm } from './crmApi'
import { formatPhone } from './ui'

/*
 * RingCentral browser phone (WebRTC) for the whole app.
 *
 * - Registers the signed-in user's RingCentral extension in this browser, so calls ring in Utessa.
 * - Incoming call → caller is matched against patients/leads (screen-pop) before answering.
 * - Answer / decline / send to voicemail / hang up / mute / hold / keypad, and click-to-call.
 * - Missed calls are logged by the server (call log sync), which also sends the auto-text.
 */

const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')
const API_ORIGIN = (() => {
  try {
    return new URL(API_ROOT).origin
  } catch {
    return API_ROOT
  }
})()

const noop = async () => {}
const NULL_PHONE = {
  enabled: false,
  status: null,
  phase: 'off',
  ready: false,
  error: '',
  incoming: null,
  active: null,
  answer: noop,
  decline: noop,
  toVoicemail: noop,
  hangup: noop,
  call: noop,
  toggleMute: noop,
  toggleHold: noop,
  sendDtmf: noop,
  connect: noop,
  disconnect: noop,
  reload: noop,
}

const PhoneCtx = createContext(NULL_PHONE)
export const useRingCentralPhone = () => useContext(PhoneCtx)

/** Pulls a dialable number out of whatever the SDK exposes for the other party. */
function sessionNumber(s) {
  const candidates = [
    s?.remoteNumber,
    s?.remotePeer,
    s?.remoteIdentity?.uri?.user,
    s?.sipMessage?.headers?.From,
    s?.inboundMessage?.headers?.From,
  ]
  for (const c of candidates) {
    if (!c) continue
    const text = typeof c === 'string' ? c : String(c?.value ?? c)
    const m = text.match(/\+?\d{7,15}/)
    if (m) return m[0]
  }
  return ''
}

function sessionName(s) {
  const fromRc = s?.rcApiCallInfo?.callerIdName
  if (fromRc && !/^\+?\d+$/.test(fromRc)) return fromRc
  const raw = s?.remotePeer || s?.sipMessage?.headers?.From || ''
  const m = String(raw).match(/^\s*"?([^"<]+?)"?\s*</)
  const name = m ? m[1].trim() : ''
  return /^\+?\d+$/.test(name) ? '' : name
}

/**
 * Turns what the user typed into the full international (E.164) number RingCentral dials.
 * Without the "+", RingCentral treats the digits as a US/Canada number, so the country code
 * must be kept.
 *   +92 343 0519849 / 0092 343 0519849 → +923430519849
 *   0343 0519849 (Pakistan mobile, local format) → +923430519849
 *   (650) 555-0100 / 1 650 555 0100 → +16505550100
 * Returns '' when the number can't be dialled as entered.
 */
export function toDialString(raw) {
  const text = String(raw || '').trim()
  let digits = text.replace(/\D/g, '')
  if (!digits) return ''
  if (text.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : ''
  if (digits.startsWith('00')) {
    digits = digits.slice(2)
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : ''
  }
  if (digits.length === 11 && digits.startsWith('03')) return `+92${digits.slice(1)}`
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}` // country code typed without "+"
  return ''
}

/**
 * Ends a call whatever state it is in. A call the other phone is still ringing must be
 * CANCELled — a BYE (hangup) is ignored until the call is answered, which left the
 * patient's phone ringing. Answered calls get a BYE; an unanswered incoming call is declined.
 */
export async function endSession(session) {
  if (!session || session.state === 'disposed' || session.state === 'failed') return
  const disposeLater = () => setTimeout(() => {
    try {
      if (session.state !== 'disposed') session.dispose()
    } catch {
      /* already gone */
    }
  }, 5000)
  try {
    if (session.direction === 'outbound' && session.state !== 'answered') {
      if (!session.remotePeer) {
        // RingCentral hasn't accepted the INVITE yet — wait for it, then cancel.
        await new Promise((resolve) => {
          const t = setTimeout(resolve, 5000)
          session.once?.('ringing', () => { clearTimeout(t); resolve() })
          session.once?.('answered', () => { clearTimeout(t); resolve() })
          session.once?.('disposed', () => { clearTimeout(t); resolve() })
        })
      }
      if (session.state === 'disposed' || session.state === 'failed') return
      if (session.state === 'answered') {
        await session.hangup()
        session.dispose()
        return
      }
      // If the patient picks up at the same moment, hang that up too.
      session.once?.('answered', () => session.hangup().catch(() => {}))
      await session.cancel()
      disposeLater()
    } else if (session.direction === 'inbound' && session.state !== 'answered') {
      await session.decline()
      disposeLater()
    } else {
      await session.hangup()
      session.dispose()
    }
  } catch {
    try {
      if (session.state !== 'disposed') session.dispose()
    } catch {
      /* already gone */
    }
  }
}

/** Turns a SIP failure ("SIP/2.0 486 Busy Here") into something staff can act on. */
function callFailureText(reason) {
  const text = String(reason || '')
  const code = Number((text.match(/SIP\/2\.0 (\d{3})/) || [])[1])
  if (code === 486 || code === 600) return 'The number is busy.'
  if (code === 487) return ''
  if (code === 480) return 'The number is not available right now.'
  if (code === 603) return 'The call was declined.'
  if (code === 404 || code === 484) return 'That number can’t be reached. Check the number and the country code (e.g. +92 …).'
  if (code === 403) return 'RingCentral refused the call. Check that international/outbound calling is allowed for your extension.'
  if (code === 408) return 'No answer.'
  return text ? `The call ended: ${text.replace(/^SIP\/2\.0 /, '')}` : 'The call could not be connected.'
}

/** A stable id for this browser, so re-registering replaces the old registration instead of piling up. */
function instanceIdFor(ext) {
  const key = `utessa.rc.instance.${ext || 'me'}`
  try {
    let id = localStorage.getItem(key)
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return undefined
  }
}

/* ─── Ringtone (generated, no audio file needed) ───────────────────────── */
function createRingtone() {
  let ctx = null
  let timer = null
  const burst = () => {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
      const now = ctx.currentTime
      ;[0, 0.45].forEach((offset) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = offset ? 480 : 440
        gain.gain.setValueAtTime(0.0001, now + offset)
        gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.4)
        osc.connect(gain).connect(ctx.destination)
        osc.start(now + offset)
        osc.stop(now + offset + 0.42)
      })
    } catch {
      /* audio blocked until the user interacts with the page */
    }
  }
  return {
    start() {
      if (timer) return
      burst()
      timer = setInterval(burst, 2600)
    },
    stop() {
      clearInterval(timer)
      timer = null
    },
  }
}

export function RingCentralPhoneProvider({ enabled, children }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [phase, setPhase] = useState('off') // off | starting | ready | error
  const [error, setError] = useState('')
  const [incoming, setIncoming] = useState(null)
  const [active, setActive] = useState(null)
  const [notice, setNotice] = useState(null)
  const webPhoneRef = useRef(null)
  const incomingRef = useRef(null) // { id, session }
  const activeRef = useRef(null)
  const ringRef = useRef(null)
  const callerIdRef = useRef(null)
  const genRef = useRef(0) // bumps on every stop, so a start that finishes late disposes itself
  const startingRef = useRef(null) // { gen, promise }
  if (!ringRef.current) ringRef.current = createRingtone()

  const showNotice = useCallback((n) => {
    setNotice(n)
    setTimeout(() => setNotice((cur) => (cur === n ? null : cur)), 9000)
  }, [])

  const stopPhone = useCallback(async () => {
    genRef.current += 1
    ringRef.current.stop()
    const live = activeRef.current?.session
    activeRef.current = null
    setActive(null)
    if (live) await endSession(live)
    const wp = webPhoneRef.current
    webPhoneRef.current = null
    if (wp) {
      try {
        await wp.dispose()
      } catch {
        /* already gone */
      }
    }
    setPhase('off')
  }, [])

  /* Server sync shortly after a call ends, so the call log / missed-call auto-text don't wait for the timer. */
  const syncSoon = useCallback(() => {
    setTimeout(() => crm.rcSync().catch(() => {}), 8000)
  }, [])

  const trackActive = useCallback((session, info) => {
    const id = info.id
    activeRef.current = { id, session }
    setActive({ ...info, muted: false, held: false })
    session.on?.('ringing', () => setActive((a) => (a && a.id === id && a.state === 'calling' ? { ...a, state: 'ringing' } : a)))
    session.on?.('answered', () => setActive((a) => (a && a.id === id ? { ...a, state: 'connected', connectedAt: a.connectedAt || Date.now() } : a)))
    session.on?.('failed', (reason) => {
      const text = callFailureText(reason)
      if (text) setError(text)
      setActive((a) => (a && a.id === id ? { ...a, state: 'failed' } : a))
    })
    session.on?.('disposed', () => {
      if (activeRef.current?.id === id) activeRef.current = null
      setActive((a) => (a && a.id === id ? null : a))
      syncSoon()
    })
  }, [syncSoon])

  const onInbound = useCallback(async (session) => {
    const id = `in-${Date.now()}`
    const number = sessionNumber(session)
    incomingRef.current = { id, session, answered: false }
    const info = { id, number, name: sessionName(session), lookup: null, looking: number.replace(/\D/g, '').length >= 7 }
    setIncoming(info)
    ringRef.current.start()
    session.on?.('disposed', () => {
      if (incomingRef.current?.id !== id) return
      const answered = incomingRef.current.answered
      incomingRef.current = null
      ringRef.current.stop()
      setIncoming(null)
      if (!answered) {
        showNotice({ kind: 'missed', number, name: info.name })
        syncSoon()
      }
    })
    if (info.looking) {
      try {
        const lookup = await crm.lookupCaller(number)
        setIncoming((cur) => (cur && cur.id === id ? { ...cur, lookup, looking: false } : cur))
        // Screen-pop: an existing patient/lead (one match) opens their profile while it is still ringing.
        // Skipped when you're already on another call, so that call's page isn't taken away.
        const only = lookup?.matches?.length === 1 ? lookup.matches[0].patient : null
        if (only && incomingRef.current?.id === id && !activeRef.current) {
          navigate(`/app/crm/patients/${only.id}`)
        }
      } catch {
        setIncoming((cur) => (cur && cur.id === id ? { ...cur, looking: false } : cur))
      }
    }
  }, [showNotice, syncSoon, navigate])

  const startPhone = useCallback(async () => {
    if (webPhoneRef.current) return undefined
    const gen = genRef.current
    // One registration per page: reuse a start that's already running for this generation.
    if (startingRef.current && startingRef.current.gen === gen) return startingRef.current.promise
    setPhase('starting')
    setError('')
    const promise = (async () => {
      try {
        const [{ default: WebPhone }, creds] = await Promise.all([import('ringcentral-web-phone'), crm.rcWebPhone()])
        const wp = new WebPhone({ sipInfo: creds.sipInfo, instanceId: instanceIdFor(creds.extensionNumber), autoAnswer: false })
        await wp.start()
        if (gen !== genRef.current || webPhoneRef.current) {
          // Stopped (or replaced) while starting — don't leave a second phone registered.
          await wp.dispose().catch(() => {})
          return
        }
        callerIdRef.current = creds.callerIdNumber || null
        wp.on('inboundCall', onInbound)
        webPhoneRef.current = wp
        setPhase('ready')
      } catch (err) {
        if (gen !== genRef.current) return
        setPhase('error')
        setError(err?.message || 'The browser phone could not start.')
      } finally {
        if (startingRef.current?.gen === gen) startingRef.current = null
      }
    })()
    startingRef.current = { gen, promise }
    return promise
  }, [onInbound])

  const reload = useCallback(async () => {
    if (!enabled) return null
    try {
      const s = await crm.rcStatus()
      setStatus(s)
      if (s.configured && s.connected) await startPhone()
      else await stopPhone()
      return s
    } catch {
      return null
    }
  }, [enabled, startPhone, stopPhone])

  useEffect(() => {
    if (!enabled) return undefined
    reload()
    const online = () => webPhoneRef.current?.start?.().catch?.(() => {})
    // Refreshing or closing the page would otherwise leave the call ringing / connected at RingCentral.
    const beforeUnload = (e) => {
      if (activeRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    const pageHide = () => {
      const live = activeRef.current?.session
      if (live) endSession(live)
      const ringing = incomingRef.current
      if (ringing) ringRef.current.stop()
      webPhoneRef.current?.dispose?.().catch?.(() => {})
    }
    window.addEventListener('online', online)
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('pagehide', pageHide)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('pagehide', pageHide)
      stopPhone()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  /* ─── Call actions ─────────────────────────────────────────────────── */
  const answer = useCallback(async () => {
    const cur = incomingRef.current
    if (!cur) return false
    ringRef.current.stop()
    cur.answered = true
    try {
      await cur.session.answer()
    } catch (err) {
      setError(err?.message || 'Could not answer the call.')
      return false
    }
    const info = incoming && incoming.id === cur.id ? incoming : { id: cur.id, number: sessionNumber(cur.session) }
    incomingRef.current = null
    setIncoming(null)
    trackActive(cur.session, { id: cur.id, number: info.number, name: info.lookup?.matches?.[0]?.patient?.fullName || info.name || '', direction: 'INBOUND', state: 'connected', startedAt: Date.now(), connectedAt: Date.now() })
    return true
  }, [incoming, trackActive])

  const decline = useCallback(async () => {
    ringRef.current.stop()
    try {
      await incomingRef.current?.session?.decline()
    } catch {
      /* already gone */
    }
  }, [])

  const toVoicemail = useCallback(async () => {
    ringRef.current.stop()
    try {
      await incomingRef.current?.session?.toVoicemail()
    } catch {
      /* already gone */
    }
  }, [])

  const hangup = useCallback(async () => {
    const session = activeRef.current?.session
    activeRef.current = null
    setActive(null)
    await endSession(session)
  }, [])

  const call = useCallback(async (number, name = '') => {
    const wp = webPhoneRef.current
    const callee = toDialString(number)
    if (!wp || !callee) {
      if (wp) setError('Enter the full number. For numbers outside the US/Canada, start with + and the country code (e.g. +92 343 0519849).')
      return false
    }
    if (activeRef.current) {
      // Prevents a second call going out while one is ringing (that second call comes back "busy").
      setError('Finish the current call before starting another.')
      return false
    }
    setError('')
    const id = `out-${Date.now()}`
    // RingCentral fires outboundCall synchronously, so activeRef is set before this returns.
    wp.once('outboundCall', (session) => trackActive(session, { id, number: callee, name, direction: 'OUTBOUND', state: 'calling', startedAt: Date.now() }))
    wp.call(callee, callerIdRef.current ? toDialString(callerIdRef.current) || undefined : undefined)
      .then((session) => {
        // RingCentral can refuse the INVITE outright (403) without a "failed" event.
        if (session && !['answered', 'disposed', 'failed', 'ringing'].includes(session.state) && activeRef.current?.id === id) {
          setError(callFailureText('SIP/2.0 403 Forbidden'))
          activeRef.current = null
          setActive(null)
          endSession(session)
        }
      })
      .catch((err) => {
        setError(err?.message || 'The call could not be placed.')
      })
    return true
  }, [trackActive])

  const toggleMute = useCallback(async () => {
    const s = activeRef.current?.session
    if (!s) return
    const next = !active?.muted
    try {
      if (next) await s.mute()
      else await s.unmute()
      setActive((a) => (a ? { ...a, muted: next } : a))
    } catch {
      /* ignore */
    }
  }, [active])

  const toggleHold = useCallback(async () => {
    const s = activeRef.current?.session
    if (!s) return
    const next = !active?.held
    try {
      if (next) await s.hold()
      else await s.unhold()
      setActive((a) => (a ? { ...a, held: next } : a))
    } catch {
      /* ignore */
    }
  }, [active])

  const sendDtmf = useCallback(async (digit) => {
    try {
      await activeRef.current?.session?.sendDtmf(digit)
    } catch {
      /* ignore */
    }
  }, [])

  /* ─── Connect / disconnect (OAuth popup) ───────────────────────────── */
  const connect = useCallback(async () => {
    setError('')
    const popup = window.open('', 'utessa-ringcentral', 'width=520,height=720')
    try {
      const { url } = await crm.rcAuthorizeUrl()
      if (popup) popup.location.href = url
      else window.location.href = url
    } catch (err) {
      popup?.close()
      setError(err.message)
      return { ok: false, message: err.message }
    }
    return new Promise((resolve) => {
      const done = (result) => {
        window.removeEventListener('message', onMessage)
        clearInterval(poll)
        reload().then(() => resolve(result))
      }
      const onMessage = (e) => {
        if (e.origin !== API_ORIGIN || e.data?.type !== 'utessa-ringcentral') return
        done({ ok: Boolean(e.data.ok), message: e.data.message })
      }
      window.addEventListener('message', onMessage)
      const poll = setInterval(() => {
        if (popup && popup.closed) done({ ok: null, message: '' })
      }, 800)
    })
  }, [reload])

  const disconnect = useCallback(async () => {
    await stopPhone()
    await crm.rcDisconnect()
    await reload()
  }, [reload, stopPhone])

  const value = useMemo(() => ({
    enabled: Boolean(enabled),
    status,
    phase,
    ready: phase === 'ready',
    error,
    incoming,
    active,
    answer,
    decline,
    toVoicemail,
    hangup,
    call,
    toggleMute,
    toggleHold,
    sendDtmf,
    connect,
    disconnect,
    reload,
  }), [enabled, status, phase, error, incoming, active, answer, decline, toVoicemail, hangup, call, toggleMute, toggleHold, sendDtmf, connect, disconnect, reload])

  return (
    <PhoneCtx.Provider value={value}>
      {children}
      {enabled && <PhoneOverlay phone={value} notice={notice} onCloseNotice={() => setNotice(null)} />}
    </PhoneCtx.Provider>
  )
}

/* ─── Floating incoming-call card, live-call bar and missed-call notice ── */
function PhoneOverlay({ phone, notice, onCloseNotice }) {
  const location = useLocation()
  const navigate = useNavigate()
  const onCallDesk = location.pathname.startsWith('/app/crm/call-desk')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!phone.active) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [phone.active])

  const inc = phone.incoming
  const act = phone.active
  const match = inc?.lookup?.matches?.[0]?.patient

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[75] flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-3">
      {notice?.kind === 'missed' && (
        <div className="pointer-events-auto flex items-start gap-3 rounded-[14px] border border-danger-200 bg-white p-3.5 shadow-[0_18px_50px_rgba(16,19,46,0.16)]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-100 text-danger-700">
            <Icon name="phoneMissed" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13.5px] font-semibold text-navy">Missed call</p>
            <p className="m-0 text-[12.5px] text-mist-600">
              {notice.name || formatPhone(notice.number) || 'Unknown caller'} · logged with a call-back task. The auto-text goes out if it’s turned on.
            </p>
          </div>
          <button type="button" aria-label="Dismiss" onClick={onCloseNotice} className="text-mist-500 hover:text-navy">×</button>
        </div>
      )}

      {inc && !onCallDesk && (
        <section role="dialog" aria-label="Incoming call" className="pointer-events-auto rounded-[16px] border border-brand-100 bg-white p-4 shadow-[0_18px_50px_rgba(16,19,46,0.2)]">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-600/40" aria-hidden="true" />
              <Icon name="phoneIn" className="relative h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[12px] font-semibold text-brand-700">Incoming call · RingCentral</p>
              <p className="m-0 truncate font-mono text-[18px] font-medium text-navy">{formatPhone(inc.number) || 'Unknown number'}</p>
            </div>
            {match && (
              <button
                type="button"
                aria-label={`Open ${match.fullName}'s profile`}
                title="Open profile (the call keeps ringing)"
                onClick={() => navigate(`/app/crm/patients/${match.id}`)}
                className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full border border-mist-200 text-brand-700 transition hover:border-brand-600 hover:bg-brand-50"
              >
                <Icon name="arrowRight" className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-3 rounded-[10px] bg-mist-50 px-3 py-2.5 text-[13px]">
            {inc.looking ? (
              <span className="text-mist-600">Checking patients and leads…</span>
            ) : match ? (
              <>
                <span className={`mr-2 inline-block rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${match.lifecycleStage === 'PATIENT' ? 'bg-brand-50 text-brand-800' : 'bg-info-100 text-info-700'}`}>
                  {match.lifecycleStage === 'PATIENT' ? 'Existing patient' : 'Existing lead'}
                </span>
                <b className="text-navy">{match.fullName}</b>
                {inc.lookup.matches.length > 1 && <span className="text-mist-600"> +{inc.lookup.matches.length - 1} more on this number</span>}
              </>
            ) : (
              <span className="text-navy"><b>New number</b>{inc.name ? ` · ${inc.name}` : ''} — you can search for an existing patient after answering.</span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!(await phone.answer())) return
                // Existing patient/lead → straight to their profile; otherwise the Calls page for intake.
                const only = inc.lookup?.matches?.length === 1 ? inc.lookup.matches[0].patient : null
                navigate(only ? `/app/crm/patients/${only.id}` : `/app/crm/call-desk?phone=${encodeURIComponent(inc.number)}&direction=INBOUND&rc=1`)
              }}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-success-600 px-3 text-[13.5px] font-semibold text-white hover:bg-success-700"
            >
              <Icon name="phone" className="h-4 w-4" /> Answer
            </button>
            <button type="button" onClick={phone.toVoicemail} className="min-h-10 rounded-lg border border-mist-300 px-3 text-[13px] font-semibold text-navy hover:bg-mist-50">Voicemail</button>
            <button type="button" onClick={phone.decline} className="min-h-10 rounded-lg bg-danger-600 px-3 text-[13px] font-semibold text-white hover:bg-danger-700">Decline</button>
          </div>
        </section>
      )}

      {act && !onCallDesk && (
        <section aria-label="Current call" className="pointer-events-auto rounded-[14px] bg-brand-900 p-3 text-white shadow-[0_18px_50px_rgba(16,19,46,0.25)]">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${act.state === 'calling' || act.state === 'ringing' ? 'bg-sun-500' : 'bg-success-500'}`} />
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
              {act.state === 'calling' ? 'Calling' : act.state === 'ringing' ? 'Ringing' : 'On call'} · {act.name || formatPhone(act.number)}
            </span>
            <span className="font-mono text-[14px]">{fmtTimer(now - (act.connectedAt || act.startedAt))}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <OverlayBtn onClick={phone.toggleMute} active={act.muted}>{act.muted ? 'Unmute' : 'Mute'}</OverlayBtn>
            <OverlayBtn onClick={phone.toggleHold} active={act.held}>{act.held ? 'Resume' : 'Hold'}</OverlayBtn>
            <OverlayBtn onClick={() => navigate(`/app/crm/call-desk?phone=${encodeURIComponent(act.number)}&direction=${act.direction}&rc=1`)}>Open call desk</OverlayBtn>
            <button type="button" onClick={phone.hangup} className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-lg bg-danger-600 px-3 text-[12.5px] font-semibold hover:bg-danger-700">
              <Icon name="phone" className="h-3.5 w-3.5 rotate-[135deg]" /> End
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function OverlayBtn({ onClick, active, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-8 rounded-lg px-2.5 text-[12.5px] font-semibold ${active ? 'bg-white text-brand-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
    >
      {children}
    </button>
  )
}

export function fmtTimer(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
