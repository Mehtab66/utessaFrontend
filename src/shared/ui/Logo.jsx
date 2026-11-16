export function Logo({ className = 'h-10 w-10' }) {
  return <img src="/logo.svg" alt="Utessa" className={className} />
}

export function Wordmark({ light = false }) {
  return (
    <span className={`text-[22px] font-semibold tracking-tight ${light ? 'text-white' : 'text-navy'}`}>
      <span className={`font-extrabold ${light ? 'text-cyan' : 'text-navy'}`}>U</span>
      <span className={light ? 'text-white' : 'text-navy'}>tessa</span>
    </span>
  )
}
