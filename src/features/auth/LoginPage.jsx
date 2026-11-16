import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Wordmark } from '../../shared/ui/Logo'

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
    <div className="auth-shell">
      <main className="auth-form-panel">
        <div className="auth-topbar">
          <Wordmark />
          <span>
            Need an account?{' '}
            <Link to="/signup">Sign up</Link>
          </span>
        </div>

        <form className="auth-form-wrap" onSubmit={onSubmit} noValidate>
          <h1>Sign in</h1>
          <p className="auth-subtitle">Welcome back! Please enter your details.</p>

          <div className="space-y-4">
            <div className="auth-field">
              <label htmlFor="email">Email address</label>
              <div className="auth-icon-field">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError('')
                  }}
                  autoComplete="email"
                  autoFocus
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-icon-field">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError('')
                  }}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="auth-with-toggle"
                />
                <button
                  type="button"
                  className="auth-show-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          <div className="auth-row-between mt-5">
            <label className="auth-checkbox-row">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="auth-link muted-link">
              Forgot password?
            </Link>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="auth-primary-btn"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="auth-form-foot">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Protected by bot detection. We never ask for a card to start a trial.
          </p>
        </form>
      </main>

      <aside className="auth-visual" aria-label="Utessa platform preview">
        <div className="auth-visual-overlay" />
        <div className="auth-visual-copy">
          <h2>Get your sales lifecycle streamlined today</h2>
          <p>“SalesVault helped us optimize our lead management, deal tracking and sales forecasting.”</p>
          <div className="auth-avatar-row">
            {[1, 2, 3].map((i) => (
              <div key={i} className="auth-avatar" />
            ))}
          </div>
        </div>
      </aside>

      <style>{`
        .auth-shell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          min-height: 100vh;
          gap: 16px;
          padding: 16px;
          background: #ffffff;
        }
        .auth-form-panel {
          display: flex;
          flex-direction: column;
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
          padding: 22px clamp(20px, 4vw, 56px) 32px;
        }
        .auth-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
          color: #5E6485;
        }
        .auth-topbar a {
          color: #1B1F4B;
          font-weight: 600;
          text-decoration: underline;
          text-decoration-color: rgba(27,31,75,.25);
          text-underline-offset: 3px;
        }
        .auth-form-wrap {
          width: 100%;
          max-width: 480px;
          margin: auto;
          padding: 38px 0 14px;
        }
        .auth-form-wrap h1 {
          margin: 0 0 8px;
          font-size: clamp(2.2rem, 3vw, 3.1rem);
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: #1B1F4B;
        }
        .auth-subtitle {
          margin: 0 0 30px;
          font-size: 15.5px;
          line-height: 1.55;
          color: #5E6485;
        }
        .auth-field {
          margin-bottom: 16px;
        }
        .auth-field label {
          display: block;
          margin-bottom: 7px;
          color: #1B1F4B;
          font-size: 13.5px;
          font-weight: 600;
        }
        .auth-icon-field {
          position: relative;
          display: flex;
          align-items: center;
        }
        .auth-icon-field svg {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          width: 19px;
          height: 19px;
          color: #7C83A3;
          pointer-events: none;
        }
        .auth-icon-field input {
          width: 100%;
          height: 52px;
          padding: 0 14px 0 46px;
          border: 1px solid #DCE4F5;
          border-radius: 10px;
          background: #EAF0FB;
          color: #181C42;
          font: inherit;
          font-size: 15px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .auth-icon-field input::placeholder {
          color: #A5AAC2;
        }
        .auth-icon-field input:hover {
          border-color: #C5D1EC;
        }
        .auth-icon-field input:focus-visible {
          outline: none;
          border-color: #3BC4CA;
          box-shadow: 0 0 0 4px rgba(59,196,202,.35);
          background: #fff;
        }
        .auth-with-toggle {
          padding-right: 48px !important;
        }
        .auth-show-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: #5E6485;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .auth-row-between {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .auth-checkbox-row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #5E6485;
        }
        .auth-checkbox-row input {
          width: 18px;
          height: 18px;
          accent-color: #1B1F4B;
        }
        .auth-link {
          font-size: 14px;
          font-weight: 600;
          color: #1B1F4B;
          text-decoration: underline;
          text-decoration-color: rgba(27,31,75,.25);
          text-underline-offset: 3px;
        }
        .auth-error {
          min-height: 22px;
          margin: 12px 0 0;
          color: #B42318;
          font-size: 13.5px;
          font-weight: 600;
        }
        .auth-primary-btn {
          width: 100%;
          height: 52px;
          margin-top: 14px;
          border: 0;
          border-radius: 11px;
          background: #1B1F4B;
          color: white;
          font: inherit;
          font-size: 16px;
          font-weight: 600;
          box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 6px 16px -6px rgba(27,31,75,.55);
          cursor: pointer;
        }
        .auth-primary-btn:hover {
          background: #262B66;
        }
        .auth-form-foot {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          font-size: 13px;
          color: #5E6485;
        }
        .auth-form-foot svg {
          width: 14px;
          height: 14px;
          color: #3BC4CA;
        }
        .auth-visual {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
          border-radius: 24px;
          min-height: 560px;
          background: #17242F url('/Connected Teal Network with Central Team.png') center/cover no-repeat;
          box-shadow: 0 20px 50px -20px rgba(24,28,66,.35);
        }
        .auth-visual-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(14,34,38,0.12), rgba(14,34,38,0.52));
        }
        .auth-visual-copy {
          position: relative;
          z-index: 1;
          padding: 30px clamp(22px, 3vw, 42px) clamp(24px, 4vw, 42px);
          color: white;
        }
        .auth-visual-copy h2 {
          margin: 0 0 10px;
          max-width: 430px;
          font-size: clamp(2.2rem, 3vw, 4rem);
          line-height: 1.03;
          letter-spacing: -0.045em;
          color: white;
        }
        .auth-visual-copy p {
          margin: 0;
          max-width: 420px;
          font-size: 17px;
          line-height: 1.7;
          color: rgba(255,255,255,0.85);
        }
        .auth-avatar-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 20px;
        }
        .auth-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.9);
          background: radial-gradient(circle at 30% 30%, #f4f5f7, #9bb7be 35%, #587b80 100%);
          box-shadow: 0 6px 14px rgba(0,0,0,0.25);
        }
        @media (max-width: 880px) {
          .auth-shell {
            grid-template-columns: 1fr;
          }
          .auth-form-panel {
            padding-top: 18px;
          }
          .auth-visual {
            min-height: 420px;
          }
        }
      `}</style>
    </div>
  )
}
