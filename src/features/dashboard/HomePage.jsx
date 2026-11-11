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
    <div className="space-y-6">
      {!user?.emailVerified && (
        <div className="rounded-[16px] border border-[#f3d5d5] bg-[#fff4f4] px-4 py-3 text-sm text-[#7d3d3d] shadow-[0_12px_24px_rgba(122,39,26,0.04)]">
          <b>Verify your email</b> to unlock patient-information features for this practice.
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#69789a]">Overview</p>
          <h1 className="m-0 text-[30px] font-black tracking-[-0.05em] text-[#171d39]">Practice dashboard</h1>
          <p className="mt-1 text-sm text-[#4c5678]">
            Live counts for {user?.organizationName}. Signed in as {roleLabel(user?.role)}.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-[#f3c9c9] bg-[#fff4f4] px-3.5 py-3 text-sm font-semibold text-[#b74545]">
          {error}
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.key}
            to={kpi.to}
            className="group rounded-[22px] border border-[#eaeef9] bg-[linear-gradient(135deg,#ffffff_0%,#f8faff_100%)] p-4 no-underline shadow-[0_12px_28px_rgba(17,24,52,0.06)] transition duration-200 hover:-translate-y-1 hover:border-[#9ddedc] hover:shadow-[0_20px_36px_rgba(17,24,52,0.09)]"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="rounded-full bg-[#ebf7f7] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1c8f8e]">
                {kpi.key}
              </span>
            </div>
            <div className="font-mono text-[30px] font-semibold tracking-[-0.04em] text-[#171d39]">
              {loading && summary == null ? '—' : (kpi.n ?? 0)}
            </div>
            <div className="mt-2 text-[13px] text-[#4c5678]">{kpi.l}</div>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-5">
        <section className="min-w-0 flex-[1_1_360px] rounded-[24px] border border-[#eaeef9] bg-white p-5 shadow-[0_18px_32px_rgba(17,24,52,0.05)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#171d39]">Needs attention</h2>
            <span className="rounded-full bg-[#ebf9f8] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#1c8f8e]">
              Live
            </span>
          </div>
          <ul className="m-0 list-none p-0">
            {(summary?.attention || []).map((item) => (
              <li key={item.title} className="flex gap-3 border-b border-[#edf1fa] py-3 last:border-0">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[item.tone] || DOT.teal}`} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold text-[#171d39]">{item.title}</p>
                  <p className="m-0 mt-0.5 text-[13px] text-[#4c5678]">{item.meta}</p>
                </div>
                <span className={`ml-auto self-start rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE[item.tone] || TONE.teal}`}>
                  {item.tone === 'red' ? 'Action' : 'Info'}
                </span>
              </li>
            ))}
            {!loading && !summary?.attention?.length && (
              <li className="py-3 text-sm text-[#4c5678]">No items yet — add providers, staff, vendors, or leads.</li>
            )}
          </ul>
        </section>

        <section className="min-w-0 flex-[1_1_290px] rounded-[24px] border border-[#eaeef9] bg-white p-5 shadow-[0_18px_32px_rgba(17,24,52,0.05)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#171d39]">Quick actions</h2>
            <span className="rounded-full bg-[#fff3d8] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#a8741e]">
              Fast
            </span>
          </div>
          <div className="grid gap-2.5">
            <Action to="/app/providers" tone="teal">Register a provider</Action>
            <Action to="/app/staff" tone="amber">Add staff member</Action>
            <Action to="/app/vendors" tone="lavender">Add vendor + BAA</Action>
            <Action to="/app/crm" tone="ink">Log a patient lead</Action>
          </div>
        </section>
      </div>
    </div>
  )
}

function Action({ to, children, tone = 'teal' }) {
  const accent = {
    teal: 'border-[#cfeef0] bg-[#f2fbfb]',
    amber: 'border-[#f1d9a9] bg-[#fffaf2]',
    lavender: 'border-[#dfe0fb] bg-[#f7f5ff]',
    ink: 'border-[#e4e8f7] bg-[#f7f9ff]',
  }

  return (
    <Link
      to={to}
      className={`group flex min-h-[56px] items-center justify-between gap-3 rounded-[16px] border px-3.5 py-2.5 text-sm font-semibold text-[#171d39] no-underline transition duration-150 hover:-translate-y-0.5 hover:border-[#8fd9d2] hover:shadow-[0_12px_24px_rgba(17,24,52,0.06)] ${accent[tone] || accent.teal}`}
    >
      <span className="text-[14px] text-[#171d39]">{children}</span>
      <span className="text-[15px] font-bold text-[#171d39] transition group-hover:translate-x-0.5">→</span>
    </Link>
  )
}
