import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Logo, Wordmark } from '../../shared/ui/Logo'

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await api('/api/v1/auth/login', { method: 'POST', body: { email, password } })
      loginWithToken(res.token, res.user)
      navigate(res.user.onboardingDone ? '/app' : '/welcome')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <main className="mx-auto max-w-[560px] overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-panel)]">
        <div className="flex items-center gap-3 bg-navy px-6 py-4">
          <Logo className="h-10 w-10" />
          <Wordmark light />
          <span className="ml-auto text-sm font-semibold text-lcyan">
            New here? <Link to="/signup" className="underline-offset-2 hover:underline">Start trial</Link>
          </span>
        </div>
        <form className="px-6 py-7 sm:px-8" onSubmit={onSubmit}>
          <h1 className="text-[26px] font-bold text-navy">Welcome back</h1>
          <p className="mb-6 mt-1 text-[15px] text-muted">Sign in to your organization&apos;s Utessa workspace.</p>

          <label className="mb-1.5 block text-[13.5px] font-semibold text-navy">Work email</label>
          <input className="mb-3.5 w-full rounded-[10px] border-[1.5px] border-line px-3.5 py-2.5 text-[15px] focus:border-teal focus:outline-none focus:shadow-[0_0_0_4px_rgba(59,196,202,.45)]" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

          <label className="mb-1.5 block text-[13.5px] font-semibold text-navy">Password</label>
          <input className="w-full rounded-[10px] border-[1.5px] border-line px-3.5 py-2.5 text-[15px] focus:border-teal focus:outline-none focus:shadow-[0_0_0_4px_rgba(59,196,202,.45)]" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

          {error && <p className="mt-3 text-[13.5px] font-semibold text-warn" role="alert">{error}</p>}

          <button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl bg-navy py-3.5 text-[15px] font-bold text-white hover:bg-[#2B3173] disabled:opacity-60">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  )
}
