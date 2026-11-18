/** Superadmin console nav — full utessa-superadmin-v35.html sidebar */
export const PLATFORM_NAV = [
  {
    title: 'Today',
    tone: 'cyan',
    items: [
      { id: 'overview', label: 'Overview', to: '/platform', end: true },
      { id: 'tasks', label: 'To do', to: '/platform/tasks' },
    ],
  },
  {
    title: 'Customers',
    tone: 'lav',
    items: [
      { id: 'orgs', label: 'Organizations', to: '/platform/organizations' },
      { id: 'access', label: 'Account access', to: '/platform/access' },
      { id: 'signups', label: 'Early access sign-ups', to: '/platform/signups' },
    ],
  },
  {
    title: 'Product',
    tone: 'yellow',
    items: [
      { id: 'pricing', label: 'Plans and pricing', to: '/platform/pricing' },
      { id: 'flags', label: 'Feature rollout', to: '/platform/flags' },
    ],
  },
  {
    title: 'Administration',
    tone: 'navy',
    items: [
      { id: 'team', label: 'Staff', to: '/platform/staff' },
      { id: 'audit', label: 'Audit log', to: '/platform/audit' },
      { id: 'logins', label: 'Sign-in log', to: '/platform/logins' },
    ],
  },
]

export const TONE_DOT = {
  cyan: 'bg-brand-600',
  lav: 'bg-brand-50',
  yellow: 'bg-sun-300',
  navy: 'bg-brand-950',
}
