import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { Alert, Button, Card, Loading, PageHeader, Pill } from '../crm/ui'
import PricingModal from '../dashboard/PricingModal'
import { billing, formatDate, formatMoney, LIVE_STATUSES, MODULE_INFO, newIdempotencyKey } from './billingApi'

const STATE_TEXT = {
  TRIAL: ['Free trial', 'teal'],
  ACTIVE: ['Active', 'green'],
  PAST_DUE: ['Payment overdue', 'amber'],
  RESTRICTED: ['Paused — payment needed', 'red'],
  INACTIVE: ['No active plan', 'gray'],
}

/** /app/billing — plan, payment status, invoices; also where Stripe Checkout returns to. */
export default function BillingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const canManage = ['OWNER', 'ADMIN'].includes(String(user?.role || '').toUpperCase())
  const [ent, setEnt] = useState(null)
  const [sub, setSub] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [plansOpen, setPlansOpen] = useState(false)
  const keys = useRef({})

  const load = useCallback(async () => {
    try {
      setEnt(await billing.entitlements())
      if (canManage) {
        const [s, inv] = await Promise.all([billing.subscription(), billing.invoices()])
        setSub(s)
        setInvoices(inv)
      }
    } catch (err) {
      setError(err.message)
    }
  }, [canManage])

  // Coming back from Stripe Checkout: confirm with the server (never trust the redirect alone).
  useEffect(() => {
    const status = params.get('checkout')
    const sessionId = params.get('session_id')
    if (status === 'cancelled') {
      setNotice('Checkout was cancelled — nothing was charged.')
      setParams({}, { replace: true })
    } else if (status === 'success' && sessionId) {
      setNotice('Confirming your subscription with Stripe…')
      billing.checkoutStatus(sessionId)
        .then((r) => {
          setNotice(r.status === 'complete' ? 'Your subscription is set up. Thank you!' : 'Checkout is not completed yet.')
          setParams({}, { replace: true })
          load()
        })
        .catch((err) => setError(err.message))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (name, fn) => {
    setBusy(true)
    setError('')
    keys.current[name] = keys.current[name] || newIdempotencyKey()
    try {
      await fn(keys.current[name])
      delete keys.current[name]
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!ent && !error) return <Loading />
  const [stateLabel, tone] = STATE_TEXT[ent?.state] || ['—', 'gray']
  const live = sub && LIVE_STATUSES.includes(sub.status) && sub.items?.length > 0

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Your plan, payments and invoices. Payments are processed securely by Stripe."
        actions={canManage && <Button onClick={() => setPlansOpen(true)}>{live ? 'Change plan' : 'Choose a plan'}</Button>}
      />
      {notice && <div className="mb-3"><Alert tone="info">{notice}</Alert></div>}
      <Alert>{error}</Alert>

      {ent && (
        <div className="mb-4 grid gap-3 lg:grid-cols-3">
          <Card title="Status">
            <Pill tone={tone}>{stateLabel}</Pill>
            <p className="m-0 mt-2 text-[13px] text-mist-700">
              {ent.state === 'TRIAL' && <>Free trial until <b>{formatDate(ent.trialEndsAt)}</b> — every module included.</>}
              {ent.state === 'ACTIVE' && (ent.cancellationScheduled ? <>Cancels on <b>{formatDate(ent.accessEndsAt)}</b>.</> : 'Everything is paid up.')}
              {ent.state === 'PAST_DUE' && <>We couldn't collect the last payment. Update your card before <b>{formatDate(ent.gracePeriodEndsAt)}</b> to keep access.</>}
              {ent.state === 'RESTRICTED' && 'Modules are paused until the overdue invoice is paid. Your data is safe.'}
              {ent.state === 'INACTIVE' && 'Choose a plan to use the modules again. Your data is safe.'}
            </p>
          </Card>
          <Card title="Modules you can use">
            <div className="flex flex-wrap gap-1.5">
              {ent.modules.length ? ent.modules.map((m) => <Pill key={m} tone="blue">{MODULE_INFO[m]?.name || m}</Pill>) : <span className="text-[13px] text-mist-600">None right now</span>}
            </div>
          </Card>
          <Card title="Team members">
            <p className="m-0 text-[22px] font-bold text-navy">{ent.members}<span className="text-[14px] font-normal text-mist-600"> of {ent.maxMembers} {ent.state === 'TRIAL' ? '(trial limit)' : 'seats'}</span></p>
            <p className="m-0 mt-1 text-[12px] text-mist-600">The owner doesn't use a seat.</p>
          </Card>
        </div>
      )}

      {canManage && live && (
        <Card title="Current plan" className="mb-4"
          actions={(
            <span className="flex gap-2">
              {sub.scheduledChangeAt && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act('cancelScheduled', billing.cancelScheduledChange)}>Undo booked change</Button>}
              {sub.cancelAtPeriodEnd
                ? <Button size="sm" disabled={busy} onClick={() => act('reactivate', billing.reactivate)}>Keep my subscription</Button>
                : <Button size="sm" variant="ghost" disabled={busy} onClick={() => { if (window.confirm('Cancel at the end of the current period? You keep access until then.')) act('cancel', (k) => billing.cancel('PERIOD_END', k)) }}>Cancel subscription</Button>}
            </span>
          )}>
          <ul className="m-0 list-none divide-y divide-mist-100 p-0">
            {sub.items.map((i, idx) => (
              <li key={idx} className="flex items-center justify-between py-2 text-[13.5px]">
                <span>
                  {i.key === 'seat' ? `Team members × ${i.quantity}` : MODULE_INFO[i.key]?.name || i.label}
                  {i.status === 'SCHEDULED_REMOVAL' && <Pill tone="amber" className="ml-2">Ends {formatDate(sub.scheduledChangeAt)}</Pill>}
                  {i.status === 'SCHEDULED_ADD' && <Pill tone="blue" className="ml-2">From {formatDate(sub.scheduledChangeAt)}</Pill>}
                </span>
                <span className="font-mono">{formatMoney(i.unitPrice.amount * i.quantity, i.unitPrice.currency)}/{i.interval === 'YEARLY' ? 'yr' : 'mo'}</span>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-2 text-[12.5px] text-mist-600">
            {sub.status === 'trialing' ? `First charge on ${formatDate(sub.trial?.endsAt)}.` : sub.currentPeriodEnd ? `Renews on ${formatDate(sub.currentPeriodEnd)}.` : ''}
          </p>
        </Card>
      )}

      {canManage && invoices.length > 0 && (
        <Card title="Invoices" bodyClassName="p-0">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead><tr className="text-[12px] text-mist-600">{['Date', 'Number', 'Amount', 'Status', ''].map((h) => <th key={h} className="border-b border-mist-200 px-4 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {invoices.map((inv, idx) => (
                <tr key={idx}>
                  <td className="border-b border-mist-100 px-4 py-2">{formatDate(inv.createdAt)}</td>
                  <td className="border-b border-mist-100 px-4 py-2 font-mono">{inv.number || '—'}</td>
                  <td className="border-b border-mist-100 px-4 py-2 font-mono">{formatMoney(inv.amountDue.amount, inv.amountDue.currency)}</td>
                  <td className="border-b border-mist-100 px-4 py-2"><Pill tone={inv.status === 'paid' ? 'green' : inv.status === 'open' ? 'amber' : 'gray'}>{inv.status}</Pill></td>
                  <td className="border-b border-mist-100 px-4 py-2 text-right">
                    {inv.status === 'open' && inv.hostedInvoiceUrl && <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="mr-3 font-semibold text-brand-700">Pay</a>}
                    {inv.invoicePdfUrl && <a href={inv.invoicePdfUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700">PDF</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {!canManage && <p className="text-[13px] text-mist-600">Only the practice owner or an admin can change billing.</p>}

      <PricingModal isOpen={plansOpen} canManage={canManage} onClose={() => { setPlansOpen(false); load() }} />
      <button type="button" className="sr-only" onClick={() => navigate('/app')}>Back to dashboard</button>
    </div>
  )
}
