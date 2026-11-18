import { Link, useParams } from 'react-router-dom'
import { DataTable, EmptyNote, Kpi, PageHeader, Panel, StatusPill, statusTone } from './ui'
import { usePlatformApi } from './usePlatformApi'

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function fmtShort(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

export default function OrganizationDetailPage() {
  const { id } = useParams()
  const { data, loading, error } = usePlatformApi(`/api/v1/platform/organizations/${id}`)

  if (loading) {
    return (
      <div>
        <PageHeader title="Organization" subtitle="Loading practice details…" />
        <EmptyNote>Fetching organization profile and members…</EmptyNote>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader
          title="Organization"
          subtitle="Could not load this practice."
          right={
            <Link
              to="/platform/organizations"
              className="inline-flex min-h-[42px] items-center rounded-[10px] border border-mist-200 bg-white px-3.5 text-sm font-semibold text-ink-900 hover:bg-mist-50"
            >
              Back to organizations
            </Link>
          }
        />
        <p className="rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-semibold text-danger-700">
          {error || 'Organization not found.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={data.name}
        subtitle={`${data.orgType} · ${data.slug}`}
        right={
          <Link
            to="/platform/organizations"
            className="inline-flex min-h-[42px] items-center rounded-[10px] border border-mist-200 bg-white px-3.5 text-sm font-semibold text-ink-900 hover:bg-mist-50"
          >
            Back to organizations
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill tone={statusTone(data.status)}>{data.status}</StatusPill>
        <StatusPill tone={data.onboardingDone ? 'ok' : 'warn'}>
          {data.onboardingDone ? 'Setup complete' : 'Setup incomplete'}
        </StatusPill>
        <StatusPill tone={data.termsAccepted ? 'ok' : 'bad'}>
          {data.termsAccepted ? 'Terms accepted' : 'Terms pending'}
        </StatusPill>
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <Kpi label="Members" value={data.memberCount} />
        <Kpi label="Team size band" value={data.teamSizeBand ?? '—'} />
        <Kpi label="Trial ends" value={fmtShort(data.trialEndsAt)} />
        <Kpi label="Created" value={fmtShort(data.createdAt)} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Practice profile">
          <dl className="grid gap-3 text-sm">
            <Detail label="Organization ID" value={data.id} mono />
            <Detail label="Slug" value={data.slug} mono />
            <Detail label="Type" value={data.orgType} />
            <Detail label="EHR" value={data.ehrName} />
            <Detail label="News opt-in" value={data.newsOptIn ? 'Yes' : 'No'} />
            <Detail label="Trial starts" value={fmtDate(data.trialStartsAt)} />
            <Detail label="Trial ends" value={fmtDate(data.trialEndsAt)} />
            <Detail label="Updated" value={fmtDate(data.updatedAt)} />
          </dl>
        </Panel>

        <Panel title="Enabled services">
          {data.enabledServices?.length ? (
            <div className="flex flex-wrap gap-2">
              {data.enabledServices.map((service) => (
                <StatusPill key={service} tone="info">
                  {service}
                </StatusPill>
              ))}
            </div>
          ) : (
            <EmptyNote>No services selected during signup yet.</EmptyNote>
          )}
        </Panel>
      </div>

      <Panel title="Members" right={`${data.members?.length || 0} people`}>
        <DataTable
          empty="No members in this organization yet."
          columns={[
            {
              key: 'fullName',
              label: 'Person',
              render: (r) => (
                <div>
                  <b>{r.fullName}</b>
                  <div className="text-[13px] text-mist-700">{r.email}</div>
                </div>
              ),
            },
            {
              key: 'role',
              label: 'Role',
              render: (r) => <StatusPill tone="mute">{r.role}</StatusPill>,
            },
            {
              key: 'emailVerified',
              label: 'Email',
              render: (r) => (
                <StatusPill tone={r.emailVerified ? 'ok' : 'warn'}>
                  {r.emailVerified ? 'Verified' : 'Unverified'}
                </StatusPill>
              ),
            },
            { key: 'phone', label: 'Phone' },
            {
              key: 'joinedAt',
              label: 'Joined',
              render: (r) => fmtShort(r.joinedAt),
            },
          ]}
          rows={data.members || []}
        />
      </Panel>
    </div>
  )
}

function Detail({ label, value, mono }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 border-b border-mist-200 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-mist-700">{label}</dt>
      <dd className={`m-0 break-all font-medium text-ink-900 ${mono ? 'font-mono text-[13px]' : ''}`}>
        {value || '—'}
      </dd>
    </div>
  )
}
