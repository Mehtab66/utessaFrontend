import { DataTable, EmptyNote, PageHeader, Panel } from './ui'

export default function AuditPage() {
  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Every privileged action in the control plane — access, pricing, flags, subscriptions and team changes."
      />
      <Panel title="Recent events">
        <DataTable
          empty="No audit events yet. Resets, plan publishes and support-access grants will list here."
          columns={[
            { key: 't', label: 'When' },
            { key: 'who', label: 'Who' },
            { key: 'action', label: 'Action' },
            { key: 'target', label: 'Target' },
          ]}
          rows={[]}
        />
        <div className="mt-4">
          <EmptyNote>Append-only audit storage will capture reason text with each privileged action.</EmptyNote>
        </div>
      </Panel>
    </div>
  )
}
