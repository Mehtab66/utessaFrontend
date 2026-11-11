import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Logo, Wordmark } from '../../shared/ui/Logo'

const HIGHLIGHTS = [
  { color: 'bg-[#53e4d4]', title: 'Unified workspace', text: 'CRM, operations, outreach, and time in one place' },
  { color: 'bg-[#ffca5c]', title: 'Protected by design', text: 'Pharmacy-grade privacy and tenant-safe access' },
  { color: 'bg-[#9a96ff]', title: 'Audit-ready', text: 'Clear workflows for compliance and governance' },
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
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(83,228,212,0.18),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(247,199,90,0.14),_transparent_18%),linear-gradient(135deg,#f5f8ff_0%,#eef2fb_40%,#ecfaf8_100%)] text-navy">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="relative flex min-h-[300px] w-full overflow-hidden bg-[#0b1020] text-white lg:min-h-screen lg:w-[46%]">
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

            <div className="animate-rise-delay max-w-lg py-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9ceee8]">Welcome back</p>
              <h1 className="mt-4 text-4xl font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-[3.2rem]">
                Sign in to <span className="text-[#53e4d4]">Utessa</span>
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#dbe3ff]/85">
                Bring your practice operations into one focused system for patient access, staff workflows, outreach, and compliance.
              </p>
            </div>

            <div className="animate-rise-delay space-y-3">
              {HIGHLIGHTS.map((item) => (
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

        <main className="flex w-full flex-1 items-center justify-center bg-[#f6f8fc] px-4 py-10 sm:px-6 lg:px-8 xl:px-12">
          <div className="w-full max-w-[520px]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <span className="inline-flex items-center rounded-full border border-[#dfe6f6] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#58637e]">
                Secure access
              </span>
              <p className="text-sm font-semibold text-navy">
                New here?{' '}
                <Link to="/signup" className="text-[#1c8f8e] underline-offset-2 hover:underline">
                  Start trial
                </Link>
              </p>
            </div>

            <form
              className="animate-rise rounded-[30px] border border-[#edf1fa] bg-white p-5 shadow-[0_28px_70px_rgba(14,23,49,0.1)] sm:p-7"
              onSubmit={onSubmit}
              noValidate
            >
              <header className="mb-6">
                <h2 className="text-[30px] font-black tracking-[-0.05em] text-[#171d39]">Sign in</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[#5a6582]">
                  Use the work email for your Utessa organization.
                </p>
              </header>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[13.5px] font-semibold text-[#1d2448]">
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
                  <label htmlFor="password" className="mb-1.5 block text-[13.5px] font-semibold text-[#1d2448]">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#5a6582] transition hover:text-[#1d2448]"
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
                  className="mt-4 rounded-xl border border-[#f2c9c9] bg-[#fff4f4] px-3.5 py-3 text-[13.5px] font-semibold text-[#b74545]"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-2xl bg-[linear-gradient(135deg,#1d2448_0%,#242f67_35%,#2eb9ae_100%)] py-3.5 text-[15px] font-bold text-white shadow-[0_22px_35px_rgba(29,36,72,0.22)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>

              <p className="mt-5 text-center text-[13.5px] text-[#5a6582]">
                Need an account?{' '}
                <Link to="/signup" className="font-semibold text-[#1d2448] underline-offset-2 hover:underline">
                  Start your free 14-day trial
                </Link>
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
          transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
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
