/*
 * Module icons for the sidebar rail. Drawn exactly like the other rail icons (Home, pinned tools):
 * 24px grid, plain outline, 1.8 stroke, round caps, no fills — so the whole rail reads as one set.
 *   Operations  clinic building + gear (running the practice internally)
 *   CRM         patient + heart (patient relationships)
 *   Marketing   megaphone
 *   Time Clock  punch clock / stopwatch
 * Everything uses currentColor, so the rail decides the colour (grey idle, white when active).
 */

function Svg({ className, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Practice Operations — clinic building + gear: managing the practice's internal running */
export function LogoOps({ className = 'h-5 w-5' }) {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <Svg className={className}>
      <path d="M3.5 20.5V6.8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4.4" />
      <path d="M2.5 20.5h9.2" />
      <path d="M9.5 7.6v4.2M7.4 9.7h4.2" />
      <path d="M8 20.5v-3a.8.8 0 0 1 .8-.8h1.4" />
      <circle cx="17.5" cy="17" r="3" />
      {teeth.map((a) => (
        <path key={a} d="M17.5 13.9v-1.1" transform={`rotate(${a} 17.5 17)`} />
      ))}
    </Svg>
  )
}

/** CRM — patient with a heart: managing patient relationships */
export function LogoCRM({ className = 'h-5 w-5' }) {
  return (
    <Svg className={className}>
      <circle cx="9.5" cy="7.5" r="3.6" />
      <path d="M3 20c.6-3.6 3.2-5.8 6.5-5.8 1.2 0 2.3.3 3.2.8" />
      <path d="M17.6 20.6l-3-2.9a1.9 1.9 0 0 1 3-2.3 1.9 1.9 0 0 1 3 2.3Z" />
    </Svg>
  )
}

/** Marketing — megaphone with sound waves */
export function LogoMarketing({ className = 'h-5 w-5' }) {
  return (
    <Svg className={className}>
      <path d="M3.5 10.2v3.6a1.2 1.2 0 0 0 1.2 1.2h2.6l7.2 4.5V4.5L7.3 9H4.7a1.2 1.2 0 0 0-1.2 1.2Z" />
      <path d="M7.3 15l1 4.6a1 1 0 0 0 1 .8h.7a1 1 0 0 0 1-1.2l-.8-3" />
      <path d="M17.6 9.4a3.8 3.8 0 0 1 0 5.2" />
      <path d="M19.9 7.1a7 7 0 0 1 0 9.8" />
    </Svg>
  )
}

/** Time Clock — punch clock (stopwatch) */
export function LogoTimeClock({ className = 'h-5 w-5' }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M9.8 2.8h4.4M12 2.8V6" />
      <path d="M18.4 6.3l1.3-1.3" />
      <path d="M12 9.6v3.9l2.6 1.7" />
    </Svg>
  )
}
