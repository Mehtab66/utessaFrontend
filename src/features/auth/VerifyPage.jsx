import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Wordmark } from '../../shared/ui/Logo'

export default function VerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSessionUser } = useAuth()
  const email = location.state?.email || ''
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const refs = useRef([])

  useEffect(() => {
    if (!email) navigate('/signup', { replace: true })
  }, [email, navigate])

  function setDigit(index, value) {
    const clean = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = clean
    setDigits(next)
    if (clean && index < 5) refs.current[index + 1]?.focus()
  }

  function onKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    const code = digits.join('')
    setSubmitting(true)
    setError('')
    try {
      const res = await api('/api/v1/auth/verify-email', { method: 'POST', body: { email, code } })
      setSessionUser(res.user)
      navigate(res.user.onboardingDone ? '/app' : '/welcome', {
        state: res.user.onboardingDone ? { bootDashboard: true } : undefined,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    setError('')
    try {
      await api('/api/v1/auth/resend-code', { method: 'POST', body: { email } })
      setInfo('A new code was sent. Check the backend console in development.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-shell">
      <main className="auth-form-panel">
        <div className="auth-topbar">
          <Wordmark />
        </div>

        <form className="auth-form-wrap verify-form-wrap" onSubmit={onSubmit} noValidate>
          <h1>Check your email</h1>

          <div className="verify-email-line">
            We sent a 6-digit code to <b>{email}</b>. It expires in 10 minutes.
          </div>

          {info && <p className="verify-info">{info}</p>}

          <div className="verify-code-row">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el }}
                className="verify-code-input"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
              />
            ))}
          </div>

          {error && <p className="auth-error verify-error" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className={`auth-primary-btn verify-btn${error ? ' verify-btn-error' : ''}`}
          >
            {submitting ? 'Verifying…' : 'Verify'}
          </button>

          <p className="verify-meta">
            Didn&apos;t get it?{' '}
            <button type="button" className="auth-link muted-link" onClick={resend}>Resend code</button>
            {' · '}
            <Link to="/signup" className="auth-link muted-link">Change email</Link>
          </p>
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
        .verify-form-wrap {
          max-width: 520px;
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
        .auth-subtitle b {
          color: #1B1F4B;
          font-weight: 600;
        }
        .verify-form-wrap h1 {
          margin-bottom: 12px;
          font-family: var(--font-sans);
          font-size: clamp(2rem, 2.4vw, 2.7rem);
          font-weight: 500;
          line-height: 1.12;
          letter-spacing: -0.03em;
          color: #1B1F4B;
        }
        .verify-email-line {
          margin: 0 0 14px;
          font-family: var(--font-sans);
          font-size: 15px;
          line-height: 1.5;
          color: #5E6485;
        }
        .verify-email-line b {
          color: #1B1F4B;
          font-weight: 600;
        }
        .verify-dev-note {
          margin-top: 0;
          border-radius: 12px;
          border: 1px solid #B7F0F2;
          background: #E9FBFB;
          padding: 12px 14px;
          color: #1B1F4B;
          font-size: 14px;
          line-height: 1.5;
        }
        .verify-info {
          margin: 16px 0 0;
          color: #0A8A63;
          font-size: 13.5px;
          font-weight: 600;
        }
        .verify-code-row {
          display: flex;
          gap: 10px;
          width: 100%;
          margin-top: 22px;
          margin-bottom: 18px;
        }
        .verify-code-input {
          flex: 1;
          width: 100%;
          max-width: none;
          height: 60px;
          border: 1.5px solid #DCE4F5;
          border-radius: 12px;
          background: #EAF0FB;
          color: #181C42;
          text-align: center;
          font-family: var(--font-sans);
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .verify-code-input:focus {
          border-color: #3BC4CA;
          box-shadow: 0 0 0 4px rgba(59,196,202,.18);
        }
        .verify-error {
          min-height: 18px;
          margin: 0 0 10px;
          color: #B42318;
          font-family: var(--font-sans);
          font-size: 13.5px;
          font-weight: 400;
        }
        .verify-actions {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
          margin-top: 0;
        }
        .verify-meta {
          margin: 12px 0 0;
          color: #1B1F4B;
          font-size: 13px;
          line-height: 1.5;
          text-align: center;
        }
        .verify-meta .auth-link,
        .verify-meta .auth-link:visited,
        .verify-meta .auth-link:hover,
        .verify-meta .auth-link:focus {
          color: #1B1F4B;
          text-decoration: underline;
          text-decoration-color: rgba(27,31,75,.3);
          text-underline-offset: 3px;
        }
        .verify-btn {
          width: 100%;
          margin-top: 0;
        }
        .auth-primary-btn {
          width: 100%;
          height: 52px;
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
        .auth-primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .verify-btn-error {
          background: #1B1F4B;
          box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 6px 16px -6px rgba(27,31,75,.55);
        }
        .verify-btn-error:hover {
          background: #262B66;
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
