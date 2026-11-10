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
    <div className="min-h-screen lg:grid lg:h-screen lg:grid-cols-[minmax(280px,0.88fr)_minmax(0,1.12fr)] lg:overflow-hidden">
      <aside className="relative overflow-hidden bg-navy text-white lg:h-full">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 80% 10%, rgba(92,225,230,0.3), transparent 55%), radial-gradient(ellipse 55% 45% at 5% 85%, rgba(255,210,63,0.16), transparent 50%), linear-gradient(165deg, #12153a 0%, #1b1f4b 48%, #1a3a4a 100%)',
          }}
        />
        <div className="relative z-10 flex h-full flex-col px-6 py-7 sm:px-10 lg:px-12 lg:py-10">
          <Link to="/" className="animate-rise inline-flex w-fit items-center gap-3">
            <Logo className="h-9 w-9" />
            <Wordmark light />
          </Link>
          <div className="animate-rise-delay mt-10 max-w-md lg:mt-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lcyan">Almost there</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.08] tracking-tight">
              Welcome, <span className="text-cyan">{firstName}</span>
            </h1>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-lavender/90">
              Three quick questions so we can tailor your practice checklist. Everything stays unlocked either way.
            </p>
          </div>
          <div className="animate-rise-delay mt-8 space-y-3 text-sm text-lavender/80 lg:mt-auto">
            <p>✓ Session secured for your organization only</p>
            <p>✓ Role-based menus — no shared “view as” switch</p>
            <p>✓ HIPAA-ready workspace with signed BAA</p>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-col bg-bg px-4 py-7 sm:px-8 lg:h-full lg:overflow-y-auto lg:px-12 lg:py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Step 1 of 1 · optional</p>
          <p className="text-sm text-muted">{user?.organizationName}</p>
        </div>

        <div className="animate-rise mx-auto w-full max-w-[640px] pb-6">
          <header className="mb-6">
            <h2 className="text-[26px] font-extrabold tracking-tight text-navy sm:text-[30px]">
              Set up your practice
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
              Tell us a little about {user?.organizationName || 'your organization'} so the dashboard opens in the right place.
            </p>
          </header>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="orgType" className="mb-1.5 block text-[13.5px] font-semibold text-navy">Organization type</label>
              <select
                id="orgType"
                className="field"
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
              >
                <option>Practice or clinic</option>
                <option>Chiropractic or physical therapy</option>
                <option>Hospital or health system</option>
                <option>Health agency</option>
                <option>Home health</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="ehrName" className="mb-1.5 block text-[13.5px] font-semibold text-navy">
                Current EHR <span className="font-normal text-muted">(optional)</span>
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

          <p className="mb-3 mt-7 text-[13.5px] font-semibold text-navy">
            What do you want to set up first? <span className="font-normal text-muted">(pick any)</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SERVICES.map((s) => {
              const on = selected.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`relative rounded-[14px] border-[1.5px] bg-white py-3.5 pl-14 pr-10 text-left transition ${
                    on
                      ? 'border-teal shadow-[0_0_0_3px_rgba(59,196,202,.22)]'
                      : 'border-line hover:border-[#B5BDD8]'
                  }`}
                >
                  <span className={`absolute left-4 top-4 h-[26px] w-[26px] rounded-md ${on ? s.chip : 'border-[1.5px] border-dashed border-[#C4CAE0] bg-soft'}`} />
                  {on && <span className="absolute right-3.5 top-3.5 text-xs font-bold text-navy">✓ Added</span>}
                  <span className="block text-base font-bold text-navy">{s.name}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-snug text-muted">{s.desc}</span>
                </button>
              )
            })}
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-[#F3C1BC] bg-[#FFF5F4] px-3.5 py-3 text-[13.5px] font-semibold text-warn" role="alert">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="text-[15px] font-bold text-navy underline-offset-2 hover:underline disabled:opacity-60"
              onClick={() => finish(true)}
              disabled={submitting}
            >
              Skip for now
            </button>
            <button
              type="button"
              className="rounded-xl bg-yellow px-6 py-3.5 text-[15px] font-bold text-navy transition hover:brightness-105 disabled:opacity-60"
              onClick={() => finish(false)}
              disabled={submitting}
            >
              {submitting ? 'Opening dashboard…' : 'Go to my dashboard'}
            </button>
          </div>
        </div>
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
        }
        .field:focus-visible {
          outline: none;
          border-color: var(--color-teal);
          box-shadow: 0 0 0 4px rgba(59, 196, 202, 0.35);
        }
      `}</style>
    </div>
  )
}
