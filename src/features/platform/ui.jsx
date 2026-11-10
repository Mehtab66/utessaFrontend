export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-3xl">
        <h1 className="m-0 text-[clamp(28px,3vw,36px)] font-bold tracking-[-0.01em] text-[#1B1F4B]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] leading-relaxed text-[#4A4E7A]">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Panel({ title, right, children, className = '' }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-[14px] border border-[#DCDFEE] bg-white p-[22px] ${className}`}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="m-0 text-xl font-bold text-[#1B1F4B]">{title}</h2> : <span />}
          {right && <span className="text-sm text-[#4A4E7A]">{right}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Kpi({ label, value, sub }) {
  return (
    <div className="rounded-[14px] border border-[#DCDFEE] bg-white px-5 py-[18px]">
      <div className="text-[13px] font-semibold text-[#4A4E7A]">{label}</div>
      <div className="mt-1 font-mono text-[32px] font-medium tracking-[-0.02em] text-[#1B1F4B]">{value}</div>
      {sub && <div className="mt-1 text-[13px] text-[#4A4E7A]">{sub}</div>}
    </div>
  )
}

export function StatusPill({ children, tone = 'mute' }) {
  const tones = {
    ok: 'bg-[#E3F4EA] text-[#1E7A4C]',
    warn: 'bg-[#FFF3D6] text-[#9A5B00]',
    bad: 'bg-[#FBE6E1] text-[#B4472F]',
    info: 'bg-[#E8F6F7] text-[#1E6E73]',
    mute: 'bg-[#ECEEF6] text-[#4A4E7A]',
    trial: 'bg-[#EEF0FA] text-[#1B1F4B]',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${tones[tone] || tones.mute}`}>
      {children}
    </span>
  )
}

export function statusTone(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('active') || s.includes('live') || s.includes('signed') || s.includes('healthy')) return 'ok'
  if (s.includes('trial') || s.includes('watch') || s.includes('pending') || s.includes('onboarding')) return 'warn'
  if (s.includes('past') || s.includes('lock') || s.includes('risk') || s.includes('fail') || s.includes('suspend')) return 'bad'
  return 'mute'
}

export function Bars({ rows, colors = ['#3BC4CA', '#C9CDF2', '#FFD23F', '#1B1F4B'] }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0))
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row, i) => (
        <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(80px,1.4fr)_auto] items-center gap-2 text-sm">
          <span className="truncate font-medium text-[#1B1F4B]">{row.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-[#ECEEF6]">
            <i
              className="block h-full rounded-full"
              style={{
                width: `${Math.max(row.value ? 4 : 0, (row.value / max) * 100)}%`,
                background: colors[i % colors.length],
              }}
            />
          </span>
          <b className="min-w-[2ch] text-right font-mono text-[#1B1F4B]">{row.value}</b>
        </div>
      ))}
      {!rows.length && <p className="text-sm text-[#4A4E7A]">No data yet.</p>}
    </div>
  )
}

export function Cols({ rows }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0))
  return (
    <div className="flex items-end gap-3 pt-2">
      {rows.map((row) => (
        <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <b className="font-mono text-sm text-[#1B1F4B]">{row.value}</b>
          <span className="flex h-28 w-full items-end rounded-md bg-[#ECEEF6] px-1.5 pb-1">
            <i
              className="block w-full rounded-sm bg-[#3BC4CA]"
              style={{ height: `${(row.value / max) * 100}%`, minHeight: row.value ? 4 : 0 }}
            />
          </span>
          <span className="text-[12px] text-[#4A4E7A]">{row.label}</span>
        </div>
      ))}
    </div>
  )
}

export function DataTable({ columns, rows, empty = 'No rows yet.' }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-[#DCDFEE]">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="bg-[#F6F7FB]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`border-b border-[#DCDFEE] px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4A4E7A] ${col.num ? 'text-right' : ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-[#4A4E7A]">{empty}</td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id || row.key} className="hover:bg-[#F8F9FD]">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`border-b border-[#EBECF4] px-3 py-3 text-sm text-[#1B1F4B] ${col.num ? 'text-right font-mono' : ''}`}
                >
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EmptyNote({ children }) {
  return (
    <div className="rounded-[12px] border border-dashed border-[#DCDFEE] bg-[#F8F9FD] px-4 py-6 text-sm leading-relaxed text-[#4A4E7A]">
      {children}
    </div>
  )
}
