import { useEffect, useMemo, useRef, useState } from 'react'
import { billing, formatDate, formatMoney, LIVE_STATUSES, MODULE_INFO, newIdempotencyKey } from '../billing/billingApi'

/*
 * Plans & pricing. Prices come from the backend (GET /api/v1/billing/pricing, read from Stripe) —
 * nothing is hard-coded here. Without a subscription it starts Stripe Checkout; with one it
 * previews and applies a plan change on the existing subscription.
 */

const ORDER = ['crm', 'ops', 'mkt', 'tc']

export default function PricingModal({ isOpen, onClose, canManage = true }) {
  const [pricing, setPricing] = useState(null)
  const [sub, setSub] = useState(null)
  const [ent, setEnt] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [modules, setModules] = useState(['crm'])
  const [seats, setSeats] = useState(0)
  const [interval, setInterval] = useState('MONTHLY')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [done, setDone] = useState(null)
  // One key per user action; reused if the same action is retried.
  const keyRef = useRef({ action: null, key: null })

  const keyFor = (action) => {
    if (keyRef.current.action !== action) keyRef.current = { action, key: newIdempotencyKey() }
    return keyRef.current.key
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    let alive = true
    setError('')
    setPreview(null)
    setDone(null)
    setLoadError('')
    ;(async () => {
      try {
        const [p, e] = await Promise.all([billing.pricing(), billing.entitlements()])
        let s = null
        if (canManage) {
          try {
            s = await billing.subscription()
          } catch {
            s = null
          }
        }
        if (!alive) return
        setPricing(p)
        setEnt(e)
        setSub(s)
        const live = s && LIVE_STATUSES.includes(s.status) && s.items?.length
        if (live) {
          const current = s.items.filter((i) => i.key !== 'seat' && i.status !== 'SCHEDULED_ADD').map((i) => i.key)
          setModules(current.length ? current : ['crm'])
          setSeats(s.seats?.purchased ?? 0)
          setInterval(s.interval || 'MONTHLY')
        } else {
          setModules(['crm'])
          setSeats(Math.max(e?.members ?? 0, 0))
          setInterval('MONTHLY')
        }
      } catch (err) {
        if (alive) setLoadError(err.message || 'Could not load plans.')
      }
    })()
    return () => {
      alive = false
    }
  }, [isOpen, canManage])

  const hasSubscription = !!(sub && LIVE_STATUSES.includes(sub.status) && sub.items?.length)
  const members = ent?.members ?? 0
  const yearly = interval === 'YEARLY'
  const currency = pricing?.currency || 'usd'

  const quote = useMemo(() => {
    if (!pricing) return null
    const lines = ORDER.filter((k) => modules.includes(k)).map((k) => {
      const p = pricing.modules.find((m) => m.key === k)
      const price = yearly ? p.yearly : p.monthly
      return { key: k, name: MODULE_INFO[k]?.name || p.label, amount: price.amount, note: yearly ? 'per year' : 'per month' }
    })
    const seat = yearly ? pricing.seatYearly : pricing.seatMonthly
    if (seats > 0) lines.push({ key: 'seat', name: `Team members × ${seats}`, amount: seat.amount * seats, note: `${formatMoney(seat.amount, currency)} each` })
    const total = lines.reduce((s, l) => s + l.amount, 0)
    // What the same plan would cost on the other cycle, for the yearly saving hint.
    const monthlyTotal = ORDER.filter((k) => modules.includes(k))
      .reduce((s, k) => s + pricing.modules.find((m) => m.key === k).monthly.amount, 0) + pricing.seatMonthly.amount * seats
    const yearlyTotal = ORDER.filter((k) => modules.includes(k))
      .reduce((s, k) => s + pricing.modules.find((m) => m.key === k).yearly.amount, 0) + pricing.seatYearly.amount * seats
    return { lines, total, saving: Math.max(0, monthlyTotal * 12 - yearlyTotal) }
  }, [pricing, modules, seats, yearly, currency])

  if (!isOpen) return null

  const toggle = (k) => {
    setPreview(null)
    setModules((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }

  const change = { modules, seats, interval }

  async function startCheckout() {
    setBusy(true)
    setError('')
    try {
      const res = await billing.startCheckout(change, keyFor(`checkout:${JSON.stringify(change)}`))
      window.location.assign(res.checkoutUrl)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function runPreview() {
    setBusy(true)
    setError('')
    try {
      setPreview(await billing.preview(change))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmChange() {
    setBusy(true)
    setError('')
    const body = { ...change, previewToken: preview.previewToken }
    const key = keyFor(`change:${preview.previewToken}`)
    try {
      let res
      if (preview.changeType === 'INTERVAL') res = await billing.changeCycle({ interval, timing: preview.timing, previewToken: preview.previewToken }, key)
      else if (preview.changeType === 'DOWNGRADE') res = await billing.downgrade({ ...body, timing: preview.timing }, key)
      else res = await billing.upgrade(body, key)
      if (res.result === 'PAYMENT_REQUIRED' && res.paymentUrl) {
        setDone({ text: 'Your card needs attention. The change is applied as soon as the payment goes through.', url: res.paymentUrl })
      } else if (res.result === 'SCHEDULED') {
        setDone({ text: `Done — your plan changes on ${formatDate(res.effectiveAt)}. You keep everything until then.` })
      } else {
        setDone({ text: 'Your plan has been updated.' })
      }
      setPreview(null)
      if (res.subscription) setSub(res.subscription)
    } catch (err) {
      setError(err.message)
      if (err.status === 409) setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  const trialActive = ent?.trialActive
  const changed = hasSubscription && sub && (
    interval !== sub.interval
    || seats !== (sub.seats?.purchased ?? 0)
    || [...modules].sort().join() !== sub.items.filter((i) => i.key !== 'seat' && i.status !== 'SCHEDULED_ADD').map((i) => i.key).sort().join()
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-3 backdrop-blur-sm sm:p-5 font-sans text-ink-950" onClick={onClose}>
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Plans and pricing">
        <div className="flex items-center justify-between border-b border-mist-200 bg-mist-50 px-6 py-4">
          <h2 className="text-base font-bold text-ink-900">Utessa Plans & Pricing</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-mist-600 hover:bg-mist-100">✕</button>
        </div>

        {loadError && <p className="m-0 px-6 py-8 text-sm font-semibold text-danger-700">{loadError}</p>}
        {!loadError && !pricing && <p className="m-0 px-6 py-8 text-sm text-mist-600">Loading prices…</p>}

        {pricing && quote && (
          <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_320px]">
            {/* ── choose ── */}
            <div className="space-y-5 p-6">
              {trialActive && !hasSubscription && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] text-brand-900">
                  You're on the free trial until <b>{formatDate(ent.trialEndsAt)}</b> with every module. Pick your plan now —
                  you won't be charged until the trial ends.
                </div>
              )}
              {hasSubscription && (
                <div className="rounded-xl border border-mist-200 bg-mist-50 px-4 py-3 text-[13px] text-ink-800">
                  Current plan: <b>{sub.items.filter((i) => i.key !== 'seat').map((i) => MODULE_INFO[i.key]?.name || i.key).join(', ')}</b>
                  {' · '}{sub.seats?.purchased ?? 0} seat{(sub.seats?.purchased ?? 0) === 1 ? '' : 's'} · {sub.interval?.toLowerCase()}
                  {sub.status !== 'active' && sub.status !== 'trialing' ? ` · ${sub.status.replace('_', ' ')}` : ''}
                </div>
              )}

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist-500">Modules</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ORDER.map((k) => {
                    const p = pricing.modules.find((m) => m.key === k)
                    const on = modules.includes(k)
                    return (
                      <button key={k} type="button" onClick={() => toggle(k)} aria-pressed={on}
                        className={`rounded-xl border p-3 text-left transition ${on ? 'border-brand-500 bg-brand-50 shadow-[inset_0_0_0_1px_#1E8E94]' : 'border-mist-200 bg-white hover:border-mist-300'}`}>
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: MODULE_INFO[k].color }} />
                            {MODULE_INFO[k].name}
                          </span>
                          <span className="text-[13px] font-semibold text-ink-800">
                            {formatMoney(yearly ? p.yearly.amount : p.monthly.amount, currency)}<span className="font-normal text-mist-500">/{yearly ? 'yr' : 'mo'}</span>
                          </span>
                        </span>
                        <span className="mt-1 block text-[12px] leading-snug text-mist-600">{MODULE_INFO[k].desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist-500">Team members</h4>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Fewer seats" onClick={() => { setPreview(null); setSeats((s) => Math.max(members, s - 1)) }} className="h-9 w-9 rounded-lg border border-mist-300 text-lg">−</button>
                    <input type="number" min={members} max={10000} value={seats} aria-label="Paid team member seats"
                      onChange={(e) => { setPreview(null); setSeats(Math.max(0, Math.min(10000, Number(e.target.value) || 0))) }}
                      className="h-9 w-20 rounded-lg border border-mist-300 text-center text-[15px] font-semibold" />
                    <button type="button" aria-label="More seats" onClick={() => { setPreview(null); setSeats((s) => s + 1) }} className="h-9 w-9 rounded-lg border border-mist-300 text-lg">+</button>
                  </div>
                  <p className="m-0 mt-1.5 text-[12px] text-mist-600">
                    {formatMoney(yearly ? pricing.seatYearly.amount : pricing.seatMonthly.amount, currency)} per member / {yearly ? 'year' : 'month'}. The owner is free.
                    {members > 0 ? ` You have ${members} team member${members === 1 ? '' : 's'} now.` : ''}
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist-500">Billing cycle</h4>
                  <div className="inline-flex rounded-lg border border-mist-300 p-0.5">
                    {['MONTHLY', 'YEARLY'].map((v) => (
                      <button key={v} type="button" onClick={() => { setPreview(null); setInterval(v) }}
                        className={`rounded-md px-3 py-1.5 text-[13px] font-semibold ${interval === v ? 'bg-brand-600 text-white' : 'text-ink-700'}`}>
                        {v === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                      </button>
                    ))}
                  </div>
                  {quote.saving > 0 && <p className="m-0 mt-1.5 text-[12px] font-semibold text-brand-800">Yearly saves {formatMoney(quote.saving, currency)} a year.</p>}
                </div>
              </div>
            </div>

            {/* ── summary ── */}
            <div className="flex flex-col border-t border-mist-200 bg-navy p-6 text-white md:border-l md:border-t-0">
              <h4 className="m-0 text-xs font-semibold uppercase tracking-wide text-iris-200">Your plan</h4>
              <ul className="m-0 mt-3 list-none space-y-2 p-0">
                {quote.lines.map((l) => (
                  <li key={l.key} className="flex justify-between gap-3 text-[13.5px]">
                    <span>{l.name}<span className="block text-[11.5px] text-white/60">{l.note}</span></span>
                    <span className="font-semibold">{formatMoney(l.amount, currency)}</span>
                  </li>
                ))}
                {quote.lines.length === 0 && <li className="text-[13px] text-white/70">Choose at least one module.</li>}
              </ul>
              <div className="mt-4 border-t border-white/15 pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-white/80">Total</span>
                  <span className="text-2xl font-bold">{formatMoney(quote.total, currency)}<span className="text-sm font-normal text-white/70">/{yearly ? 'yr' : 'mo'}</span></span>
                </div>
                {trialActive && !hasSubscription && <p className="m-0 mt-1 text-[12px] text-white/70">First charge on {formatDate(ent.trialEndsAt)}.</p>}
              </div>

              {preview && (
                <div className="mt-4 rounded-xl bg-white/10 p-3 text-[12.5px]">
                  <p className="m-0 font-semibold">
                    {preview.timing === 'IMMEDIATE'
                      ? `Due now: ${formatMoney(preview.amountDueNow.amount, preview.amountDueNow.currency)}`
                      : `Takes effect ${formatDate(preview.effectiveAt)} — nothing charged now`}
                  </p>
                  {preview.lines?.length > 0 && (
                    <ul className="m-0 mt-2 list-none space-y-1 p-0 text-white/80">
                      {preview.lines.map((l, i) => (
                        <li key={i} className="flex justify-between gap-2"><span className="min-w-0">{l.description}</span><span className="shrink-0">{formatMoney(l.amount.amount, l.amount.currency)}</span></li>
                      ))}
                    </ul>
                  )}
                  <p className="m-0 mt-2 text-white/70">Next invoice: {formatMoney(preview.nextInvoiceAmount.amount, preview.nextInvoiceAmount.currency)}{preview.nextInvoiceAt ? ` on ${formatDate(preview.nextInvoiceAt)}` : ''}</p>
                </div>
              )}
              {done && (
                <div className="mt-4 rounded-xl bg-white/10 p-3 text-[12.5px]">
                  {done.text} {done.url && <a href={done.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-200 underline">Complete payment</a>}
                </div>
              )}
              {error && <p role="alert" className="m-0 mt-3 rounded-lg bg-danger-600/20 px-3 py-2 text-[12.5px] font-semibold text-white">{error}</p>}

              <div className="mt-auto space-y-2 pt-5">
                {!canManage ? (
                  <p className="m-0 text-[12.5px] text-white/75">Only the practice owner or an admin can change the plan.</p>
                ) : !hasSubscription ? (
                  <button type="button" disabled={busy || modules.length === 0} onClick={startCheckout}
                    className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-400 disabled:opacity-50">
                    {busy ? 'Opening secure checkout…' : 'Continue to secure checkout'}
                  </button>
                ) : preview ? (
                  <button type="button" disabled={busy} onClick={confirmChange}
                    className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-400 disabled:opacity-50">
                    {busy ? 'Applying…' : preview.timing === 'IMMEDIATE' && preview.amountDueNow.amount > 0 ? `Confirm and pay ${formatMoney(preview.amountDueNow.amount, preview.amountDueNow.currency)}` : 'Confirm change'}
                  </button>
                ) : (
                  <button type="button" disabled={busy || !changed || modules.length === 0} onClick={runPreview}
                    className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-400 disabled:opacity-50">
                    {busy ? 'Calculating…' : changed ? 'Preview change' : 'This is your current plan'}
                  </button>
                )}
                <button type="button" onClick={onClose} className="w-full rounded-lg px-4 py-2 text-[13px] font-semibold text-white/80 hover:bg-white/10">Close</button>
                <p className="m-0 text-center text-[11px] text-white/55">Payments are processed securely by Stripe.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
