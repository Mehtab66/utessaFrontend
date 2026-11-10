import { api } from '../../shared/api/client'
import { ResourceWorkspace, StatusPill, useResourceList } from '../../shared/ui/ResourceWorkspace'
import { staffDefaults, staffFromRow, staffSections, toStaffPayload } from './staffFormConfig'

const STATUS_TONE = {
  ACTIVE: 'green',
  ONBOARDING: 'amber',
  SUSPENDED: 'red',
  INACTIVE: 'gray',
}

export default function StaffPage() {
  const { rows, loading, error, refresh } = useResourceList(() => api('/api/v1/staff'))

  return (
    <ResourceWorkspace
      title="Staff"
      subtitle="Complete staff registration from the wireframe — identity, address, job, pay, access, credentials and separation."
      addLabel="+ Add staff"
      columns={[
        { key: 'name', label: 'Name', render: (r) => <b>{r.firstName} {r.lastName}</b> },
        { key: 'designation', label: 'Designation', render: (r) => r.designation || r.jobTitle },
        { key: 'department', label: 'Department' },
        { key: 'employmentType', label: 'Employment' },
        { key: 'accessRole', label: 'Access' },
        {
          key: 'status',
          label: 'Status',
          render: (r) => <StatusPill tone={STATUS_TONE[r.status] || 'gray'}>{r.status}</StatusPill>,
        },
      ]}
      rows={rows}
      loading={loading}
      error={error}
      empty="No staff yet. Add teammates using the full registration form."
      onRefresh={refresh}
      onCreate={(body) => api('/api/v1/staff', { method: 'POST', body: toStaffPayload(body) })}
      onEdit={(id, body) => api(`/api/v1/staff/${id}`, { method: 'PUT', body: toStaffPayload(body) })}
      onDelete={(id) => api(`/api/v1/staff/${id}`, { method: 'DELETE' })}
      form={{
        defaults: () => staffDefaults(false),
        fromRow: staffFromRow,
        sections: staffSections({ providerMode: false }),
      }}
    />
  )
}
