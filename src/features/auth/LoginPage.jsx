import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Logo, Wordmark } from '../../shared/ui/Logo'

const HIGHLIGHTS = [
  { color: 'bg-cyan', title: 'Your workspace', text: 'CRM, ops, outreach, and time in one place' },
  { color: 'bg-lavender', title: 'Tenant-safe', text: 'Organization data stays isolated by design' },
  { color: 'bg-yellow', title: 'HIPAA-ready', text: 'Signed BAA and audit-friendly workflows' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { setSessionUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError('Enter your work email.')
    if (!password) return setError('Enter your password.')

    setSubmitting(true)
    try {
      const res = await api('/api/v1/auth/login', { method: 'POST', body: { email, password } })
      setSessionUser(res.user)
      if (res.user.superAdmin) {
        navigate('/platform', { state: { bootDashboard: true } })
        return
      }
      navigate(res.user.onboardingDone ? '/app' : '/welcome', {
        state: res.user.onboardingDone ? { bootDashboard: true } : undefined,
      })
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
              Welcome back
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-[2.75rem]">
              Sign in to <span className="text-cyan">Utessa</span>
            </h1>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-lavender/90">
              Pick up where your practice left off — leads, operations, outreach, and time tracking in one secure workspace.
            </p>
          </div>

          <ul className="animate-rise-delay mt-8 hidden max-w-md space-y-3 lg:block">
            {HIGHLIGHTS.map((item) => (
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
            <span className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[12.5px] font-semibold text-lcyan">
              Organization workspace
            </span>
            <span className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[12.5px] font-semibold text-lcyan">
              HIPAA-ready · BAA included
            </span>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-col bg-bg px-4 py-7 sm:px-8 lg:h-full lg:overflow-y-auto lg:px-12 lg:py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-muted">Your practice workspace</p>
          <p className="text-sm font-semibold text-navy">
            New here?{' '}
            <Link to="/signup" className="text-teal underline-offset-2 hover:underline">
              Start trial
            </Link>
          </p>
        </div>

        <form
          className="animate-rise mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center pb-4"
          onSubmit={onSubmit}
          noValidate
        >
          <header className="mb-7">
            <h2 className="text-[26px] font-extrabold tracking-tight text-navy sm:text-[30px]">
              Sign in
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
              Use the work email for your Utessa organization.
            </p>
          </header>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13.5px] font-semibold text-navy">
                Work email
              </label>
              <input
                id="email"
                className="field"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                autoComplete="email"
                autoFocus
                placeholder="you@yourpractice.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13.5px] font-semibold text-navy">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  className="field pr-16"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                  autoComplete="current-password"
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
            </div>
          </div>

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
            className="mt-6 w-full rounded-xl bg-yellow py-3.5 text-[15px] font-bold text-navy transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="mt-5 text-center text-[13.5px] text-muted">
            Need an account?{' '}
            <Link to="/signup" className="font-semibold text-navy underline-offset-2 hover:underline">
              Start your free 14-day trial
            </Link>
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
