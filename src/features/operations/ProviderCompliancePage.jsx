import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Avatar, Button, DataTable, FilterSelect, Kpi, PageHeader, Pill, SearchInput, Toolbar, useAsync, fmtDate } from '../crm/ui'
import { ops } from './opsApi'

const STATE_TONE = { EXPIRED: 'red', ACTION: 'red', MISSING: 'amber', DUE: 'amber' }
const STATE_LABEL = { EXPIRED: 'Expired', ACTION: 'Action needed', MISSING: 'Missing', DUE: 'Due soon' }
const STATUS_TONE = { 'Action needed': 'red', 'Renewal coming up': 'amber', 'Fully compliant': 'green' }

function itemWhen(i) {
  if (i.state === 'MISSING') return 'Not on file'
  if (i.days == null) return i.dueOn ? fmtDate(i.dueOn) : ''
  if (i.days < 0) return `${fmtDate(i.dueOn)} · ${Math.abs(i.days)}d ago`
  return `${fmtDate(i.dueOn)} · ${i.days}d`
}

/** Every provider's compliance in one list: credentials, payers, privileges and tracker dates. */
export default function ProviderCompliancePage() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync(() => ops.compliance(), [])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [kind, setKind] = useState('ALL')
  const [open, setOpen] = useState(null)

  const rows = useMemo(() => (data || []).map((p) => ({ ...p, id: p.staffId })), [data])
  const kinds = useMemo(() => [...new Set(rows.flatMap((r) => r.openItems.map((i) => i.kind)))].sort(), [rows])

  const counts = useMemo(() => ({
    all: rows.length,
    ok: rows.filter((r) => r.status === 'Fully compliant').length,
    due: rows.filter((r) => r.openItems.some((i) => i.state === 'DUE')).length,
    expired: rows.filter((r) => r.openItems.some((i) => i.state === 'EXPIRED')).length,
    missing: rows.filter((r) => r.openItems.some((i) => i.state === 'MISSING')).length,
    payer: rows.filter((r) => r.openItems.some((i) => i.kind === 'Payer' && i.state === 'ACTION')).length,
    cme: rows.filter((r) => r.cmeNeeded > 0 && r.cmeCredits < r.cmeNeeded).length,
  }), [rows])

  const shown = rows.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false
    if (kind !== 'ALL' && !r.openItems.some((i) => i.kind === kind)) return false
    switch (filter) {
      case 'ok': return r.status === 'Fully compliant'
      case 'open': return r.openItems.length > 0
      case 'expired': return r.openItems.some((i) => i.state === 'EXPIRED')
      case 'due': return r.openItems.some((i) => i.state === 'DUE')
      case 'missing': return r.openItems.some((i) => i.state === 'MISSING')
      case 'payer': return r.openItems.some((i) => i.kind === 'Payer' && i.state === 'ACTION')
      case 'cme': return r.cmeNeeded > 0 && r.cmeCredits < r.cmeNeeded
      default: return true
    }
  })

  const columns = [
    {
      key: 'name',
      label: 'Provider',
      render: (r) => (
        <button type="button" onClick={() => navigate(`/app/providers/${r.staffId}`)} className="flex items-center gap-2.5 text-left">
          <Avatar name={r.name} size="sm" />
          <b className="font-semibold text-ink-950 hover:text-brand-700">{r.name}</b>
        </button>
      ),
    },
    {
      key: 'status',
      label: 'Status & compliance',
      sortValue: (r) => r.openItems.length,
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <Pill tone={STATUS_TONE[r.status] || 'gray'} dot>{r.status}</Pill>
          {r.openItems.length > 0 && (
            <button type="button" className="text-[12.5px] font-semibold text-brand-700 hover:underline" onClick={() => setOpen(open === r.staffId ? null : r.staffId)}>
              {r.openItems.length} item{r.openItems.length === 1 ? '' : 's'} · Next: {r.openItems[0].label}
            </button>
          )}
          {open === r.staffId && (
            <ul className="m-0 mt-1 list-none space-y-1 p-0">
              {r.openItems.map((i, k) => (
                <li key={k} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  <Pill tone={STATE_TONE[i.state] || 'gray'}>{STATE_LABEL[i.state]}</Pill>
                  <span className="text-ink-950">{i.label}</span>
                  <span className="text-mist-500">{itemWhen(i)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      key: 'readiness',
      label: 'Readiness',
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-16 overflow-hidden rounded-sm bg-mist-100">
            <i className={`block h-full rounded-sm ${r.readiness >= 90 ? 'bg-brand-600' : r.readiness >= 70 ? 'bg-sun-400' : 'bg-danger-500'}`} style={{ width: `${r.readiness}%` }} />
          </span>
          <b className="font-mono text-[12.5px] font-semibold">{r.readiness}%</b>
        </span>
      ),
    },
    { key: 'payers', label: 'Payers approved', sortValue: (r) => r.payersApproved, render: (r) => (r.payersTotal ? `${r.payersApproved} of ${r.payersTotal}` : 'None started') },
    { key: 'privs', label: 'Privileges', sortValue: (r) => r.privilegesGranted, render: (r) => (r.privilegesTotal ? `${r.privilegesGranted} of ${r.privilegesTotal}` : '—') },
    {
      key: 'cme',
      label: 'CME',
      sortValue: (r) => (r.cmeNeeded ? r.cmeCredits / r.cmeNeeded : 1),
      render: (r) => (r.cmeNeeded ? (
        <span className="flex flex-col">
          <span>{r.cmeCredits}/{r.cmeNeeded} credits</span>
          <span className={`text-[12px] ${r.cmeCredits >= r.cmeNeeded ? 'text-success-600' : 'text-sun-700'}`}>{r.cmeCredits >= r.cmeNeeded ? 'Complete' : 'Short'}{r.cmeCycleEnds ? ` · cycle ends ${fmtDate(r.cmeCycleEnds)}` : ''}</span>
        </span>
      ) : '—'),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Provider compliance"
        count={loading ? null : rows.length}
        subtitle="Everyone who bills under their own NPI: licenses, DEA, CAQH, payer enrollment, privileges, malpractice and CME in one list. Click a name for the full profile."
        actions={<Button variant="secondary" onClick={reload}>Refresh</Button>}
      />
      <Alert>{error}</Alert>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="All providers" value={counts.all} hint="Clear filters" onClick={() => { setFilter('ALL'); setKind('ALL') }} />
        <Kpi label="Fully compliant" value={counts.ok} hint="Nothing open" tone="green" onClick={() => setFilter('ok')} />
        <Kpi label="Due in 90 days" value={counts.due} hint="Renewals coming up" tone="amber" onClick={() => setFilter('due')} />
        <Kpi label="Expired" value={counts.expired} hint="Renew now" tone="red" onClick={() => setFilter('expired')} />
        <Kpi label="Missing credentials" value={counts.missing} hint="Required items not on file" tone="amber" onClick={() => setFilter('missing')} />
        <Kpi label="Payer asked for info" value={counts.payer} hint="Respond to keep it moving" tone="red" onClick={() => setFilter('payer')} />
      </div>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search providers…" />
        <FilterSelect
          label="Compliance"
          value={filter}
          onChange={setFilter}
          allLabel="All providers"
          options={[
            { value: 'ok', label: 'Fully compliant' },
            { value: 'open', label: 'Has open items' },
            { value: 'expired', label: 'Expired' },
            { value: 'due', label: 'Due in 90 days' },
            { value: 'missing', label: 'Missing credentials' },
            { value: 'payer', label: 'Payer asked for information' },
            { value: 'cme', label: 'CME behind' },
          ]}
        />
        <FilterSelect label="Item type" value={kind} onChange={setKind} allLabel="Any item" options={kinds.map((k) => ({ value: k, label: k }))} />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={shown}
        loading={loading}
        empty={rows.length ? 'No providers match these filters.' : 'No providers yet. Register providers on the Providers page.'}
      />
    </div>
  )
}
