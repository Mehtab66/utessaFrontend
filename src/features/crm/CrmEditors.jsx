import { useCallback, useState } from 'react'
import {
  APPT_MODES, APPT_STATUSES, APPT_TYPES, CONTACT_METHODS, LANGUAGES, LEAD_SOURCES, LEAD_STATUSES, LIFECYCLES,
  OPP_STAGES, PARTNER_STATUSES, PARTNER_TYPES, PRIORITIES, REFERRAL_STATUSES, TARGET_METRICS, TASK_STATUSES,
  TASK_TYPES, crm,
} from './crmApi'
import { Button, FormModal, fromLocalInput, nullify, toLocalInput, useCrmRefs } from './ui'

const yesNo = (v) => v === true || v === 'true'

/* ─── Patient / lead ───────────────────────────────────────────────────── */
const patientSections = (isEdit) => [
  {
    title: 'Patient / caller',
    fields: [
      { name: 'firstName', label: 'First name *', required: true },
      { name: 'lastName', label: 'Last name' },
      { name: 'phone', label: 'Mobile phone', type: 'tel', placeholder: '(555) 555-0100' },
      { name: 'altPhone', label: 'Alternate phone', type: 'tel' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'dateOfBirth', label: 'Date of birth', type: 'date' },
      { name: 'gender', label: 'Sex / gender', type: 'select', options: ['Female', 'Male', 'Non-binary', 'Other', 'Prefer not to say'] },
      { name: 'preferredName', label: 'Preferred name' },
    ],
  },
  {
    title: 'Pipeline',
    fields: [
      { name: 'lifecycleStage', label: 'Record type', type: 'select', options: LIFECYCLES, noEmpty: true },
      { name: 'leadStatus', label: 'Lead status', type: 'select', options: LEAD_STATUSES, noEmpty: true },
      { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, noEmpty: true },
      { name: 'ownerUserId', label: 'Assigned to', type: 'member' },
      { name: 'nextFollowUp', label: isEdit ? 'Schedule a follow-up on' : 'First follow-up on', type: 'date', hint: 'Creates a follow-up call task for the assignee.' },
      { name: 'lostReason', label: 'Lost / not-qualified reason', show: (v) => v.leadStatus === 'LOST' || v.leadStatus === 'NOT_QUALIFIED' },
    ],
  },
  {
    title: 'Source & referral',
    fields: [
      { name: 'source', label: 'Lead source', type: 'select', options: LEAD_SOURCES },
      { name: 'sourceDetail', label: 'Source detail', placeholder: 'e.g. Google Ads – knee pain campaign' },
      { name: 'referralPartnerId', label: 'Referring partner', type: 'partner', emptyLabel: 'None' },
      { name: 'campaign', label: 'Campaign' },
    ],
  },
  {
    title: 'Care interest',
    fields: [
      { name: 'interestedService', label: 'Service / reason category', placeholder: 'e.g. Physical therapy' },
      { name: 'preferredProvider', label: 'Preferred provider' },
      { name: 'preferredLocation', label: 'Preferred location' },
      { name: 'reasonForVisit', label: 'Reason for visit / chief complaint', type: 'textarea', hint: 'Keep clinical detail minimal — full notes belong in the EHR.' },
    ],
  },
  {
    title: 'Insurance',
    fields: [
      { name: 'insurancePayer', label: 'Insurance / payer', placeholder: 'e.g. Aetna, Medicare, Self-pay' },
      { name: 'insurancePlan', label: 'Plan' },
      { name: 'insuranceMemberId', label: 'Member ID' },
      { name: 'insuranceVerified', label: 'Eligibility verified', type: 'checkbox' },
    ],
  },
  {
    title: 'Contact preferences & consent',
    fields: [
      { name: 'preferredContact', label: 'Preferred contact', type: 'select', options: CONTACT_METHODS },
      { name: 'preferredLanguage', label: 'Preferred language', type: 'select', options: LANGUAGES },
      { name: 'bestTimeToCall', label: 'Best time to call', type: 'select', options: ['Morning', 'Midday', 'Afternoon', 'Evening', 'Any time'] },
      { name: 'consentCall', label: 'OK to call', type: 'checkbox' },
      { name: 'consentSms', label: 'SMS consent (TCPA)', type: 'checkbox' },
      { name: 'consentEmail', label: 'Email consent', type: 'checkbox' },
      { name: 'doNotContact', label: 'Do not contact', type: 'checkbox' },
    ],
  },
  {
    title: 'Address',
    fields: [
      { name: 'street', label: 'Street', span: 2 },
      { name: 'city', label: 'City' },
      { name: 'state', label: 'State' },
      { name: 'zip', label: 'ZIP' },
    ],
  },
  {
    title: 'Chart link & notes',
    fields: [
      { name: 'mrn', label: 'MRN / chart #', show: (v) => v.lifecycleStage === 'PATIENT' },
      { name: 'tags', label: 'Tags', placeholder: 'Comma separated, e.g. VIP, Spanish, Medicare' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
]

export function patientDefaults(overrides = {}) {
  return {
    firstName: '', lastName: '', phone: '', altPhone: '', email: '', dateOfBirth: '', gender: '', preferredName: '',
    lifecycleStage: 'LEAD', leadStatus: 'NEW', priority: 'MEDIUM', ownerUserId: '', nextFollowUp: '', lostReason: '',
    source: 'Phone call', sourceDetail: '', referralPartnerId: '', campaign: '',
    interestedService: '', preferredProvider: '', preferredLocation: '', reasonForVisit: '',
    insurancePayer: '', insurancePlan: '', insuranceMemberId: '', insuranceVerified: false,
    preferredContact: 'Mobile', preferredLanguage: 'English', bestTimeToCall: '',
    consentCall: true, consentSms: false, consentEmail: false, doNotContact: false,
    street: '', city: '', state: '', zip: '', mrn: '', tags: '', notes: '',
    ...overrides,
  }
}

function patientFromRow(p) {
  const out = patientDefaults()
  Object.keys(out).forEach((k) => {
    if (p[k] !== undefined && p[k] !== null) out[k] = p[k]
  })
  out.nextFollowUp = ''
  return out
}

/* ─── Opportunity ──────────────────────────────────────────────────────── */
const opportunitySections = [
  {
    title: 'Opportunity',
    fields: [
      { name: 'patientId', label: 'Patient / lead *', type: 'patient', required: true, span: 2 },
      { name: 'name', label: 'Opportunity name *', required: true, placeholder: 'e.g. Knee replacement consult', span: 2 },
      { name: 'serviceLine', label: 'Service line', placeholder: 'e.g. Orthopedics' },
      { name: 'providerName', label: 'Provider' },
      { name: 'stage', label: 'Stage', type: 'select', options: OPP_STAGES, noEmpty: true },
      { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, noEmpty: true },
      { name: 'estimatedValue', label: 'Estimated value ($)', type: 'number', min: 0, step: '0.01' },
      { name: 'probability', label: 'Probability (%)', type: 'number', min: 0, max: 100, hint: 'Leave blank to use the stage default.' },
      { name: 'expectedCloseDate', label: 'Expected decision date', type: 'date' },
      { name: 'ownerUserId', label: 'Owner', type: 'member' },
      { name: 'lostReason', label: 'Lost reason', show: (v) => v.stage === 'LOST', required: true },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
]

/* ─── Appointment ──────────────────────────────────────────────────────── */
const appointmentSections = [
  {
    title: 'Appointment',
    fields: [
      { name: 'patientId', label: 'Patient / lead *', type: 'patient', required: true, span: 2 },
      { name: 'appointmentType', label: 'Type', type: 'select', options: APPT_TYPES, noEmpty: true },
      { name: 'mode', label: 'Visit mode', type: 'select', options: APPT_MODES, noEmpty: true },
      { name: 'startsAt', label: 'Date & time *', type: 'datetime', required: true },
      { name: 'durationMinutes', label: 'Duration (minutes)', type: 'number', min: 5, max: 600, step: 5 },
      { name: 'providerName', label: 'Provider', hint: 'Double-booking the same provider is blocked.' },
      { name: 'location', label: 'Location / room' },
      { name: 'status', label: 'Status', type: 'select', options: APPT_STATUSES, noEmpty: true },
      { name: 'assignedUserId', label: 'Booked by / coordinator', type: 'member' },
      { name: 'title', label: 'Title', placeholder: 'Auto: "<type> · <patient>"', span: 2 },
      { name: 'cancelReason', label: 'Cancellation / no-show reason', show: (v) => v.status === 'CANCELLED' || v.status === 'NO_SHOW', span: 2 },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
]

/* ─── Task ─────────────────────────────────────────────────────────────── */
const taskSections = [
  {
    title: 'Task',
    fields: [
      { name: 'title', label: 'What needs to happen? *', required: true, span: 2 },
      { name: 'patientId', label: 'Patient / lead', type: 'patient', span: 2 },
      { name: 'taskType', label: 'Type', type: 'select', options: TASK_TYPES, noEmpty: true },
      { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, noEmpty: true },
      { name: 'dueAt', label: 'Due *', type: 'datetime', required: true },
      { name: 'assignedUserId', label: 'Assigned to', type: 'member' },
      { name: 'status', label: 'Status', type: 'select', options: TASK_STATUSES, noEmpty: true },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
]

/* ─── Referral ─────────────────────────────────────────────────────────── */
const referralSections = (isEdit) => [
  {
    title: 'Referred patient',
    hint: isEdit ? null : 'Pick an existing record, or enter the new patient — a lead is created automatically.',
    fields: [
      { name: 'mode', label: 'Patient', type: 'select', noEmpty: true, options: [{ value: 'existing', label: 'Existing patient / lead' }, { value: 'new', label: 'New patient' }], show: () => !isEdit },
      { name: 'patientId', label: 'Patient / lead *', type: 'patient', span: 2, show: (v) => isEdit || v.mode !== 'new', required: true },
      { name: 'patientFirstName', label: 'First name *', show: (v) => !isEdit && v.mode === 'new', required: true },
      { name: 'patientLastName', label: 'Last name', show: (v) => !isEdit && v.mode === 'new' },
      { name: 'patientPhone', label: 'Phone *', type: 'tel', show: (v) => !isEdit && v.mode === 'new', required: true },
      { name: 'patientDateOfBirth', label: 'Date of birth', type: 'date', show: (v) => !isEdit && v.mode === 'new' },
      { name: 'patientEmail', label: 'Email', type: 'email', show: (v) => !isEdit && v.mode === 'new' },
    ],
  },
  {
    title: 'Referral source',
    fields: [
      { name: 'referralPartnerId', label: 'Referring partner', type: 'partner', emptyLabel: 'Not in directory' },
      { name: 'referringProviderName', label: 'Referring provider' },
      { name: 'referringProviderNpi', label: 'Referring NPI' },
      { name: 'direction', label: 'Direction', type: 'select', noEmpty: true, options: [{ value: 'INBOUND', label: 'Inbound (to us)' }, { value: 'OUTBOUND', label: 'Outbound (we refer out)' }] },
    ],
  },
  {
    title: 'Clinical & authorization',
    fields: [
      { name: 'serviceRequested', label: 'Service requested', placeholder: 'e.g. Cardiology consult' },
      { name: 'referredToProvider', label: 'Referred to provider' },
      { name: 'diagnosisCodes', label: 'Diagnosis codes (ICD-10)', placeholder: 'e.g. M17.11, I10' },
      { name: 'insurancePayer', label: 'Insurance / payer' },
      { name: 'authorizationNumber', label: 'Authorization #' },
      { name: 'authorizationExpiresOn', label: 'Authorization expires', type: 'date' },
      { name: 'reason', label: 'Reason for referral', type: 'textarea' },
    ],
  },
  {
    title: 'Workflow',
    fields: [
      { name: 'status', label: 'Status', type: 'select', options: REFERRAL_STATUSES, noEmpty: true },
      { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, noEmpty: true },
      { name: 'receivedOn', label: 'Received on', type: 'date' },
      { name: 'dueOn', label: 'Process by', type: 'date', hint: 'Default: 3 days (1 day if urgent).' },
      { name: 'assignedUserId', label: 'Coordinator', type: 'member' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
]

/* ─── Referral partner ─────────────────────────────────────────────────── */
const partnerSections = [
  {
    title: 'Partner',
    fields: [
      { name: 'name', label: 'Name *', required: true, placeholder: 'Practice, facility or physician', span: 2 },
      { name: 'partnerType', label: 'Type', type: 'select', options: PARTNER_TYPES, noEmpty: true },
      { name: 'relationshipStatus', label: 'Relationship', type: 'select', options: PARTNER_STATUSES, noEmpty: true },
      { name: 'specialty', label: 'Specialty' },
      { name: 'npi', label: 'NPI' },
      { name: 'contactName', label: 'Contact person' },
      { name: 'ownerUserId', label: 'Relationship owner', type: 'member' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { name: 'phone', label: 'Phone', type: 'tel' },
      { name: 'fax', label: 'Fax', type: 'tel' },
      { name: 'email', label: 'Email', type: 'email', span: 2 },
      { name: 'street', label: 'Street', span: 2 },
      { name: 'city', label: 'City' },
      { name: 'state', label: 'State' },
      { name: 'zip', label: 'ZIP' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
]

/* ─── Target ───────────────────────────────────────────────────────────── */
const targetSections = [
  {
    title: 'Target',
    fields: [
      { name: 'metric', label: 'Metric *', type: 'select', options: TARGET_METRICS, noEmpty: true, required: true },
      { name: 'targetValue', label: 'Target *', type: 'number', min: 1, required: true },
      { name: 'userId', label: 'Assigned to', type: 'member', emptyLabel: 'Whole practice' },
      { name: 'periodLabel', label: 'Period label', placeholder: 'e.g. Q1 2027' },
      { name: 'periodStart', label: 'Start *', type: 'date', required: true },
      { name: 'periodEnd', label: 'End *', type: 'date', required: true },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
]

/* ═══════════════════════════════════════════════════════════════════════
   Hook: one place to open any CRM editor from any page
   ═══════════════════════════════════════════════════════════════════════ */
export function useCrmEditors({ onSaved, toast } = {}) {
  const [state, setState] = useState(null)
  const [dupe, setDupe] = useState(false)
  const { refreshRefs } = useCrmRefs()
  const close = useCallback(() => {
    setState(null)
    setDupe(false)
  }, [])
  const done = useCallback(async (kind, result, message) => {
    setState(null)
    setDupe(false)
    toast?.(message)
    await onSaved?.(kind, result)
  }, [onSaved, toast])

  const open = {
    patient: (row, defaults = {}) => setState({ kind: 'patient', row, initial: row ? patientFromRow(row) : patientDefaults(defaults) }),
    opportunity: (row, defaults = {}) => setState({
      kind: 'opportunity',
      row,
      initial: row
        ? { ...row, estimatedValue: row.estimatedValue ?? '', probability: row.probability ?? '', expectedCloseDate: row.expectedCloseDate || '', ownerUserId: row.ownerUserId || '', __patientIdLabel: row.patientName }
        : { patientId: '', name: '', serviceLine: '', providerName: '', stage: 'INQUIRY', priority: 'MEDIUM', estimatedValue: '', probability: '', expectedCloseDate: '', ownerUserId: '', notes: '', ...defaults },
    }),
    appointment: (row, defaults = {}) => {
      const start = new Date()
      start.setDate(start.getDate() + 1)
      start.setHours(9, 0, 0, 0)
      setState({
        kind: 'appointment',
        row,
        initial: row
          ? { ...row, startsAt: toLocalInput(row.startsAt), assignedUserId: row.assignedUserId || '', __patientIdLabel: row.patientName }
          : { patientId: '', appointmentType: 'NEW_PATIENT', mode: 'IN_PERSON', startsAt: toLocalInput(start.toISOString()), durationMinutes: 30, providerName: '', location: '', status: 'SCHEDULED', assignedUserId: '', title: '', cancelReason: '', notes: '', ...defaults },
      })
    },
    task: (row, defaults = {}) => {
      const due = new Date(Date.now() + 2 * 3600 * 1000)
      due.setMinutes(0, 0, 0)
      setState({
        kind: 'task',
        row,
        initial: row
          ? { ...row, dueAt: toLocalInput(row.dueAt), patientId: row.patientId || '', assignedUserId: row.assignedUserId || '', __patientIdLabel: row.patientName }
          : { title: '', patientId: '', taskType: 'CALL', priority: 'MEDIUM', dueAt: toLocalInput(due.toISOString()), assignedUserId: '', status: 'OPEN', notes: '', ...defaults },
      })
    },
    referral: (row, defaults = {}) => setState({
      kind: 'referral',
      row,
      initial: row
        ? { ...row, referralPartnerId: row.referralPartnerId || '', assignedUserId: row.assignedUserId || '', authorizationExpiresOn: row.authorizationExpiresOn || '', dueOn: row.dueOn || '', __patientIdLabel: row.patientName }
        : {
            mode: defaults.patientId ? 'existing' : 'new', patientId: '', patientFirstName: '', patientLastName: '', patientPhone: '', patientDateOfBirth: '', patientEmail: '',
            referralPartnerId: '', referringProviderName: '', referringProviderNpi: '', direction: 'INBOUND', serviceRequested: '', referredToProvider: '',
            diagnosisCodes: '', insurancePayer: '', authorizationNumber: '', authorizationExpiresOn: '', reason: '', status: 'RECEIVED', priority: 'MEDIUM',
            receivedOn: new Date().toISOString().slice(0, 10), dueOn: '', assignedUserId: '', notes: '', ...defaults,
          },
    }),
    partner: (row) => setState({
      kind: 'partner',
      row,
      initial: row
        ? { ...row, ownerUserId: row.ownerUserId || '' }
        : { name: '', partnerType: 'PHYSICIAN', relationshipStatus: 'ACTIVE', specialty: '', npi: '', contactName: '', ownerUserId: '', phone: '', fax: '', email: '', street: '', city: '', state: '', zip: '', notes: '' },
    }),
    target: (row) => {
      const now = new Date()
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      setState({
        kind: 'target',
        row,
        initial: row
          ? { ...row, userId: row.userId || '' }
          : { metric: 'NEW_LEADS', targetValue: '', userId: '', periodLabel: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), periodStart: iso(first), periodEnd: iso(last), notes: '' },
      })
    },
  }

  const kind = state?.kind
  const isEdit = Boolean(state?.row)

  async function submitPatient(values, allowDuplicate = false) {
    const body = nullify({ ...values, insuranceVerified: yesNo(values.insuranceVerified) })
    try {
      const result = isEdit ? await crm.updatePatient(state.row.id, body) : await crm.createPatient(body, allowDuplicate)
      await done('patient', result, isEdit ? 'Record updated' : result.lifecycleStage === 'PATIENT' ? 'Patient added' : 'Lead created')
    } catch (err) {
      if (err.status === 409) setDupe(true)
      throw err
    }
  }

  const node = (
    <>
      <FormModal
        open={kind === 'patient'}
        title={isEdit ? `Edit ${state?.row?.fullName}` : state?.initial?.lifecycleStage === 'PATIENT' ? 'Add patient' : 'New patient lead'}
        subtitle="Only the first name is required — capture what the caller shares."
        sections={patientSections(isEdit)}
        initial={state?.initial}
        onClose={close}
        onSubmit={(v) => submitPatient(v)}
        size="xl"
        extraFooter={(values, run, saving) => (dupe && !isEdit ? (
          <Button variant="secondary" disabled={saving} onClick={() => run((v) => submitPatient(v, true))}>
            Save anyway
          </Button>
        ) : null)}
      />
      <FormModal
        open={kind === 'opportunity'}
        title={isEdit ? 'Edit opportunity' : 'New opportunity'}
        sections={opportunitySections}
        initial={state?.initial}
        onClose={close}
        onSubmit={async (v) => {
          const body = nullify(v)
          const result = isEdit ? await crm.updateOpportunity(state.row.id, body) : await crm.createOpportunity(body)
          await done('opportunity', result, isEdit ? 'Opportunity updated' : 'Opportunity created')
        }}
      />
      <FormModal
        open={kind === 'appointment'}
        title={isEdit ? 'Edit appointment' : 'Schedule appointment'}
        sections={appointmentSections}
        initial={state?.initial}
        onClose={close}
        onSubmit={async (v) => {
          const body = nullify({ ...v, startsAt: fromLocalInput(v.startsAt), durationMinutes: Number(v.durationMinutes) || 30 })
          const result = isEdit ? await crm.updateAppointment(state.row.id, body) : await crm.createAppointment(body)
          await done('appointment', result, isEdit ? 'Appointment updated' : 'Appointment booked')
        }}
      />
      <FormModal
        open={kind === 'task'}
        title={isEdit ? 'Edit task' : 'New follow-up task'}
        sections={taskSections}
        initial={state?.initial}
        onClose={close}
        size="md"
        onSubmit={async (v) => {
          const body = nullify({ ...v, dueAt: fromLocalInput(v.dueAt) })
          const result = isEdit ? await crm.updateTask(state.row.id, body) : await crm.createTask(body)
          await done('task', result, isEdit ? 'Task updated' : 'Task created')
        }}
      />
      <FormModal
        open={kind === 'referral'}
        title={isEdit ? 'Edit referral' : 'Log referral'}
        subtitle={isEdit ? null : 'A “process referral” task is created for the coordinator automatically.'}
        sections={referralSections(isEdit)}
        initial={state?.initial}
        onClose={close}
        size="xl"
        onSubmit={async (v) => {
          const body = nullify(v)
          delete body.mode
          if (!isEdit && v.mode === 'new') body.patientId = null
          if (!isEdit && v.mode !== 'new') {
            body.patientFirstName = null
            body.patientPhone = null
          }
          const result = isEdit ? await crm.updateReferral(state.row.id, body) : await crm.createReferral(body)
          await done('referral', result, isEdit ? 'Referral updated' : 'Referral logged')
        }}
      />
      <FormModal
        open={kind === 'partner'}
        title={isEdit ? 'Edit referral partner' : 'Add referral partner'}
        sections={partnerSections}
        initial={state?.initial}
        onClose={close}
        onSubmit={async (v) => {
          const body = nullify(v)
          const result = isEdit ? await crm.updatePartner(state.row.id, body) : await crm.createPartner(body)
          await refreshRefs()
          await done('partner', result, isEdit ? 'Partner updated' : 'Partner added')
        }}
      />
      <FormModal
        open={kind === 'target'}
        title={isEdit ? 'Edit target' : 'New target'}
        sections={targetSections}
        initial={state?.initial}
        onClose={close}
        size="md"
        onSubmit={async (v) => {
          const body = nullify({ ...v, targetValue: Number(v.targetValue) })
          const result = isEdit ? await crm.updateTarget(state.row.id, body) : await crm.createTarget(body)
          await done('target', result, isEdit ? 'Target updated' : 'Target created')
        }}
      />
    </>
  )

  return { open, node }
}
