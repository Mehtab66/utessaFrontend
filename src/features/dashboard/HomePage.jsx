import { useAuth } from '../../shared/auth/AuthContext'

const TASKS = [
  { id: 'mfa', label: 'Turn on two-step verification', done: false },
  { id: 'invite', label: 'Invite your team', done: false },
  { id: 'import', label: 'Import patient leads or contacts', done: false },
]

export default function HomePage() {
  const { user } = useAuth()
  const doneCount = TASKS.filter((t) => t.done).length
  const pct = Math.round((doneCount / TASKS.length) * 100)

  return (
    <div>
      {!user.emailVerified && (
        <div className="mb-4 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-3.5 py-3 text-sm text-[#7A271A]">
          <b>Verify your email</b> to unlock patient information features.
        </div>
      )}

      <div className="mb-4 rounded-xl border border-[#F1D46B] bg-[#FFF8DB] px-3.5 py-3 text-sm text-[#5C4A00]">
        <b>Secure your account first.</b> Turn on two-step verification before inviting staff. MFA lands in a later phase.
      </div>

      <h2 className="text-[22px] font-bold text-navy">Get set up</h2>
      <p className="mb-2 mt-1 text-[15px] text-muted">{doneCount} of {TASKS.length} setup tasks complete</p>
      <div className="mb-4 h-1.5 overflow-hidden rounded bg-soft">
        <i className="block h-full bg-gradient-to-r from-cyan to-teal transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="mb-5 overflow-hidden rounded-[14px] border border-line">
        {TASKS.map((task, i) => (
          <div key={task.id} className={`flex items-center gap-3 px-4 py-3.5 text-[14.5px] ${i < TASKS.length - 1 ? 'border-b border-[#EEF1F8]' : ''}`}>
            <span className="grid h-5 w-5 place-items-center rounded-md border-[1.5px] border-[#C4CAE0]" />
            <span className="flex-1">{task.label}</span>
          </div>
        ))}
      </div>

      <p className="text-[13px] text-muted">
        Your organization <b className="text-navy">{user.organizationName}</b> is isolated — only members of this tenant can see its data.
      </p>
    </div>
  )
}
