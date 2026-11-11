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
  { color: 'bg-[#53e4d4]', title: 'CRM', text: 'Leads, tracking, referrals, and outreach' },
  { color: 'bg-[#ffca5c]', title: 'Ops', text: 'Documents, BAAs, and audit controls' },
  { color: 'bg-[#9b96ff]', title: 'Marketing', text: 'Reviews, email, and text automation' },
  { color: 'bg-[#2ec4b6]', title: 'Time clock', text: 'Scheduling, timesheets, and payroll' },
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

  const meterColor = ['#E4E7F2', '#D95050', '#E6A02F', '#3CC9C1', '#1E8C68'][form.password ? Math.max(strength, 1) : 0]

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
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(83,228,212,0.18),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(247,199,90,0.14),_transparent_18%),linear-gradient(135deg,#f5f8ff_0%,#eef2fb_40%,#ecfaf8_100%)] text-navy">
      <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
        <aside className="relative flex min-h-[260px] w-full overflow-hidden bg-[#0b1020] text-white lg:min-h-screen lg:w-[46%] lg:flex-none">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 78% 12%, rgba(83,228,212,0.3), transparent 18%), radial-gradient(circle at 12% 86%, rgba(247,199,90,0.14), transparent 20%), linear-gradient(140deg, #0b1020 0%, #121a33 38%, #0d2335 100%)',
            }}
          />
          <div className="animate-pulse-soft pointer-events-none absolute -right-10 top-20 h-52 w-52 rounded-full bg-[#53e4d4]/10 blur-3xl" />
          <div className="animate-pulse-soft pointer-events-none absolute bottom-4 left-6 h-48 w-48 rounded-full bg-[#f7c75a]/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between px-6 py-7 sm:px-8 lg:px-10 xl:px-12">
            <Link to="/" className="animate-rise inline-flex w-fit items-center gap-3">
              <Logo className="h-9 w-9" />
              <Wordmark light />
            </Link>

            <div className="animate-rise-delay max-w-lg py-4 lg:py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9ceee8]">14-day free trial</p>
              <h1 className="mt-3 text-4xl font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-[3.1rem]">
                Start with <span className="text-[#53e4d4]">Utessa</span>
              </h1>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#dbe3ff]/85">
                One workspace for CRM, operations, outreach, and time — built for teams that want clarity, speed, and control.
              </p>
            </div>

            <div className="animate-rise-delay space-y-2.5">
              {INCLUDES.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-[2px]">
                  <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${item.color}`} />
                  <div>
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-sm text-[#dce3ff]/75">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex w-full flex-1 items-center justify-center overflow-y-auto bg-[#f6f8fc] px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
          <div className="w-full max-w-[650px] py-1">
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="inline-flex items-center rounded-full border border-[#dfe6f6] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#58637e]">
                About a minute to set up
              </span>
              <p className="text-sm font-semibold text-navy">
                Have an account?{' '}
                <Link to="/login" className="text-[#1c8f8e] underline-offset-2 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>

            <form
              className="animate-rise rounded-[30px] border border-[#edf1fa] bg-white p-4 shadow-[0_28px_70px_rgba(14,23,49,0.1)] sm:p-5"
              onSubmit={onSubmit}
              noValidate
            >
              <header className="mb-5">
                <h2 className="text-[26px] font-black tracking-[-0.05em] text-[#171d39] sm:text-[30px]">
                  Create your practice account
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-[#5a6582]">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#5a6582] transition hover:text-[#171d39]"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#edf2ff]">
                      <i
                        className="block h-full rounded-full transition-all duration-300"
                        style={{
                          width: form.password ? `${Math.max(strength, 1) * 25}%` : 0,
                          background: meterColor,
                        }}
                      />
                    </div>
                    <span className="min-w-[4.5rem] text-right text-[12px] font-semibold text-[#5a6582]">
                      {form.password ? STRENGTH_LABELS[Math.max(strength, 1)] : '12+ chars'}
                    </span>
                  </div>
                </Field>
              </section>

              <section className="mt-5 space-y-3.5">
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
                  <p className="mb-2 text-[13.5px] font-semibold text-[#1d2448]">
                    Team size <span className="font-normal text-[#5a6582]">(people who will log in)</span>
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
                              ? 'border-[#2ec4b6] bg-[#eafaf9] text-[#171d39] shadow-[0_0_0_3px_rgba(46,196,182,.22)]'
                              : 'border-[#dfe6f7] bg-white text-[#171d39] hover:border-[#9ecfd8]'
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

              <section className="mt-4 space-y-2 text-sm leading-snug text-[#171d39]">
                <label className="flex cursor-pointer gap-3 rounded-xl p-1">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-[17px] w-[17px] shrink-0 accent-[#1d2448]"
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
                    className="mt-0.5 h-[17px] w-[17px] shrink-0 accent-[#1d2448]"
                    checked={form.newsOptIn}
                    onChange={(e) => update('newsOptIn', e.target.checked)}
                  />
                  <span>
                    Send me product tips and updates by email. <span className="text-[#5a6582]">(Optional)</span>
                  </span>
                </label>
              </section>

              {error && (
                <p
                  className="mt-4 rounded-xl border border-[#f2c9c9] bg-[#fff4f4] px-3.5 py-3 text-[13.5px] font-semibold text-[#b74545]"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full rounded-2xl bg-[linear-gradient(135deg,#1d2448_0%,#242f67_35%,#2eb9ae_100%)] py-3.5 text-[15px] font-bold text-white shadow-[0_22px_35px_rgba(29,36,72,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
              <p className="mt-3 text-center text-[13px] text-[#5a6582]">
                No credit card required. Your organization stays private from day one.
              </p>
            </form>
          </div>
        </main>
      </div>

      <style>{`
        .field {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #dde5f6;
          border-radius: 15px;
          font: inherit;
          font-size: 15px;
          background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
          color: #171d39;
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }
        .field:hover {
          border-color: #b4c1df;
        }
        .field:focus-visible {
          outline: none;
          border-color: #42cfc0;
          box-shadow: 0 0 0 4px rgba(66, 207, 192, 0.22);
        }
        .field::placeholder {
          color: #8a93af;
        }
      `}</style>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#5a6582]">
      {children}
    </p>
  )
}

function Field({ label, hint, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13.5px] font-semibold text-[#1d2448]">
        {label} {hint && <span className="font-normal text-[#5a6582]">({hint})</span>}
      </label>
      {children}
    </div>
  )
}
