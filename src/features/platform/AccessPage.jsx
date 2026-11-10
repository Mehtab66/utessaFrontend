import { EmptyNote, PageHeader, Panel } from './ui'

export default function AccessPage() {
  return (
    <div>
      <PageHeader
        title="Account access"
        subtitle="Find a practice user by work email or name. Reset links, unlocks and timed support access are audited — nothing opens without a reason."
      />
      <Panel title="Find a user">
        <label className="block text-[12px] font-semibold text-[#4A4E7A]">
          Work email or name
          <input
            className="mt-1 min-h-[42px] w-full max-w-xl rounded-[10px] border border-[#DCDFEE] bg-[#F6F7FB] px-3 text-sm font-normal"
            placeholder="Search practice users"
            disabled
          />
        </label>
        <div className="mt-4">
          <EmptyNote>
            Cross-tenant user search and support-access requests will plug in next. Practice owners must approve any
            timed support session before staff can enter an organization.
          </EmptyNote>
        </div>
      </Panel>
    </div>
  )
}
