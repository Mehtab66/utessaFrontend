/* Utessa brand logo — files live in /public/brand. */

/** Square app icon (navy tile with the color cross). */
export function Logo({ className = 'h-8 w-8', ...props }) {
  return <img src="/brand/utessa-icon.png" alt="" aria-hidden="true" draggable="false" className={`object-contain ${className}`} {...props} />
}

/**
 * Full logo: icon + "Utessa" wordmark.
 * `light` is for dark backgrounds — the navy lettering would disappear there,
 * so it pairs the icon with white text instead.
 */
export function Wordmark({ light = false, className = 'h-9' }) {
  if (light) {
    return (
      <span className="inline-flex items-center gap-2.5 no-underline">
        <Logo className="h-9 w-9 flex-none" />
        <span className="text-[22px] font-bold tracking-[-0.01em] text-white">
          <b className="font-extrabold text-[#5CE1E6]">U</b>tessa
        </span>
      </span>
    )
  }
  return <img src="/brand/utessa-logo.png" alt="Utessa" draggable="false" className={`w-auto object-contain ${className}`} />
}
