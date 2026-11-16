import { useEffect, useMemo, useState } from 'react'

const BANDS = [
  { min: 1,   max: 10,  label: '1–10 users',    crm: 149,  ops: 99,   mkt: 149  },
  { min: 11,  max: 25,  label: '11–25 users',   crm: 349,  ops: 249,  mkt: 349  },
  { min: 26,  max: 40,  label: '26–40 users',   crm: 449,  ops: 349,  mkt: 449  },
  { min: 41,  max: 75,  label: '41–75 users',   crm: 649,  ops: 499,  mkt: 649  },
  { min: 76,  max: 150, label: '76–150 users',  crm: 999,  ops: 749,  mkt: 999  },
  { min: 151, max: 300, label: '151–300 users', crm: 1699, ops: 1149, mkt: 1699 }
]

const TC_RATE = 3
const TC_MIN = 30
const MONTHLY_UPLIFT = 0.15
const DISC = { 2: 0.10, 3: 0.15, 4: 0.20 }

const SIZE_OPTIONS = [
  { value: 5,   label: '1–10' },
  { value: 18,  label: '11–25' },
  { value: 33,  label: '26–40' },
  { value: 58,  label: '41–75' },
  { value: 113, label: '76–150' },
  { value: 225, label: '151–300' },
  { value: 301, label: '300+' },
]

const SVCS = [
  {
    id: 'crm',
    name: 'CRM',
    color: '#5CE1E6',
    desc: 'Patient leads, call tracking, referral CRM, pipelines and contact history.',
  },
  {
    id: 'ops',
    name: 'Operations',
    color: '#C9CDF2',
    desc: 'Documents, dashboard, vendor management with BAA flags, role-based access and audit log.',
  },
  {
    id: 'mkt',
    name: 'Marketing & Outreach',
    color: '#FFD23F',
    desc: 'Review requests and monitoring, email campaigns, social posting and text campaigns.',
  },
  {
    id: 'tc',
    name: 'Time Clock',
    color: '#3BC4CA',
    desc: 'Clock in and out, timesheets, mobile app and payroll export.',
  },
]

function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function findBand(users) {
  for (let i = 0; i < BANDS.length; i++) {
    if (users >= BANDS[i].min && users <= BANDS[i].max) return BANDS[i]
  }
  return null
}

export default function PricingModal({ isOpen, onClose, defaultSizeBand }) {
  const [selectedSvcs, setSelectedSvcs] = useState(['crm', 'ops'])
  const [sizeBand, setSizeBand] = useState(defaultSizeBand ?? 5)
  const [staff, setStaff] = useState(10)
  const [billing, setBilling] = useState('annual') // 'annual' | 'monthly'
  const [showPromo, setShowPromo] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [step, setStep] = useState('choose') // 'choose' | 'checkout' | 'done'
  const [autoRenew, setAutoRenew] = useState(false)

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('choose')
      setAutoRenew(false)
    }
  }, [isOpen])

  const toggleSvc = (id) => {
    setSelectedSvcs((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  // Quote calculation
  const quote = useMemo(() => {
    const isCustom = sizeBand > 300
    const b = findBand(sizeBand)
    const lines = []
    let list = 0

    if (b && selectedSvcs.length && !isCustom) {
      selectedSvcs.forEach((s) => {
        const each = s === 'tc' ? Math.max(TC_MIN, TC_RATE * staff) : b[s]
        const amt = each
        const svcMeta = SVCS.find((x) => x.id === s)
        lines.push({
          key: s,
          name: svcMeta?.name || s,
          color: svcMeta?.color || '#5CE1E6',
          amount: amt,
          note: s === 'tc' ? `${staff} staff` : b.label,
        })
        list += amt
      })
    }

    const disc = DISC[selectedSvcs.length] || 0
    const net = list * (1 - disc) * (billing === 'monthly' ? 1 + MONTHLY_UPLIFT : 1)
    const bandLabel = SIZE_OPTIONS.find(o => o.value === sizeBand)?.label || b?.label || ''

    return { b, lines, list, disc, net, isCustom, bandLabel }
  }, [sizeBand, staff, selectedSvcs, billing])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-3 backdrop-blur-sm sm:p-5 font-sans text-[#171d39]">
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-[#e0e2e9] bg-[#f6f7fb] px-6 py-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#007f9b]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h12l4 5.5L12 21 2 9.5 6 4z" />
              <path d="M2 9.5h20" />
              <path d="M10 4l-2.5 5.5L12 21l4.5-11.5L14 4" />
            </svg>
            <h2 className="text-base font-bold text-[#1B1F4B]">Utessa Plans & Pricing</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#687699] transition hover:bg-[#ebedf5] hover:text-[#171d39]"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        {step === 'choose' && (
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_310px]">
            {/* Left: configuration form */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold tracking-tight text-[#171d39]">Choose your plan</h3>
                <p className="mt-0.5 text-xs text-[#687699]">
                  Select the services you need. Your practice setup, data, and users stay exactly as they are.
                </p>
              </div>

              {/* Service tiles */}
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#687699]">Services</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {SVCS.map((svc) => {
                    const isSelected = selectedSvcs.includes(svc.id)
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleSvc(svc.id)}
                        className={`group relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                          isSelected
                            ? 'border-[#007f9b] bg-[#f0fafb] ring-1 ring-[#007f9b]'
                            : 'border-[#dfe3ec] bg-white hover:border-[#b0b8cb]'
                        }`}
                      >
                        <span
                          className="h-7 w-7 shrink-0 rounded-lg opacity-80"
                          style={{ backgroundColor: svc.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[13.5px] font-semibold text-[#171d39]">{svc.name}</span>
                            <span
                              className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[11px] font-bold ${
                                isSelected ? 'bg-[#007f9b] text-white' : 'border border-[#d0d4de] text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#687699]">{svc.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {selectedSvcs.length >= 2 && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#b2e5ea] bg-[#eefafb] px-3 py-2 text-xs font-semibold text-[#007f9b]">
                    <span>✓</span>
                    Bundle discount: {Math.round(quote.disc * 100)}% off for {selectedSvcs.length} services.
                  </div>
                )}
              </div>

              {/* Size configuration */}
              <div className="border-t border-[#edf0f6] pt-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#687699]">Practice Size</h4>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#4a567d]">Number of users</label>
                  <select
                    value={sizeBand}
                    onChange={(e) => setSizeBand(Number(e.target.value))}
                    className="h-9 w-full rounded-lg border border-[#d0d4de] bg-white px-3 text-sm font-semibold text-[#171d39] outline-none focus:border-[#007f9b] focus:ring-1 focus:ring-[#007f9b]"
                  >
                    {SIZE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label} users</option>
                    ))}
                  </select>
                </div>

                {selectedSvcs.includes('tc') && (
                  <div className="mt-3 max-w-[220px]">
                    <label className="mb-1 block text-xs font-semibold text-[#4a567d]">
                      Staff who clock in <span className="font-normal text-[#9aaac8]">(Time Clock)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={staff}
                      onChange={(e) => setStaff(Math.max(1, parseInt(e.target.value) || 0))}
                      className="h-9 w-full rounded-lg border border-[#d0d4de] bg-white px-3 text-sm font-semibold text-[#171d39] outline-none focus:border-[#007f9b] focus:ring-1 focus:ring-[#007f9b]"
                    />
                  </div>
                )}
              </div>

              {/* Billing Toggle */}
              <div className="border-t border-[#edf0f6] pt-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#687699]">Billing Cycle</h4>
                <div className="inline-flex rounded-xl border border-[#dfe3ec] bg-[#f4f6fa] p-1">
                  <button
                    type="button"
                    onClick={() => setBilling('annual')}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                      billing === 'annual' ? 'bg-white text-[#171d39] shadow-sm' : 'text-[#687699] hover:text-[#171d39]'
                    }`}
                  >
                    Annual, save 13%
                  </button>
                  <button
                    type="button"
                    onClick={() => setBilling('monthly')}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                      billing === 'monthly' ? 'bg-white text-[#171d39] shadow-sm' : 'text-[#687699] hover:text-[#171d39]'
                    }`}
                  >
                    Monthly
                  </button>
                </div>

                {/* Breakdown line items */}
                <div className="mt-4 overflow-hidden rounded-xl border border-[#dfe3ec]">
                  {quote.isCustom ? (
                    <div className="p-4 text-xs text-[#4a567d]">
                      Organizations with more than 300 users receive custom volume pricing, dedicated onboarding, and enterprise SLA.
                    </div>
                  ) : !selectedSvcs.length ? (
                    <div className="p-4 text-center text-xs text-[#9aaac8]">Please select at least one service above.</div>
                  ) : (
                    <div className="divide-y divide-[#edf0f6] text-xs">
                      {quote.lines.map((l) => (
                        <div key={l.key} className="flex items-center justify-between px-3.5 py-2.5">
                          <span className="flex items-center gap-2 font-medium text-[#171d39]">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                            {l.name} <span className="text-[#9aaac8]">· {l.note}</span>
                          </span>
                          <span className="font-semibold text-[#171d39]">{money(l.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between bg-[#fbfcfd] px-3.5 py-2 text-[#687699]">
                        <span>Subtotal</span>
                        <span>{money(quote.list)}</span>
                      </div>
                      {quote.disc > 0 && (
                        <div className="flex justify-between bg-[#fbfcfd] px-3.5 py-2 text-[#007f9b]">
                          <span>Bundle discount ({Math.round(quote.disc * 100)}%)</span>
                          <span>−{money(quote.list * quote.disc)}</span>
                        </div>
                      )}
                      {billing === 'monthly' && (
                        <div className="flex justify-between bg-[#fbfcfd] px-3.5 py-2 text-[#687699]">
                          <span>Monthly billing (+15%)</span>
                          <span>+{money(quote.net - quote.list * (1 - quote.disc))}</span>
                        </div>
                      )}
                      <div className="flex justify-between bg-[#f4f7fc] px-3.5 py-2.5 text-sm font-bold text-[#1B1F4B]">
                        <span>Total per month</span>
                        <span>{money(quote.net)}</span>
                      </div>
                      {billing === 'annual' && (
                        <div className="flex justify-between bg-[#fbfcfd] px-3.5 py-2 text-[11px] text-[#687699]">
                          <span>Billed annually</span>
                          <span>{money(quote.net * 12)} per year</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Promo code link */}
                <div className="mt-3">
                  {!showPromo ? (
                    <button
                      type="button"
                      onClick={() => setShowPromo(true)}
                      className="text-xs font-semibold text-[#007f9b] hover:underline"
                    >
                      Have a promo code?
                    </button>
                  ) : (
                    <div className="flex max-w-[280px] gap-2">
                      <input
                        type="text"
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="h-8 flex-1 rounded-lg border border-[#d0d4de] px-2.5 text-xs outline-none focus:border-[#007f9b]"
                      />
                      <button
                        type="button"
                        onClick={() => alert('Promo code applied successfully!')}
                        className="h-8 rounded-lg bg-[#007f9b] px-3 text-xs font-semibold text-white transition hover:bg-[#006e86]"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Estimate card */}
            <div className="flex flex-col justify-between rounded-2xl bg-white p-6 text-[#171d39] shadow-lg">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#B9BDE0]">Your estimate</h4>
                <div className="mt-2 text-4xl font-extrabold tracking-tight">
                  {quote.isCustom ? 'Custom' : money(quote.net)}
                </div>
                <div className="mt-1 text-xs text-[#B9BDE0]">
                  {quote.isCustom
                    ? 'quote from our enterprise team'
                    : quote.net
                    ? `per month · ${quote.bandLabel} users`
                    : 'per month'}
                </div>

                {/* Discount pill */}
                <div className="mt-4">
                  <span className="inline-block rounded-full bg-[#FFD23F] px-3 py-1 text-xs font-bold text-[#1B1F4B]">
                    {quote.disc > 0
                      ? `${Math.round(quote.disc * 100)}% bundle discount`
                      : selectedSvcs.length > 0
                      ? 'Add a service to save 10%'
                      : 'Add a service'}
                  </span>
                </div>

                {/* Divider */}
                <div className="my-5 h-px bg-white/15" />

                {/* Mosaic tiles */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-[#171d39]">Included services:</p>
                  <div className="flex gap-2">
                    {SVCS.map((s) => {
                      const active = selectedSvcs.includes(s.id)
                      return (
                        <div
                          key={s.id}
                          title={s.name}
                          className="h-8 w-8 rounded-lg transition-all"
                          style={{
                            backgroundColor: s.color,
                            opacity: active ? 1 : 0.15,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>

                <div className="my-5 h-px bg-white/15" />

                <p className="text-[11px] leading-relaxed text-[#171d39]">
                  Prices are per location. Time Clock is $3 per staff member, $30 minimum. Bundles save 10% (2 services), 15% (3) or 20% (4). Over 300 users, our team prepares a custom quote.
                </p>
              </div>

              {/* Bottom action button */}
              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  disabled={!selectedSvcs.length || quote.isCustom}
                  className="w-full rounded-xl bg-[#007f9b] py-2.5 text-center text-xs font-bold text-white shadow transition hover:bg-[#006e86] disabled:opacity-50"
                >
                  Continue to payment
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full text-center text-xs font-medium text-[#B9BDE0] hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checkout step */}
        {step === 'checkout' && (
          <div className="p-6">
            <h3 className="text-xl font-bold text-[#171d39]">Review and confirm</h3>
            <p className="mt-1 text-xs text-[#687699]">
              Confirm your subscription details. Your free trial remains active and you will not be charged until the trial ends.
            </p>

            <div className="mt-5 space-y-4 rounded-xl border border-[#dfe3ec] bg-[#fbfcfd] p-5 text-sm">
              <div className="flex justify-between border-b border-[#edf0f6] pb-3">
                <span className="text-[#687699]">Plan</span>
                <span className="font-semibold text-[#171d39]">
                  {selectedSvcs.map((s) => SVCS.find((x) => x.id === s)?.name).join(', ')} · {quote.b?.label}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#edf0f6] pb-3">
                <span className="text-[#687699]">First payment</span>
                <span className="font-semibold text-[#171d39]">
                  {money(billing === 'annual' ? quote.net * 12 : quote.net)} (when your 14-day trial ends)
                </span>
              </div>
              <div className="flex justify-between border-b border-[#edf0f6] pb-3">
                <span className="text-[#687699]">Renewal schedule</span>
                <span className="font-semibold text-[#171d39]">
                  {money(billing === 'annual' ? quote.net * 12 : quote.net)} {billing === 'annual' ? 'every year' : 'every month'}
                </span>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs text-[#4a567d]">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#d0d4de] text-[#007f9b] focus:ring-[#007f9b]"
              />
              <span>
                I agree that my subscription renews automatically {billing === 'annual' ? 'every year' : 'every month'} at{' '}
                <b>{money(billing === 'annual' ? quote.net * 12 : quote.net)}</b> until I cancel, and that I can cancel online at any time.
              </span>
            </label>

            <div className="mt-6 flex items-center justify-between border-t border-[#edf0f6] pt-4">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-xs font-semibold text-[#687699] hover:text-[#171d39]"
              >
                ← Back to plan
              </button>
              <button
                type="button"
                disabled={!autoRenew}
                onClick={() => setStep('done')}
                className="rounded-xl bg-[#007f9b] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#006e86] disabled:opacity-50"
              >
                Start subscription
              </button>
            </div>
          </div>
        )}

        {/* Done / Confirmation step */}
        {step === 'done' && (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e3faf2] text-2xl text-[#10a37f]">
              ✓
            </div>
            <h3 className="mt-4 text-2xl font-bold text-[#171d39]">You&apos;re all set!</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#687699]">
              Your subscription is confirmed. A receipt and confirmation with your plan details and billing schedule have been emailed to your practice account.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#007f9b] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#006e86]"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
