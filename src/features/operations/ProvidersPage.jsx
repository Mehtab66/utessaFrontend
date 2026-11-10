import { api } from '../../shared/api/client'
import { ResourceWorkspace, StatusPill, useResourceList } from '../../shared/ui/ResourceWorkspace'
import { staffDefaults, staffFromRow, staffSections, toStaffPayload } from './staffFormConfig'

const STATUS_TONE = {
  ACTIVE: 'green',
  ONBOARDING: 'amber',
  SUSPENDED: 'red',
  INACTIVE: 'gray',
}

export default function ProvidersPage() {
  const { rows, loading, error, refresh } = useResourceList(() => api('/api/v1/providers'))

  return (
    <ResourceWorkspace
      title="Providers"
      subtitle="Full credentialed clinician registration — personal, contact, specialty, licenses, DEA, CAQH, pay and access."
      addLabel="Register provider"
      columns={[
        { key: 'name', label: 'Provider', render: (r) => <b>{r.firstName} {r.lastName}</b> },
        { key: 'specialty', label: 'Specialty', render: (r) => r.specialty || r.jobTitle },
        { key: 'npi', label: 'NPI' },
        { key: 'deaNumber', label: 'DEA' },
        {
          key: 'license',
          label: 'License',
          render: (r) => (r.licenseNumber ? `${r.licenseType || 'License'} · ${r.licenseNumber}` : '—'),
        },
        {
          key: 'licenseExpiresOn',
          label: 'Lic. exp',
          render: (r) => r.licenseExpiresOn || '—',
        },
        {
          key: 'status',
          label: 'Status',
          render: (r) => <StatusPill tone={STATUS_TONE[r.status] || 'gray'}>{r.status}</StatusPill>,
        },
      ]}
      rows={rows}
      loading={loading}
      error={error}
      empty="No providers yet. Register clinicians with the full wireframe fields."
      onRefresh={refresh}
      onCreate={(body) => api('/api/v1/providers', { method: 'POST', body: toStaffPayload(body, { forceProvider: true }) })}
      onEdit={(id, body) => api(`/api/v1/providers/${id}`, { method: 'PUT', body: toStaffPayload(body, { forceProvider: true }) })}
      onDelete={(id) => api(`/api/v1/providers/${id}`, { method: 'DELETE' })}
      form={{
        defaults: () => staffDefaults(true),
        fromRow: staffFromRow,
        sections: staffSections({ providerMode: true }),
      }}
    />
  )
}
