import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'
import { roleLabel } from '../../shared/security/roles'

const DOT = {
  teal: 'bg-[#0A7A82]',
  amber: 'bg-[#C97A12]',
  red: 'bg-[#C4321F]',
  green: 'bg-[#155E62]',
  blue: 'bg-[#1D4E9A]',
  ink: 'bg-[#4A3D8F]',
}

const TONE = {
  teal: 'bg-[#DEF2F3] text-[#155E62]',
  amber: 'bg-[#FDF0DC] text-[#7E4305]',
  red: 'bg-[#FDE7E4] text-[#9B1C12]',
  green: 'bg-[#DEF2F3] text-[#155E62]',
  blue: 'bg-[#E2ECFA] text-[#1D4E9A]',
  ink: 'bg-[#E7E4F5] text-[#4A3D8F]',
}

export default function HomePage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await api('/api/v1/dashboard/summary')
        if (alive) setSummary(data)
      } catch (err) {
        if (alive) setError(err.message || 'Could not load dashboard')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const kpis = [
    { key: 'leads', n: summary?.activePatientLeads, l: 'Patient leads', to: '/app/crm' },
    { key: 'followups', n: summary?.openLeadFollowUps, l: 'Open lead follow-ups', to: '/app/crm' },
    { key: 'providers', n: summary?.providerCount, l: 'Providers registered', to: '/app/providers' },
    { key: 'onboarding', n: summary?.staffOnboarding, l: 'Staff onboarding', to: '/app/staff' },
    { key: 'licenses', n: summary?.expiringLicenses, l: 'Licenses ≤ 60 days', to: '/app/providers' },
    { key: 'vendors', n: summary?.vendorsNeedingBaa, l: 'Vendors needing BAA', to: '/app/vendors' },
  ]

  return (
    <div>
      {!user?.emailVerified && (
        <div className="mb-4 rounded-[12px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#7A271A]">
          <b>Verify your email</b> to unlock patient-information features for this practice.
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em] text-navy">Practice dashboard</h1>
          <p className="mt-1 text-sm text-[#43476A]">
            Live counts for {user?.organizationName}. Signed in as {roleLabel(user?.role)}.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-[#F3C1BC] bg-[#FFF5F4] px-3.5 py-3 text-sm font-semibold text-warn">
          {error}
        </p>
      )}

      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
        {kpis.map((kpi) => (
          <Link
            key={kpi.key}
            to={kpi.to}
            className="rounded-[12px] border border-[#D9DAE1] bg-white px-5 py-[18px] no-underline transition hover:border-[#0A7A82]"
          >
            <div className="font-mono text-[32px] font-medium tracking-[-0.02em] text-navy">
              {loading && summary == null ? '—' : (kpi.n ?? 0)}
            </div>
            <div className="mt-1 text-[13px] text-[#43476A]">{kpi.l}</div>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-[18px]">
        <section className="min-w-0 flex-[1_1_320px] rounded-[12px] border border-[#D9DAE1] bg-white px-5 py-[18px]">
          <h2 className="mb-3 text-base font-semibold text-navy">Needs attention</h2>
          <ul className="m-0 list-none p-0">
            {(summary?.attention || []).map((item) => (
              <li key={item.title} className="flex gap-3 border-b border-[#EAEBF4] py-3 last:border-0">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[item.tone] || DOT.teal}`} />
                <div>
                  <p className="m-0 text-sm font-semibold text-navy">{item.title}</p>
                  <p className="m-0 mt-0.5 text-[13px] text-[#4C5076]">{item.meta}</p>
                </div>
                <span className={`ml-auto self-start rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE[item.tone] || TONE.teal}`}>
                  Live
                </span>
              </li>
            ))}
            {!loading && !summary?.attention?.length && (
              <li className="py-3 text-sm text-[#4C5076]">No items yet — add providers, staff, vendors, or leads.</li>
            )}
          </ul>
        </section>

        <section className="min-w-0 flex-[1_1_280px] rounded-[12px] border border-[#D9DAE1] bg-white px-5 py-[18px]">
          <h2 className="mb-3 text-base font-semibold text-navy">Quick actions</h2>
          <div className="flex flex-col gap-2">
            <Action to="/app/providers">Register a provider</Action>
            <Action to="/app/staff">Add staff member</Action>
            <Action to="/app/vendors">Add vendor + BAA</Action>
            <Action to="/app/crm">Log a patient lead</Action>
          </div>
        </section>
      </div>
    </div>
  )
}

function Action({ to, children }) {
  return (
    <Link
      to={to}
      className="min-h-11 rounded-lg border border-[#C8C9D4] bg-white px-4 text-sm font-semibold text-[#151621] no-underline transition hover:bg-[#F1F2F8]"
    >
      {children}
    </Link>
  )
}
