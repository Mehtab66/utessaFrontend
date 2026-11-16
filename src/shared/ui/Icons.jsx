export function IconUser({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <circle cx="12" cy="8" r="4" strokeWidth="1.7" />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconMail({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" strokeWidth="1.8" />
      <path d="M4 7l8 6 8-6" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

export function IconLock({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <rect x="5" y="10" width="14" height="10" rx="2.5" strokeWidth="1.8" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" strokeWidth="1.8" />
    </svg>
  )
}

export function IconPhone({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <path
        d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconBuilding({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <path
        d="M4 20V5.5L12 3v17M12 8l8 2.5V20M2.5 20h19M7.5 8.5h1M7.5 12h1M7.5 15.5h1M15.5 13h1M15.5 16.5h1"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconUsers({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <circle cx="9" cy="8.5" r="3.5" strokeWidth="1.7" />
      <path d="M2.5 19.5c.9-3 3.3-4.5 6.5-4.5s5.6 1.5 6.5 4.5M16 5.2a3.5 3.5 0 0 1 0 6.6M18 15.3c1.7.6 2.9 2 3.5 4.2" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconShield({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconCalendar({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2.5" strokeWidth="1.8" />
      <path d="M4 10h16M9 3v4M15 3v4" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconGoogle({ className = 'w-[18px] h-[18px]', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.4 9.1 5.4 12 5.4z" />
    </svg>
  )
}

export function IconMicrosoft({ className = 'w-[18px] h-[18px]', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  )
}
