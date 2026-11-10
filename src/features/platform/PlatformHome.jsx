import { useAuth } from '../../shared/auth/AuthContext'

export default function PlatformHome() {
  const { user } = useAuth()

  return (
    <div>
      <div className="mb-5">
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em] text-navy">Platform monitor</h1>
        <p className="mt-1 text-sm text-[#43476A]">
          Signed in as <b>{user.email}</b>. This account is a system operator — it does not belong to a practice.
        </p>
      </div>

      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        {[
          ['—', 'Practices'],
          ['—', 'Active sessions'],
          ['—', 'Failed logins (24h)'],
          ['—', 'Open support flags'],
        ].map(([n, l]) => (
          <div key={l} className="rounded-[12px] border border-[#D9DAE1] bg-white px-5 py-[18px]">
            <div className="font-mono text-[32px] font-medium tracking-[-0.02em] text-navy">{n}</div>
            <div className="mt-1 text-[13px] text-[#43476A]">{l}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[12px] border border-[#BEDBDD] bg-[#F1F8F8] px-4 py-3 text-sm leading-relaxed text-[#075E66]">
        Live cross-tenant metrics and audit tools will plug in here. Org-scoped APIs remain blocked for this
        session until an explicit, audited practice-impersonation flow is added.
      </div>
    </div>
  )
}
