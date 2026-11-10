import { PageHeader, Panel, StatusPill } from './ui'

const PLANS = [
  { id: 'starter', name: 'Starter', fit: 'Small clinics, single location', annual: '$299', monthly: '$349', seats: 5 },
  { id: 'growth', name: 'Growth', fit: 'Growing practices, home health', annual: '$699', monthly: '$799', seats: 15, rec: true },
  { id: 'professional', name: 'Professional', fit: 'Multi-provider groups, agencies', annual: '$1,499', monthly: '$1,699', seats: 40 },
  { id: 'enterprise', name: 'Enterprise', fit: 'Hospitals, multi-site systems', annual: 'Custom', monthly: 'Custom', seats: '40+' },
]

export default function PricingPage() {
  return (
    <div>
      <PageHeader
        title="Plans and pricing"
        subtitle="Public plans shown on the signup page. Edits are drafts until you publish — customer invoices do not change until publish."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => (
          <Panel key={p.id} title={p.name} right={p.rec ? <StatusPill tone="ok">Recommended</StatusPill> : null}>
            <p className="m-0 text-sm text-[#4A4E7A]">{p.fit}</p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-[#4A4E7A]">Annual</dt><dd className="m-0 font-semibold">{p.annual}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-[#4A4E7A]">Monthly</dt><dd className="m-0 font-semibold">{p.monthly}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-[#4A4E7A]">Included users</dt><dd className="m-0 font-semibold">{p.seats}</dd></div>
            </dl>
          </Panel>
        ))}
      </div>
      <div className="mt-4">
        <Panel title="Add-ons and discounts">
          <ul className="m-0 list-none space-y-2 p-0 text-sm">
            <li className="flex justify-between gap-3 border-b border-[#EBECF4] py-2"><span>Text bundle · per 5,000 texts</span><b>$40</b></li>
            <li className="flex justify-between gap-3 border-b border-[#EBECF4] py-2"><span>AI voice minutes · per minute over allowance</span><b>$0.15</b></li>
            <li className="flex justify-between gap-3 border-b border-[#EBECF4] py-2"><span>Extra credentialed provider · per month</span><b>$20</b></li>
            <li className="flex justify-between gap-3 py-2"><span>Founding practice discount · first year</span><b>20%</b></li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
