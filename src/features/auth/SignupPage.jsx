import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { Wordmark } from '../../shared/ui/Logo'

const SIZE_OPTIONS = [
  { value: 5, label: '1–10' },
  { value: 18, label: '11–25' },
  { value: 33, label: '26–40' },
  { value: 58, label: '41–75' },
  { value: 113, label: '76–150' },
  { value: 225, label: '151–300' },
  { value: 301, label: '300+' },
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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [passwordInfoOpen, setPasswordInfoOpen] = useState(false)
  const [fieldFocus, setFieldFocus] = useState({
    fullName: false,
    email: false,
    organizationName: false,
    teamSizeBand: false,
  })

  const passwordRules = useMemo(() => {
    const value = form.password
    return [
      { label: 'At least 8 characters', valid: value.length >= 8 },
      { label: 'At least one uppercase letter', valid: /[A-Z]/.test(value) },
      { label: 'At least one lowercase letter', valid: /[a-z]/.test(value) },
      { label: 'At least one number', valid: /\d/.test(value) },
      { label: 'At least one special character', valid: /[^A-Za-z0-9]/.test(value) },
    ]
  }, [form.password])

  const fieldValidation = useMemo(() => ({
    fullName: !form.fullName.trim() ? 'Please enter your full name.' : '',
    email: !form.email.trim() ? 'Please enter your work email.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? 'Please enter a valid work email.' : '',
    organizationName: !form.organizationName.trim() ? 'Please enter your practice name.' : '',
    teamSizeBand: !form.teamSizeBand ? 'Please select your team size.' : '',
  }), [form])

  const passwordFieldValidation = useMemo(() => {
    if (!form.password) return 'Please enter a password.'
    if (form.password.length < 8 || form.password.length > 64) return 'Password must be 8–64 characters long.'
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
      return 'Password must include uppercase, lowercase, a number, and a special character.'
    }
    return ''
  }, [form.password])

  const passwordRequirementsText = 'Use 8–64 characters with at least one uppercase letter, one lowercase letter, one number, and one special character.'

  const passwordRequirements = [
    'At least 8 characters',
    'At least 1 uppercase letter',
    'At least 1 lowercase letter',
    'At least 1 number',
    'At least 1 special character',
  ]

  const requiredFieldHint = (field) => {
    const value = fieldValidation[field]
    if (!value) return ''
    return fieldFocus[field] || (typeof form[field] === 'string' ? form[field].trim() : form[field]) ? value : ''
  }

  const passwordInlineError = useMemo(() => {
    if (!form.password) return ''
    if (form.password.length < 8) return 'Use at least 8 characters.'
    if (!/[A-Z]/.test(form.password)) return 'Add at least one uppercase letter.'
    if (!/[a-z]/.test(form.password)) return 'Add at least one lowercase letter.'
    if (!/\d/.test(form.password)) return 'Add at least one number.'
    if (!/[^A-Za-z0-9]/.test(form.password)) return 'Add at least one special character.'
    return ''
  }, [form.password])

  const passwordValid = passwordRules.every((rule) => rule.valid)

  async function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.fullName.trim()) return setError('Add your full name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid work email.')
    const passwordMessage = passwordErrorMessage()
    if (passwordMessage) return setError(passwordMessage)
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

  const isFormValid = useMemo(() => {
    return (
      form.fullName.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
      passwordValid &&
      form.organizationName.trim() &&
      form.teamSizeBand &&
      form.termsAccepted
    )
  }, [form, passwordValid])

  function passwordErrorMessage() {
    if (!form.password) return 'Enter a password.'
    if (form.password.length < 8 || form.password.length > 64) return 'Password must be 8–64 characters long.'
    if (!/[A-Z]/.test(form.password)) return 'Include at least one uppercase letter.'
    if (!/[a-z]/.test(form.password)) return 'Include at least one lowercase letter.'
    if (!/\d/.test(form.password)) return 'Include at least one number.'
    if (!/[^A-Za-z0-9]/.test(form.password)) return 'Include at least one special character.'
    return ''
  }

  return (
    <div className="auth-shell">
      <main className="auth-form-panel">
        <div className="auth-topbar">
          <Wordmark />
          <span>
            Have an account?{' '}
            <Link to="/login">Sign in</Link>
          </span>
        </div>

        <form className="auth-form-wrap" onSubmit={onSubmit} noValidate>
          <h1>Create your account</h1>
          <p className="auth-subtitle">Start your 14-day free trial. No credit card required.</p>

          <div className="auth-sso">
            <button type="button" className="auth-sso-btn">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/>
                <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z"/>
                <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8z"/>
                <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.4 9.1 5.4 12 5.4z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="auth-divider">or sign up with email</div>

          <div className="auth-grid-2">
            <div className="auth-field">
              <label htmlFor="fullName">Full name</label>
              <div className="auth-icon-field">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                <input
                  id="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  onFocus={() => setFieldFocus((v) => ({ ...v, fullName: true }))}
                  onBlur={() => setFieldFocus((v) => ({ ...v, fullName: false }))}
                  autoComplete="name"
                  placeholder="Enter your full name"
                />
              </div>
              <div className="auth-field-status">{requiredFieldHint('fullName') || ''}</div>
            </div>

            <div className="auth-field">
              <label htmlFor="email">Work email</label>
              <div className="auth-icon-field">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  onFocus={() => setFieldFocus((v) => ({ ...v, email: true }))}
                  onBlur={() => setFieldFocus((v) => ({ ...v, email: false }))}
                  autoComplete="email"
                  placeholder="Enter your work email"
                />
              </div>
              <div className="auth-field-status">{requiredFieldHint('email') || ''}</div>
            </div>
          </div>

          <div className="auth-grid-2">
            <div className="auth-field">
              <label htmlFor="password" className="auth-label-with-icon">
                <span>Password</span>
                <span className="auth-info-tooltip-wrap">
                  <button
                    type="button"
                    className="auth-info-button"
                    aria-label="Password requirements"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="auth-info-icon">
                      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 10.5v5.2M12 7.5h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                  <span className="auth-info-tooltip">
                    Use at least 8 characters with at least one uppercase letter, one lowercase letter, one number, and one special character.
                  </span>
                </span>
              </label>
              <div className="auth-icon-field">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  autoComplete="new-password"
                  placeholder="Enter a password"
                  className="auth-with-toggle"
                />
                <button type="button" className="auth-show-toggle" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
              <div className="auth-field-status">{(passwordFieldValidation && (passwordFocused || form.password)) ? passwordFieldValidation : ''}</div>
            </div>

            <div className="auth-field">
              <label htmlFor="phone">Phone <span className="auth-optional">(optional)</span></label>
              <div className="auth-icon-field">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
                <input id="phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} autoComplete="tel" placeholder="Enter your phone number" />
              </div>
              <div className="auth-field-status" />
            </div>
          </div>

          <div className="auth-grid-2">
            <div className="auth-field">
              <label htmlFor="organizationName">Practice name</label>
              <div className="auth-icon-field">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V5.5L12 3v17M12 8l8 2.5V20M2.5 20h19M7.5 8.5h1M7.5 12h1M7.5 15.5h1M15.5 13h1M15.5 16.5h1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <input
                  id="organizationName"
                  type="text"
                  value={form.organizationName}
                  onChange={(e) => update('organizationName', e.target.value)}
                  onFocus={() => setFieldFocus((v) => ({ ...v, organizationName: true }))}
                  onBlur={() => setFieldFocus((v) => ({ ...v, organizationName: false }))}
                  autoComplete="organization"
                  placeholder="Enter your practice name"
                />
              </div>
              <div className="auth-field-status">{requiredFieldHint('organizationName') || ''}</div>
            </div>

            <div className="auth-field">
              <label htmlFor="teamSizeBand">Team size <span className="auth-optional">(users)</span></label>
              <div className="auth-icon-field">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M2.5 19.5c.9-3 3.3-4.5 6.5-4.5s5.6 1.5 6.5 4.5M16 5.2a3.5 3.5 0 0 1 0 6.6M18 15.3c1.7.6 2.9 2 3.5 4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                <select
                  id="teamSizeBand"
                  value={form.teamSizeBand}
                  onChange={(e) => update('teamSizeBand', e.target.value)}
                  onFocus={() => setFieldFocus((v) => ({ ...v, teamSizeBand: true }))}
                  onBlur={() => setFieldFocus((v) => ({ ...v, teamSizeBand: false }))}
                >
                  <option value="">Choose…</option>
                  {SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="auth-field-status">{requiredFieldHint('teamSizeBand') || ''}</div>
            </div>
          </div>

          <div className="auth-checks" style={{ marginTop: 8 }}>
            <label>
              <input type="checkbox" checked={form.termsAccepted} onChange={(e) => update('termsAccepted', e.target.checked)} />
              <span>
                I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>, and I'm authorized to accept the <a href="#">Business Associate Agreement</a> on behalf of this practice.
              </span>
            </label>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button
            type="submit"
            className="auth-primary-btn"
            disabled={submitting || !isFormValid}
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </main>

      <aside className="auth-visual" aria-label="Utessa platform preview">
        <div className="auth-visual-overlay" />
        <div className="auth-visual-copy">
          <h2>
            <span>Run your whole practice</span>
            <span> from one place</span>
          </h2>
          <p>Try CRM, Operations, Marketing and Time Clock free for 14 days. HIPAA-ready with a signed BAA, and no credit card to start.</p>
          <ul className="auth-pills">
            <li><i style={{ background: '#5CE1E6' }} />CRM</li>
            <li><i style={{ background: '#C9CDF2' }} />Operations</li>
            <li><i style={{ background: '#FFD23F' }} />Marketing</li>
            <li><i style={{ background: '#3BC4CA' }} />Time Clock</li>
          </ul>
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
        .auth-sso {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (max-width: 560px) {
          .auth-sso { grid-template-columns: 1fr; }
          .auth-grid-2 { grid-template-columns: 1fr; }
        }
        .auth-sso-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 50px;
          width: 100%;
          border: 1px solid #E1E4EE;
          border-radius: 11px;
          background: #fff;
          color: #1B1F4B;
          font: inherit;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .auth-sso-btn:hover {
          background: #FBFCFE;
          border-color: #BFC5DA;
        }
        .auth-sso-btn svg {
          width: 18px;
          height: 18px;
        }
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 22px 0;
          color: #8A90AD;
          font-size: 13px;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #E1E4EE;
        }
        .auth-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 16px;
          margin-top: 0;
        }
        .auth-field {
          margin-bottom: 0;
        }
        .auth-field label {
          display: block;
          margin-bottom: 6px;
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
        .auth-icon-field input,
        .auth-icon-field select {
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
        .auth-checks {
          margin-top: 8px;
          display: grid;
          gap: 10px;
        }
        .auth-checks label {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          font-family: var(--font-sans);
          font-size: 14px;
          line-height: 1.5;
          color: #5E6485;
        }
        .auth-checks input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          accent-color: #1B1F4B;
          flex: none;
        }
        .auth-checks a {
          color: #1B1F4B;
          font-weight: 600;
          text-decoration: underline;
          text-decoration-color: rgba(27,31,75,.25);
          text-underline-offset: 3px;
        }
        .auth-field-status {
          min-height: 16px;
          margin-top: 5px;
          font-family: var(--font-sans);
          font-size: 12.25px;
          font-weight: 400;
          line-height: 1.3;
          color: #B42318;
        }
        .auth-field-status-error {
          color: #B42318;
        }
        .auth-error {
          min-height: 22px;
          margin: 10px 0 0;
          color: #B42318;
          font-family: var(--font-sans);
          font-size: 13.5px;
          font-weight: 400;
        }
        .auth-primary-btn {
          width: 100%;
          height: 52px;
          margin-top: 12px;
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
        .auth-primary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .auth-primary-btn:hover:not(:disabled) {
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
        .auth-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
          padding: 0;
          list-style: none;
        }
        .auth-pills li {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.88);
          color: #1B1F4B;
          font-size: 13px;
          font-weight: 700;
        }
        .auth-pills i {
          width: 10px;
          height: 10px;
          display: inline-block;
          border-radius: 50%;
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
        .auth-password-rules {
          display: grid;
          gap: 6px;
          margin-top: 10px;
          padding: 8px 10px;
          border: 1px solid #E7ECF8;
          border-radius: 10px;
          background: #F7F9FD;
          min-height: 118px;
        }
        .auth-password-rule {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          color: #6B728B;
        }
        .auth-password-rule.is-valid {
          color: #0F8A5F;
        }
        .auth-password-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
        }
        .auth-password-rule.is-valid .auth-password-dot {
          background: #0F8A5F;
        }
        .auth-label-with-icon {
          display: inline-flex;
          align-items: baseline;
          justify-content: center;
          gap: 6px;
          margin-bottom: 0;
          line-height: 1;
          height: 18px;
        }
        .auth-info-tooltip-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          min-width: 16px;
          min-height: 16px;
          flex: 0 0 16px;
          transform: translateY(1px);
          line-height: 1;
        }
        .auth-info-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 15px;
          height: 15px;
          padding: 0;
          margin: 0;
          border: none;
          background: transparent;
          color: #6A7290;
          cursor: help;
          vertical-align: middle;
          transform: translateY(1px);
        }
        .auth-info-icon {
          display: block;
          width: 15px;
          height: 15px;
          transform: translateY(0.5px);
        }
        .auth-info-tooltip {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 10px);
          transform: translateX(-50%);
          width: max-content;
          max-width: 260px;
          padding: 9px 10px;
          border: 1px solid rgba(27, 31, 75, 0.12);
          border-radius: 10px;
          background: #1B1F4B;
          color: #fff;
          font-size: 11.5px;
          line-height: 1.5;
          box-shadow: 0 16px 30px rgba(19, 25, 48, 0.18);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.15s ease, visibility 0.15s ease;
          pointer-events: none;
          white-space: normal;
          z-index: 20;
        }
        .auth-info-tooltip-wrap:hover .auth-info-tooltip,
        .auth-info-tooltip-wrap:focus-within .auth-info-tooltip {
          opacity: 1;
          visibility: visible;
        }
        .auth-info-tooltip::before {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 10px;
          height: 10px;
          background: #1B1F4B;
          border-right: 1px solid rgba(27, 31, 75, 0.12);
          border-bottom: 1px solid rgba(27, 31, 75, 0.12);
        }
      `}</style>
    </div>
  )
}
