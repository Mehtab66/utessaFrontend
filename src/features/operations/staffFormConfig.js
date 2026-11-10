/** Wireframe-aligned staff / provider registration sections */

/** Non-provider staff designations */
export const STAFF_DESIGNATIONS = [
  'Front desk / patient access',
  'Scheduler / call center',
  'Medical assistant (CMA / RMA)',
  'Certified nursing assistant (CNA)',
  'Licensed practical nurse (LPN)',
  'Registered nurse (RN)',
  'Billing specialist',
  'Office manager',
  'HR / staff administrator',
  'IT administrator',
  'Physician liaison / marketing',
  'Other',
]

/** Credentialed clinician types only — used on Providers form */
export const PROVIDER_TYPES = [
  'Physician (MD / DO)',
  'Nurse practitioner (APRN / CRNP)',
  'Physician assistant (PA-C)',
  'Certified nurse midwife (CNM)',
  'Clinical nurse specialist (CNS)',
  'Dentist (DDS / DMD)',
  'Podiatrist (DPM)',
  'Optometrist (OD)',
  'Psychologist',
  'Other provider',
]

export function staffDefaults(provider = false) {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    preferredName: '',
    dateOfBirth: '',
    languages: '',
    street: '',
    apt: '',
    city: '',
    state: 'TX',
    zip: '',
    homePhone: '',
    mobilePhone: '',
    workPhone: '',
    personalEmail: '',
    email: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    jobTitle: provider ? 'Cardiologist' : 'Front desk / patient access',
    department: provider ? 'Cardiology clinic' : 'Front office',
    designation: provider ? 'Physician (MD / DO)' : 'Front desk / patient access',
    managerName: '',
    category: provider ? 'Provider' : 'Administrative',
    provider,
    status: 'ONBOARDING',
    employmentType: 'Full-time',
    fte: '1.0',
    hoursPerWeek: '40',
    shift: 'Day',
    workArrangement: 'On-site',
    payType: 'Salary',
    payRate: '',
    payFrequency: 'Biweekly',
    evalPlan: 'annual',
    accessRole: provider ? 'PROVIDER' : 'FRONT',
    createLogin: false,
    specialty: provider ? 'Cardiology' : '',
    subspecialty: '',
    boardStatus: provider ? 'Board certified' : '',
    boardName: '',
    boardExpiresOn: '',
    populationFocus: provider ? 'Adult' : '',
    supervisorName: '',
    npi: '',
    deaNumber: '',
    deaExpiresOn: '',
    taxonomyCode: '',
    caqhId: '',
    licenseType: provider ? 'State medical license' : '',
    licenseNumber: '',
    licenseExpiresOn: '',
    location: 'Plano office',
    startDate: '',
    termDate: '',
    lastDayWorked: '',
    separationType: '',
    rehireEligibility: '',
    separationNotes: '',
    notes: '',
    credentials: [],
  }
}

export function staffFromRow(r) {
  const d = staffDefaults(Boolean(r.provider))
  for (const key of Object.keys(d)) {
    if (r[key] !== undefined && r[key] !== null) d[key] = r[key]
  }
  d.provider = Boolean(r.provider)
  d.createLogin = Boolean(r.createLogin)
  d.credentials = r.credentials || []
  if (d.provider) {
    d.category = 'Provider'
    d.accessRole = 'PROVIDER'
  }
  return d
}

export function staffSections({ providerMode = false } = {}) {
  const jobFields = providerMode
    ? [
        {
          name: 'designation',
          label: 'Provider type *',
          type: 'select',
          required: true,
          options: PROVIDER_TYPES.map((d) => ({ value: d, label: d })),
        },
        { name: 'jobTitle', label: 'Clinical title / display name *', required: true, placeholder: 'e.g. Cardiologist' },
        { name: 'department', label: 'Department / clinic *', required: true },
        { name: 'location', label: 'Primary location *', required: true },
        { name: 'managerName', label: 'Reports to' },
        { name: 'startDate', label: 'Credentialing / start date *', type: 'date', required: true },
        {
          name: 'employmentType',
          label: 'Employment type *',
          type: 'select',
          required: true,
          options: ['Full-time', 'Part-time', 'PRN / per diem', 'Contract', 'Locum'].map((v) => ({ value: v, label: v })),
        },
        { name: 'fte', label: 'FTE' },
        { name: 'hoursPerWeek', label: 'Scheduled hours / week' },
        {
          name: 'status',
          label: 'Status *',
          type: 'select',
          required: true,
          options: [
            { value: 'ONBOARDING', label: 'Onboarding' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'SUSPENDED', label: 'Suspended' },
            { value: 'INACTIVE', label: 'Inactive' },
          ],
        },
        { name: 'createLogin', label: 'Invite to Utessa', type: 'checkbox', hint: 'Send a provider login invite' },
      ]
    : [
        {
          name: 'designation',
          label: 'Designation (staff type) *',
          type: 'select',
          required: true,
          options: STAFF_DESIGNATIONS.map((d) => ({ value: d, label: d })),
        },
        { name: 'jobTitle', label: 'Job title on profile *', required: true },
        { name: 'department', label: 'Department *', required: true },
        { name: 'location', label: 'Primary location *', required: true },
        { name: 'managerName', label: 'Reports to' },
        { name: 'startDate', label: 'Joining date *', type: 'date', required: true },
        {
          name: 'employmentType',
          label: 'Employment type *',
          type: 'select',
          required: true,
          options: ['Full-time', 'Part-time', 'PRN / per diem', 'Contract', 'Temporary'].map((v) => ({ value: v, label: v })),
        },
        { name: 'fte', label: 'FTE' },
        { name: 'hoursPerWeek', label: 'Scheduled hours / week' },
        {
          name: 'shift',
          label: 'Shift',
          type: 'select',
          options: ['Day', 'Evening', 'Night', 'Rotating', 'Variable'].map((v) => ({ value: v, label: v })),
        },
        {
          name: 'workArrangement',
          label: 'Work arrangement',
          type: 'select',
          options: ['On-site', 'Hybrid', 'Remote'].map((v) => ({ value: v, label: v })),
        },
        {
          name: 'status',
          label: 'Status *',
          type: 'select',
          required: true,
          options: [
            { value: 'ONBOARDING', label: 'Onboarding' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'SUSPENDED', label: 'Suspended' },
            { value: 'INACTIVE', label: 'Inactive' },
          ],
        },
        {
          name: 'category',
          label: 'Category *',
          type: 'select',
          required: true,
          options: [
            'Administrative',
            'Clinical support',
            'Nursing',
            'Billing & revenue cycle',
            'Leadership',
            'Technologist',
            'Therapy',
            'Pharmacy',
          ].map((v) => ({ value: v, label: v })),
        },
        {
          name: 'accessRole',
          label: 'Access role *',
          type: 'select',
          required: true,
          options: [
            { value: 'FRONT', label: 'Front desk' },
            { value: 'CLINICAL', label: 'Clinical staff' },
            { value: 'BILLING', label: 'Billing' },
            { value: 'HR', label: 'HR' },
            { value: 'MANAGER', label: 'Office manager' },
            { value: 'OUTREACH', label: 'Outreach' },
            { value: 'ADMIN', label: 'Admin' },
            { value: 'MEMBER', label: 'Team member' },
          ],
        },
        { name: 'createLogin', label: 'Create a login', type: 'checkbox', hint: 'Invite this person to Utessa' },
      ]

  const sections = [
    {
      title: '1 · Personal, address & emergency',
      hint: 'Identity, home address, phones, and who to call in an emergency.',
      fields: [
        { name: '_h_personal', type: 'heading', label: 'Personal details' },
        { name: 'firstName', label: 'First name *', required: true },
        { name: 'middleName', label: 'Middle name' },
        { name: 'lastName', label: 'Last name *', required: true },
        { name: 'preferredName', label: 'Preferred name' },
        { name: 'dateOfBirth', label: 'Date of birth', type: 'date' },
        { name: 'languages', label: 'Languages spoken', placeholder: 'English, Spanish…' },
        { name: '_h_address', type: 'heading', label: 'Address and contact' },
        { name: 'street', label: 'Street address *', span2: true, required: true },
        { name: 'apt', label: 'Apt / suite' },
        { name: 'city', label: 'City *', required: true },
        {
          name: 'state',
          label: 'State *',
          type: 'select',
          required: true,
          options: ['TX', 'OK', 'LA', 'NM', 'AR', 'Other'].map((s) => ({ value: s, label: s })),
        },
        { name: 'zip', label: 'ZIP *', required: true },
        { name: 'homePhone', label: 'Home phone', type: 'tel' },
        { name: 'mobilePhone', label: 'Mobile phone *', type: 'tel', required: true },
        { name: 'workPhone', label: 'Work phone / ext.', type: 'tel' },
        { name: 'personalEmail', label: 'Personal email', type: 'email' },
        { name: 'email', label: 'Work email *', type: 'email', required: true },
        { name: '_h_emergency', type: 'heading', label: 'Emergency contact' },
        { name: 'emergencyName', label: 'Name' },
        { name: 'emergencyRelationship', label: 'Relationship' },
        { name: 'emergencyPhone', label: 'Phone', type: 'tel' },
      ],
    },
    {
      title: providerMode ? '2 · Placement & credentials' : '2 · Job & employment',
      hint: providerMode
        ? 'Practice placement plus specialty, board, NPI, and license details.'
        : 'Staff designation, employment, and access — providers are registered separately.',
      fields: providerMode
        ? [
            { name: '_h_job', type: 'heading', label: 'Practice placement' },
            ...jobFields,
            { name: '_h_credentials', type: 'heading', label: 'Specialty & credentials' },
            { name: 'specialty', label: 'Specialty *', required: true },
            { name: 'subspecialty', label: 'Subspecialty' },
            {
              name: 'boardStatus',
              label: 'Board status *',
              type: 'select',
              required: true,
              options: [
                { value: '', label: '—' },
                { value: 'Board certified', label: 'Board certified' },
                { value: 'Board eligible', label: 'Board eligible' },
                { value: 'Not applicable', label: 'Not applicable' },
              ],
            },
            { name: 'boardName', label: 'Certifying board' },
            { name: 'boardExpiresOn', label: 'Board certification expires', type: 'date' },
            {
              name: 'populationFocus',
              label: 'Population focus *',
              type: 'select',
              required: true,
              options: [
                { value: '', label: '—' },
                { value: 'Adult', label: 'Adult' },
                { value: 'Pediatric', label: 'Pediatric' },
                { value: 'Both', label: 'Both' },
              ],
            },
            { name: 'supervisorName', label: 'Collaborating / supervising provider' },
            { name: 'npi', label: 'NPI *', required: true },
            { name: 'taxonomyCode', label: 'Taxonomy code' },
            { name: 'caqhId', label: 'CAQH ID' },
            { name: 'deaNumber', label: 'DEA number' },
            { name: 'deaExpiresOn', label: 'DEA expires', type: 'date' },
            {
              name: 'licenseType',
              label: 'Primary license type',
              type: 'select',
              options: [
                'State medical license',
                'APRN license',
                'PA license',
                'Dental license',
                'Other',
              ].map((v) => ({ value: v, label: v })),
            },
            { name: 'licenseNumber', label: 'Primary license number' },
            { name: 'licenseExpiresOn', label: 'Primary license expires', type: 'date' },
          ]
        : [
            { name: '_h_job', type: 'heading', label: 'Job and employment' },
            ...jobFields,
            { name: '_h_license', type: 'heading', label: 'License (if applicable)' },
            { name: 'licenseType', label: 'License type', placeholder: 'e.g. RN, LPN, CMA' },
            { name: 'licenseNumber', label: 'License number' },
            { name: 'licenseExpiresOn', label: 'License expires', type: 'date' },
          ],
    },
    {
      title: '3 · Pay, separation & notes',
      hint: 'Compensation, evaluation plan, end-of-employment fields, and internal notes.',
      fields: [
        { name: '_h_pay', type: 'heading', label: 'Pay & evaluation' },
        {
          name: 'payType',
          label: 'Pay type *',
          type: 'select',
          required: true,
          options: ['Hourly', 'Salary', 'Contract', 'Stipend'].map((v) => ({ value: v, label: v })),
        },
        { name: 'payRate', label: 'Base pay / rate' },
        {
          name: 'payFrequency',
          label: 'Pay frequency',
          type: 'select',
          options: ['Weekly', 'Biweekly', 'Semimonthly', 'Monthly'].map((v) => ({ value: v, label: v })),
        },
        {
          name: 'evalPlan',
          label: 'Evaluation timeline *',
          type: 'select',
          required: true,
          options: [
            { value: '90-day', label: '90-day then annual' },
            { value: 'annual', label: 'Annual' },
            { value: 'semiannual', label: 'Semiannual' },
            { value: 'none', label: 'Not set' },
          ],
        },
        { name: '_h_separation', type: 'heading', label: 'Separation (if ending)' },
        { name: 'termDate', label: 'Termination / end date', type: 'date' },
        { name: 'lastDayWorked', label: 'Last day worked', type: 'date' },
        {
          name: 'separationType',
          label: 'Separation type',
          type: 'select',
          options: [
            { value: '', label: '—' },
            { value: 'Resignation', label: 'Resignation' },
            { value: 'Termination', label: 'Termination' },
            { value: 'Retirement', label: 'Retirement' },
            { value: 'End of contract', label: 'End of contract' },
          ],
        },
        {
          name: 'rehireEligibility',
          label: 'Rehire eligibility',
          type: 'select',
          options: [
            { value: '', label: '—' },
            { value: 'Eligible', label: 'Eligible' },
            { value: 'Not eligible', label: 'Not eligible' },
            { value: 'Review required', label: 'Review required' },
          ],
        },
        { name: 'separationNotes', label: 'Separation notes (HR only)', type: 'textarea', full: true },
        { name: '_h_notes', type: 'heading', label: 'Notes' },
        { name: 'notes', label: 'Internal notes', type: 'textarea', full: true, rows: 4 },
      ],
    },
  ]

  return sections
}

export function toStaffPayload(values, { forceProvider = false } = {}) {
  const dateKeys = [
    'dateOfBirth',
    'boardExpiresOn',
    'deaExpiresOn',
    'licenseExpiresOn',
    'startDate',
    'termDate',
    'lastDayWorked',
  ]
  const body = { ...values, provider: Boolean(forceProvider) }
  for (const key of dateKeys) {
    if (body[key] === '') body[key] = null
  }
  if (!Array.isArray(body.credentials)) body.credentials = []

  // Strip UI-only heading keys
  for (const key of Object.keys(body)) {
    if (key.startsWith('_h_')) delete body[key]
  }

  if (forceProvider) {
    body.provider = true
    body.category = 'Provider'
    body.accessRole = 'PROVIDER'
  } else {
    body.provider = false
    if (body.accessRole === 'PROVIDER' || body.accessRole === 'OWNER') {
      body.accessRole = 'MEMBER'
    }
    if (body.category === 'Provider') {
      body.category = 'Administrative'
    }
  }

  return body
}
