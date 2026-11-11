import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, EmptyNote, Kpi, PageHeader, StatusPill, statusTone } from './ui'
import { usePlatformApi } from './usePlatformApi'

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
        <p className="mb-4 rounded-xl border border-[#F3C1BC] bg-[#FFF5F4] px-3.5 py-3 text-sm font-semibold text-[#B4472F]">
          {error}
        </p>
      )}

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <Kpi label="Organizations" value={loading ? '—' : (data || []).length} />
        <Kpi label="On trial" value={loading ? '—' : trials} />
        <Kpi label="Members" value={loading ? '—' : members} />
        <Kpi label="Showing" value={rows.length} sub="After filters" />
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded-[14px] border border-[#DCDFEE] bg-white p-3.5">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[12px] font-semibold text-[#4A4E7A]">
          Search
          <input
            className="min-h-[42px] rounded-[10px] border border-[#DCDFEE] bg-[#F6F7FB] px-3 text-sm font-normal text-[#1B1F4B]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Organization, slug or type"
          />
        </label>
        <label className="flex min-w-[160px] flex-col gap-1 text-[12px] font-semibold text-[#4A4E7A]">
          Status
          <select
            className="min-h-[42px] rounded-[10px] border border-[#DCDFEE] bg-[#F6F7FB] px-3 text-sm font-normal text-[#1B1F4B]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="Trial">Trial</option>
            <option value="Active">Active</option>
            <option value="Onboarding">Onboarding</option>
          </select>
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
                <b className="text-[#075E66] underline-offset-2 group-hover:underline">{r.name}</b>
                <div className="text-[13px] text-[#4A4E7A]">{r.orgType} · {r.slug}</div>
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
