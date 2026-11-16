import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Logo, Wordmark } from '../../shared/ui/Logo'

const HIGHLIGHTS = [
  { accent: 'bg-[#1EA7A8]', title: 'Unified workspace', text: 'CRM, operations, outreach, and time in one place' },
  { accent: 'bg-[#F4C65A]', title: 'Protected by design', text: 'Privacy-first access with clear audit trails' },
  { accent: 'bg-[#7E8BD9]', title: 'Audit-ready', text: 'Governance and compliance built into daily workflows' },
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
    <div className="min-h-screen bg-white text-[#141B35]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="relative flex min-h-[290px] w-full overflow-hidden bg-[#111827] text-white lg:min-h-screen lg:w-[44%]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(30,167,168,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(244,198,90,0.18),_transparent_24%),linear-gradient(130deg,#111827_0%,#1a2542_38%,#17263f_100%)]" />
          <div className="relative z-10 flex w-full flex-col justify-between px-6 py-7 sm:px-8 lg:px-10 xl:px-12">
            <Link to="/" className="inline-flex w-fit items-center gap-3">
              <Logo className="h-9 w-9" />
              <Wordmark light />
            </Link>

            <div className="max-w-lg py-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#BAF0F1]">Welcome back</p>
              <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.06em] text-white sm:text-[3.1rem]">
                Sign in to <span className="text-[#66D9D5]">Utessa</span>
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#DDE7FF]/80">
                Bring your practice operations into one focused system for patient access, staff workflows, outreach, and compliance.
              </p>
            </div>

            <div className="space-y-3">
              {HIGHLIGHTS.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${item.accent}`} />
                  <div>
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-sm text-[#DDE7FF]/75">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex w-full flex-1 items-center justify-center bg-white px-4 py-10 sm:px-6 lg:px-8 xl:px-12">
          <div className="w-full max-w-[500px]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-full border border-[#E4E8F3] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5B647C]">
                Secure access
              </span>
              <p className="text-sm font-medium text-[#141B35]">
                New here?{' '}
                <Link to="/signup" className="font-semibold text-[#1C8F90] underline-offset-2 hover:underline">
                  Start trial
                </Link>
              </p>
            </div>

            <form
              className="rounded-[28px] border border-[#E9EEF9] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7"
              onSubmit={onSubmit}
              noValidate
            >
              <header className="mb-6">
                <h2 className="text-[30px] font-black tracking-[-0.06em] text-[#141B35]">Sign in</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[#5B647C]">
                  Use the work email for your Utessa organization.
                </p>
              </header>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[13.5px] font-semibold text-[#1D2448]">
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
                  <label htmlFor="password" className="mb-1.5 block text-[13.5px] font-semibold text-[#1D2448]">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#5B647C] transition hover:text-[#141B35]"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <p className="mt-4 rounded-xl border border-[#F2CDCD] bg-[#FFF5F5] px-3.5 py-3 text-[13.5px] font-semibold text-[#B44545]" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-2xl bg-[#141B35] py-3.5 text-[15px] font-bold text-white shadow-[0_16px_28px_rgba(20,27,53,0.18)] transition hover:bg-[#1B2445] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>

              <p className="mt-5 text-center text-[13.5px] text-[#5B647C]">
                Need an account?{' '}
                <Link to="/signup" className="font-semibold text-[#141B35] underline-offset-2 hover:underline">
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
          border-radius: 14px;
          font: inherit;
          font-size: 15px;
          background: #ffffff;
          color: #141B35;
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }
        .field:hover {
          border-color: #b8c6e8;
        }
        .field:focus-visible {
          outline: none;
          border-color: #1EA7A8;
          box-shadow: 0 0 0 4px rgba(30, 167, 168, 0.14);
        }
        .field::placeholder {
          color: #8B93AA;
        }
      `}</style>
    </div>
  )
}
