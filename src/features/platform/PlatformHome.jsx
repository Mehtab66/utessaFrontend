import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bars, Cols, EmptyNote, Kpi, PageHeader, Panel, StatusPill, statusTone } from './ui'
import { usePlatformApi } from './usePlatformApi'

const TABS = [
  ['summary', 'Summary'],
  ['growth', 'Growth'],
  ['revenue', 'Revenue'],
  ['engagement', 'Engagement'],
  ['value', 'Proof of value'],
  ['costs', 'Costs and margin'],
  ['market', 'Market'],
  ['health', 'Health and compliance'],
]

export default function PlatformHome() {
  const { data, loading, error } = usePlatformApi('/api/v1/platform/overview')
  const [tab, setTab] = useState('summary')

  const asOf = useMemo(() => {
    if (!data?.generatedAt) return ''
    return new Date(data.generatedAt).toLocaleString()
  }, [data])

  return (
    <div>
      <PageHeader
        title="Utessa at a glance"
        subtitle="Totals across every organization. Patient records, leads and documents never appear in this console."
        right={<span className="text-sm text-[#4A4E7A]">{asOf ? `As of ${asOf}` : loading ? 'Loading…' : ''}</span>}
      />

      {error && (
        <p className="mb-4 rounded-xl border border-[#F3C1BC] bg-[#FFF5F4] px-3.5 py-3 text-sm font-semibold text-[#B4472F]">
          {error}
        </p>
      )}

      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-[#DCDFEE] pb-0" role="tablist" aria-label="Overview sections">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              tab === id
                ? 'border-[#3BC4CA] text-[#1B1F4B]'
                : 'border-transparent text-[#4A4E7A] hover:text-[#1B1F4B]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' && <SummaryTab data={data} loading={loading} />}
      {tab === 'growth' && <GrowthTab data={data} />}
      {tab === 'revenue' && <PlaceholderTab title="Revenue" copy="MRR, plan mix, founding discounts and failed payments will aggregate here once Stripe billing is wired." />}
      {tab === 'engagement' && <PlaceholderTab title="Engagement" copy="Module adoption and idle organizations will appear here from product telemetry." />}
      {tab === 'value' && <PlaceholderTab title="Proof of value" copy="Credentials renewed, missed-call text-backs, leads and BAAs — organization totals only, never patient detail." />}
      {tab === 'costs' && <PlaceholderTab title="Costs and margin" copy="Texting, AI voice and hosting cost vs plan revenue will land here after usage metering." />}
      {tab === 'market' && <PlaceholderTab title="Market" copy="Organizations and early-access sign-ups by city for the Texas launch." />}
      {tab === 'health' && <HealthTab data={data} />}
    </div>
  )
}

function SummaryTab({ data, loading }) {
  const orgs = data?.organizationCount ?? (loading ? '—' : 0)
  const trials = data?.trialCount ?? 0
  const members = data?.memberCount ?? 0
  const verified = data?.verifiedUserCount ?? 0
  const incomplete = data?.onboardingIncomplete ?? 0
  const byType = (data?.byOrgType || []).map((x) => ({ label: x.type, value: x.count }))
  const months = (data?.enrolledByMonth || []).map((x) => ({ label: x.month, value: x.count }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="Organizations enrolled" value={orgs} sub={`${trials} on trial · ${incomplete} still onboarding`} />
        <Kpi label="Users across organizations" value={members} sub={`${verified} verified emails`} />
        <Kpi label="Trials ending ≤ 7 days" value={data?.activeTrialEndingSoon ?? 0} sub="Follow up before they lapse" />
        <Kpi label="Platform operators" value={data?.superAdminCount ?? 0} sub="Superadmin accounts" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Organizations by type" right={`${orgs} total`}>
          <Bars rows={byType} />
        </Panel>
        <Panel title="Enrolled over time" right="Total at month end">
          <Cols rows={months} />
        </Panel>
        <Panel title="Needs attention" right="Live">
          <ul className="m-0 list-none space-y-3 p-0">
            {(data?.attention || []).map((item) => (
              <li key={`${item.priority}-${item.title}`} className="border-b border-[#EBECF4] pb-3 last:border-0 last:pb-0">
                <div className="mb-1">
                  <StatusPill tone={statusTone(item.priority)}>{item.priority}</StatusPill>
                </div>
                <p className="m-0 text-sm font-semibold text-[#1B1F4B]">{item.title}</p>
                <p className="m-0 mt-0.5 text-[13px] text-[#4A4E7A]">{item.detail}</p>
                {item.href && (
                  <Link to={item.href} className="mt-1 inline-block text-[13px] font-semibold text-[#1E8E94]">
                    Open
                  </Link>
                )}
              </li>
            ))}
            {!loading && !(data?.attention || []).length && (
              <li className="text-sm text-[#4A4E7A]">Nothing urgent — practices look healthy.</li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function GrowthTab({ data }) {
  const months = (data?.enrolledByMonth || []).map((x) => ({ label: x.month, value: x.count }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="Organizations enrolled" value={data?.organizationCount ?? 0} sub="All time" />
        <Kpi label="On trial now" value={data?.trialCount ?? 0} sub="Active trial window" />
        <Kpi label="Onboarding incomplete" value={data?.onboardingIncomplete ?? 0} sub="Welcome flow not finished" />
        <Kpi label="Ending ≤ 7 days" value={data?.activeTrialEndingSoon ?? 0} sub="Sales follow-up" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Enrolled over time" right="Cumulative">
          <Cols rows={months} />
        </Panel>
        <Panel title="Why organizations cancel" right="All time">
          <EmptyNote>No cancellations yet. When one happens, the reason picked at cancellation shows here.</EmptyNote>
        </Panel>
      </div>
    </div>
  )
}

function HealthTab({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="Organizations" value={data?.organizationCount ?? 0} sub="On the platform" />
        <Kpi label="Verified users" value={data?.verifiedUserCount ?? 0} sub="Email confirmed" />
        <Kpi label="Onboarding gaps" value={data?.onboardingIncomplete ?? 0} sub="Practice setup unfinished" />
        <Kpi label="Trials ending soon" value={data?.activeTrialEndingSoon ?? 0} sub="Within 7 days" />
      </div>
      <Panel title="Compliance notes" right="Platform">
        <EmptyNote>
          Business Associate Agreements and security alerts will list here. Patient data never appears in this console —
          only organization-level compliance status.
        </EmptyNote>
      </Panel>
    </div>
  )
}

function PlaceholderTab({ title, copy }) {
  return (
    <Panel title={title}>
      <EmptyNote>{copy}</EmptyNote>
    </Panel>
  )
}
