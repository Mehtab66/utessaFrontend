export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="mb-6 rounded-[16px] border border-[#DCE3F5] bg-white p-5 shadow-[0_6px_18px_rgba(27,31,75,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1E8E94]">Super admin</p>
          <h1 className="m-0 text-[clamp(28px,3vw,36px)] font-bold tracking-[-0.03em] text-[#1B1F4B]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#4A4E7A]">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  )
}

export function Panel({ title, right, children, className = '' }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-[16px] border border-[#DCE3F5] bg-white p-[22px] shadow-[0_6px_18px_rgba(27,31,75,0.04)] ${className}`}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="m-0 text-xl font-bold tracking-[-0.02em] text-[#1B1F4B]">{title}</h2> : <span />}
          {right && <span className="text-sm font-medium text-[#4A4E7A]">{right}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Kpi({ label, value, sub }) {
  return (
    <div className="rounded-[16px] border border-[#DCE3F5] bg-white p-4 shadow-[0_6px_18px_rgba(27,31,75,0.03)]">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#4A4E7A]">{label}</div>
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#3BC4CA]" />
      </div>
      <div className="mt-3 font-mono text-[30px] font-semibold tracking-[-0.04em] text-[#1B1F4B]">{value}</div>
      {sub && <div className="mt-1 text-[13px] leading-relaxed text-[#4A4E7A]">{sub}</div>}
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${tones[tone] || tones.mute}`}>
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
          <span className="flex h-28 w-full items-end rounded-[10px] bg-[#F3F5FB] px-1.5 pb-1">
            <i
              className="block w-full rounded-[6px] bg-[#2DB8BF]"
              style={{ height: `${(row.value / max) * 100}%`, minHeight: row.value ? 4 : 0 }}
            />
          </span>
          <span className="text-[12px] text-[#4A4E7A]">{row.label}</span>
        </div>
      ))}
    </div>
  )
}

export function DataTable({ columns, rows, empty = 'No rows yet.', onRowClick }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#DCE3F5] bg-white shadow-[0_4px_12px_rgba(27,31,75,0.02)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="bg-[#F6F8FF]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`border-b border-[#E8ECF8] px-3 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A4E7A] ${col.num ? 'text-right' : ''}`}
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
              <tr
                key={row.id || row.key}
                className={`transition hover:bg-[#F8FAFF] ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'link' : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-b border-[#EEF1FA] px-3 py-3 text-sm text-[#1B1F4B] ${col.num ? 'text-right font-mono' : ''}`}
                  >
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function EmptyNote({ children }) {
  return (
    <div className="rounded-[12px] border border-dashed border-[#D6DEF8] bg-[#F8FAFF] px-4 py-5 text-sm leading-relaxed text-[#4A4E7A]">
      {children}
    </div>
  )
}
