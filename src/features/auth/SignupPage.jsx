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
  { value: 301, label: '300+' },
]

const INCLUDES = [
  { color: 'bg-cyan', title: 'CRM', text: 'Leads, call tracking, referrals' },
  { color: 'bg-lavender', title: 'Operations', text: 'Documents, vendor BAAs, audit log' },
  { color: 'bg-yellow', title: 'Marketing', text: 'Reviews, email, and texts' },
  { color: 'bg-teal', title: 'Time Clock', text: 'Timesheets and payroll export' },
]

const STRENGTH_LABELS = ['', 'Too short', 'Weak', 'Okay', 'Strong']

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
  const [showPassword, setShowPassword] = useState(false)
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
    if (error) setError('')
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
    <div className="min-h-screen lg:grid lg:h-screen lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] lg:overflow-hidden">
      <aside className="relative overflow-hidden bg-navy text-white lg:h-full">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 80% 10%, rgba(92,225,230,0.3), transparent 55%), radial-gradient(ellipse 55% 45% at 5% 85%, rgba(255,210,63,0.16), transparent 50%), linear-gradient(165deg, #12153a 0%, #1b1f4b 48%, #1a3a4a 100%)',
          }}
        />
        <div className="animate-mosaic pointer-events-none absolute -right-8 top-24 h-48 w-48 rounded-full bg-cyan/10 blur-3xl" />
        <div className="animate-mosaic pointer-events-none absolute bottom-16 left-6 h-40 w-40 rounded-full bg-yellow/10 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col px-6 py-7 sm:px-10 lg:px-12 lg:py-10">
          <Link to="/" className="animate-rise inline-flex w-fit items-center gap-3">
            <Logo className="h-9 w-9" />
            <Wordmark light />
          </Link>

          <div className="animate-rise-delay mt-8 max-w-md lg:mt-14">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lcyan">
              14-day free trial
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-[2.75rem]">
              Start with <span className="text-cyan">Utessa</span>
            </h1>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-lavender/90">
              One workspace for CRM, operations, outreach, and time — ready for practices that need clear tenant boundaries.
            </p>
          </div>

          <ul className="animate-rise-delay mt-8 hidden max-w-md space-y-3 lg:block">
            {INCLUDES.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className={`mt-1.5 h-3 w-3 shrink-0 rounded ${item.color}`} />
                <span>
                  <span className="font-semibold text-white">{item.title}</span>
                  <span className="text-lavender/75"> — {item.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="animate-rise-delay mt-7 flex flex-wrap gap-2 lg:mt-auto lg:pt-10">
            <span className="rounded-lg bg-yellow px-3 py-1.5 text-[12.5px] font-bold text-navy">
              No credit card
            </span>
            <span className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[12.5px] font-semibold text-lcyan">
              HIPAA-ready · BAA included
            </span>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-col bg-bg px-4 py-7 sm:px-8 lg:h-full lg:overflow-y-auto lg:px-12 lg:py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-muted">About a minute to set up</p>
          <p className="text-sm font-semibold text-navy">
            Have an account?{' '}
            <Link to="/login" className="text-teal underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <form
          className="animate-rise mx-auto w-full max-w-[560px] pb-4"
          onSubmit={onSubmit}
          noValidate
        >
          <header className="mb-6">
            <h2 className="text-[26px] font-extrabold tracking-tight text-navy sm:text-[30px]">
              Create your practice account
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
              All four services included. You choose what to keep when the trial ends.
            </p>
          </header>

          <section className="space-y-3.5">
            <SectionLabel>About you</SectionLabel>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Full name" htmlFor="fullName">
                <input
                  id="fullName"
                  className="field"
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  autoComplete="name"
                  autoFocus
                />
              </Field>
              <Field label="Work email" htmlFor="email">
                <input
                  id="email"
                  className="field"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  autoComplete="email"
                  placeholder="you@yourpractice.com"
                />
              </Field>
            </div>

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <input
                  id="password"
                  className="field pr-16"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-muted transition hover:text-navy"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
                  <i
                    className="block h-full rounded-full transition-all duration-300"
                    style={{
                      width: form.password ? `${Math.max(strength, 1) * 25}%` : 0,
                      background: meterColor,
                    }}
                  />
                </div>
                <span className="min-w-[4.5rem] text-right text-[12px] font-semibold text-muted">
                  {form.password ? STRENGTH_LABELS[Math.max(strength, 1)] : '12+ chars'}
                </span>
              </div>
            </Field>
          </section>

          <section className="mt-6 space-y-3.5">
            <SectionLabel>Your practice</SectionLabel>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Practice name" htmlFor="organizationName">
                <input
                  id="organizationName"
                  className="field"
                  value={form.organizationName}
                  onChange={(e) => update('organizationName', e.target.value)}
                  autoComplete="organization"
                  placeholder="e.g. Riverside Family Clinic"
                />
              </Field>
              <Field label="Phone" hint="Optional" htmlFor="phone">
                <input
                  id="phone"
                  className="field"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  autoComplete="tel"
                  placeholder="For setup help"
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-[13.5px] font-semibold text-navy">
                Team size <span className="font-normal text-muted">(people who will log in)</span>
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Team size">
                {SIZE_OPTIONS.map((o) => {
                  const selected = String(form.teamSizeBand) === String(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => update('teamSizeBand', o.value)}
                      className={`rounded-xl border-[1.5px] px-2 py-2.5 text-[13.5px] font-semibold transition ${
                        selected
                          ? 'border-teal bg-[#E9FBFB] text-navy shadow-[0_0_0_3px_rgba(59,196,202,.28)]'
                          : 'border-line bg-white text-navy hover:border-teal/60'
                      }`}
                      aria-pressed={selected}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="mt-5 space-y-2.5 text-sm leading-snug text-navy">
            <label className="flex cursor-pointer gap-3 rounded-xl p-1">
              <input
                type="checkbox"
                className="mt-0.5 h-[17px] w-[17px] shrink-0 accent-navy"
                checked={form.termsAccepted}
                onChange={(e) => update('termsAccepted', e.target.checked)}
              />
              <span>
                I agree to the Terms of Service and Privacy Policy, and I&apos;m authorized to accept the Business Associate Agreement (BAA) on behalf of this practice.
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-xl p-1">
              <input
                type="checkbox"
                className="mt-0.5 h-[17px] w-[17px] shrink-0 accent-navy"
                checked={form.newsOptIn}
                onChange={(e) => update('newsOptIn', e.target.checked)}
              />
              <span>
                Send me product tips and updates by email.{' '}
                <span className="text-muted">(Optional)</span>
              </span>
            </label>
          </section>

          {error && (
            <p
              className="mt-4 rounded-xl border border-[#F3C1BC] bg-[#FFF5F4] px-3.5 py-3 text-[13.5px] font-semibold text-warn"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-yellow py-3.5 text-[15px] font-bold text-navy transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
          <p className="mt-3 text-center text-[13px] text-muted">
            No credit card required. Your organization stays private from day one.
          </p>
        </form>
      </main>

      <style>{`
        .field {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid var(--color-line);
          border-radius: 12px;
          font: inherit;
          font-size: 15px;
          background: #fff;
          color: var(--color-navy);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .field:hover {
          border-color: #c5cadc;
        }
        .field:focus-visible {
          outline: none;
          border-color: var(--color-teal);
          box-shadow: 0 0 0 4px rgba(59, 196, 202, 0.35);
        }
        .field::placeholder {
          color: #8b91ab;
        }
      `}</style>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted">
      {children}
    </p>
  )
}

function Field({ label, hint, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13.5px] font-semibold text-navy">
        {label} {hint && <span className="font-normal text-muted">({hint})</span>}
      </label>
      {children}
    </div>
  )
}
