import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, EmptyNote, Kpi, PageHeader, StatusPill, statusTone } from './ui'
import { usePlatformApi } from './usePlatformApi'
import Select from '../../shared/ui/Select'

export default function OrganizationsPage() {
  const navigate = useNavigate()
  const { data, loading, error } = usePlatformApi('/api/v1/platform/organizations')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  const rows = useMemo(() => {
    const list = data || []
    return list.filter((row) => {
      const hay = `${row.name} ${row.slug} ${row.orgType}`.toLowerCase()
      if (q && !hay.includes(q.toLowerCase())) return false
      if (status && row.status !== status) return false
      return true
    })
  }, [data, q, status])

  const trials = (data || []).filter((r) => r.status === 'Trial').length
  const members = (data || []).reduce((a, r) => a + (r.memberCount || 0), 0)

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle="Every practice on Utessa, with trial status and member counts. Pick filters to focus sales, billing or onboarding."
      />

      {error && (
        <p className="mb-4 rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-semibold text-danger-700">
          {error}
        </p>
      )}

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <Kpi label="Organizations" value={loading ? '—' : (data || []).length} />
        <Kpi label="On trial" value={loading ? '—' : trials} />
        <Kpi label="Members" value={loading ? '—' : members} />
        <Kpi label="Showing" value={rows.length} sub="After filters" />
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded-[14px] border border-mist-200 bg-white p-3.5">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[12px] font-semibold text-mist-700">
          Search
          <input
            className="min-h-[42px] rounded-[10px] border border-mist-200 bg-mist-50 px-3 text-sm font-normal text-ink-900"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Organization, slug or type"
          />
        </label>
        <label className="flex min-w-[160px] flex-col gap-1 text-[12px] font-semibold text-mist-700">
          Status
          <Select
            className="min-h-[42px] rounded-[10px] border border-mist-200 bg-mist-50 px-3 text-sm font-normal text-ink-900"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="Trial">Trial</option>
            <option value="Active">Active</option>
            <option value="Onboarding">Onboarding</option>
          </Select>
        </label>
      </div>

      <DataTable
        empty={loading ? 'Loading organizations…' : 'No organizations match these filters.'}
        onRowClick={(row) => navigate(`/platform/organizations/${row.id}`)}
        columns={[
          {
            key: 'name',
            label: 'Organization',
            render: (r) => (
              <div>
                <b className="text-brand-800 underline-offset-2 group-hover:underline">{r.name}</b>
                <div className="text-[13px] text-mist-700">{r.orgType} · {r.slug}</div>
              </div>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (r) => <StatusPill tone={statusTone(r.status)}>{r.status}</StatusPill>,
          },
          {
            key: 'onboardingDone',
            label: 'Setup',
            render: (r) => (r.onboardingDone ? 'Complete' : 'Incomplete'),
          },
          { key: 'memberCount', label: 'Users', num: true },
          {
            key: 'trialEndsAt',
            label: 'Trial ends',
            render: (r) => (r.trialEndsAt ? new Date(r.trialEndsAt).toLocaleDateString() : '—'),
          },
        ]}
        rows={rows}
      />

      {!loading && !(data || []).length && (
        <div className="mt-4">
          <EmptyNote>No practices have signed up yet. New organizations from signup will appear here automatically.</EmptyNote>
        </div>
      )}
    </div>
  )
}
