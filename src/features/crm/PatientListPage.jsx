import { useEffect, useMemo, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { permissionsFor } from '../../shared/security/roles'
import { LEAD_SOURCES, LEAD_STATUSES, OPEN_LEAD_STATUSES, PRIORITIES, crm, labelOf } from './crmApi'
import { useCrmEditors } from './CrmEditors'
import LeadImportModal from './LeadImportModal'
import {
  Alert, Avatar, Button, ConfirmModal, DataTable, EnumPill, FilterSelect, PageHeader, Pill, PromptModal, SearchInput,
  Segmented, Toolbar, fmtDate, fmtRelative, formatPhone, useAsync, useCrmRefs, useDebounced, useToast,
} from './ui'

const BOARD_COLUMNS = ['NEW', 'ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED', 'APPOINTMENT_SCHEDULED', 'SHOWED']

/** mode = 'LEAD' (patient leads pipeline) | 'PATIENT' (patient directory) */
export default function PatientListPage({ mode = 'LEAD' }) {
  const isLead = mode === 'LEAD'
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = permissionsFor(user?.role).has('crmadmin')
  const [toastNode, toast] = useToast()
  const { team } = useCrmRefs()

  const [view, setView] = useState('table')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState(isLead ? 'OPEN' : 'ALL')
  const [priority, setPriority] = useState('ALL')
  const [source, setSource] = useState('ALL')
  const [owner, setOwner] = useState('ALL')
  const [followUp, setFollowUp] = useState('ALL')
  const [selected, setSelected] = useState([])
  const [bulk, setBulk] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [importing, setImporting] = useState(false)
  const debouncedQ = useDebounced(q)

  const params = {
    lifecycle: mode,
    status: status === 'OPEN' ? OPEN_LEAD_STATUSES : status,
    priority,
    source,
    ownerUserId: owner === 'ME' ? user?.userId : owner,
    followUp,
    q: debouncedQ,
  }
  const { data, loading, error, reload } = useAsync(() => crm.patients(params), [mode, status, priority, source, owner, followUp, debouncedQ])
  const rows = data || []
  // A new lead stays on the Patient leads list (it shows up at the top); other new records open their profile.
  const editors = useCrmEditors({ toast, onSaved: (kind, res) => (kind === 'patient' && res?.id && !rows.some((r) => r.id === res.id) && !(isLead && res.lifecycleStage === 'LEAD') ? navigate(`/app/crm/patients/${res.id}`) : reload()) })

  // "New → Patient lead" from the top bar lands here with ?new=1
  const location = useLocation()
  useEffect(() => {
    if (new URLSearchParams(location.search).get('new') === '1') {
      editors.open.patient(null, isLead ? {} : { lifecycleStage: 'PATIENT', leadStatus: 'CONVERTED' })
      navigate(location.pathname, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const counts = useMemo(() => {
    const c = {}
    rows.forEach((r) => {
      c[r.leadStatus] = (c[r.leadStatus] || 0) + 1
    })
    return c
  }, [rows])

  async function runBulk(action, value) {
    const res = await crm.bulk({ ids: selected, action, value })
    toast(`${res.updated} record${res.updated === 1 ? '' : 's'} updated`)
    setSelected([])
    setBulk(null)
    await reload()
  }

  function exportCsv() {
    const cols = ['fullName', 'phone', 'email', 'dateOfBirth', 'lifecycleStage', 'leadStatus', 'priority', 'source', 'interestedService', 'insurancePayer', 'ownerName', 'nextFollowUp', 'lastContactAt', 'mrn', 'createdAt']
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${isLead ? 'patient-leads' : 'patients'}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    {
      key: 'fullName',
      label: isLead ? 'Lead' : 'Patient',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.fullName} size="sm" tone={r.lifecycleStage === 'PATIENT' ? 'teal' : 'blue'} />
          <div className="min-w-0">
            <p className="m-0 whitespace-nowrap font-semibold text-navy">{r.fullName}</p>
            <p className="m-0 whitespace-nowrap text-[12px] text-mist-500">{r.phone ? formatPhone(r.phone) : r.email || 'No contact info'}</p>
          </div>
          {r.doNotContact && <Pill tone="red">DNC</Pill>}
        </div>
      ),
    },
    isLead
      ? { key: 'leadStatus', label: 'Status', toneList: LEAD_STATUSES, render: (r) => <EnumPill list={LEAD_STATUSES} value={r.leadStatus} />, sortValue: (r) => LEAD_STATUSES.findIndex((s) => s.value === r.leadStatus) }
      : { key: 'mrn', label: 'MRN', render: (r) => r.mrn || '—' },
    { key: 'priority', label: 'Priority', toneList: PRIORITIES, render: (r) => <EnumPill list={PRIORITIES} value={r.priority} />, sortValue: (r) => PRIORITIES.findIndex((s) => s.value === r.priority) },
    isLead ? { key: 'source', label: 'Source', render: (r) => r.source || '—' } : { key: 'dateOfBirth', label: 'DOB', render: (r) => fmtDate(r.dateOfBirth), nowrap: true },
    { key: 'interestedService', label: isLead ? 'Interest' : 'Service', render: (r) => r.interestedService || '—' },
    { key: 'insurancePayer', label: 'Insurance', render: (r) => (r.insurancePayer ? <span>{r.insurancePayer}{r.insuranceVerified && <Icon name="check" title="Verified" className="ml-1 inline h-3.5 w-3.5 text-brand-800" strokeWidth={2.4} />}</span> : '—') },
    { key: 'ownerName', label: 'Owner', nowrap: true, render: (r) => r.ownerName || <span className="text-mist-500">Unassigned</span> },
    {
      key: 'nextFollowUp',
      label: 'Next follow-up',
      nowrap: true,
      render: (r) => {
        if (!r.nextFollowUp) return <span className="text-mist-500">—</span>
        const overdue = r.nextFollowUp < new Date().toISOString().slice(0, 10)
        return <span className={overdue ? 'font-semibold text-danger-600' : ''}>{fmtDate(r.nextFollowUp)}</span>
      },
    },
    { key: 'lastContactAt', label: 'Last contact', nowrap: true, render: (r) => (r.lastContactAt ? fmtRelative(r.lastContactAt) : 'Never') },
    { key: 'createdAt', label: 'Created', nowrap: true, render: (r) => fmtDate(r.createdAt) },
  ]

  return (
    <div>
      <PageHeader
        title={isLead ? 'Patient leads' : 'Patients'}
        count={data ? `${rows.length} ${isLead ? (rows.length === 1 ? 'lead' : 'leads') : (rows.length === 1 ? 'patient' : 'patients')}` : null}
        subtitle={isLead
          ? 'Every inquiry from phone, web, walk-ins and referrals — prioritized, assigned and followed up until they book.'
          : 'Converted and existing patients with their chart link, insurance and EHR sync status.'}
        actions={
          <>
            {isLead && <Button variant="secondary" onClick={() => setImporting(true)}><Icon name="upload" /> Import</Button>}
            <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
            <Button onClick={() => editors.open.patient(null, isLead ? {} : { lifecycleStage: 'PATIENT', leadStatus: 'CONVERTED' })}>
              <Icon name="plus" /> {isLead ? 'New lead' : 'Add patient'}
            </Button>
          </>
        }
      />
      <Alert>{error}</Alert>

      <Toolbar
        right={isLead && <Segmented value={view} onChange={setView} options={[{ value: 'table', label: 'Table' }, { value: 'board', label: 'Board' }]} />}
      >
        <SearchInput value={q} onChange={setQ} placeholder="Name, phone, email, MRN, payer…" />
        {isLead && (
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            allLabel="All statuses"
            options={[{ value: 'OPEN', label: 'Open pipeline' }, ...LEAD_STATUSES]}
          />
        )}
        <FilterSelect label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} />
        {isLead && <FilterSelect label="Source" value={source} onChange={setSource} options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))} />}
        <FilterSelect
          label="Owner"
          value={owner}
          onChange={setOwner}
          allLabel="Anyone"
          options={[{ value: 'ME', label: 'Me' }, ...team.map((m) => ({ value: m.userId, label: m.fullName }))]}
        />
        <FilterSelect
          label="Follow-up"
          value={followUp}
          onChange={setFollowUp}
          allLabel="Any"
          options={[{ value: 'overdue', label: 'Overdue' }, { value: 'today', label: 'Due today' }, { value: 'none', label: 'None scheduled' }]}
        />
      </Toolbar>

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-brand-100 bg-brand-50 px-3 py-2 text-[13px]">
          <b className="text-navy">{selected.length} selected</b>
          <Button size="sm" variant="secondary" onClick={() => setBulk('ASSIGN')}>Assign…</Button>
          <Button size="sm" variant="secondary" onClick={() => setBulk('PRIORITY')}>Set priority…</Button>
          {isLead && <Button size="sm" variant="secondary" onClick={() => setBulk('STATUS')}>Set status…</Button>}
          {isAdmin && <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>}
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      {view === 'table' || !isLead ? (
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          selectable
          selected={selected}
          onSelect={setSelected}
          onRowClick={(r) => navigate(`/app/crm/patients/${r.id}`)}
          empty={isLead ? 'No leads match these filters. Log a call or add a lead to start the pipeline.' : 'No patients yet. Convert a lead or add a patient.'}
        />
      ) : (
        <LeadBoard rows={rows} counts={counts} onOpen={(r) => navigate(`/app/crm/patients/${r.id}`)} onMove={async (r, next) => {
          try {
            await crm.patientStatus(r.id, { leadStatus: next })
            toast(`${r.fullName} → ${labelOf(LEAD_STATUSES, next)}`)
            reload()
          } catch (err) {
            toast(err.message, 'error')
          }
        }} />
      )}

      <BulkModal action={bulk} team={team} onClose={() => setBulk(null)} onConfirm={runBulk} />
      <ConfirmModal
        open={confirmDelete}
        title={`Delete ${selected.length} record${selected.length === 1 ? '' : 's'}?`}
        message="This permanently removes the records with their timeline, tasks, appointments, opportunities and referrals. This cannot be undone."
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await runBulk('DELETE')
          setConfirmDelete(false)
        }}
      />
      {editors.node}
      <LeadImportModal
        open={importing}
        onClose={() => setImporting(false)}
        onDone={(res) => { toast(`${res.created} lead${res.created === 1 ? '' : 's'} imported`); reload() }}
      />
      {toastNode}
    </div>
  )
}

function LeadBoard({ rows, counts, onOpen, onMove }) {
  const [dragging, setDragging] = useState(null)
  return (
    <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 overflow-x-auto pb-2">
      {BOARD_COLUMNS.map((status) => {
        const items = rows.filter((r) => r.leadStatus === status)
        return (
          <div
            key={status}
            className="flex min-h-[360px] flex-col rounded-[14px] border border-mist-200 bg-mist-25"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging && dragging.leadStatus !== status) onMove(dragging, status)
              setDragging(null)
            }}
          >
            <div className="flex items-center justify-between border-b border-mist-200 px-3 py-2.5">
              <EnumPill list={LEAD_STATUSES} value={status} />
              <span className="font-mono text-[12px] font-semibold text-mist-500">{counts[status] || 0}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {items.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  draggable
                  onDragStart={() => setDragging(r)}
                  onClick={() => onOpen(r)}
                  className="rounded-[10px] border border-mist-200 bg-white p-2.5 text-left transition hover:border-brand-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="m-0 text-[13px] font-semibold text-navy">{r.fullName}</p>
                    <EnumPill list={PRIORITIES} value={r.priority} dot={false} />
                  </div>
                  <p className="m-0 mt-0.5 text-[12px] text-mist-500">{r.phone || r.email || '—'}</p>
                  <p className="m-0 mt-1 truncate text-[12px] text-mist-700">{r.interestedService || r.reasonForVisit || r.source || ''}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-mist-500">
                    <span>{r.ownerName || 'Unassigned'}</span>
                    <span>{r.nextFollowUp ? `F/U ${fmtDate(r.nextFollowUp)}` : fmtRelative(r.createdAt)}</span>
                  </div>
                </button>
              ))}
              {items.length === 0 && <p className="m-0 px-1 py-4 text-center text-[12px] text-mist-500">Drop leads here</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BulkModal({ action, team, onClose, onConfirm }) {
  if (!action) return null
  const config = {
    ASSIGN: { title: 'Assign selected records', label: 'Assign to', options: team.map((m) => m.fullName) },
    PRIORITY: { title: 'Set priority', label: 'Priority', options: PRIORITIES.map((p) => p.label) },
    STATUS: { title: 'Set lead status', label: 'Status', options: LEAD_STATUSES.map((s) => s.label) },
  }[action]
  return (
    <PromptModal
      open
      title={config.title}
      label={config.label}
      options={config.options}
      required
      confirmLabel="Apply"
      onClose={onClose}
      onConfirm={async (label) => {
        let value = label
        if (action === 'ASSIGN') value = team.find((m) => m.fullName === label)?.userId
        if (action === 'PRIORITY') value = PRIORITIES.find((p) => p.label === label)?.value
        if (action === 'STATUS') value = LEAD_STATUSES.find((s) => s.label === label)?.value
        await onConfirm(action, value)
      }}
    />
  )
}
