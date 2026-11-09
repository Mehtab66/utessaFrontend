export default function CrmPage() {
  return <ModuleStub title="CRM" color="bg-cyan" copy="Leads, call tracking, referrals, and pipelines will live here. Tenant-scoped data only." />
}

export function ModuleStub({ title, color, copy }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-3 w-3 rounded-sm ${color}`} />
        <h2 className="text-[22px] font-bold text-navy">{title}</h2>
      </div>
      <p className="max-w-prose text-[15px] leading-relaxed text-muted">{copy}</p>
      <div className="mt-6 rounded-[14px] border border-dashed border-[#C4CAE0] bg-soft/60 px-4 py-8 text-center text-sm text-muted">
        Module shell ready — feature work comes next.
      </div>
    </div>
  )
}
