import { DataTable, EmptyNote, PageHeader, Panel } from './ui'

const SAMPLE = []

export default function SignupsPage() {
  return (
    <div>
      <PageHeader
        title="Early access sign-ups"
        subtitle="Inbound interest before a trial starts. Sales updates status and can launch a 14-day Starter trial from here."
      />
      <Panel title="Pipeline">
        <DataTable
          empty="No early-access sign-ups yet. New website leads will appear in this queue."
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'org', label: 'Organization' },
            { key: 'name', label: 'Contact' },
            { key: 'city', label: 'City' },
            { key: 'status', label: 'Status' },
          ]}
          rows={SAMPLE}
        />
        <div className="mt-4">
          <EmptyNote>Wire the public waitlist form to this queue when marketing launches early access capture.</EmptyNote>
        </div>
      </Panel>
    </div>
  )
}
