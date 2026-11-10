import { DataTable, PageHeader, StatusPill } from './ui'
import { usePlatformApi } from './usePlatformApi'

export default function StaffPage() {
  const { data, loading, error } = usePlatformApi('/api/v1/platform/staff')

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Utessa platform operators. Superadmins can see every console area; team roles will add Support, Billing and Sales permissions next."
      />
      {error && (
        <p className="mb-4 rounded-xl border border-[#F3C1BC] bg-[#FFF5F4] px-3.5 py-3 text-sm font-semibold text-[#B4472F]">
          {error}
        </p>
      )}
      <DataTable
        empty={loading ? 'Loading staff…' : 'No platform staff yet.'}
        columns={[
          {
            key: 'fullName',
            label: 'Name',
            render: (r) => (
              <div>
                <b>{r.fullName}</b>
                <div className="font-mono text-[13px] text-[#4A4E7A]">{r.email}</div>
              </div>
            ),
          },
          {
            key: 'platformRole',
            label: 'Role',
            render: (r) => <StatusPill tone="info">{r.platformRole}</StatusPill>,
          },
          {
            key: 'emailVerified',
            label: 'Email',
            render: (r) => (r.emailVerified ? <StatusPill tone="ok">Verified</StatusPill> : <StatusPill tone="warn">Unverified</StatusPill>),
          },
          {
            key: 'createdAt',
            label: 'Added',
            render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'),
          },
        ]}
        rows={data || []}
      />
    </div>
  )
}
