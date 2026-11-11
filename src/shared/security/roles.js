/**
 * Role catalog aligned with the Practice CRM prototype.
 * Access comes only from the authenticated session role (server cookie / JWT claims).
 * There is no client-side “Viewing as” override for normal use.
 */

/** Organization roles only — platform SUPERADMIN is users.platform_role, not memberships.role */
export const ROLE_META = {
  OWNER: { id: 'OWNER', label: 'Owner / admin', group: 'owner' },
  ADMIN: { id: 'ADMIN', label: 'Admin', group: 'owner' },
  MANAGER: { id: 'MANAGER', label: 'Office manager', group: 'manager' },
  FRONT: { id: 'FRONT', label: 'Front desk', group: 'front' },
  CLINICAL: { id: 'CLINICAL', label: 'Clinical staff', group: 'clinical' },
  PROVIDER: { id: 'PROVIDER', label: 'Provider', group: 'provider' },
  BILLING: { id: 'BILLING', label: 'Billing', group: 'billing' },
  OUTREACH: { id: 'OUTREACH', label: 'Outreach', group: 'outreach' },
  HR: { id: 'HR', label: 'HR / staff admin', group: 'hr' },
  MEMBER: { id: 'MEMBER', label: 'Team member', group: 'front' },
}

/** Permission keys → which nav modules they unlock */
const PERMS = {
  OWNER: [
    'dash', 'inbox',
    'creds', 'staff', 'vendors', 'docvault', 'resources', 'training', 'timeclock', 'inventory',
    'patients', 'noshows',
    'leads', 'cms', 'email', 'social', 'agents',
    'setup', 'voip', 'mail', 'mobile', 'brand', 'access',
  ],
  ADMIN: [
    'dash', 'inbox',
    'creds', 'staff', 'vendors', 'docvault', 'resources', 'training', 'timeclock', 'inventory',
    'patients', 'noshows',
    'leads', 'cms', 'email', 'social', 'agents',
    'setup', 'voip', 'mail', 'mobile', 'brand', 'access',
  ],
  MANAGER: [
    'dash', 'inbox',
    'creds', 'staff', 'vendors', 'docvault', 'resources', 'training', 'timeclock', 'inventory',
    'patients', 'noshows',
    'leads', 'cms', 'email', 'social', 'agents',
  ],
  FRONT: ['dash', 'inbox', 'patients', 'noshows', 'resources', 'training', 'timeclock'],
  CLINICAL: ['dash', 'inbox', 'patients', 'resources', 'training', 'timeclock'],
  PROVIDER: ['dash', 'inbox', 'patients', 'resources', 'training', 'timeclock'],
  BILLING: ['dash', 'inbox', 'resources', 'training', 'timeclock'],
  OUTREACH: ['dash', 'inbox', 'leads', 'cms', 'email', 'social', 'agents', 'resources', 'training', 'timeclock'],
  HR: ['dash', 'inbox', 'creds', 'staff', 'docvault', 'resources', 'training', 'timeclock'],
  MEMBER: ['dash', 'inbox', 'resources', 'training', 'timeclock'],
}

const FEATURE_SERVICE = {
  dash: null,
  inbox: null,
  creds: 'ops',
  staff: 'ops',
  vendors: 'ops',
  docvault: 'ops',
  resources: 'ops',
  training: 'ops',
  timeclock: 'tc',
  inventory: 'ops',
  patients: 'crm',
  noshows: 'crm',
  leads: 'mkt',
  cms: 'mkt',
  email: 'mkt',
  social: 'mkt',
  agents: 'mkt',
  setup: null,
  voip: null,
  mail: null,
  mobile: null,
  brand: null,
  access: null,
}

function normalizeEnabledServices(enabledServices) {
  if (!enabledServices) return []
  if (Array.isArray(enabledServices)) return enabledServices
  if (enabledServices instanceof Set) return [...enabledServices]
  if (typeof enabledServices === 'object') return Object.keys(enabledServices).filter((key) => enabledServices[key])
  return []
}

function resolveEnabledServices(enabledServices) {
  const normalized = normalizeEnabledServices(enabledServices)
  if (enabledServices == null && normalized.length === 0) {
    return ['crm', 'ops', 'mkt', 'tc']
  }
  return normalized
}

/** Full practice sidebar — aligned with Practice-CRM wireframe */
export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', to: '/app', end: true, perm: 'dash' },
      { id: 'inbox', label: 'Inbox', to: '/app/inbox', perm: 'inbox' },
    ],
  },
  {
    title: 'Practice operations',
    items: [
      { id: 'creds', label: 'Providers', to: '/app/providers', perm: 'creds', service: 'ops' },
      { id: 'staff', label: 'Staff', to: '/app/staff', perm: 'staff', service: 'ops' },
      { id: 'vendors', label: 'Vendors', to: '/app/vendors', perm: 'vendors', service: 'ops' },
      { id: 'docvault', label: 'Document vault', to: '/app/document-vault', perm: 'docvault', service: 'ops' },
      { id: 'resources', label: 'Resources', to: '/app/resources', perm: 'resources', service: 'ops' },
      { id: 'training', label: 'Training', to: '/app/training', perm: 'training', service: 'ops' },
      { id: 'timeclock', label: 'Time clock', to: '/app/timeclock', perm: 'timeclock', service: 'tc' },
      { id: 'inventory', label: 'Inventory', to: '/app/inventory', perm: 'inventory', service: 'ops' },
    ],
  },
  {
    title: 'Patients',
    items: [
      { id: 'patients', label: 'Patient leads & calls', to: '/app/crm', perm: 'patients', service: 'crm' },
      { id: 'noshows', label: 'No-shows & cancellations', to: '/app/no-shows', perm: 'noshows', service: 'crm' },
    ],
  },
  {
    title: 'Marketing & outreach',
    items: [
      { id: 'leads', label: 'Provider leads', to: '/app/provider-leads', perm: 'leads', service: 'mkt' },
      { id: 'cms', label: 'CMS provider search', to: '/app/cms-search', perm: 'cms', service: 'mkt' },
      { id: 'email', label: 'Email campaigns', to: '/app/email-campaigns', perm: 'email', service: 'mkt' },
      { id: 'social', label: 'Social posts', to: '/app/social', perm: 'social', service: 'mkt' },
      { id: 'agents', label: 'AI agents', to: '/app/agents', perm: 'agents', service: 'mkt' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { id: 'setup', label: 'Practice setup', to: '/app/setup', perm: 'setup', badge: '11 left' },
      { id: 'voip', label: 'Phone & text (VoIP)', to: '/app/voip', perm: 'voip' },
      { id: 'mail', label: 'Email & domains', to: '/app/email-domains', perm: 'mail' },
      { id: 'mobile', label: 'Mobile app', to: '/app/mobile', perm: 'mobile' },
      { id: 'brand', label: 'Company & brand', to: '/app/brand', perm: 'brand' },
      { id: 'access', label: 'Plans & access', to: '/app/plans-access', perm: 'access' },
    ],
  },
]

export function normalizeRole(role) {
  const key = String(role || 'MEMBER').toUpperCase()
  return ROLE_META[key] ? key : 'MEMBER'
}

export function roleLabel(role) {
  return ROLE_META[normalizeRole(role)]?.label || 'Team member'
}

export function permissionsFor(role) {
  return new Set(PERMS[normalizeRole(role)] || PERMS.MEMBER)
}

export function navForRole(role, enabledServices = []) {
  const perms = permissionsFor(role)
  const allowed = new Set(resolveEnabledServices(enabledServices))

  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!perms.has(item.perm)) return false
      const required = FEATURE_SERVICE[item.perm] ?? item.service ?? null
      return required == null || allowed.has(required)
    }),
  })).filter((section) => section.items.length > 0)
}

export function dashboardCopy(role) {
  const r = normalizeRole(role)
  const map = {
    OWNER: {
      title: 'Practice dashboard',
      subtitle: 'Patients, referral partners, staffing and compliance at a glance.',
      kpis: [
        { n: '128', l: 'Active patient leads', tone: 'teal' },
        { n: '14', l: 'Open credential items', tone: 'amber' },
        { n: '6', l: 'Staff onboarding', tone: 'ink' },
        { n: '3', l: 'Expiring BAAs', tone: 'red' },
      ],
    },
    ADMIN: {
      title: 'Admin dashboard',
      subtitle: 'Operations health across credentials, vendors, and access.',
      kpis: [
        { n: '14', l: 'Open credential items', tone: 'amber' },
        { n: '9', l: 'Vendor BAAs due', tone: 'red' },
        { n: '22', l: 'Active staff logins', tone: 'teal' },
        { n: '4', l: 'Policy updates', tone: 'ink' },
      ],
    },
    MANAGER: {
      title: 'Office manager dashboard',
      subtitle: 'Front desk load, staffing, and what needs a decision today.',
      kpis: [
        { n: '37', l: 'Calls waiting follow-up', tone: 'teal' },
        { n: '8', l: 'No-shows to recover', tone: 'amber' },
        { n: '5', l: 'PTO requests', tone: 'ink' },
        { n: '12', l: 'Inventory requests', tone: 'blue' },
      ],
    },
    FRONT: {
      title: 'Front desk dashboard',
      subtitle: 'Patient leads, callbacks, and today’s schedule pressure.',
      kpis: [
        { n: '18', l: 'New leads today', tone: 'teal' },
        { n: '11', l: 'Callbacks due', tone: 'amber' },
        { n: '4', l: 'No-shows open', tone: 'red' },
        { n: '2', l: 'Unread inbox', tone: 'blue' },
      ],
    },
    CLINICAL: {
      title: 'Clinical dashboard',
      subtitle: 'Patient prep, training, and items that need clinical attention.',
      kpis: [
        { n: '9', l: 'Patients to prep', tone: 'teal' },
        { n: '3', l: 'Training due', tone: 'amber' },
        { n: '1', l: 'Policy acknowledgments', tone: 'ink' },
        { n: '0', l: 'Open incidents', tone: 'green' },
      ],
    },
    PROVIDER: {
      title: 'Provider dashboard',
      subtitle: 'Your schedule signals, credential status, and patient follow-ups.',
      kpis: [
        { n: '16', l: 'Patients on panel', tone: 'teal' },
        { n: '2', l: 'Credential tasks', tone: 'amber' },
        { n: '5', l: 'Messages', tone: 'blue' },
        { n: '1', l: 'Privileges pending', tone: 'ink' },
      ],
    },
    BILLING: {
      title: 'Billing dashboard',
      subtitle: 'Revenue-cycle signals without clinical chart access beyond your role.',
      kpis: [
        { n: '42', l: 'Claims in process', tone: 'teal' },
        { n: '7', l: 'Denials to work', tone: 'amber' },
        { n: '3', l: 'Missing demographics', tone: 'red' },
        { n: '1', l: 'Payer updates', tone: 'ink' },
      ],
    },
    OUTREACH: {
      title: 'Outreach dashboard',
      subtitle: 'Provider leads, campaigns, and agent activity.',
      kpis: [
        { n: '64', l: 'Provider leads', tone: 'teal' },
        { n: '5', l: 'Campaigns live', tone: 'blue' },
        { n: '12', l: 'Meetings set', tone: 'green' },
        { n: '2', l: 'Agents needing review', tone: 'amber' },
      ],
    },
    HR: {
      title: 'HR dashboard',
      subtitle: 'Staff onboarding, credentials, and sensitive HR queues.',
      kpis: [
        { n: '6', l: 'Onboarding in progress', tone: 'teal' },
        { n: '4', l: 'Licenses expiring', tone: 'amber' },
        { n: '2', l: 'Offer letters pending', tone: 'ink' },
        { n: '3', l: 'PTO approvals', tone: 'blue' },
      ],
    },
    MEMBER: {
      title: 'Your dashboard',
      subtitle: 'What you can access in this practice workspace.',
      kpis: [
        { n: '3', l: 'Training items', tone: 'teal' },
        { n: '1', l: 'Unread messages', tone: 'blue' },
        { n: '0', l: 'Time-card issues', tone: 'green' },
        { n: '2', l: 'Resources to review', tone: 'ink' },
      ],
    },
  }
  return map[r] || map.MEMBER
}

export function attentionItems(role) {
  const r = normalizeRole(role)
  const shared = {
    OWNER: [
      { title: 'DEA renewals due in 30 days', meta: '2 providers · Credentials', tone: 'amber' },
      { title: 'Vendor BAA missing signature', meta: 'Imaging courier · Vendors', tone: 'red' },
      { title: '3 staff still onboarding', meta: 'HR / Staff', tone: 'ink' },
    ],
    FRONT: [
      { title: 'Call back Rivera family', meta: 'Lead · left voicemail yesterday', tone: 'amber' },
      { title: 'Confirm Thursday new-patient slots', meta: 'Schedule', tone: 'teal' },
      { title: 'Recover 2 no-shows from Monday', meta: 'No-shows', tone: 'red' },
    ],
    OUTREACH: [
      { title: 'Follow up Dr. Patel intro', meta: 'Provider lead · Qualified', tone: 'teal' },
      { title: 'Review AI agent draft emails', meta: 'Agents', tone: 'amber' },
      { title: 'Campaign “Spring cardiac” needs assets', meta: 'Marketing', tone: 'ink' },
    ],
    HR: [
      { title: 'Finish onboarding checklist for Maya Chen', meta: 'Staff', tone: 'teal' },
      { title: 'License expiring — RN Torres', meta: 'Credentials', tone: 'amber' },
      { title: 'Approve PTO for front desk', meta: 'Time clock', tone: 'blue' },
    ],
  }
  return shared[r] || shared.OWNER.map((x) => ({ ...x, title: x.title.replace('providers', 'items') })).slice(0, 3)
}

export function serviceAllowed(enabledServices, perm) {
  const allowed = new Set(resolveEnabledServices(enabledServices))
  const required = FEATURE_SERVICE[perm] ?? null
  return required == null || allowed.has(required)
}
