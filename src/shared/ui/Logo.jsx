export function Logo({ className = 'h-8 w-8', ...props }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect x="47.5" y="19" width="25" height="25" rx="5" fill="#5CE1E6" />
      <rect x="19" y="47.5" width="25" height="25" rx="5" fill="#C9CDF2" />
      <rect x="47.5" y="47.5" width="25" height="25" rx="5" fill="#FFD23F" />
      <rect x="76" y="47.5" width="25" height="25" rx="5" fill="#8FEAEE" />
      <rect x="47.5" y="76" width="25" height="25" rx="5" fill="#3BC4CA" />
    </svg>
  )
}

export function Wordmark({ light = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 no-underline ${className}`}>
      <Logo className="h-8 w-8 flex-none" />
      <span className={`text-[21px] font-semibold tracking-[-0.01em] ${light ? 'text-white' : 'text-[#1B1F4B]'}`}>
        <b className={`font-extrabold ${light ? 'text-[#5CE1E6]' : 'text-[#3BC4CA]'}`}>U</b>tessa
      </span>
    </span>
  )
}
