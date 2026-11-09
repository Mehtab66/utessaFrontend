import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { Logo, Wordmark } from '../../shared/ui/Logo'

const SERVICES = [
  { id: 'crm', name: 'CRM', desc: 'Patient leads, call tracking, referral CRM, pipelines and contact history.', chip: 'crm' },
  { id: 'ops', name: 'Operations', desc: 'Documents, dashboard, vendor management with BAA flags, role-based access and audit log.', chip: 'ops' },
  { id: 'mkt', name: 'Marketing & Outreach', desc: 'Review requests and monitoring, email campaigns, social posting and text campaigns.', chip: 'mkt' },
  { id: 'tc', name: 'Time Clock', desc: 'Clock in and out, timesheets, mobile app and payroll export.', chip: 'tc' },
]

const CHIP = {
  crm: 'bg-cyan',
  ops: 'bg-lavender',
  mkt: 'bg-yellow',
  tc: 'bg-teal',
}

export default function WelcomePage() {
  const { user, loginWithToken, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const [orgType, setOrgType] = useState('Practice or clinic')
  const [ehrName, setEhrName] = useState('')
  const [selected, setSelected] = useState(['crm'])
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const firstName = (user?.fullName || 'there').split(/\s+/)[0]

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function finish(skip) {
    setSubmitting(true)
    try {
      const me = await api('/api/v1/onboarding/welcome', {
        method: 'PATCH',
        body: skip
          ? { orgType: null, ehrName: null, enabledServices: null }
          : { orgType, ehrName, enabledServices: selected },
      })
      const token = localStorage.getItem('utessa_token')
      loginWithToken(token, me)
      navigate('/app')
    } catch {
      navigate('/app')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <main className="mx-auto max-w-[760px] overflow-hidden rounded-[18px] bg-white shadow-[var(--shadow-panel)]">
        <div className="flex items-center gap-3 bg-navy px-6 py-4 text-white">
          <Logo className="h-10 w-10" />
          <Wordmark light />
          <span className="ml-auto text-sm font-semibold text-lcyan">Step 1 of 1 · optional</span>
        </div>
        <div className="px-6 py-7 sm:px-8">
          <h2 className="text-[26px] font-bold text-navy">Welcome, {firstName}</h2>
          <p className="mb-5 mt-1 text-[15px] text-muted">Three quick questions so we can set up your checklist. Everything stays unlocked either way.</p>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13.5px] font-semibold text-navy">Organization type</label>
              <select className="w-full rounded-[10px] border-[1.5px] border-line px-3.5 py-2.5" value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                <option>Practice or clinic</option>
                <option>Chiropractic or physical therapy</option>
                <option>Hospital or health system</option>
                <option>Health agency</option>
                <option>Home health</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13.5px] font-semibold text-navy">Current EHR <span className="font-normal text-muted">(optional)</span></label>
              <input className="w-full rounded-[10px] border-[1.5px] border-line px-3.5 py-2.5" value={ehrName} onChange={(e) => setEhrName(e.target.value)} placeholder="e.g. athenahealth" />
            </div>
          </div>

          <p className="mb-3 mt-5 text-[13.5px] font-semibold text-navy">What do you want to set up first? <span className="font-normal text-muted">(pick any)</span></p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SERVICES.map((s) => {
              const on = selected.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`relative rounded-[14px] border-[1.5px] py-3.5 pl-14 pr-10 text-left transition ${on ? 'border-navy shadow-[0_0_0_3px_rgba(27,31,75,.08)]' : 'border-line hover:border-[#B5BDD8]'}`}
                >
                  <span className={`absolute left-4 top-4 h-[26px] w-[26px] rounded-md ${on ? CHIP[s.chip] : 'border-[1.5px] border-dashed border-[#C4CAE0] bg-soft'}`} />
                  {on && <span className="absolute right-3.5 top-3.5 text-xs font-bold text-navy">✓ Added</span>}
                  <span className="block text-base font-bold text-navy">{s.name}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-snug text-muted">{s.desc}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="text-[15px] font-bold text-navy underline-offset-2 hover:underline" onClick={() => finish(true)} disabled={submitting}>
              Skip for now
            </button>
            <button type="button" className="rounded-xl bg-navy px-6 py-3 text-[15px] font-bold text-white hover:bg-[#2B3173] disabled:opacity-60" onClick={() => finish(false)} disabled={submitting}>
              Go to my dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
