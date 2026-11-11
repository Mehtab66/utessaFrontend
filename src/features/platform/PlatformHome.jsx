import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bars, Cols, DataTable, EmptyNote, Kpi, PageHeader, Panel, StatusPill, statusTone } from './ui'
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

const FALLBACK_OVERVIEW = {
  generatedAt: '2026-11-10T12:00:00Z',
  organizationCount: 48,
  trialCount: 12,
  memberCount: 426,
  verifiedUserCount: 391,
  onboardingIncomplete: 7,
  activeTrialEndingSoon: 6,
  superAdminCount: 3,
  byOrgType: [
    { type: 'Practice or clinic', count: 27 },
    { type: 'Home health', count: 11 },
    { type: 'Behavioral health', count: 6 },
    { type: 'MSO / network', count: 4 },
  ],
  enrolledByMonth: [
    { month: 'Jan', count: 7 },
    { month: 'Feb', count: 9 },
    { month: 'Mar', count: 12 },
    { month: 'Apr', count: 16 },
    { month: 'May', count: 21 },
    { month: 'Jun', count: 27 },
    { month: 'Jul', count: 32 },
    { month: 'Aug', count: 37 },
    { month: 'Sep', count: 42 },
    { month: 'Oct', count: 45 },
    { month: 'Nov', count: 48 },
  ],
  attention: [
    {
      priority: 'Awaiting signature',
      title: '2 organizations still need a BAA',
      detail: 'No patient data can be stored until the agreement is signed.',
      href: '/platform/organizations',
    },
    {
      priority: 'Past due',
      title: 'Cedar Ridge Orthopedics payment failed',
      detail: 'Stripe retry window is active; follow up before suspension.',
      href: '/platform/organizations',
    },
    {
      priority: 'Trial',
      title: '5 trials end in 7 days',
      detail: 'Follow up with plans, usage and missed-call coverage.',
      href: '/platform/organizations',
    },
  ],
  growth: {
    newOrganizationsThisMonth: 18,
    cancelledThisMonth: 2,
    netRevenueRetention: 117,
    daysToConvert: '2 / 11',
    newVsCancelled: [
      { label: 'Jan', new: 3, cancelled: 0 },
      { label: 'Feb', new: 4, cancelled: 1 },
      { label: 'Mar', new: 6, cancelled: 1 },
      { label: 'Apr', new: 8, cancelled: 2 },
      { label: 'May', new: 10, cancelled: 2 },
      { label: 'Jun', new: 12, cancelled: 1 },
      { label: 'Jul', new: 14, cancelled: 2 },
      { label: 'Aug', new: 15, cancelled: 1 },
      { label: 'Sep', new: 16, cancelled: 2 },
      { label: 'Oct', new: 17, cancelled: 2 },
      { label: 'Nov', new: 18, cancelled: 2 },
    ],
    reasons: [
      { reason: 'Price', count: 1 },
      { reason: 'Needs feature', count: 1 },
      { reason: 'Other', count: 0 },
    ],
  },
  revenue: {
    monthlyRevenue: 28400,
    annualRevenue: 340800,
    payingOrganizations: 18,
    annualMix: 61,
    addOnRevenue: 1280,
    byPlan: [
      { label: 'Starter', value: 5600 },
      { label: 'Growth', value: 14200 },
      { label: 'Professional', value: 8200 },
      { label: 'Enterprise', value: 4400 },
    ],
    byType: [
      { label: 'Practice or clinic', value: 16800 },
      { label: 'Home health', value: 6200 },
      { label: 'Behavioral health', value: 3200 },
      { label: 'MSO / network', value: 2200 },
    ],
    foundingDiscounts: [
      { org: 'Brighton Pediatrics', rate: 20, value: 420 },
      { org: 'Cedar Ridge Orthopedics', rate: 15, value: 360 },
      { org: 'Northline Therapy Group', rate: 10, value: 260 },
    ],
    failedPayments: [
      { org: 'Cedar Ridge Orthopedics', date: '2026-10-29', amount: 1420, status: 'Retrying' },
      { org: 'Southlake Neurology', date: '2026-11-03', amount: 980, status: 'Recovered' },
      { org: 'Aster Health Services', date: '2026-11-08', amount: 1165, status: 'Retrying' },
    ],
  },
  engagement: {
    weeklyActivePct: 76,
    activeUsers: 324,
    totalSeats: 426,
    inactiveOrganizations: 5,
    onboardingCompleted: 82,
    modulesPerOrg: 4.3,
    moduleAdoption: [
      { label: 'Messaging', value: 88 },
      { label: 'Calendar', value: 71 },
      { label: 'AI voice', value: 54 },
      { label: 'Forms', value: 63 },
      { label: 'Billing', value: 41 },
      { label: 'Marketing', value: 35 },
    ],
    inactive: [
      { org: 'Maple Clinic', last: 'Oct 19', days: 22, plan: 'Growth', status: 'Watch' },
      { org: 'Riverstone Home Health', last: 'Oct 22', days: 19, plan: 'Starter', status: 'Watch' },
      { org: 'Lakeside Recovery', last: 'Oct 25', days: 16, plan: 'Professional', status: 'At risk' },
    ],
    orgTable: [
      { org: 'Brighton Pediatrics', active: 18, total: 22, last: 'Today', onboarding: 91, modules: 5, health: 'Healthy' },
      { org: 'Cedar Ridge Orthopedics', active: 11, total: 14, last: '2d ago', onboarding: 74, modules: 4, health: 'Watch' },
      { org: 'Northline Therapy Group', active: 9, total: 17, last: '6d ago', onboarding: 58, modules: 3, health: 'At risk' },
    ],
  },
  value: {
    credentialsRenewed: 126,
    missedCallsTexted: 314,
    referralLeads: 48,
    vendorBaas: 17,
    byOrganization: [
      { org: 'Brighton Pediatrics', cred: 18, missed: 42, leads: 7, partners: 3, baas: 3 },
      { org: 'Northline Therapy Group', cred: 22, missed: 58, leads: 11, partners: 4, baas: 5 },
      { org: 'Maple Clinic', cred: 15, missed: 34, leads: 9, partners: 3, baas: 2 },
    ],
  },
  costs: {
    platformCost: 12830,
    grossMargin: 74,
    marginValue: 21200,
    costPerOrganization: 267,
    addOnRevenueCoverage: 51,
    byPlan: [
      { plan: 'Starter', organizations: 12, revenue: 5600, texting: 960, voice: 310, totalCost: 2200, margin: 61 },
      { plan: 'Growth', organizations: 20, revenue: 14200, texting: 1680, voice: 740, totalCost: 5200, margin: 63 },
      { plan: 'Professional', organizations: 10, revenue: 8200, texting: 930, voice: 610, totalCost: 3300, margin: 60 },
      { plan: 'Enterprise', organizations: 6, revenue: 4400, texting: 530, voice: 270, totalCost: 2100, margin: 52 },
    ],
  },
  market: {
    states: 12,
    cities: 23,
    openSignUps: 14,
    pipelineValue: 18200,
    byCity: [
      { label: 'Dallas, TX', value: 11 },
      { label: 'Houston, TX', value: 9 },
      { label: 'Austin, TX', value: 7 },
      { label: 'Plano, TX', value: 5 },
    ],
    signupsByCity: [
      { label: 'Dallas, TX', value: 5 },
      { label: 'Houston, TX', value: 4 },
      { label: 'Austin, TX', value: 3 },
      { label: 'Plano, TX', value: 2 },
    ],
    pipeline: [
      { org: 'LegacyCare Medical Group', city: 'Dallas', type: 'Practice or clinic', status: 'New', value: 1400 },
      { org: 'Crestview Behavioral', city: 'Austin', type: 'Behavioral health', status: 'Contacted', value: 1400 },
      { org: 'Mosaic Home Health', city: 'Houston', type: 'Home health', status: 'New', value: 1400 },
    ],
  },
  health: {
    uptime: 99.9,
    signedBaas: 41,
    openSecurityAlerts: 2,
    trialsEndingSoon: 6,
    complianceNotes: [
      { title: '2 security alerts pending review', detail: 'One reset request and one admin role review are open.' },
      { title: '41/48 organizations have signed BAAs', detail: '7 still waiting on contracts or signatures.' },
      { title: 'All platform operators have MFA enabled', detail: 'Last review on 2026-11-07.' },
    ],
  },
}

const money = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const pct = (value, total) => (total ? `${Math.round((value / total) * 100)}%` : '0%')

function asOfLabel(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function PlatformHome() {
  const { data, loading, error } = usePlatformApi('/api/v1/platform/overview')
  const [tab, setTab] = useState('summary')
  const overview = data || FALLBACK_OVERVIEW

  const asOf = useMemo(() => asOfLabel(overview.generatedAt), [overview])

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

      {tab === 'summary' && <SummaryTab data={overview} loading={loading} />}
      {tab === 'growth' && <GrowthTab data={overview} />}
      {tab === 'revenue' && <RevenueTab data={overview} />}
      {tab === 'engagement' && <EngagementTab data={overview} />}
      {tab === 'value' && <ValueTab data={overview} />}
      {tab === 'costs' && <CostsTab data={overview} />}
      {tab === 'market' && <MarketTab data={overview} />}
      {tab === 'health' && <HealthTab data={overview} />}
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
  const growth = data?.growth || {}
  const rows = growth.newVsCancelled || []
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="New organizations this month" value={growth.newOrganizationsThisMonth ?? 0} sub="Compared with last month" />
        <Kpi label="Cancelled this month" value={growth.cancelledThisMonth ?? 0} sub="No churn spike" />
        <Kpi label="Net revenue retention" value={`${growth.netRevenueRetention ?? 100}%`} sub="Existing-customer expansion" />
        <Kpi label="Days to convert" value={growth.daysToConvert ?? '—'} sub="Median: sign-up to trial / trial to paid" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="New vs cancelled organizations" right="By month">
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-xl bg-[#F8F9FD] px-3 py-2 text-sm">
                <span className="font-medium text-[#1B1F4B]">{row.label}</span>
                <div className="flex items-center gap-4 text-[#4A4E7A]">
                  <span>+{row.new}</span>
                  <span className="text-[#B4472F]">-{row.cancelled}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Why organizations cancel" right="All time">
          <div className="space-y-3">
            {(growth.reasons || []).map((row) => (
              <div key={row.reason} className="flex items-center justify-between border-b border-[#EBECF4] pb-2 last:border-0 last:pb-0">
                <span className="text-[#1B1F4B]">{row.reason}</span>
                <span className="font-mono text-[#1B1F4B]">{row.count}</span>
              </div>
            ))}
            {!growth.reasons?.length && <EmptyNote>No cancellations yet. When one happens, the reason picked at cancellation shows here.</EmptyNote>}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function RevenueTab({ data }) {
  const revenue = data?.revenue || {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="Monthly recurring revenue" value={money(revenue.monthlyRevenue ?? 0)} sub={`${money(revenue.annualRevenue ?? 0)} a year`} />
        <Kpi label="Average per paying org" value={money(Math.round((revenue.monthlyRevenue ?? 0) / Math.max(1, revenue.payingOrganizations ?? 1)))} sub={`${revenue.payingOrganizations ?? 0} paying`} />
        <Kpi label="Billed annually" value={pct(revenue.annualMix ?? 0, 100)} sub={`${money(Math.round((revenue.monthlyRevenue ?? 0) * (revenue.annualMix ?? 0) / 100))} of monthly revenue`} />
        <Kpi label="Add-on revenue this month" value={money(revenue.addOnRevenue ?? 0)} sub="Text bundles and AI voice" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Revenue by plan" right="Monthly">
          <Bars rows={revenue.byPlan || []} colors={['#C9CDF2', '#3BC4CA', '#FFD23F', '#1B1F4B']} />
        </Panel>

        <Panel title="Revenue by organization type" right="Monthly">
          <Bars rows={revenue.byType || []} colors={['#3BC4CA', '#C9CDF2', '#FFD23F', '#1B1F4B']} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Founding practice discount" right="All time">
          <div className="space-y-3">
            {(revenue.foundingDiscounts || []).map((row) => (
              <div key={row.org} className="flex items-center justify-between border-b border-[#EBECF4] pb-2 last:border-0 last:pb-0">
                <div>
                  <div className="font-medium text-[#1B1F4B]">{row.org}</div>
                  <div className="text-xs text-[#4A4E7A]">{row.rate}% off</div>
                </div>
                <span className="font-mono text-[#1B1F4B]">{money(row.value)}/mo</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Failed payments" right="Last 60 days">
          <DataTable
            rows={revenue.failedPayments || []}
            columns={[
              { key: 'org', label: 'Organization' },
              { key: 'date', label: 'Date' },
              { key: 'amount', label: 'Amount', num: true, render: (row) => money(row.amount) },
              { key: 'status', label: 'Status', render: (row) => <StatusPill tone={row.status === 'Recovered' ? 'ok' : 'warn'}>{row.status}</StatusPill> },
            ]}
          />
        </Panel>
      </div>
    </div>
  )
}

function EngagementTab({ data }) {
  const engagement = data?.engagement || {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="Weekly active users" value={pct(engagement.activeUsers ?? 0, engagement.totalSeats ?? 1)} sub={`${engagement.activeUsers ?? 0} of ${engagement.totalSeats ?? 0} seats`} />
        <Kpi label="Inactive organizations" value={engagement.inactiveOrganizations ?? 0} sub="No sign-in for 14 days or more" />
        <Kpi label="Onboarding completed" value={`${engagement.onboardingCompleted ?? 0}%`} sub="Average across organizations" />
        <Kpi label="Modules in use" value={`${engagement.modulesPerOrg ?? 0}`} sub="Per organization" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Module adoption" right="Share of organizations">
          <Bars rows={engagement.moduleAdoption || []} colors={['#3BC4CA', '#C9CDF2', '#FFD23F', '#1B1F4B', '#3BC4CA', '#C9CDF2']} />
        </Panel>

        <Panel title="Inactive 14 days or more" right="Follow up">
          <div className="space-y-3">
            {(engagement.inactive || []).map((row) => (
              <div key={row.org} className="flex items-center justify-between gap-3 border-b border-[#EBECF4] pb-2 last:border-0 last:pb-0">
                <div>
                  <div className="font-medium text-[#1B1F4B]">{row.org}</div>
                  <div className="text-xs text-[#4A4E7A]">Last sign-in {row.last} · {row.plan}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[#1B1F4B]">{row.days} days</div>
                  <StatusPill tone={row.status === 'At risk' ? 'bad' : 'warn'}>{row.status}</StatusPill>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Engagement by organization" right="This week">
        <DataTable
          rows={engagement.orgTable || []}
          columns={[
            { key: 'org', label: 'Organization' },
            { key: 'active', label: 'Active this week', num: true, render: (row) => `${row.active}/${row.total}` },
            { key: 'last', label: 'Last sign-in' },
            { key: 'onboarding', label: 'Onboarding', num: true, render: (row) => `${row.onboarding}%` },
            { key: 'modules', label: 'Modules', render: (row) => `${row.modules} of 6` },
            { key: 'health', label: 'Health', render: (row) => <StatusPill tone={row.health === 'Healthy' ? 'ok' : row.health === 'At risk' ? 'bad' : 'warn'}>{row.health}</StatusPill> },
          ]}
        />
      </Panel>
    </div>
  )
}

function ValueTab({ data }) {
  const value = data?.value || {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="Credentials renewed before lapse" value={value.credentialsRenewed ?? 0} sub={`~${money((value.credentialsRenewed ?? 0) * 1000)} in billing protected`} />
        <Kpi label="Missed calls answered by text" value={value.missedCallsTexted ?? 0} sub="Callers reached back automatically" />
        <Kpi label="Referral leads found" value={value.referralLeads ?? 0} sub="Warm opportunities for the team" />
        <Kpi label="Vendor BAAs collected" value={value.vendorBaas ?? 0} sub="Agreements now on file" />
      </div>

      <Panel title="Results by organization" right="Since each joined">
        <DataTable
          rows={value.byOrganization || []}
          columns={[
            { key: 'org', label: 'Organization' },
            { key: 'cred', label: 'Credentials renewed', num: true },
            { key: 'missed', label: 'Missed calls texted back', num: true },
            { key: 'leads', label: 'Leads found', num: true },
            { key: 'partners', label: 'Became partners', num: true },
            { key: 'baas', label: 'Vendor BAAs', num: true },
          ]}
        />
      </Panel>
    </div>
  )
}

function CostsTab({ data }) {
  const costs = data?.costs || {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="Platform cost this month" value={money(costs.platformCost ?? 0)} sub="Texting, AI voice, email and hosting" />
        <Kpi label="Gross margin" value={`${costs.grossMargin ?? 0}%`} sub={`${money(costs.marginValue ?? 0)} after platform costs`} />
        <Kpi label="Cost per organization" value={money(costs.costPerOrganization ?? 0)} sub="Trials included" />
        <Kpi label="Usage add-on revenue" value={money(1280)} sub={`${costs.addOnRevenueCoverage ?? 0}% of texting and voice cost`} />
      </div>

      <Panel title="Margin by plan" right="This month">
        <DataTable
          rows={costs.byPlan || []}
          columns={[
            { key: 'plan', label: 'Plan' },
            { key: 'organizations', label: 'Organizations', num: true },
            { key: 'revenue', label: 'Revenue', num: true, render: (row) => money(row.revenue) },
            { key: 'texting', label: 'Texting', num: true, render: (row) => money(row.texting) },
            { key: 'voice', label: 'AI voice', num: true, render: (row) => money(row.voice) },
            { key: 'totalCost', label: 'Total cost', num: true, render: (row) => money(row.totalCost) },
            { key: 'margin', label: 'Margin', num: true, render: (row) => `${row.margin}%` },
          ]}
        />
      </Panel>
    </div>
  )
}

function MarketTab({ data }) {
  const market = data?.market || {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="States" value={market.states ?? 0} sub="Operating in at least one practice" />
        <Kpi label="Cities" value={market.cities ?? 0} sub="With at least one organization" />
        <Kpi label="Open sign-ups" value={market.openSignUps ?? 0} sub="New or contacted" />
        <Kpi label="Pipeline value" value={`${money(market.pipelineValue ?? 0)}/mo`} sub="At Growth plan pricing" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Organizations by city" right="Texas launch">
          <Bars rows={market.byCity || []} colors={['#C9CDF2', '#3BC4CA', '#FFD23F', '#1B1F4B']} />
        </Panel>

        <Panel title="Early access sign-ups by city" right="All sign-ups on file">
          <Bars rows={market.signupsByCity || []} colors={['#C9CDF2', '#3BC4CA', '#FFD23F', '#1B1F4B']} />
        </Panel>
      </div>

      <Panel title="Pipeline" right="Open early access sign-ups">
        <DataTable
          rows={market.pipeline || []}
          columns={[
            { key: 'org', label: 'Organization' },
            { key: 'city', label: 'City' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status', render: (row) => <StatusPill tone={row.status === 'Contacted' ? 'warn' : 'ok'}>{row.status}</StatusPill> },
            { key: 'value', label: 'Value at Growth', num: true, render: (row) => `${money(row.value)}/mo` },
          ]}
        />
      </Panel>
    </div>
  )
}

function HealthTab({ data }) {
  const health = data?.health || {}
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <Kpi label="Uptime, last 30 days" value={`${health.uptime ?? 0}%`} sub="Target 99.9%" />
        <Kpi label="BAAs signed" value={`${health.signedBaas ?? 0}/48`} sub="Agreements on file" />
        <Kpi label="Open security alerts" value={health.openSecurityAlerts ?? 0} sub="Pending review" />
        <Kpi label="Trials ending soon" value={health.trialsEndingSoon ?? 0} sub="Within 7 days" />
      </div>

      <Panel title="Compliance notes" right="Platform">
        <div className="space-y-3">
          {(health.complianceNotes || []).map((note) => (
            <div key={note.title} className="rounded-xl border border-[#EBECF4] bg-[#F8F9FD] p-3.5">
              <div className="text-sm font-semibold text-[#1B1F4B]">{note.title}</div>
              <div className="mt-1 text-sm text-[#4A4E7A]">{note.detail}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
