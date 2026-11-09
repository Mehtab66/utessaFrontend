import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Logo, Wordmark } from '../../shared/ui/Logo'

export default function VerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithToken } = useAuth()
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
    if (code.length !== 6) return setError('Enter the 6-digit code.')
    setSubmitting(true)
    setError('')
    try {
      const res = await api('/api/v1/auth/verify-email', { method: 'POST', body: { email, code } })
      loginWithToken(res.token, res.user)
      navigate(res.user.onboardingDone ? '/app' : '/welcome')
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
    <div className="min-h-screen bg-bg px-4 py-10">
      <main className="mx-auto max-w-[760px] overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-panel)]">
        <div className="flex items-center gap-3 bg-navy px-6 py-4">
          <Logo className="h-10 w-10" />
          <Wordmark light />
        </div>
        <form className="px-6 py-7 sm:px-8" onSubmit={onSubmit}>
          <h2 className="text-[26px] font-bold text-navy">Check your email</h2>
          <p className="mt-1 text-[15px] text-muted">
            We sent a 6-digit code to <b className="text-navy">{email}</b>. It expires in 10 minutes.
          </p>
          <div className="mt-3 rounded-xl border border-[#B7F0F2] bg-[#E9FBFB] px-3.5 py-3 text-sm text-navy">
            In development, the code is printed in the backend server logs.
          </div>
          {info && <p className="mt-3 text-sm font-semibold text-ok">{info}</p>}

          <div className="mt-5 flex gap-2.5">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el }}
                className="h-[58px] w-[52px] rounded-[10px] border-[1.5px] border-line text-center text-2xl font-bold text-navy focus:border-teal focus:outline-none focus:shadow-[0_0_0_4px_rgba(59,196,202,.45)]"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
              />
            ))}
          </div>

          {error && <p className="mt-3 text-[13.5px] font-semibold text-warn" role="alert">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              Didn&apos;t get it?{' '}
              <button type="button" className="font-semibold text-navy underline" onClick={resend}>Resend code</button>
              {' · '}
              <Link to="/signup" className="font-semibold underline">Change email</Link>
            </p>
            <button type="submit" disabled={submitting} className="rounded-xl bg-navy px-6 py-3 text-[15px] font-bold text-white hover:bg-[#2B3173] disabled:opacity-60">
              {submitting ? 'Verifying…' : 'Verify'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
