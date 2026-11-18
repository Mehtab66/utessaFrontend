import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import { roleLabel } from '../../shared/security/roles'
import { Alert, Loading, useAsync } from '../crm/ui'
import { Chip, Hero } from './kit'
import { workspace } from './workspaceApi'

const ROLE_TONE = {
  OWNER: '#1B1F4B', ADMIN: '#3A3F8F', MANAGER: '#0A7A82', FRONT: '#2E8FD0', CLINICAL: '#34C38F',
  PROVIDER: '#7C6CF0', BILLING: '#F5A524', OUTREACH: '#E46FA8', HR: '#8B93F0', MEMBER: '#64748B',
}

export default function TeamPage() {
  const navigate = useNavigate()
  const { data, loading, error } = useAsync(() => workspace.team(), [])
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('ALL')

  const roles = useMemo(() => [...new Set((data || []).map((m) => m.role))], [data])
  const members = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data || [])
      .filter((m) => role === 'ALL' || m.role === role)
      .filter((m) => !q || `${m.fullName} ${m.email}`.toLowerCase().includes(q))
  }, [data, role, query])

  return (
    <div>
      <Hero
        icon="users"
        title="Team"
        subtitle="Everyone in your practice workspace — who they are, how to reach them and what is on their plate."
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Chip active={role === 'ALL'} onClick={() => setRole('ALL')} count={data?.length ?? 0}>Everyone</Chip>
          {roles.map((r) => <Chip key={r} active={role === r} onClick={() => setRole(r)}>{roleLabel(r)}</Chip>)}
        </div>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA3BF]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people" className="h-9 w-60 rounded-lg border border-[#E1E4EE] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#0A7A82]" />
        </div>
      </div>

      <Alert>{error}</Alert>
      {loading && !data ? <Loading label="Loading team…" /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {members.map((m) => {
            const tone = ROLE_TONE[m.role] || ROLE_TONE.MEMBER
            const initials = (m.fullName || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <article key={m.userId} className="overflow-hidden rounded-2xl border border-[#E6E9F2] bg-white shadow-[0_1px_2px_rgba(24,28,66,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-14px_rgba(17,24,52,0.3)]">
                <div className="h-14" style={{ background: `linear-gradient(120deg, ${tone}, ${tone}99)` }} />
                <div className="-mt-8 px-4 pb-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-[17px] font-bold text-white ring-4 ring-white" style={{ background: `linear-gradient(135deg, ${tone}, #1B1F4B)` }}>{initials}</span>
                  <div className="mt-2.5 flex items-center gap-2">
                    <h3 className="m-0 truncate text-[15px] font-bold text-navy">{m.fullName}</h3>
                    {m.you && <span className="rounded-full bg-[#EEF7F8] px-2 py-0.5 text-[10.5px] font-bold text-[#0A7A82]">You</span>}
                  </div>
                  <p className="m-0 text-[12.5px] font-semibold" style={{ color: tone }}>{roleLabel(m.role)}</p>
                  <div className="mt-3 space-y-1.5 text-[12.5px] text-[#5E6485]">
                    <a href={`mailto:${m.email}`} className="flex items-center gap-2 truncate no-underline hover:text-[#0A7A82]"><Icon name="mail" className="h-3.5 w-3.5 text-[#9AA3BF]" />{m.email}</a>
                    {m.phone && <a href={`tel:${m.phone}`} className="flex items-center gap-2 no-underline hover:text-[#0A7A82]"><Icon name="phone" className="h-3.5 w-3.5 text-[#9AA3BF]" />{m.phone}</a>}
                    <p className="m-0 flex items-center gap-2"><Icon name="calendar" className="h-3.5 w-3.5 text-[#9AA3BF]" />Joined {new Date(m.joinedAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F8F9FC] px-3 py-2">
                    <span className="text-[12px] text-[#687699]"><b className="text-navy">{m.openTasks}</b> open task{m.openTasks === 1 ? '' : 's'}</span>
                    <button type="button" onClick={() => navigate(`/app/my-work?new=1&assignee=${m.userId}`)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0A7A82] hover:underline">
                      <Icon name="plus" className="h-3.5 w-3.5" /> Assign task
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
          {!members.length && <p className="col-span-full py-10 text-center text-sm text-[#8A93B2]">No one matches that filter.</p>}
        </div>
      )}
    </div>
  )
}
