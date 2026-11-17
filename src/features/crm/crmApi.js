import { api } from '../../shared/api/client'

/* ─── Query helper ─────────────────────────────────────────────────────── */
function qs(params = {}) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'ALL') return
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

const BASE = '/api/v1/crm'
const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')

/** Multipart upload (the JSON client can't send files). */
async function upload(path, form) {
  const res = await fetch(`${API_ROOT}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'Utessa' },
    body: form,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const error = new Error(data?.message || 'Upload failed')
    error.status = res.status
    throw error
  }
  return data
}
const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

/* ─── Endpoints ────────────────────────────────────────────────────────── */
export const crm = {
  dashboard: () => api(`${BASE}/dashboard${qs({ tz: tz() })}`),
  search: (q) => api(`${BASE}/search${qs({ q })}`),
  team: () => api(`${BASE}/team`),

  patients: (params) => api(`${BASE}/patients${qs(params)}`),
  patient: (id) => api(`${BASE}/patients/${id}`),
  createPatient: (body, allowDuplicate = false) =>
    api(`${BASE}/patients${qs({ allowDuplicate: allowDuplicate || undefined })}`, { method: 'POST', body }),
  updatePatient: (id, body) => api(`${BASE}/patients/${id}`, { method: 'PUT', body }),
  deletePatient: (id) => api(`${BASE}/patients/${id}`, { method: 'DELETE' }),
  patientStatus: (id, body) => api(`${BASE}/patients/${id}/status`, { method: 'PATCH', body }),
  convertPatient: (id, body) => api(`${BASE}/patients/${id}/convert`, { method: 'POST', body }),
  ehrSync: (id) => api(`${BASE}/patients/${id}/ehr-sync`, { method: 'POST' }),
  timeline: (id) => api(`${BASE}/patients/${id}/timeline`),
  addActivity: (id, body) => api(`${BASE}/patients/${id}/activities`, { method: 'POST', body }),
  duplicates: (params) => api(`${BASE}/patients/duplicates${qs(params)}`),
  bulk: (body) => api(`${BASE}/patients/bulk`, { method: 'POST', body }),

  lookupCaller: (phone) => api(`${BASE}/call-desk/lookup${qs({ phone })}`),
  logCall: (body) => api(`${BASE}/call-desk/calls`, { method: 'POST', body }),
  recentCalls: (limit = 25) => api(`${BASE}/call-desk/calls${qs({ limit })}`),

  partners: () => api(`${BASE}/referral-partners`),
  createPartner: (body) => api(`${BASE}/referral-partners`, { method: 'POST', body }),
  updatePartner: (id, body) => api(`${BASE}/referral-partners/${id}`, { method: 'PUT', body }),
  deletePartner: (id) => api(`${BASE}/referral-partners/${id}`, { method: 'DELETE' }),

  referrals: (params) => api(`${BASE}/referrals${qs(params)}`),
  createReferral: (body) => api(`${BASE}/referrals`, { method: 'POST', body }),
  updateReferral: (id, body) => api(`${BASE}/referrals/${id}`, { method: 'PUT', body }),
  referralStatus: (id, body) => api(`${BASE}/referrals/${id}/status`, { method: 'PATCH', body }),
  deleteReferral: (id) => api(`${BASE}/referrals/${id}`, { method: 'DELETE' }),

  opportunities: (params) => api(`${BASE}/opportunities${qs(params)}`),
  opportunity: (id) => api(`${BASE}/opportunities/${id}`),
  opportunityTimeline: (id) => api(`${BASE}/opportunities/${id}/timeline`),
  createOpportunity: (body) => api(`${BASE}/opportunities`, { method: 'POST', body }),
  updateOpportunity: (id, body) => api(`${BASE}/opportunities/${id}`, { method: 'PUT', body }),
  opportunityStage: (id, body) => api(`${BASE}/opportunities/${id}/stage`, { method: 'PATCH', body }),
  deleteOpportunity: (id) => api(`${BASE}/opportunities/${id}`, { method: 'DELETE' }),

  appointments: (params) => api(`${BASE}/appointments${qs(params)}`),
  createAppointment: (body) => api(`${BASE}/appointments`, { method: 'POST', body }),
  updateAppointment: (id, body) => api(`${BASE}/appointments/${id}`, { method: 'PUT', body }),
  appointmentStatus: (id, body) => api(`${BASE}/appointments/${id}/status`, { method: 'PATCH', body }),
  deleteAppointment: (id) => api(`${BASE}/appointments/${id}`, { method: 'DELETE' }),

  tasks: (params) => api(`${BASE}/tasks${qs({ tz: tz(), ...params })}`),
  createTask: (body) => api(`${BASE}/tasks`, { method: 'POST', body }),
  updateTask: (id, body) => api(`${BASE}/tasks/${id}`, { method: 'PUT', body }),
  completeTask: (id, body) => api(`${BASE}/tasks/${id}/complete`, { method: 'POST', body: body || {} }),
  deleteTask: (id) => api(`${BASE}/tasks/${id}`, { method: 'DELETE' }),

  targets: () => api(`${BASE}/targets`),
  createTarget: (body) => api(`${BASE}/targets`, { method: 'POST', body }),
  updateTarget: (id, body) => api(`${BASE}/targets/${id}`, { method: 'PUT', body }),
  deleteTarget: (id) => api(`${BASE}/targets/${id}`, { method: 'DELETE' }),

  matchIdentity: (params) => api(`${BASE}/call-desk/match${qs(params)}`),
  linkPhone: (id, phone) => api(`${BASE}/patients/${id}/link-phone`, { method: 'POST', body: { phone } }),
  documentCall: (body) => api(`${BASE}/call-desk/document`, { method: 'POST', body }),
  intake: (body) => api(`${BASE}/call-desk/intake`, { method: 'POST', body }),
  providers: () => api(`${BASE}/providers`),
  openings: (params) => api(`${BASE}/appointments/openings${qs(params)}`),
  callAnalytics: (params) => api(`${BASE}/call-analytics${qs({ tz: tz(), ...params })}`),

  recalls: () => api(`${BASE}/recalls`),
  recallAttempt: (id, body) => api(`${BASE}/recalls/${id}/attempts`, { method: 'POST', body }),
  recallReopen: (id) => api(`${BASE}/recalls/${id}/reopen`, { method: 'POST' }),
  recallImport: (body) => api(`${BASE}/recalls/import`, { method: 'POST', body }),
  deleteRecall: (id) => api(`${BASE}/recalls/${id}`, { method: 'DELETE' }),

  phone: () => api(`${BASE}/phone`),
  savePhoneMine: (config) => api(`${BASE}/phone/config/me`, { method: 'PUT', body: { config } }),
  savePhonePractice: (config) => api(`${BASE}/phone/config/practice`, { method: 'PUT', body: { config } }),
  phoneContacts: (params) => api(`${BASE}/phone/contacts${qs(params)}`),
  threads: () => api(`${BASE}/phone/threads`),
  thread: (phone) => api(`${BASE}/phone/threads/${encodeURIComponent(phone)}`),
  markThreadRead: (phone) => api(`${BASE}/phone/threads/${encodeURIComponent(phone)}/read`, { method: 'POST' }),
  sendText: (body) => api(`${BASE}/phone/messages`, { method: 'POST', body }),
  voicemails: () => api(`${BASE}/phone/voicemails`),
  logVoicemail: (body) => api(`${BASE}/phone/voicemails`, { method: 'POST', body }),
  voicemailStatus: (id, status) => api(`${BASE}/phone/voicemails/${id}/status${qs({ status })}`, { method: 'POST' }),
  faxes: () => api(`${BASE}/phone/faxes`),
  createFax: (form) => upload(`${BASE}/phone/faxes`, form),
  fileFax: (id, body) => api(`${BASE}/phone/faxes/${id}/file`, { method: 'POST', body }),
  forwardFax: (id, body) => api(`${BASE}/phone/faxes/${id}/forward`, { method: 'POST', body }),
  faxDocumentUrl: (id) => `${API_ROOT}${BASE}/phone/faxes/${id}/document`,
  /** Fetches the fax with the session cookie and returns a local blob URL (safe to show in an iframe). */
  faxDocumentBlob: async (id) => {
    const res = await fetch(`${API_ROOT}${BASE}/phone/faxes/${id}/document`, { credentials: 'include' })
    if (!res.ok) throw new Error('Could not load the document')
    return URL.createObjectURL(await res.blob())
  },

  integrations: () => api(`${BASE}/integrations`),
  saveIntegration: (kind, body) => api(`${BASE}/integrations/${kind}`, { method: 'PUT', body }),
}

/* ─── Vocabulary ───────────────────────────────────────────────────────── */
const opt = (pairs) => pairs.map(([value, label, tone]) => ({ value, label, tone }))

export const LEAD_STATUSES = opt([
  ['NEW', 'New', 'blue'],
  ['ATTEMPTING_CONTACT', 'Attempting contact', 'amber'],
  ['CONTACTED', 'Contacted', 'teal'],
  ['QUALIFIED', 'Qualified', 'ink'],
  ['APPOINTMENT_SCHEDULED', 'Appt scheduled', 'teal'],
  ['SHOWED', 'Showed', 'green'],
  ['CONVERTED', 'Converted', 'green'],
  ['NOT_QUALIFIED', 'Not qualified', 'gray'],
  ['LOST', 'Lost', 'red'],
])
export const OPEN_LEAD_STATUSES = ['NEW', 'ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED', 'APPOINTMENT_SCHEDULED', 'SHOWED']

export const PRIORITIES = opt([
  ['URGENT', 'Urgent', 'red'],
  ['HIGH', 'High', 'amber'],
  ['MEDIUM', 'Medium', 'blue'],
  ['LOW', 'Low', 'gray'],
])

export const LIFECYCLES = opt([
  ['LEAD', 'Lead', 'blue'],
  ['PATIENT', 'Patient', 'green'],
  ['INACTIVE', 'Inactive', 'gray'],
])

export const OPP_STAGES = opt([
  ['INQUIRY', 'Inquiry', 'blue'],
  ['QUALIFIED', 'Qualified', 'ink'],
  ['CONSULT_SCHEDULED', 'Consult scheduled', 'teal'],
  ['CONSULT_COMPLETED', 'Consult completed', 'teal'],
  ['TREATMENT_PRESENTED', 'Treatment presented', 'amber'],
  ['WON', 'Won', 'green'],
  ['LOST', 'Lost', 'red'],
])
export const OPEN_OPP_STAGES = ['INQUIRY', 'QUALIFIED', 'CONSULT_SCHEDULED', 'CONSULT_COMPLETED', 'TREATMENT_PRESENTED']

export const APPT_STATUSES = opt([
  ['SCHEDULED', 'Scheduled', 'blue'],
  ['CONFIRMED', 'Confirmed', 'teal'],
  ['CHECKED_IN', 'Checked in', 'ink'],
  ['COMPLETED', 'Completed', 'green'],
  ['NO_SHOW', 'No-show', 'red'],
  ['CANCELLED', 'Cancelled', 'gray'],
  ['RESCHEDULED', 'Rescheduled', 'amber'],
])
export const APPT_TYPES = opt([
  ['NEW_PATIENT', 'New patient visit'],
  ['CONSULTATION', 'Consultation'],
  ['FOLLOW_UP', 'Follow-up visit'],
  ['TELEHEALTH', 'Telehealth visit'],
  ['CALLBACK', 'Scheduled callback'],
  ['MEETING', 'Meeting'],
])
export const APPT_MODES = opt([
  ['IN_PERSON', 'In person'],
  ['TELEHEALTH', 'Telehealth / video'],
  ['PHONE', 'Phone'],
])

export const REFERRAL_STATUSES = opt([
  ['RECEIVED', 'Received', 'blue'],
  ['IN_REVIEW', 'In review', 'ink'],
  ['INSURANCE_VERIFICATION', 'Insurance verification', 'amber'],
  ['AUTHORIZATION_PENDING', 'Auth pending', 'amber'],
  ['SCHEDULED', 'Scheduled', 'teal'],
  ['COMPLETED', 'Completed', 'green'],
  ['DECLINED', 'Declined', 'red'],
  ['CANCELLED', 'Cancelled', 'gray'],
])
export const OPEN_REFERRAL_STATUSES = ['RECEIVED', 'IN_REVIEW', 'INSURANCE_VERIFICATION', 'AUTHORIZATION_PENDING', 'SCHEDULED']

export const TASK_STATUSES = opt([
  ['OPEN', 'Open', 'blue'],
  ['IN_PROGRESS', 'In progress', 'amber'],
  ['DONE', 'Done', 'green'],
  ['CANCELLED', 'Cancelled', 'gray'],
])
export const TASK_TYPES = opt([
  ['CALL', 'Call'],
  ['SMS', 'Text message'],
  ['EMAIL', 'Email'],
  ['FOLLOW_UP', 'Follow-up'],
  ['INSURANCE_VERIFICATION', 'Insurance verification'],
  ['RECORDS_REQUEST', 'Records request'],
  ['DOCUMENT', 'Paperwork / forms'],
  ['OTHER', 'Other'],
])

export const ACTIVITY_TYPES = opt([
  ['CALL_INBOUND', 'Inbound call', 'teal'],
  ['CALL_OUTBOUND', 'Outbound call', 'teal'],
  ['NOTE', 'Note', 'gray'],
  ['SMS', 'Text message', 'blue'],
  ['EMAIL', 'Email', 'blue'],
  ['MEETING', 'Meeting / visit', 'ink'],
  ['STATUS_CHANGE', 'Status change', 'amber'],
  ['SYSTEM', 'System', 'gray'],
])

export const LEAD_SOURCES = [
  'Phone call', 'Web form', 'Walk-in', 'Referral', 'Google / search', 'Social media',
  'Insurance directory', 'Health fair / event', 'Existing patient referral', 'Email campaign', 'Other',
]
export const CALL_OUTCOMES = ['Reached', 'Voicemail', 'No answer', 'Busy', 'Callback requested', 'Scheduled', 'Wrong number', 'Not interested']
export const CONTACT_METHODS = ['Mobile', 'Home phone', 'Text', 'Email', 'Patient portal']
export const LANGUAGES = ['English', 'Spanish', 'Chinese', 'Vietnamese', 'Arabic', 'Urdu', 'Hindi', 'French', 'Other']
export const PARTNER_TYPES = opt([
  ['PHYSICIAN', 'Physician'],
  ['PRACTICE', 'Practice / group'],
  ['HOSPITAL', 'Hospital / health system'],
  ['URGENT_CARE', 'Urgent care / ER'],
  ['SPECIALIST', 'Specialist'],
  ['PAYER', 'Insurance / payer'],
  ['EMPLOYER', 'Employer'],
  ['COMMUNITY', 'Community org'],
  ['OTHER', 'Other'],
])
export const PARTNER_STATUSES = opt([
  ['ACTIVE', 'Active', 'green'],
  ['PROSPECT', 'Prospect', 'blue'],
  ['INACTIVE', 'Inactive', 'gray'],
])

export const TARGET_METRICS = opt([
  ['NEW_LEADS', 'New leads'],
  ['CALLS_MADE', 'Outbound calls'],
  ['APPOINTMENTS_BOOKED', 'Appointments booked'],
  ['APPOINTMENTS_COMPLETED', 'Visits completed'],
  ['CONVERSIONS', 'Leads converted'],
  ['REFERRALS_RECEIVED', 'Referrals received'],
  ['REVENUE_WON', 'Revenue won ($)'],
])

export const PHONE_PROVIDERS = ['RingCentral', 'Twilio', 'Weave', 'Vonage', '8x8', 'Nextiva', 'Dialpad', 'Zoom Phone', 'Other']
export const EHR_PROVIDERS = [
  'athenahealth', 'Epic', 'eClinicalWorks', 'NextGen', 'Cerner (Oracle Health)', 'Allscripts / Veradigm',
  'Tebra (Kareo)', 'DrChrono', 'Practice Fusion', 'ModMed', 'AdvancedMD', 'Elation', 'Other',
]

export function labelOf(list, value) {
  return list.find((o) => o.value === value)?.label || value || '—'
}
export function toneOf(list, value) {
  return list.find((o) => o.value === value)?.tone || 'gray'
}

/* ─── Incoming-call flow ───────────────────────────────────────────────── */
export const CALL_REASONS = [
  'Schedule or reschedule',
  'Question for the care team',
  'Prescription refill',
  'Billing or insurance',
  'Test results',
  'Other',
]
export const CALL_DOC_OUTCOMES = [
  'Resolved on the call',
  'Appointment booked or changed',
  'Message sent to care team',
  'Call back needed',
  'Transferred',
]
export const LEAD_REASONS = [
  'Asked about insurance we take',
  'Asked about a provider or service',
  'Will call back to book',
  'Price / self-pay question',
  'Wrong number or spam',
]
export const CALLER_TYPES = opt([
  ['REFERRING_OFFICE', 'Referring office'],
  ['HOSPITAL', 'Hospital / facility'],
  ['PHARMACY', 'Pharmacy'],
  ['PAYER', 'Insurance / payer'],
  ['VENDOR', 'Vendor'],
  ['STAFF', 'Staff'],
  ['OTHER', 'Other'],
])
export const POLICY_HOLDERS = ['Patient', 'Spouse', 'Parent', 'Other']
export const COMMON_PAYERS = [
  'Medicare Part B', 'Medicaid', 'Aetna', 'Blue Cross Blue Shield', 'UnitedHealthcare', 'Cigna', 'Humana',
  'Tricare', 'Kaiser Permanente', 'Other',
]

/* ─── Recall call list ─────────────────────────────────────────────────── */
export const RECALL_STATUSES = opt([
  ['TO_CALL', 'To call', 'blue'],
  ['NOT_REACHED', 'Not reached', 'amber'],
  ['REBOOKED', 'Rebooked', 'green'],
  ['CLOSED', 'Closed', 'gray'],
])
export const RECALL_CLOSE_REASONS = [
  'Patient declined',
  'Seen elsewhere',
  'No longer needs the visit',
  'Wrong number / unreachable',
  'Deceased',
  'Other',
]

/* ─── Phone workspace ──────────────────────────────────────────────────── */
export const PRESENCE = opt([
  ['AVAILABLE', 'Available', 'green'],
  ['BUSY', 'Busy', 'amber'],
  ['DND', 'Do not disturb', 'red'],
  ['AWAY', 'Away', 'gray'],
])
export const QUICK_REPLIES = [
  ['Confirm visit', 'Hi {first}, this is a reminder of your upcoming visit. Reply C to confirm.'],
  ['Please call us', 'Hi {first}, please give us a call back at your convenience.'],
  ['Running late', 'Hi {first}, the provider is running about 15 minutes behind today. Thank you for your patience.'],
  ['Forms', 'Hi {first}, your new-patient forms are ready. We will send the link shortly.'],
]
export const FAX_DOC_TYPES = ['Referral', 'Medical records', 'Lab report', 'Prior authorization', 'Insurance', 'Other']
/** Words that suggest clinical detail — texts are not a secure channel. */
export const PHI_PATTERN = /\b(test|result|lab|biopsy|diagnos\w*|hiv|std|pregnan\w*|cancer|mri|ct scan|x-ray|prescription|medication|blood|positive|negative)\b/i
