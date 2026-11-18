import { useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { permissionsFor } from '../../shared/security/roles'
import {
  APPT_STATUSES, CALL_OUTCOMES, LEAD_STATUSES, LIFECYCLES, OPP_STAGES, PRIORITIES, REFERRAL_STATUSES, TASK_TYPES,
  crm, labelOf,
} from './crmApi'
import { useCrmEditors } from './CrmEditors'
import {
  Alert, Avatar, Button, Card, ConfirmModal, DataTable, DetailGrid, EnumPill, Field, Loading, Modal, Pill, PromptModal,
  StagePath, Tabs, Timeline, ageFrom, formatPhone, fmtDate, fmtDateTime, fmtMoney, fmtRelative, useAsync, useToast,
} from './ui'

const PATH = LEAD_STATUSES.filter((s) => !['NOT_QUALIFIED', 'LOST'].includes(s.value))
const COMPOSER_TYPES = [
  { value: 'NOTE', label: 'Note' },
  { value: 'CALL_OUTBOUND', label: 'Outbound call' },
  { value: 'CALL_INBOUND', label: 'Inbound call' },
  { value: 'SMS', label: 'Text message' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'In-person meeting' },
]

export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = permissionsFor(user?.role).has('crmadmin')
  const [toastNode, toast] = useToast()
  const [tab, setTab] = useState('activity')
  const [lostOpen, setLostOpen] = useState(null)
  const [convertOpen, setConvertOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const patient = useAsync(() => crm.patient(id), [id])
  const timeline = useAsync(() => crm.timeline(id), [id])
  const opps = useAsync(() => crm.opportunities({ patientId: id }), [id])
  const appts = useAsync(() => crm.appointments({ patientId: id }), [id])
  const tasks = useAsync(() => crm.tasks({ patientId: id }), [id])
  const referrals = useAsync(() => crm.referrals({ patientId: id }), [id])

  const reloadAll = async () => {
    await Promise.all([patient.reload(), timeline.reload(), opps.reload(), appts.reload(), tasks.reload(), referrals.reload()])
  }
  const editors = useCrmEditors({ toast, onSaved: reloadAll })
  const p = patient.data

  if (patient.loading && !p) return <Loading />
  if (patient.error && !p) return <Alert>{patient.error}</Alert>
  if (!p) return null

  const age = ageFrom(p.dateOfBirth)
  const isLead = p.lifecycleStage === 'LEAD'
  const closed = p.leadStatus === 'LOST' || p.leadStatus === 'NOT_QUALIFIED'
  const ctx = { patientId: p.id, __patientIdLabel: p.fullName }
  const openTasks = (tasks.data || []).filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')

  async function changeStatus(leadStatus, lostReason) {
    try {
      await crm.patientStatus(p.id, { leadStatus, lostReason: lostReason || null })
      toast(`Status → ${labelOf(LEAD_STATUSES, leadStatus)}`)
      await reloadAll()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[12.5px] text-mist-500">
        <Link to={isLead ? '/app/crm/leads' : '/app/crm/patients'} className="font-semibold text-brand-700">
          <span className="inline-flex items-center gap-1"><Icon name="arrowLeft" className="h-3.5 w-3.5" /> {isLead ? 'Patient leads' : 'Patients'}</span>
        </Link>
      </div>

      {/* Header */}
      <section className="rounded-[16px] border border-mist-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <Avatar name={p.fullName} size="lg" tone={isLead ? 'blue' : 'teal'} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="m-0 text-[24px] font-bold tracking-[-0.02em] text-navy">{p.fullName}</h1>
                <EnumPill list={LIFECYCLES} value={p.lifecycleStage} />
                <EnumPill list={PRIORITIES} value={p.priority} />
                {p.doNotContact && <Pill tone="red">Do not contact</Pill>}
              </div>
              <p className="m-0 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-mist-700">
                {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 font-semibold text-brand-700"><Icon name="phone" className="h-3.5 w-3.5" /> {formatPhone(p.phone)}</a>}
                {p.email && <a href={`mailto:${p.email}`} className="text-brand-700">{p.email}</a>}
                {p.dateOfBirth && <span>DOB {fmtDate(p.dateOfBirth)}{age != null ? ` · ${age} yrs` : ''}</span>}
                {p.mrn && <span>MRN {p.mrn}</span>}
                <span>Owner: {p.ownerName || 'Unassigned'}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.phone && (
              <Button variant="secondary" onClick={() => navigate(`/app/crm/call-desk?phone=${encodeURIComponent(p.phone)}&direction=OUTBOUND`)}>
                <Icon name="phone" /> Call
              </Button>
            )}
            <Button variant="secondary" onClick={() => editors.open.appointment(null, ctx)}>Schedule</Button>
            <Button variant="secondary" onClick={() => editors.open.task(null, { ...ctx, title: `Follow up with ${p.fullName}` })}>Add task</Button>
            <Button variant="secondary" onClick={() => editors.open.patient(p)}>Edit</Button>
            {isLead && !closed && <Button onClick={() => setConvertOpen(true)}>Convert to patient</Button>}
          </div>
        </div>

        {isLead && (
          <div className="mt-4">
            <StagePath stages={PATH} value={closed ? null : p.leadStatus} onSelect={(v) => (v === 'CONVERTED' ? setConvertOpen(true) : changeStatus(v))} />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
              <span className="text-mist-500">
                {closed
                  ? <>Closed as <b className="text-danger-600">{labelOf(LEAD_STATUSES, p.leadStatus)}</b>{p.lostReason ? ` — ${p.lostReason}` : ''}</>
                  : <>Created {fmtRelative(p.createdAt)} · last contact {p.lastContactAt ? fmtRelative(p.lastContactAt) : 'never'}</>}
              </span>
              <span className="flex gap-2">
                {closed ? (
                  <Button size="sm" variant="secondary" onClick={() => changeStatus('CONTACTED')}>Re-open lead</Button>
                ) : (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setLostOpen('NOT_QUALIFIED')}>Not qualified</Button>
                    <Button size="sm" variant="danger" onClick={() => setLostOpen('LOST')}>Mark lost</Button>
                  </>
                )}
              </span>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Card bodyClassName="pt-2">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'activity', label: 'Activity', count: timeline.data?.length },
                { value: 'opportunities', label: 'Opportunities', count: opps.data?.length },
                { value: 'appointments', label: 'Appointments', count: appts.data?.length },
                { value: 'tasks', label: 'Tasks', count: openTasks.length },
                { value: 'referrals', label: 'Referrals', count: referrals.data?.length },
              ]}
            />

            {tab === 'activity' && (
              <>
                <Composer patient={p} onSaved={async () => {
                  toast('Activity logged')
                  await Promise.all([timeline.reload(), patient.reload(), tasks.reload()])
                }} />
                <div className="mt-4"><Timeline items={timeline.data} loading={timeline.loading} /></div>
              </>
            )}

            {tab === 'opportunities' && (
              <>
                <div className="mb-3 flex justify-end">
                  <Button size="sm" onClick={() => editors.open.opportunity(null, { ...ctx, name: p.interestedService ? `${p.interestedService} – ${p.fullName}` : '', serviceLine: p.interestedService || '' })}><Icon name="plus" /> Opportunity</Button>
                </div>
                <DataTable
                  rows={opps.data || []}
                  loading={opps.loading}
                  onRowClick={(o) => navigate(`/app/crm/opportunities/${o.id}`)}
                  empty="No opportunities yet."
                  columns={[
                    { key: 'name', label: 'Opportunity', render: (o) => <b>{o.name}</b> },
                    { key: 'serviceLine', label: 'Service line' },
                    { key: 'stage', label: 'Stage', render: (o) => <EnumPill list={OPP_STAGES} value={o.stage} /> },
                    { key: 'estimatedValue', label: 'Value', align: 'right', render: (o) => fmtMoney(o.estimatedValue) },
                    { key: 'ownerName', label: 'Owner' },
                  ]}
                />
              </>
            )}

            {tab === 'appointments' && (
              <>
                <div className="mb-3 flex justify-end">
                  <Button size="sm" onClick={() => editors.open.appointment(null, ctx)}><Icon name="plus" /> Appointment</Button>
                </div>
                <DataTable
                  rows={appts.data || []}
                  loading={appts.loading}
                  onRowClick={(a) => editors.open.appointment(a)}
                  empty="No appointments yet."
                  columns={[
                    { key: 'startsAt', label: 'When', nowrap: true, render: (a) => fmtDateTime(a.startsAt) },
                    { key: 'title', label: 'Appointment' },
                    { key: 'providerName', label: 'Provider' },
                    { key: 'status', label: 'Status', render: (a) => <EnumPill list={APPT_STATUSES} value={a.status} /> },
                    { key: 'ehrSyncStatus', label: 'EHR', render: (a) => <EhrBadge status={a.ehrSyncStatus} /> },
                  ]}
                />
              </>
            )}

            {tab === 'tasks' && (
              <>
                <div className="mb-3 flex justify-end">
                  <Button size="sm" onClick={() => editors.open.task(null, { ...ctx, title: `Follow up with ${p.fullName}` })}><Icon name="plus" /> Task</Button>
                </div>
                <DataTable
                  rows={tasks.data || []}
                  loading={tasks.loading}
                  onRowClick={(t) => editors.open.task(t)}
                  empty="No tasks yet."
                  columns={[
                    { key: 'title', label: 'Task', render: (t) => <span className={t.status === 'DONE' ? 'text-mist-500 line-through' : 'font-semibold'}>{t.title}</span> },
                    { key: 'taskType', label: 'Type', render: (t) => labelOf(TASK_TYPES, t.taskType) },
                    { key: 'dueAt', label: 'Due', nowrap: true, render: (t) => <span className={t.overdue ? 'font-semibold text-danger-600' : ''}>{fmtDateTime(t.dueAt)}</span> },
                    { key: 'assignedName', label: 'Assignee' },
                    {
                      key: 'actions',
                      label: '',
                      sortable: false,
                      render: (t) => (t.status === 'OPEN' || t.status === 'IN_PROGRESS') && (
                        <Button size="sm" variant="secondary" onClick={async (e) => {
                          e.stopPropagation()
                          await crm.completeTask(t.id)
                          toast('Task completed')
                          await Promise.all([tasks.reload(), timeline.reload(), patient.reload()])
                        }}><Icon name="check" /> Done</Button>
                      ),
                    },
                  ]}
                />
              </>
            )}

            {tab === 'referrals' && (
              <>
                <div className="mb-3 flex justify-end">
                  <Button size="sm" onClick={() => editors.open.referral(null, { ...ctx, mode: 'existing' })}><Icon name="plus" /> Referral</Button>
                </div>
                <DataTable
                  rows={referrals.data || []}
                  loading={referrals.loading}
                  onRowClick={(r) => editors.open.referral(r)}
                  empty="No referrals for this patient."
                  columns={[
                    { key: 'receivedOn', label: 'Received', nowrap: true, render: (r) => fmtDate(r.receivedOn) },
                    { key: 'referralPartnerName', label: 'From', render: (r) => r.referralPartnerName || r.referringProviderName || '—' },
                    { key: 'serviceRequested', label: 'Service' },
                    { key: 'status', label: 'Status', render: (r) => <EnumPill list={REFERRAL_STATUSES} value={r.status} /> },
                    { key: 'authorizationNumber', label: 'Auth #' },
                  ]}
                />
              </>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Contact & consent" actions={<Button size="sm" variant="ghost" onClick={() => editors.open.patient(p)}>Edit</Button>}>
            <DetailGrid items={[
              ['Mobile', p.phone],
              ['Alternate', p.altPhone],
              ['Preferred contact', p.preferredContact],
              ['Language', p.preferredLanguage],
              ['Best time', p.bestTimeToCall],
              ['Address', [p.street, p.city, p.state, p.zip].filter(Boolean).join(', ')],
            ]} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone={p.consentCall ? 'green' : 'gray'}><Icon name={p.consentCall ? 'check' : 'x'} className="h-3 w-3" strokeWidth={2.4} />Calls</Pill>
              <Pill tone={p.consentSms ? 'green' : 'gray'}><Icon name={p.consentSms ? 'check' : 'x'} className="h-3 w-3" strokeWidth={2.4} />SMS</Pill>
              <Pill tone={p.consentEmail ? 'green' : 'gray'}><Icon name={p.consentEmail ? 'check' : 'x'} className="h-3 w-3" strokeWidth={2.4} />Email</Pill>
            </div>
          </Card>
          <Card title="Insurance">
            <DetailGrid items={[
              ['Payer', p.insurancePayer],
              ['Plan', p.insurancePlan],
              ['Member ID', p.insuranceMemberId],
              ['Eligibility', p.insuranceVerified ? <Pill key="v" tone="green">Verified</Pill> : <Pill key="nv" tone="amber">Not verified</Pill>],
            ]} />
          </Card>
          <Card title="Source & care interest">
            <DetailGrid items={[
              ['Source', p.source],
              ['Source detail', p.sourceDetail],
              ['Referring partner', p.referralPartnerName],
              ['Campaign', p.campaign],
              ['Interest', p.interestedService],
              ['Preferred provider', p.preferredProvider],
              ['Location', p.preferredLocation],
              ['Next follow-up', p.nextFollowUp ? fmtDate(p.nextFollowUp) : null],
            ]} />
            {p.reasonForVisit && <p className="m-0 mt-3 rounded-lg bg-mist-25 px-3 py-2 text-[13px] text-mist-700">{p.reasonForVisit}</p>}
            {p.tags && (
              <div className="mt-3 flex flex-wrap gap-1">
                {p.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => <Pill key={t} tone="ink">{t}</Pill>)}
              </div>
            )}
            {p.notes && <p className="m-0 mt-3 whitespace-pre-line text-[13px] text-mist-700">{p.notes}</p>}
          </Card>
          <Card title="EHR link">
            <DetailGrid items={[
              ['Sync status', <EhrBadge key="s" status={p.ehrSyncStatus} />],
              ['EHR patient ID', p.ehrPatientId],
              ['Last synced', p.ehrSyncedAt ? fmtDateTime(p.ehrSyncedAt) : null],
            ]} />
            {!p.ehrPatientId && p.ehrSyncStatus !== 'PENDING' && (
              <Button size="sm" variant="secondary" className="mt-3" onClick={async () => {
                try {
                  await crm.ehrSync(p.id)
                  toast('Queued for EHR')
                  await Promise.all([patient.reload(), timeline.reload()])
                } catch (err) {
                  toast(err.message, 'error')
                }
              }}>Queue for EHR creation</Button>
            )}
            <p className="m-0 mt-2 text-[12px] text-mist-500">
              Queued records are pushed to your EHR automatically once the <Link to="/app/crm/integrations" className="font-semibold text-brand-700">EHR integration</Link> is live.
            </p>
          </Card>
          {isAdmin && (
            <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>Delete record</Button>
          )}
        </div>
      </div>

      <PromptModal
        open={Boolean(lostOpen)}
        title={lostOpen === 'LOST' ? 'Mark lead as lost' : 'Mark as not qualified'}
        label="Reason"
        options={lostOpen === 'LOST'
          ? ['Chose another provider', 'Insurance not accepted', 'Cost / self-pay concerns', 'No response after multiple attempts', 'Scheduling / location', 'No longer needs care', 'Other']
          : ['Outside service area', 'Service not offered', 'Age / eligibility', 'Duplicate record', 'Spam / wrong number', 'Other']}
        required
        confirmLabel="Save"
        onClose={() => setLostOpen(null)}
        onConfirm={async (reason) => {
          await changeStatus(lostOpen, reason)
          setLostOpen(null)
        }}
      />
      <ConvertModal open={convertOpen} patient={p} onClose={() => setConvertOpen(false)} onDone={async () => {
        setConvertOpen(false)
        toast(`${p.fullName} is now a patient`)
        await reloadAll()
      }} />
      <ConfirmModal
        open={confirmDelete}
        title={`Delete ${p.fullName}?`}
        message="This permanently removes the record with its timeline, tasks, appointments, opportunities and referrals. This cannot be undone."
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await crm.deletePatient(p.id)
          navigate(isLead ? '/app/crm/leads' : '/app/crm/patients')
        }}
      />
      {editors.node}
      {toastNode}
    </div>
  )
}

export function EhrBadge({ status }) {
  const map = {
    NOT_LINKED: ['gray', 'Not linked'],
    PENDING: ['amber', 'Queued'],
    SYNCED: ['green', 'Synced'],
    FAILED: ['red', 'Failed'],
  }
  const [tone, label] = map[status] || map.NOT_LINKED
  return <Pill tone={tone} dot>{label}</Pill>
}

function Composer({ patient, onSaved }) {
  const [type, setType] = useState('NOTE')
  const [body, setBody] = useState('')
  const [outcome, setOutcome] = useState('Reached')
  const [subject, setSubject] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isCall = type === 'CALL_INBOUND' || type === 'CALL_OUTBOUND'

  async function save() {
    if (!body.trim() && !isCall) {
      setError('Write something first.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await crm.addActivity(patient.id, {
        type,
        subject: subject.trim() || null,
        body: body.trim() || null,
        callOutcome: isCall ? outcome : null,
      })
      setBody('')
      setSubject('')
      await onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[12px] border border-mist-200 bg-mist-25 p-3">
      <div className="flex flex-wrap gap-1.5">
        {COMPOSER_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${type === t.value ? 'bg-brand-600 text-white' : 'bg-white text-mist-700 ring-1 ring-mist-200 hover:bg-brand-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {isCall && <Field field={{ name: 'o', label: 'Outcome', type: 'select', options: CALL_OUTCOMES, noEmpty: true }} value={outcome} onChange={setOutcome} />}
        {(type === 'EMAIL' || type === 'MEETING') && <Field field={{ name: 's', label: 'Subject' }} value={subject} onChange={setSubject} />}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={isCall ? 'What was discussed? (optional)' : type === 'NOTE' ? 'Add an internal note… (avoid detailed clinical notes — those belong in the EHR)' : 'Message summary…'}
        className="mt-2 w-full rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-warn">{error}</span>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : `Log ${COMPOSER_TYPES.find((t) => t.value === type)?.label.toLowerCase()}`}</Button>
      </div>
    </div>
  )
}

function ConvertModal({ open, patient, onClose, onDone }) {
  const [mrn, setMrn] = useState('')
  const [push, setPush] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open}
      title={`Convert ${patient.fullName} to a patient`}
      subtitle="Use this once the person has booked or attended their first visit."
      onClose={onClose}
      size="sm"
      footer={
        <>
          {error && <span className="mr-auto text-[13px] font-semibold text-warn">{error}</span>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={async () => {
            setBusy(true)
            setError('')
            try {
              await crm.convertPatient(patient.id, { mrn: mrn.trim() || null, pushToEhr: push })
              await onDone()
            } catch (err) {
              setError(err.message)
            } finally {
              setBusy(false)
            }
          }}>{busy ? 'Converting…' : 'Convert'}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field field={{ name: 'mrn', label: 'MRN / chart number', hint: 'Optional — fills in automatically when the EHR is connected.' }} value={mrn} onChange={setMrn} />
        <Field field={{ name: 'push', label: 'Create this patient in the EHR', type: 'checkbox' }} value={push} onChange={setPush} />
      </div>
    </Modal>
  )
}
