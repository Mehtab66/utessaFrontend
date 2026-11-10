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
  cyan: 'bg-[#3BC4CA]',
  lav: 'bg-[#C9CDF2]',
  yellow: 'bg-[#FFD23F]',
  navy: 'bg-[#1B1F4B]',
}
