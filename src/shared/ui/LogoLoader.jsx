/*
 * Utessa logo loader: the logo tiles pulse in a wave while two accent squares drift.
 * The one loading indicator for the whole app — use it wherever data is loading.
 *   <LogoLoader />                       48px mark
 *   <LogoLoader size={18} />             inline, next to text
 *   <LogoLoader label="Loading notes…" />  mark with a caption underneath
 *   <LogoLoader fullScreen label="…" />  centered on an empty page (session checks)
 * Animation styles live in index.css under "Logo loader".
 */

export function LogoMark({ size = 48, className = '' }) {
  return (
    <svg
      className={`logo-loader ${className}`}
      width={size}
      height={size}
      viewBox="60 60 392 392"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="ll-t" style={{ animationDelay: '0s' }} x="203" y="82" width="105" height="105" rx="22" fill="#5CE1E6" />
      <rect className="ll-t" style={{ animationDelay: '0.12s' }} x="323" y="203" width="105" height="105" rx="22" fill="#8FEAEE" />
      <rect className="ll-t" style={{ animationDelay: '0.24s' }} x="203" y="323" width="105" height="105" rx="22" fill="#3BC4CA" />
      <rect className="ll-t" style={{ animationDelay: '0.36s' }} x="82" y="203" width="105" height="105" rx="22" fill="#C9CDF2" />
      <rect className="ll-t" style={{ animationDelay: '0.48s' }} x="203" y="203" width="105" height="105" rx="22" fill="#FFD23F" />
      <rect className="ll-sa" x="347" y="105" width="46" height="46" rx="10" fill="#3B7F98" />
      <rect className="ll-sb" x="110" y="352" width="42" height="42" rx="9" fill="#60658E" />
    </svg>
  )
}

export default function LogoLoader({ size, label, fullScreen = false, className = '' }) {
  if (fullScreen) {
    return (
      <div className={`grid min-h-screen place-items-center bg-mist-50 px-4 ${className}`} role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoMark size={size || 72} />
          {label && <p className="m-0 text-sm font-medium text-mist-600">{label}</p>}
        </div>
      </div>
    )
  }
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`} role="status" aria-live="polite">
      <LogoMark size={size || 48} />
      {label ? <p className="m-0 text-[13px] font-medium text-mist-600">{label}</p> : <span className="sr-only">Loading…</span>}
    </div>
  )
}
