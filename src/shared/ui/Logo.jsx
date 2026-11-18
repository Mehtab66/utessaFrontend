/* Utessa brand logo — files live in /public/brand. */

/** Square app icon, drawn as vector so it stays sharp at any size. */
export function Logo({ className = 'h-8 w-8', ...props }) {
  return (
    <svg viewBox="0 0 273 273" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <rect width="273" height="273" rx="65" fill="#1B1F4B" />
      <rect x="108" y="44" width="56" height="56" rx="10" fill="#5CE1E6" />
      <rect x="44" y="108" width="56" height="56" rx="10" fill="#C9CDF2" />
      <rect x="108" y="108" width="56" height="56" rx="10" fill="#FFD23F" />
      <rect x="173" y="108" width="56" height="56" rx="10" fill="#8FEAEE" />
      <rect x="108" y="173" width="56" height="56" rx="10" fill="#3BC4CA" />
      <rect x="185" y="56" width="24" height="24" rx="5" fill="#3B7F98" />
      <rect x="60" y="189" width="20" height="20" rx="4" fill="#60658E" />
    </svg>
  )
}

/**
 * Full logo: icon + "Utessa" wordmark.
 * Served pre-scaled at 1x/2x/3x so the browser never shrinks a large image (which looks soft).
 * `light` is for dark backgrounds — the navy lettering would disappear there,
 * so it pairs the icon with white text instead.
 */
export function Wordmark({ light = false, className = 'h-9' }) {
  if (light) {
    return (
      <span className="inline-flex items-center gap-2.5 no-underline">
        <Logo className="h-9 w-9 flex-none" />
        <span className="text-[22px] font-bold tracking-[-0.01em] text-white">
          <b className="font-extrabold text-aqua-400">U</b>tessa
        </span>
      </span>
    )
  }
  return (
    <img
      src="/brand/utessa-logo-36.png"
      srcSet="/brand/utessa-logo-36.png 1x, /brand/utessa-logo-72.png 2x, /brand/utessa-logo-108.png 3x"
      alt="Utessa"
      draggable="false"
      className={`w-auto object-contain ${className}`}
    />
  )
}
