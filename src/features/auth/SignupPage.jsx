import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { Logo, Wordmark } from '../../shared/ui/Logo'

const SIZE_OPTIONS = [
  { value: 5, label: '1–10' },
  { value: 18, label: '11–25' },
  { value: 33, label: '26–40' },
  { value: 58, label: '41–75' },
  { value: 113, label: '76–150' },
  { value: 225, label: '151–300' },
  { value: 301, label: 'More than 300' },
]

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    organizationName: '',
    teamSizeBand: '',
    phone: '',
    termsAccepted: false,
    newsOptIn: false,
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const strength = useMemo(() => {
    const v = form.password
    let score = 0
    if (v.length >= 12) score++
    if (v.length >= 16) score++
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++
    if (/\d|[^A-Za-z0-9]/.test(v)) score++
    return score
  }, [form.password])

  const meterColor = ['#E4E7F2', '#B42318', '#D97706', '#3BC4CA', '#137A4B'][form.password ? Math.max(strength, 1) : 0]

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.fullName.trim()) return setError('Add your full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid work email.')
    if (form.password.length < 12) return setError('Use a password of at least 12 characters.')
    if (!form.organizationName.trim()) return setError('Add your practice name.')
    if (!form.teamSizeBand) return setError('Choose your team size.')
    if (!form.termsAccepted) return setError('Accept the terms and BAA to create your account.')

    setSubmitting(true)
    try {
      const res = await api('/api/v1/auth/signup', {
        method: 'POST',
        body: {
          ...form,
          teamSizeBand: Number(form.teamSizeBand),
        },
      })
      navigate('/verify', { state: { email: res.email, requiresDemo: res.requiresDemo } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto grid max-w-[1060px] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-panel)]">
          <div className="flex items-center gap-3 bg-navy px-6 py-4 text-white">
            <Logo className="h-10 w-10" />
            <Wordmark light />
            <span className="ml-auto text-sm font-semibold text-lcyan">
              Have an account? <Link to="/login" className="underline-offset-2 hover:underline">Sign in</Link>
            </span>
          </div>
          <form className="px-6 py-7 sm:px-8" onSubmit={onSubmit} noValidate>
            <h1 className="text-[26px] font-bold tracking-tight text-navy">Start your free 14-day trial</h1>
            <p className="mb-6 mt-1 text-[15px] leading-relaxed text-muted">
              No credit card required. All four services included. Takes about a minute.
            </p>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Full name">
                <input className="field" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} autoComplete="name" />
              </Field>
              <Field label="Work email">
                <input className="field" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" placeholder="you@yourpractice.com" />
              </Field>
            </div>

            <Field label="Password" className="mt-3.5">
              <input className="field" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} autoComplete="new-password" />
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-soft">
                <i className="block h-full transition-all" style={{ width: form.password ? `${Math.max(strength, 1) * 25}%` : 0, background: meterColor }} />
              </div>
              <p className="mt-1.5 text-[12.5px] text-muted">At least 12 characters. A short phrase works well.</p>
            </Field>

            <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
              <Field label="Practice name">
                <input className="field" value={form.organizationName} onChange={(e) => update('organizationName', e.target.value)} autoComplete="organization" placeholder="e.g. Riverside Family Clinic" />
              </Field>
              <Field label="Team size" hint="(people who will log in)">
                <select className="field" value={form.teamSizeBand} onChange={(e) => update('teamSizeBand', e.target.value)}>
                  <option value="">Choose…</option>
                  {SIZE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Phone" hint="(optional, for setup help)" className="mt-3.5 max-w-[330px]">
              <input className="field" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} autoComplete="tel" />
            </Field>

            <div className="mt-4 space-y-2.5 text-sm leading-snug text-navy">
              <label className="flex gap-2.5">
                <input type="checkbox" className="mt-0.5 h-[17px] w-[17px] accent-navy" checked={form.termsAccepted} onChange={(e) => update('termsAccepted', e.target.checked)} />
                <span>I agree to the Terms of Service and Privacy Policy, and I&apos;m authorized to accept the Business Associate Agreement (BAA) on behalf of this practice.</span>
              </label>
              <label className="flex gap-2.5">
                <input type="checkbox" className="mt-0.5 h-[17px] w-[17px] accent-navy" checked={form.newsOptIn} onChange={(e) => update('newsOptIn', e.target.checked)} />
                <span>Send me product tips and updates by email. <span className="text-muted">(Optional)</span></span>
              </label>
            </div>

            {error && <p className="mt-3 min-h-5 text-[13.5px] font-semibold text-warn" role="alert">{error}</p>}

            <button type="submit" disabled={submitting} className="mt-5 w-full rounded-xl bg-navy py-3.5 text-[15px] font-bold text-white transition hover:bg-[#2B3173] disabled:opacity-60">
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
            <p className="mt-3 text-center text-[13px] text-muted">Protected by bot detection. We never ask for a card to start a trial.</p>
          </form>
        </main>

        <aside className="h-fit rounded-[18px] bg-white p-6 shadow-[var(--shadow-panel)] lg:sticky lg:top-5">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.6px] text-muted">Your trial includes</h3>
          <p className="mt-1 text-[22px] font-extrabold leading-snug text-navy">Everything, free for 14 days</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <SideItem color="bg-cyan" title="CRM" text="leads, call tracking, referrals" />
            <SideItem color="bg-lavender" title="Operations" text="documents, vendor BAAs, audit log" />
            <SideItem color="bg-yellow" title="Marketing & Outreach" text="reviews, email, texts" />
            <SideItem color="bg-teal" title="Time Clock" text="timesheets and payroll export" />
          </ul>
          <span className="mt-4 inline-block rounded-lg bg-yellow px-2.5 py-1.5 text-[12.5px] font-bold text-navy">No credit card required</span>
          <div className="my-4 h-px bg-[#EEF1F8]" />
          <p className="text-[13px] leading-relaxed text-muted">
            Choose the services you want to keep when the trial ends. Your setup and data carry over. Plans start at $99 per month. HIPAA-ready, with a signed BAA.
          </p>
        </aside>
      </div>

      <style>{`
        .field { width: 100%; padding: 11px 13px; border: 1.5px solid #DCE0EE; border-radius: 10px; font: inherit; font-size: 15px; background: #fff; color: #1B1F4B; }
        .field:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(59,196,202,.45); border-color: #3BC4CA; }
      `}</style>
    </div>
  )
}

function Field({ label, hint, className = '', children }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[13.5px] font-semibold text-navy">
        {label} {hint && <span className="font-normal text-muted">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function SideItem({ color, title, text }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded ${color}`} />
      <span><b>{title}</b>: {text}</span>
    </li>
  )
}
