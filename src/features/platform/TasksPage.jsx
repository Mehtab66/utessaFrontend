import { EmptyNote, PageHeader, Panel, StatusPill } from './ui'
import { usePlatformApi } from './usePlatformApi'

export default function TasksPage() {
  const { data } = usePlatformApi('/api/v1/platform/overview')
  const attention = data?.attention || []

  return (
    <div>
      <PageHeader
        title="To do"
        subtitle="Open work for Support, Billing and Sales. Tasks are generated from live platform signals — locked accounts, trials, onboarding gaps."
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        {[
          ['Support', 'Locked accounts, at-risk practices, access help'],
          ['Billing', 'Past-due invoices, discounts, plan changes'],
          ['Sales', 'Early access follow-ups and trial conversions'],
        ].map(([t, d]) => (
          <Panel key={t} title={t}>
            <p className="m-0 text-sm text-mist-700">{d}</p>
          </Panel>
        ))}
      </div>

      <Panel title="Open items" right={`${attention.length} live`}>
        {!attention.length ? (
          <EmptyNote>No open tasks right now. New signals from trials and onboarding will land here.</EmptyNote>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0">
            {attention.map((item) => (
              <li key={`${item.priority}-${item.title}`} className="rounded-[12px] border border-mist-200 bg-mist-25 px-4 py-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <StatusPill tone="info">{item.priority}</StatusPill>
                  <span className="text-[12px] font-semibold text-mist-700">Open</span>
                </div>
                <p className="m-0 text-sm font-semibold text-ink-900">{item.title}</p>
                <p className="m-0 mt-0.5 text-[13px] text-mist-700">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
