import { useMemo, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { permissionsFor } from '../../shared/security/roles'
import {
  OPEN_REFERRAL_STATUSES, PARTNER_STATUSES, PARTNER_TYPES, PRIORITIES, REFERRAL_STATUSES, crm, labelOf,
} from './crmApi'
import { useCrmEditors } from './CrmEditors'
import {
  Alert, Button, ConfirmModal, DataTable, EnumPill, FilterSelect, Kpi, PageHeader, Pill, PromptModal, SearchInput,
  Tabs, Toolbar, fmtDate, fmtRelative, useAsync, useCrmRefs, useDebounced, useToast,
} from './ui'

export default function ReferralsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'partners' ? 'partners' : 'queue'
  const [toastNode, toast] = useToast()
  const referrals = useAsync(() => crm.referrals(), [])
  const partners = useAsync(() => crm.partners(), [])
  const editors = useCrmEditors({ toast, onSaved: () => Promise.all([referrals.reload(), partners.reload()]) })

  const open = (referrals.data || []).filter((r) => OPEN_REFERRAL_STATUSES.includes(r.status))
  return (
    <div>
      <PageHeader
        title="Referrals"
        subtitle="Inbound referral queue with insurance & authorization tracking, plus your referring-partner directory."
        actions={
          <>
            <Button variant="secondary" onClick={() => editors.open.partner()}><Icon name="plus" /> Partner</Button>
            <Button onClick={() => editors.open.referral()}><Icon name="plus" /> Log referral</Button>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <Kpi label="Open referrals" value={open.length} />
        <Kpi label="Overdue" value={open.filter((r) => r.overdue).length} tone="red" />
        <Kpi label="Awaiting auth / insurance" value={open.filter((r) => r.status === 'AUTHORIZATION_PENDING' || r.status === 'INSURANCE_VERIFICATION').length} tone="amber" />
        <Kpi label="Active partners" value={(partners.data || []).filter((p) => p.relationshipStatus === 'ACTIVE').length} tone="ink" />
      </div>
      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'partners' ? { tab: 'partners' } : {})}
        tabs={[
          { value: 'queue', label: 'Referral queue', count: open.length },
          { value: 'partners', label: 'Referral partners', count: partners.data?.length },
        ]}
      />
      {tab === 'queue'
        ? <ReferralQueue state={referrals} editors={editors} toast={toast} />
        : <PartnerDirectory state={partners} editors={editors} toast={toast} />}
      {editors.node}
      {toastNode}
    </div>
  )
}

function ReferralQueue({ state, editors, toast }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('OPEN')
  const [priority, setPriority] = useState('ALL')
  const [partner, setPartner] = useState('ALL')
  const [closing, setClosing] = useState(null)
  const { partners } = useCrmRefs()
  const needle = useDebounced(q).toLowerCase()

  const rows = useMemo(() => (state.data || [])
    .filter((r) => (status === 'ALL' ? true : status === 'OPEN' ? OPEN_REFERRAL_STATUSES.includes(r.status) : r.status === status))
    .filter((r) => priority === 'ALL' || r.priority === priority)
    .filter((r) => partner === 'ALL' || r.referralPartnerId === partner)
    .filter((r) => !needle || [r.patientName, r.referralPartnerName, r.referringProviderName, r.serviceRequested, r.diagnosisCodes]
      .some((v) => v?.toLowerCase().includes(needle))), [state.data, status, priority, partner, needle])

  async function changeStatus(r, next, closedReason) {
    if ((next === 'DECLINED' || next === 'CANCELLED') && closedReason === undefined) {
      setClosing({ r, next })
      return
    }
    try {
      await crm.referralStatus(r.id, { status: next, closedReason: closedReason || null })
      toast(`Referral → ${labelOf(REFERRAL_STATUSES, next)}`)
      state.reload()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <>
      <Alert>{state.error}</Alert>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Patient, partner, service, ICD-10…" />
        <FilterSelect label="Status" value={status} onChange={setStatus} allLabel="All" options={[{ value: 'OPEN', label: 'Open queue' }, ...REFERRAL_STATUSES]} />
        <FilterSelect label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} />
        <FilterSelect label="Partner" value={partner} onChange={setPartner} allLabel="Any" options={partners.map((p) => ({ value: p.id, label: p.name }))} />
      </Toolbar>
      <DataTable
        rows={rows}
        loading={state.loading}
        onRowClick={(r) => editors.open.referral(r)}
        empty="No referrals match. Log one when a fax, e-referral or call comes in."
        columns={[
          { key: 'receivedOn', label: 'Received', nowrap: true, render: (r) => fmtDate(r.receivedOn) },
          {
            key: 'patientName',
            label: 'Patient',
            render: (r) => (
              <Link onClick={(e) => e.stopPropagation()} to={`/app/crm/patients/${r.patientId}`} className="font-semibold text-brand-700">
                {r.patientName}
              </Link>
            ),
          },
          { key: 'referralPartnerName', label: 'Referred by', render: (r) => r.referralPartnerName || r.referringProviderName || '—' },
          { key: 'serviceRequested', label: 'Service', render: (r) => r.serviceRequested || '—' },
          { key: 'priority', label: 'Priority', render: (r) => <EnumPill list={PRIORITIES} value={r.priority} /> },
          {
            key: 'status',
            label: 'Status',
            sortValue: (r) => REFERRAL_STATUSES.findIndex((s) => s.value === r.status),
            render: (r) => (
              <select
                value={r.status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => changeStatus(r, e.target.value)}
                className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[12px] font-semibold text-navy"
                aria-label="Change referral status"
              >
                {REFERRAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            ),
          },
          { key: 'insurancePayer', label: 'Payer / auth', render: (r) => [r.insurancePayer, r.authorizationNumber && `#${r.authorizationNumber}`].filter(Boolean).join(' · ') || '—' },
          {
            key: 'dueOn',
            label: 'Process by',
            nowrap: true,
            render: (r) => (r.overdue ? <Pill tone="red">{fmtDate(r.dueOn)}</Pill> : fmtDate(r.dueOn)),
          },
          { key: 'assignedName', label: 'Coordinator' },
        ]}
      />
      <PromptModal
        open={Boolean(closing)}
        title={closing?.next === 'DECLINED' ? 'Decline referral' : 'Cancel referral'}
        label="Reason"
        required
        options={['Insurance not accepted', 'Authorization denied', 'Outside scope of practice', 'Patient declined', 'Unable to reach patient', 'Duplicate referral', 'Other']}
        onClose={() => setClosing(null)}
        onConfirm={async (reason) => {
          await changeStatus(closing.r, closing.next, reason)
          setClosing(null)
        }}
      />
    </>
  )
}

function PartnerDirectory({ state, editors, toast }) {
  const { user } = useAuth()
  const isAdmin = permissionsFor(user?.role).has('crmadmin')
  const [q, setQ] = useState('')
  const [type, setType] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [toDelete, setToDelete] = useState(null)
  const needle = useDebounced(q).toLowerCase()
  const rows = (state.data || [])
    .filter((p) => type === 'ALL' || p.partnerType === type)
    .filter((p) => status === 'ALL' || p.relationshipStatus === status)
    .filter((p) => !needle || [p.name, p.specialty, p.contactName, p.npi, p.city].some((v) => v?.toLowerCase().includes(needle)))

  return (
    <>
      <Alert>{state.error}</Alert>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Name, specialty, NPI, city…" />
        <FilterSelect label="Type" value={type} onChange={setType} options={PARTNER_TYPES} />
        <FilterSelect label="Relationship" value={status} onChange={setStatus} options={PARTNER_STATUSES} />
      </Toolbar>
      <DataTable
        rows={rows}
        loading={state.loading}
        onRowClick={(p) => editors.open.partner(p)}
        empty="No referral partners yet. Add the physicians and facilities that send you patients."
        columns={[
          { key: 'name', label: 'Partner', render: (p) => <div><b>{p.name}</b><p className="m-0 text-[12px] text-mist-500">{p.specialty || labelOf(PARTNER_TYPES, p.partnerType)}{p.npi ? ` · NPI ${p.npi}` : ''}</p></div> },
          { key: 'relationshipStatus', label: 'Relationship', render: (p) => <EnumPill list={PARTNER_STATUSES} value={p.relationshipStatus} /> },
          { key: 'contactName', label: 'Contact', render: (p) => <div>{p.contactName || '—'}<p className="m-0 text-[12px] text-mist-500">{p.phone || p.email || ''}</p></div> },
          { key: 'totalReferrals', label: 'Referrals', align: 'right', render: (p) => <span className="font-mono">{p.totalReferrals}</span> },
          { key: 'referralsLast90Days', label: 'Last 90d', align: 'right', render: (p) => <span className="font-mono">{p.referralsLast90Days}</span> },
          { key: 'openReferrals', label: 'Open', align: 'right', render: (p) => <span className="font-mono">{p.openReferrals}</span> },
          { key: 'patientsReferred', label: 'Patients', align: 'right', render: (p) => <span className="font-mono">{p.patientsReferred}</span> },
          { key: 'lastTouchAt', label: 'Last referral', nowrap: true, render: (p) => (p.lastTouchAt ? fmtRelative(p.lastTouchAt) : '—') },
          { key: 'ownerName', label: 'Owner' },
          ...(isAdmin ? [{
            key: 'actions',
            label: '',
            sortable: false,
            render: (p) => (
              <Button size="sm" variant="ghost" onClick={(e) => {
                e.stopPropagation()
                setToDelete(p)
              }}>Delete</Button>
            ),
          }] : []),
        ]}
      />
      <ConfirmModal
        open={Boolean(toDelete)}
        title={`Delete ${toDelete?.name}?`}
        message="Referrals and patients keep their history but lose the link to this partner."
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          await crm.deletePartner(toDelete.id)
          setToDelete(null)
          toast('Partner deleted')
          state.reload()
        }}
      />
    </>
  )
}
