import { useMemo, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { OPEN_OPP_STAGES, OPP_STAGES, PRIORITIES, crm, labelOf } from './crmApi'
import { useCrmEditors } from './CrmEditors'
import {
  Alert, Button, Card, ConfirmModal, DataTable, DetailGrid, EnumPill, FilterSelect, Kpi, Loading, PageHeader,
  PromptModal, SearchInput, Segmented, StagePath, Timeline, Toolbar, fmtDate, fmtDateTime, fmtMoney, useAsync,
  useCrmRefs, useDebounced, useToast,
} from './ui'

export default function OpportunitiesPage() {
  const navigate = useNavigate()
  const [toastNode, toast] = useToast()
  const { team } = useCrmRefs()
  const [view, setView] = useState('board')
  const [q, setQ] = useState('')
  const [stage, setStage] = useState('ALL')
  const [owner, setOwner] = useState('ALL')
  const [lostFor, setLostFor] = useState(null)
  const debouncedQ = useDebounced(q)
  const { data, loading, error, reload } = useAsync(
    () => crm.opportunities({ stage, ownerUserId: owner, q: debouncedQ }),
    [stage, owner, debouncedQ],
  )
  const rows = data || []
  const editors = useCrmEditors({ toast, onSaved: () => reload() })

  const totals = useMemo(() => {
    const open = rows.filter((o) => OPEN_OPP_STAGES.includes(o.stage))
    const weighted = open.reduce((s, o) => s + (Number(o.estimatedValue) || 0) * ((o.probability ?? 0) / 100), 0)
    const won = rows.filter((o) => o.stage === 'WON')
    const lost = rows.filter((o) => o.stage === 'LOST')
    return {
      open: open.length,
      openValue: open.reduce((s, o) => s + (Number(o.estimatedValue) || 0), 0),
      weighted,
      winRate: won.length + lost.length ? Math.round((won.length * 100) / (won.length + lost.length)) : 0,
      wonValue: won.reduce((s, o) => s + (Number(o.estimatedValue) || 0), 0),
    }
  }, [rows])

  async function move(o, next, lostReason) {
    if (next === 'LOST' && !lostReason) {
      setLostFor(o)
      return
    }
    try {
      await crm.opportunityStage(o.id, { stage: next, lostReason: lostReason || null })
      toast(`${o.name} → ${labelOf(OPP_STAGES, next)}`)
      reload()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="Service-line and treatment pipeline — from first inquiry to consult, treatment plan and acceptance."
        actions={<Button onClick={() => editors.open.opportunity()}><Icon name="plus" /> New opportunity</Button>}
      />
      <Alert>{error}</Alert>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <Kpi label="Open opportunities" value={totals.open} />
        <Kpi label="Open pipeline" value={fmtMoney(totals.openValue)} tone="blue" />
        <Kpi label="Weighted forecast" value={fmtMoney(totals.weighted)} tone="ink" hint="Value × probability" />
        <Kpi label="Win rate" value={`${totals.winRate}%`} tone="green" hint={`${fmtMoney(totals.wonValue)} won`} />
      </div>

      <Toolbar right={<Segmented value={view} onChange={setView} options={[{ value: 'board', label: 'Board' }, { value: 'table', label: 'Table' }]} />}>
        <SearchInput value={q} onChange={setQ} placeholder="Opportunity, service line, patient…" />
        <FilterSelect label="Stage" value={stage} onChange={setStage} options={OPP_STAGES} />
        <FilterSelect label="Owner" value={owner} onChange={setOwner} allLabel="Anyone" options={team.map((m) => ({ value: m.userId, label: m.fullName }))} />
      </Toolbar>

      {view === 'table' ? (
        <DataTable
          rows={rows}
          loading={loading}
          onRowClick={(o) => navigate(`/app/crm/opportunities/${o.id}`)}
          empty="No opportunities yet. Create one from a lead or the call desk."
          columns={[
            { key: 'name', label: 'Opportunity', render: (o) => <b>{o.name}</b> },
            { key: 'patientName', label: 'Patient / lead', render: (o) => <Link onClick={(e) => e.stopPropagation()} className="text-brand-700" to={`/app/crm/patients/${o.patientId}`}>{o.patientName}</Link> },
            { key: 'serviceLine', label: 'Service line' },
            { key: 'stage', label: 'Stage', render: (o) => <EnumPill list={OPP_STAGES} value={o.stage} />, sortValue: (o) => OPP_STAGES.findIndex((s) => s.value === o.stage) },
            { key: 'priority', label: 'Priority', toneList: PRIORITIES, render: (o) => <EnumPill list={PRIORITIES} value={o.priority} /> },
            { key: 'estimatedValue', label: 'Value', align: 'right', render: (o) => fmtMoney(o.estimatedValue), sortValue: (o) => Number(o.estimatedValue) || 0 },
            { key: 'probability', label: 'Prob.', align: 'right', render: (o) => (o.probability != null ? `${o.probability}%` : '—') },
            { key: 'expectedCloseDate', label: 'Decision', nowrap: true, render: (o) => fmtDate(o.expectedCloseDate) },
            { key: 'ownerName', label: 'Owner' },
          ]}
        />
      ) : loading ? <Loading /> : (
        <div className="grid grid-flow-col auto-cols-[minmax(230px,1fr)] gap-3 overflow-x-auto pb-2">
          {OPP_STAGES.map((s) => (
            <StageColumn key={s.value} stage={s} items={rows.filter((o) => o.stage === s.value)} onOpen={(o) => navigate(`/app/crm/opportunities/${o.id}`)} onDrop={move} />
          ))}
        </div>
      )}

      <PromptModal
        open={Boolean(lostFor)}
        title="Why was this opportunity lost?"
        label="Reason"
        required
        options={['Chose another provider', 'Cost / coverage', 'Not medically appropriate', 'Patient declined treatment', 'No response', 'Other']}
        onClose={() => setLostFor(null)}
        onConfirm={async (reason) => {
          await move(lostFor, 'LOST', reason)
          setLostFor(null)
        }}
      />
      {editors.node}
      {toastNode}
    </div>
  )
}

function StageColumn({ stage, items, onOpen, onDrop }) {
  const total = items.reduce((s, o) => s + (Number(o.estimatedValue) || 0), 0)
  return (
    <div
      className="flex min-h-[380px] flex-col rounded-[14px] border border-mist-200 bg-mist-25"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const raw = e.dataTransfer.getData('application/json')
        if (!raw) return
        const o = JSON.parse(raw)
        if (o.stage !== stage.value) onDrop(o, stage.value)
      }}
    >
      <div className="border-b border-mist-200 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <EnumPill list={OPP_STAGES} value={stage.value} />
          <span className="font-mono text-[12px] font-semibold text-mist-500">{items.length}</span>
        </div>
        <p className="m-0 mt-1 font-mono text-[12px] text-mist-700">{fmtMoney(total)}</p>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {items.map((o) => (
          <button
            key={o.id}
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(o))}
            onClick={() => onOpen(o)}
            className="rounded-[10px] border border-mist-200 bg-white p-2.5 text-left transition hover:border-brand-200"
          >
            <p className="m-0 text-[13px] font-semibold text-navy">{o.name}</p>
            <p className="m-0 mt-0.5 text-[12px] text-mist-500">{o.patientName}</p>
            <div className="mt-1.5 flex items-center justify-between text-[12px]">
              <span className="font-mono font-semibold text-navy">{fmtMoney(o.estimatedValue)}</span>
              <span className="text-mist-500">{o.ownerName || 'Unassigned'}</span>
            </div>
          </button>
        ))}
        {items.length === 0 && <p className="m-0 px-1 py-4 text-center text-[12px] text-mist-500">Drag cards here</p>}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Opportunity detail
   ═══════════════════════════════════════════════════════════════════════ */
export function OpportunityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [toastNode, toast] = useToast()
  const [lostOpen, setLostOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const opp = useAsync(() => crm.opportunity(id), [id])
  const timeline = useAsync(() => crm.opportunityTimeline(id), [id])
  const appts = useAsync(
    () => (opp.data?.patientId ? crm.appointments({ patientId: opp.data.patientId }) : Promise.resolve([])),
    [opp.data?.patientId],
  )
  const editors = useCrmEditors({ toast, onSaved: () => Promise.all([opp.reload(), timeline.reload(), appts.reload()]) })
  const o = opp.data

  if (opp.loading && !o) return <Loading />
  if (opp.error && !o) return <Alert>{opp.error}</Alert>
  if (!o) return null

  async function setStage(stage, lostReason) {
    if (stage === 'LOST' && !lostReason) {
      setLostOpen(true)
      return
    }
    try {
      await crm.opportunityStage(o.id, { stage, lostReason: lostReason || null })
      toast(`Stage → ${labelOf(OPP_STAGES, stage)}`)
      await Promise.all([opp.reload(), timeline.reload()])
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const linkedAppts = (appts.data || []).filter((a) => a.opportunityId === o.id)

  return (
    <div className="space-y-4">
      <Link to="/app/crm/opportunities" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700"><Icon name="arrowLeft" className="h-3.5 w-3.5" /> Opportunities</Link>
      <section className="rounded-[16px] border border-mist-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[12px] font-semibold text-mist-500">Opportunity</p>
            <h1 className="m-0 text-[24px] font-bold tracking-[-0.02em] text-navy">{o.name}</h1>
            <p className="m-0 mt-1 text-[13px] text-mist-700">
              <Link to={`/app/crm/patients/${o.patientId}`} className="font-semibold text-brand-700">{o.patientName}</Link>
              {o.serviceLine ? ` · ${o.serviceLine}` : ''}{o.providerName ? ` · ${o.providerName}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => editors.open.appointment(null, { patientId: o.patientId, __patientIdLabel: o.patientName, opportunityId: o.id, appointmentType: 'CONSULTATION' })}>Schedule consult</Button>
            <Button variant="secondary" onClick={() => editors.open.task(null, { patientId: o.patientId, __patientIdLabel: o.patientName, opportunityId: o.id, title: `Follow up on ${o.name}` })}>Add task</Button>
            <Button variant="secondary" onClick={() => editors.open.opportunity(o)}>Edit</Button>
            {o.stage !== 'WON' && <Button onClick={() => setStage('WON')}>Mark won</Button>}
            {o.stage !== 'LOST' && <Button variant="danger" onClick={() => setLostOpen(true)}>Mark lost</Button>}
          </div>
        </div>
        <div className="mt-4">
          <StagePath stages={OPP_STAGES} value={o.stage} onSelect={(s) => setStage(s)} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Activity">
          <Timeline items={timeline.data} loading={timeline.loading} empty="No activity on this opportunity yet." />
        </Card>
        <div className="space-y-4">
          <Card title="Details">
            <DetailGrid items={[
              ['Stage', <EnumPill key="s" list={OPP_STAGES} value={o.stage} />],
              ['Priority', <EnumPill key="p" list={PRIORITIES} value={o.priority} />],
              ['Estimated value', fmtMoney(o.estimatedValue)],
              ['Probability', o.probability != null ? `${o.probability}%` : null],
              ['Expected decision', fmtDate(o.expectedCloseDate)],
              ['Owner', o.ownerName],
              ['Closed', o.closedAt ? fmtDateTime(o.closedAt) : null],
              o.stage === 'LOST' ? ['Lost reason', o.lostReason] : null,
              ['Created', fmtDateTime(o.createdAt)],
            ]} />
            {o.notes && <p className="m-0 mt-3 whitespace-pre-line text-[13px] text-mist-700">{o.notes}</p>}
          </Card>
          <Card title="Linked appointments">
            {linkedAppts.length === 0 ? <p className="m-0 text-sm text-mist-500">None yet — schedule a consult to advance the stage automatically.</p> : (
              <ul className="m-0 list-none space-y-1.5 p-0 text-[13px]">
                {linkedAppts.map((a) => <li key={a.id}><b>{fmtDateTime(a.startsAt)}</b> · {a.title} · {a.status.toLowerCase().replace('_', ' ')}</li>)}
              </ul>
            )}
          </Card>
          <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>Delete opportunity</Button>
        </div>
      </div>

      <PromptModal
        open={lostOpen}
        title="Why was this opportunity lost?"
        label="Reason"
        required
        options={['Chose another provider', 'Cost / coverage', 'Not medically appropriate', 'Patient declined treatment', 'No response', 'Other']}
        onClose={() => setLostOpen(false)}
        onConfirm={async (reason) => {
          await setStage('LOST', reason)
          setLostOpen(false)
        }}
      />
      <ConfirmModal
        open={confirmDelete}
        title="Delete this opportunity?"
        message="The opportunity is removed permanently. Activity already logged on the patient stays."
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await crm.deleteOpportunity(o.id)
          navigate('/app/crm/opportunities')
        }}
      />
      {editors.node}
      {toastNode}
    </div>
  )
}
