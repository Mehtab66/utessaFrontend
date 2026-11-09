export function Logo({ className = 'h-10 w-10' }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <rect x="47.5" y="19" width="25" height="25" rx="5" fill="#5CE1E6" />
      <rect x="19" y="47.5" width="25" height="25" rx="5" fill="#C9CDF2" />
      <rect x="47.5" y="47.5" width="25" height="25" rx="5" fill="#FFD23F" />
      <rect x="76" y="47.5" width="25" height="25" rx="5" fill="#8FEAEE" />
      <rect x="47.5" y="76" width="25" height="25" rx="5" fill="#3BC4CA" />
    </svg>
  )
}

export function Wordmark({ light = false }) {
  return (
    <span className={`text-[22px] font-semibold tracking-tight ${light ? 'text-white' : 'text-navy'}`}>
      <span className={`font-extrabold ${light ? 'text-cyan' : 'text-navy'}`}>U</span>
      <span className={light ? 'text-white' : 'text-navy'}>tessa</span>
    </span>
  )
}
