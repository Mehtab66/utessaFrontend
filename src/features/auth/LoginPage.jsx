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


        </form>
      </main>

      <aside className="auth-visual" aria-label="Utessa platform preview">
        <div className="auth-visual-overlay" />
        <div className="auth-visual-copy">
          <h2>
            <span>Get your sales lifecycle</span>
            <span> streamlined today</span>
          </h2>
          <p>“Utessa helped us optimize our lead management, deal tracking and sales forecasting.”</p>
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
          padding: 12px;
          background: #ffffff;
        }
        .auth-form-panel {
          display: flex;
          flex-direction: column;
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
          padding: 18px clamp(12px, 2vw, 28px) 20px;
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
          max-width: 560px;
          margin: auto;
          padding: 26px 0 12px;
        }
        .auth-form-wrap h1 {
          margin: 0 0 8px;
          font-family: var(--font-sans);
          font-size: clamp(2.2rem, 3vw, 3.1rem);
          font-weight: 500;
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
          font-family: var(--font-sans);
          font-size: 13.5px;
          font-weight: 400;
          line-height: 1.4;
          letter-spacing: 0;
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
          font-family: var(--font-sans);
          font-size: 15px;
          font-weight: 400;
          letter-spacing: 0;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .auth-icon-field input::placeholder {
          color: #A5AAC2;
          font-family: var(--font-sans);
          font-size: 15px;
          font-weight: 400;
          letter-spacing: 0;
        }
        .auth-show-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: #5E6485;
          font-family: var(--font-sans);
          font-size: 12.5px;
          font-weight: 400;
          letter-spacing: 0;
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
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 400;
          color: #5E6485;
        }
        .auth-checkbox-row input {
          width: 18px;
          height: 18px;
          accent-color: #1B1F4B;
        }
        .auth-link {
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 400;
          color: #1B1F4B;
          text-decoration: underline;
          text-decoration-color: rgba(27,31,75,.25);
          text-underline-offset: 3px;
        }
        .auth-error {
          min-height: 22px;
          margin: 12px 0 0;
          color: #B42318;
          font-family: var(--font-sans);
          font-size: 13.5px;
          font-weight: 400;
        }
        .auth-primary-btn {
          width: 100%;
          height: 52px;
          margin-top: 14px;
          border: 0;
          border-radius: 11px;
          background: #1B1F4B;
          color: white;
          font-family: var(--font-sans);
          font-size: 16px;
          font-weight: 500;
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
          background: #17242F;
          box-shadow:
            inset 0 80px 90px -50px rgba(3,10,17,0.82),
            inset 0 -120px 150px rgba(2,8,14,0.82),
            0 26px 44px -20px rgba(15,20,32,0.52);
        }
        .auth-visual::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.94) 16%,
            rgba(0, 0, 0, 0.76) 30%,
            rgba(0, 0, 0, 0.38) 52%,
            rgba(0, 0, 0, 0.08) 74%,
            rgba(0, 0, 0, 0) 100%
          );
          z-index: 1;
          pointer-events: none;
        }
        .auth-visual-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(2,5,12,0) 0%, rgba(2,5,12,0.18) 42%, rgba(2,5,12,0.9) 100%);
          z-index: 2;
        }
        .auth-visual-copy {
          position: relative;
          z-index: 2;
          padding: 30px clamp(22px, 3vw, 42px) clamp(24px, 4vw, 42px);
          color: white;
        }
        .auth-visual-copy h2 {
          margin: 0 0 10px;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          gap: 0;
          font-size: clamp(2.2rem, 3vw, 4rem);
          line-height: 0.96;
          letter-spacing: -0.045em;
          color: white;
          white-space: nowrap;
        }
        .auth-visual-copy h2 span {
          display: block;
          white-space: nowrap;
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
        .auth-visual-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          transform: scale(1.14);
          filter: saturate(1.08) contrast(1.04) drop-shadow(0 18px 25px rgba(0,0,0,0.45));
          z-index: 0;
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
