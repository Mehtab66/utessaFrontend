import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Logo, Wordmark } from '../../shared/ui/Logo'

const SERVICES = [
  { id: 'crm', name: 'CRM', desc: 'Patient leads, call tracking, referral CRM, pipelines and contact history.', chip: 'bg-cyan' },
  { id: 'ops', name: 'Operations', desc: 'Documents, vendors with BAAs, role-based access and audit log.', chip: 'bg-lavender' },
  { id: 'mkt', name: 'Marketing & Outreach', desc: 'Reviews, email campaigns, social posting and text outreach.', chip: 'bg-yellow' },
  { id: 'tc', name: 'Time Clock', desc: 'Clock in/out, timesheets, mobile app and payroll export.', chip: 'bg-teal' },
]

export default function WelcomePage() {
  const { user, setSessionUser, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [orgType, setOrgType] = useState('Practice or clinic')
  const [ehrName, setEhrName] = useState('')
  const [selected, setSelected] = useState(['crm'])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-muted">
        Loading your workspace…
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.superAdmin) return <Navigate to="/platform" replace />
  if (user?.onboardingDone) return <Navigate to="/app" replace />

  const firstName = (user?.fullName || 'there').split(/\s+/)[0]

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function finish(skip) {
    setSubmitting(true)
    setError('')
    try {
      const me = await api('/api/v1/onboarding/welcome', {
        method: 'PATCH',
        body: skip
          ? { orgType: null, ehrName: null, enabledServices: null }
          : { orgType, ehrName, enabledServices: selected },
      })
      setSessionUser(me)
      navigate('/app', { state: { bootDashboard: true } })
    } catch (err) {
      setError(err.message || 'Could not save preferences.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <main className="auth-form-panel">
        <div className="auth-topbar">
          <Wordmark />
        </div>

        <div className="auth-form-wrap welcome-form-wrap">
          <div className="welcome-header">
            <h1>Welcome, <span>{firstName}</span></h1>
            <p className="welcome-subtitle">Three quick questions so we can tailor your practice checklist. Everything stays unlocked either way.</p>
          </div>

          <div className="welcome-form-content">
            <div className="welcome-grid">
              <div className="welcome-field">
                <label htmlFor="orgType">Organization type</label>
                <select id="orgType" className="field" value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                  <option>Practice or clinic</option>
                  <option>Chiropractic or physical therapy</option>
                  <option>Hospital or health system</option>
                  <option>Health agency</option>
                  <option>Home health</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="welcome-field">
                <label htmlFor="ehrName">
                  Current EHR <span>(optional)</span>
                </label>
                <input
                  id="ehrName"
                  className="field"
                  value={ehrName}
                  onChange={(e) => setEhrName(e.target.value)}
                  placeholder="e.g. athenahealth"
                />
              </div>
            </div>

            <p className="welcome-options-label">
              What do you want to set up first? <span>(pick any)</span>
            </p>

            <div className="welcome-service-grid">
              {SERVICES.map((s) => {
                const on = selected.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={`welcome-service-card ${on ? 'is-active' : ''}`}
                  >
                    <span className={`welcome-service-icon ${on ? s.chip : 'bg-soft border-dashed'}`} />
                    {on && <span className="welcome-added">✓ Added</span>}
                    <span className="welcome-service-name">{s.name}</span>
                    <span className="welcome-service-desc">{s.desc}</span>
                  </button>
                )
              })}
            </div>

            {error && (
              <p className="welcome-error" role="alert">{error}</p>
            )}

            <div className="welcome-actions">
              <button
                type="button"
                className="welcome-link-btn"
                onClick={() => finish(true)}
                disabled={submitting}
              >
                Skip for now
              </button>
              <button
                type="button"
                className="auth-primary-btn welcome-submit"
                onClick={() => finish(false)}
                disabled={submitting}
              >
                {submitting ? 'Opening dashboard…' : 'Go to dashboard'}
              </button>
            </div>
          </div>
        </div>
      </main>

      <aside className="auth-visual" aria-label="Utessa platform preview">
        <div className="auth-visual-overlay" />
        <div className="auth-visual-copy">
          <h2>
            <span>Run your practice</span>
            <span>from one place</span>
          </h2>
          <p>“Utessa helped us optimize our lead management, deal tracking and sales forecasting.”</p>
          <div className="auth-avatar-row">
            {[1, 2, 3].map((i) => (
              <div key={i} className="auth-avatar" />
            ))}
          </div>
        </div>
        <img src="/login.webp" alt="" className="auth-visual-image" />
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
        .welcome-form-wrap {
          max-width: 640px;
        }
        .welcome-header {
          margin-bottom: 24px;
        }
        .welcome-kicker {
          margin: 0;
          color: #1B1F4B;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .welcome-header h1 {
          margin: 10px 0 8px;
          font-family: var(--font-sans);
          font-size: clamp(2.2rem, 3vw, 3.2rem);
          font-weight: 500;
          letter-spacing: -0.03em;
          line-height: 1.1;
          color: #1B1F4B;
        }
        .welcome-header h1 span {
          color: #17A7B5;
        }
        .welcome-subtitle {
          margin: 0;
          max-width: 520px;
          color: #5E6485;
          font-size: 15px;
          line-height: 1.6;
        }
        .welcome-form-content {
          display: grid;
          gap: 18px;
        }
        .welcome-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .welcome-field {
          display: grid;
          gap: 7px;
        }
        .welcome-field label {
          color: #1B1F4B;
          font-family: var(--font-sans);
          font-size: 13.5px;
          font-weight: 500;
        }
        .welcome-field label span {
          color: #5E6485;
          font-weight: 400;
        }
        .field {
          width: 100%;
          height: 52px;
          padding: 12px 14px;
          border: 1.5px solid #DCE4F5;
          border-radius: 12px;
          background: #ffffff;
          color: #1B1F4B;
          font: inherit;
          font-size: 15px;
        }
        .field:focus-visible {
          outline: none;
          border-color: #3BC4CA;
          box-shadow: 0 0 0 4px rgba(59,196,202,.18);
        }
        .welcome-options-label {
          margin: 2px 0 0;
          color: #1B1F4B;
          font-size: 13.5px;
          font-weight: 600;
        }
        .welcome-options-label span {
          color: #5E6485;
          font-weight: 400;
        }
        .welcome-service-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .welcome-service-card {
          position: relative;
          display: block;
          width: 100%;
          min-height: 112px;
          border: 1.5px solid #E2E7F1;
          border-radius: 14px;
          background: #ffffff;
          padding: 14px 14px 12px 16px;
          text-align: left;
          color: #1B1F4B;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }
        .welcome-service-card:hover {
          border-color: #B9C7E5;
          transform: translateY(-1px);
        }
        .welcome-service-card.is-active {
          border-color: #3BC4CA;
          box-shadow: 0 0 0 3px rgba(59,196,202,.18);
        }
        .welcome-service-icon {
          position: absolute;
          left: 16px;
          top: 14px;
          display: block;
          width: 24px;
          height: 24px;
          border-radius: 8px;
          border: 1.5px solid #C8D4F0;
          background: #F1F3FB;
        }
        .welcome-service-card.is-active .welcome-service-icon {
          border-color: transparent;
        }
        .bg-cyan { background: #CFF9FB; }
        .bg-lavender { background: #EEE8FF; }
        .bg-yellow { background: #FFF2C7; }
        .bg-teal { background: #DFFAF2; }
        .bg-soft { background: #F5F7FB; }
        .border-dashed { border-style: dashed; }
        .welcome-added {
          position: absolute;
          right: 12px;
          top: 12px;
          color: #1B1F4B;
          font-size: 11px;
          font-weight: 700;
        }
        .welcome-service-name {
          display: block;
          margin-top: 4px;
          margin-left: 34px;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.4;
        }
        .welcome-service-desc {
          display: block;
          margin-top: 6px;
          margin-left: 0;
          color: #5E6485;
          font-size: 13px;
          line-height: 1.5;
        }
        .welcome-error {
          margin: 4px 0 0;
          border: 1px solid #F3C1BC;
          border-radius: 12px;
          background: #FFF5F4;
          padding: 12px 14px;
          color: #B42318;
          font-size: 13.5px;
          font-weight: 600;
        }
        .welcome-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 14px;
          width: 100%;
        }
        .welcome-link-btn {
          margin: 0;
          border: 0;
          background: transparent;
          color: #1B1F4B;
          font-family: var(--font-sans);
          font-size: 15px;
          font-weight: 600;
          line-height: 1.4;
          padding: 8px 0;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: underline;
          text-decoration-color: rgba(27, 31, 75, 0.3);
          text-underline-offset: 4px;
          transition: color 0.15s ease, text-decoration-color 0.15s ease;
        }
        .welcome-link-btn:hover {
          color: #262B66;
          text-decoration-color: #262B66;
        }
        .welcome-link-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .welcome-actions .welcome-submit,
        .auth-primary-btn.welcome-submit {
          width: auto !important;
          min-width: 180px;
          margin-left: auto;
          height: 48px;
          padding: 0 24px;
          border: 0;
          border-radius: 12px;
          background: #1B1F4B;
          color: #ffffff;
          font-family: var(--font-sans);
          font-size: 15px;
          font-weight: 600;
          box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 6px 16px -6px rgba(27,31,75,.55);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .welcome-actions .welcome-submit:hover,
        .auth-primary-btn.welcome-submit:hover {
          background: #262B66;
        }
        .welcome-actions .welcome-submit:disabled,
        .auth-primary-btn.welcome-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
        .auth-visual {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
          border-radius: 24px;
          min-height: 560px;
          background: #17242F url('/Connected Teal Network with Central Team.png') center/cover no-repeat;
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
          .welcome-grid,
          .welcome-service-grid {
            grid-template-columns: 1fr;
          }
          .welcome-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .welcome-submit {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
