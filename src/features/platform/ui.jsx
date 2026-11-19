export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="mb-6 rounded-[16px] border border-mist-200 bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <h1 className="m-0 text-[clamp(28px,3vw,36px)] font-bold tracking-[-0.03em] text-brand-950">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-mist-500">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  )
}

export function Panel({ title, right, children, className = '' }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-[16px] border border-mist-200 bg-white p-[22px] ${className}`}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="m-0 text-xl font-bold tracking-[-0.02em] text-brand-950">{title}</h2> : <span />}
          {right && <span className="text-sm font-medium text-mist-500">{right}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Kpi({ label, value, sub }) {
  return (
    <div className="rounded-[16px] border border-mist-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-semibold text-mist-500">{label}</div>
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-600" />
      </div>
      <div className="mt-3 font-mono text-[30px] font-semibold tracking-[-0.04em] text-brand-950">{value}</div>
      {sub && <div className="mt-1 text-[13px] leading-relaxed text-mist-500">{sub}</div>}
    </div>
  )
}

export function StatusPill({ children, tone = 'mute' }) {
  const tones = {
    ok: 'bg-brand-50 text-brand-700',
    warn: 'bg-sun-100 text-brand-950',
    bad: 'bg-danger-100 text-danger-700',
    info: 'bg-brand-50 text-brand-700',
    mute: 'bg-mist-50 text-mist-500',
    trial: 'bg-sun-50 text-brand-950',
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold ${tones[tone] || tones.mute}`}>
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

export function Bars({ rows, colors = ['#1E8E94', '#EDFBFC', '#FFD23F', '#0A2E32'] }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0))
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row, i) => (
        <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(80px,1.4fr)_auto] items-center gap-2 text-sm">
          <span className="truncate font-medium text-brand-950">{row.label}</span>
          <span className="h-2.5 overflow-hidden rounded-sm bg-mist-50">
            <i
              className="block h-full rounded-sm"
              style={{
                width: `${Math.max(row.value ? 4 : 0, (row.value / max) * 100)}%`,
                background: colors[i % colors.length],
              }}
            />
          </span>
          <b className="min-w-[2ch] text-right font-mono text-brand-950">{row.value}</b>
        </div>
      ))}
      {!rows.length && <p className="text-sm text-mist-500">No data yet.</p>}
    </div>
  )
}

export function Cols({ rows }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0))
  return (
    <div className="flex items-end gap-3 pt-2">
      {rows.map((row) => (
        <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <b className="font-mono text-sm text-brand-950">{row.value}</b>
          <span className="flex h-28 w-full items-end rounded-[10px] bg-mist-50 px-1.5 pb-1">
            <i
              className="block w-full rounded-[6px] bg-brand-600"
              style={{ height: `${(row.value / max) * 100}%`, minHeight: row.value ? 4 : 0 }}
            />
          </span>
          <span className="text-[12px] text-mist-500">{row.label}</span>
        </div>
      ))}
    </div>
  )
}

export function DataTable({ columns, rows, empty = 'No rows yet.', onRowClick }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-mist-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="bg-mist-25">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`border-b border-mist-200 px-3 py-3 text-[12px] font-semibold text-mist-500 ${col.num ? 'text-right' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-mist-500">{empty}</td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id || row.key}
                className={`transition hover:bg-mist-25 ${onRowClick ? 'cursor-pointer' : ''}`}
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
                    className={`border-b border-mist-100 px-3 py-3 text-sm text-brand-950 ${col.num ? 'text-right font-mono' : ''}`}
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
    <div className="rounded-[12px] border border-dashed border-mist-200 bg-mist-25 px-4 py-5 text-sm leading-relaxed text-mist-500">
      {children}
    </div>
  )
}
