import { DataTable, EmptyNote, PageHeader, Panel } from './ui'

export default function LoginsPage() {
  return (
    <div>
      <PageHeader
        title="Sign-in log"
        subtitle="Successful and failed staff and practice sign-ins. Use this to spot lockouts and unusual locations."
      />
      <Panel title="Recent sign-ins">
        <DataTable
          empty="No sign-in events captured yet."
          columns={[
            { key: 't', label: 'When' },
            { key: 'email', label: 'Account' },
            { key: 'result', label: 'Result' },
            { key: 'ip', label: 'Location / IP' },
          ]}
          rows={[]}
        />
        <div className="mt-4">
          <EmptyNote>Auth events will stream here once login auditing is persisted server-side.</EmptyNote>
        </div>
      </Panel>
    </div>
  )
}
