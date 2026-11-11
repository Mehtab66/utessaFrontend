import { useMemo, useState } from 'react'
import { usePlatformApi } from './usePlatformApi'
import { EmptyNote, PageHeader, Panel, StatusPill } from './ui'

const initialUsers = [
  {
    id: 'u-1',
    name: 'Priya Nguyen',
    email: 'priya@longleafclinic.com',
    org: 'org-1',
    orgRole: 'Office manager',
    status: 'Active',
    mfa: true,
    last: 'Sep 23, 2026 · 9:14 AM',
    fails: 2,
    support: { state: 'active', until: 'Nov 18, 2026 · 6:00 PM', reason: 'Need help checking an automation setting.' },
  },
  {
    id: 'u-2',
    name: 'Marcus Lee',
    email: 'marcus@northharbordental.com',
    org: 'org-2',
    orgRole: 'Front desk lead',
    status: 'Locked',
    mfa: false,
    last: 'Sep 21, 2026 · 4:37 PM',
    fails: 8,
    support: { state: 'none' },
  },
  {
    id: 'u-3',
    name: 'Alicia Patel',
    email: 'alicia@summitpeds.com',
    org: 'org-3',
    orgRole: 'Practice owner',
    status: 'Invited',
    mfa: false,
    last: 'Never',
    fails: 0,
    support: { state: 'pending', by: 'Utessa support', mins: 60, reason: 'Needs help with onboarding setup.' },
  },
  {
    id: 'u-4',
    name: 'Jose Ramirez',
    email: 'jose@northharbordental.com',
    org: 'org-2',
    orgRole: 'Billing coordinator',
    status: 'Disabled',
    mfa: true,
    last: 'Sep 17, 2026 · 1:10 PM',
    fails: 0,
    support: { state: 'none' },
  },
  {
    id: 'u-5',
    name: 'Sarah Chen',
    email: 'sarah@longleafclinic.com',
    org: 'org-1',
    orgRole: 'Clinical administrator',
    status: 'Active',
    mfa: true,
    last: 'Today · 8:42 AM',
    fails: 1,
    support: { state: 'none' },
  },
]

const toneForStatus = {
  Active: 'ok',
  Locked: 'bad',
  Invited: 'warn',
  Disabled: 'mute',
}

function SupportBlock({ user, onRequestSupport, onApproveSupport, onEndSupport }) {
  const support = user.support ?? { state: 'none' }

  if (support.state === 'pending') {
    return (
      <div className="rounded-[12px] border border-[#F7D391] bg-[#FFF3D6] p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[15px] font-semibold text-[#1B1F4B]">Support access is waiting for approval</p>
            <p className="mt-1 text-sm text-[#9A5B00]">
              Requested by {support.by} for {support.mins} minutes. Reason: {support.reason}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn small" onClick={() => onApproveSupport(user.id)}>
              Owner approved (demo)
            </button>
            <button type="button" className="btn small danger" onClick={() => onEndSupport(user.id)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (support.state === 'active') {
    return (
      <div className="rounded-[12px] border border-[#F5C0B6] bg-[#FBE6E1] p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[15px] font-semibold text-[#1B1F4B]">Support access is on until {support.until}</p>
            <p className="mt-1 text-sm text-[#B4472F]">
              Approved by the practice owner. Every page viewed is logged and the practice sees a banner while it is on.
            </p>
          </div>
          <button type="button" className="btn small danger" onClick={() => onEndSupport(user.id)}>
            End now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#DCDFEE] bg-[#F8F9FD] p-3">
      <div>
        <p className="text-[15px] font-semibold text-[#1B1F4B]">Request support access</p>
        <p className="mt-1 text-sm text-[#4A4E7A]">
          Asks {user.orgName || 'the practice'}’s practice owner to let Utessa staff into their account for up to 60 minutes. Nothing opens until they approve.
        </p>
      </div>
      <button type="button" className="btn small" onClick={() => onRequestSupport(user.id)}>
        Request
      </button>
    </div>
  )
}

export default function AccessPage() {
  const { data: organizationRows = [] } = usePlatformApi('/api/v1/platform/organizations')
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [orgFilter, setOrgFilter] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(initialUsers[0].id)

  const organizations = useMemo(
    () =>
      (organizationRows || []).map((org) => ({
        id: org.id,
        label: org.name,
      })),
    [organizationRows],
  )

  const getOrgName = (orgId) => organizations.find((org) => org.id === orgId)?.label ?? 'Unknown organization'

  const filteredUsers = useMemo(() => {
    const cleanedQuery = query.trim().toLowerCase()
    return users.filter((user) => {
      const orgName = getOrgName(user.org)
      const matchesQuery = !cleanedQuery || `${user.name} ${user.email} ${orgName}`.toLowerCase().includes(cleanedQuery)
      const matchesStatus = !statusFilter || user.status === statusFilter
      const matchesOrg = !orgFilter || user.org === orgFilter
      return matchesQuery && matchesStatus && matchesOrg
    })
  }, [users, query, statusFilter, orgFilter, organizations])

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null

  const updateUser = (id, patch) => {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...patch } : user)))
  }

  const handleSupportRequest = (id) => {
    updateUser(id, {
      support: {
        state: 'pending',
        by: 'Utessa support',
        mins: 60,
        reason: 'Need help with access and permissions during onboarding.',
      },
    })
  }

  const handleSupportApprove = (id) => {
    updateUser(id, {
      support: {
        state: 'active',
        until: 'Nov 18, 2026 · 6:00 PM',
        reason: 'Approved by the practice owner.',
      },
    })
  }

  const handleSupportEnd = (id) => {
    updateUser(id, {
      support: { state: 'none' },
    })
  }

  const actionButton = (label, onClick, danger = false) => (
    <button type="button" className={`btn small ${danger ? 'danger' : ''}`} onClick={onClick}>
      {label}
    </button>
  )

  return (
    <div>
      <PageHeader
        title="Account access"
        subtitle="Help a customer get back in. Look someone up by work email, then send a reset link, unlock or sign them out. You only see sign-in details, never what is inside their account."
      />

      <div className="mb-5 rounded-[12px] border-l-[4px] border-[#3BC4CA] bg-white p-4 text-[15px] text-[#4A4E7A] shadow-[0_14px_34px_rgba(27,31,75,0.08)]">
        <div className="flex gap-3">
          <div className="mt-1 text-[#1E8E94]" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2.75 18 5v5.5c0 4.06-2.74 7.83-6 9.75-3.26-1.92-6-5.69-6-9.75V5l6-2.25Zm0 3.92 3.5 1.31v3.52c0 2.94-1.86 5.49-3.5 6.87-1.64-1.38-3.5-3.93-3.5-6.87V7.98L12 6.67Zm-1.25 4.08h2.5v4.5h-2.5v-4.5Zm0 5.5h2.5v2h-2.5v-2Z" fill="currentColor" />
            </svg>
          </div>
          <span>
            <b className="text-[#1B1F4B]">Utessa staff never see or set passwords.</b> Resets go to the user’s own email as a single-use link that expires in 30 minutes. Before acting on a phone or email request, confirm the person by calling back the number on file or checking with their practice owner.
          </span>
        </div>
      </div>

      <Panel title="Find a user">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(180px,220px)_minmax(180px,220px)]">
          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-[#4A4E7A]">
            Work email or name
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Work email or name"
              className="min-h-[42px] rounded-[10px] border border-[#DCDFEE] bg-[#F6F7FB] px-3 text-sm font-normal text-[#1B1F4B]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-[#4A4E7A]">
            Sign-in status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-[42px] rounded-[10px] border border-[#DCDFEE] bg-[#F6F7FB] px-3 text-sm font-normal text-[#1B1F4B]"
            >
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Locked">Locked</option>
              <option value="Invited">Invited</option>
              <option value="Disabled">Disabled</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-[#4A4E7A]">
            Organization
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="min-h-[42px] rounded-[10px] border border-[#DCDFEE] bg-[#F6F7FB] px-3 text-sm font-normal text-[#1B1F4B]"
            >
              <option value="">All</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-1 text-sm text-[#4A4E7A]">
          {query.trim() || statusFilter || orgFilter ? `${filteredUsers.length} user${filteredUsers.length === 1 ? '' : 's'} found` : 'Pick a status, such as Locked, to list users without searching'}
        </div>

        {!query.trim() && !statusFilter && !orgFilter && !selectedUser && (
          <div className="mt-3">
            <EmptyNote>Type at least two letters of a work email or name. Try Nguyen or Longleaf.</EmptyNote>
          </div>
        )}

        {((query.trim() && !filteredUsers.length) || (!query.trim() && (statusFilter || orgFilter) && !filteredUsers.length)) && (
          <div className="mt-3">
            <EmptyNote>No user matches this search. Check the spelling, or ask the practice owner which email they invited.</EmptyNote>
          </div>
        )}

        {filteredUsers.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-[12px] border border-[#DCDFEE]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-[15px]">
                <thead className="bg-[#F6F7FB]">
                  <tr>
                    <th className="border-b border-[#DCDFEE] px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4A4E7A]">Name</th>
                    <th className="border-b border-[#DCDFEE] px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4A4E7A]">Work email</th>
                    <th className="border-b border-[#DCDFEE] px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4A4E7A]">Organization</th>
                    <th className="border-b border-[#DCDFEE] px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4A4E7A]">Sign-in status</th>
                    <th className="border-b border-[#DCDFEE] px-3 py-2.5 text-right text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4A4E7A]"> </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={selectedUser?.id === user.id ? 'bg-[#EEF0FA]' : 'bg-white'}>
                      <td className="border-b border-[#EBECF4] px-3 py-3 align-top">
                        <div className="font-semibold text-[#1B1F4B]">{user.name}</div>
                        <div className="text-[13px] text-[#4A4E7A]">{user.orgRole}</div>
                      </td>
                      <td className="border-b border-[#EBECF4] px-3 py-3 align-top font-mono text-[13px] text-[#1B1F4B]">{user.email}</td>
                      <td className="border-b border-[#EBECF4] px-3 py-3 align-top text-[#1B1F4B]">{getOrgName(user.org)}</td>
                      <td className="border-b border-[#EBECF4] px-3 py-3 align-top">
                        <StatusPill tone={toneForStatus[user.status] || 'mute'}>{user.status}</StatusPill>
                      </td>
                      <td className="border-b border-[#EBECF4] px-3 py-3 text-right align-top">
                        <button
                          type="button"
                          className={`btn small ${selectedUser?.id === user.id ? 'primary' : ''}`}
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          {selectedUser?.id === user.id ? 'Selected' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedUser && (
          <div className="mt-5 rounded-[14px] border border-[#DCDFEE] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[21px] font-bold text-[#1B1F4B]">{selectedUser.name}</h3>
                <div className="font-mono text-[13px] text-[#4A4E7A]">{selectedUser.email}</div>
              </div>
              <StatusPill tone={toneForStatus[selectedUser.status] || 'mute'}>{selectedUser.status}</StatusPill>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-4">
                <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-y-2 text-[15px] text-[#1B1F4B]">
                  <dt className="text-[#4A4E7A]">Organization</dt>
                  <dd>{getOrgName(selectedUser.org)}</dd>
                  <dt className="text-[#4A4E7A]">Role at practice</dt>
                  <dd>{selectedUser.orgRole}</dd>
                  <dt className="text-[#4A4E7A]">Two-step sign-in</dt>
                  <dd>{selectedUser.mfa ? 'On' : 'Not set up'}</dd>
                  <dt className="text-[#4A4E7A]">Last sign-in</dt>
                  <dd>{selectedUser.last}</dd>
                  <dt className="text-[#4A4E7A]">Failed attempts</dt>
                  <dd>{selectedUser.fails}</dd>
                  <dt className="text-[#4A4E7A]">Password</dt>
                  <dd className="text-[#4A4E7A]">Hidden. Only the user can set it.</dd>
                </dl>

                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4A4E7A]">Recent sign-ins</p>
                  <div className="space-y-2">
                    {[
                      { title: 'Successful sign-in', detail: 'Sep 23, 2026 · 9:14 AM · 12.34.56.78' },
                      { title: 'Password reset', detail: 'Sep 20, 2026 · 7:08 AM · 12.34.56.78' },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center justify-between gap-3 border-t border-[#EBECF4] pt-2 text-sm text-[#1B1F4B]">
                        <span>{item.title}</span>
                        <span className="font-mono text-[#4A4E7A]">{item.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-3">
                  {selectedUser.status === 'Invited'
                    ? actionButton('Resend invite', () => updateUser(selectedUser.id, { status: 'Invited' }))
                    : actionButton('Send password reset link', () => updateUser(selectedUser.id, { status: 'Active' }))}

                  {selectedUser.status === 'Locked' &&
                    actionButton('Unlock account', () => updateUser(selectedUser.id, { status: 'Active', fails: 0 }))}

                  {(selectedUser.status === 'Active' || selectedUser.status === 'Locked') &&
                    actionButton('Sign out of all devices', () => updateUser(selectedUser.id, { status: 'Active' }))}

                  {actionButton('Reset two-step sign-in', () => updateUser(selectedUser.id, { mfa: false }))}
                  <SupportBlock
                    user={{ ...selectedUser, orgName: getOrgName(selectedUser.org) }}
                    onRequestSupport={handleSupportRequest}
                    onApproveSupport={handleSupportApprove}
                    onEndSupport={handleSupportEnd}
                  />

                  {selectedUser.status === 'Disabled'
                    ? actionButton('Turn sign-in back on', () => updateUser(selectedUser.id, { status: 'Active' }))
                    : actionButton('Turn off sign-in', () => updateUser(selectedUser.id, { status: 'Disabled' }), true)}
                </div>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
