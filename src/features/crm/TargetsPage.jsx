import { useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { useAuth } from '../../shared/auth/AuthContext'
import { permissionsFor } from '../../shared/security/roles'
import { TARGET_METRICS, crm, labelOf } from './crmApi'
import { useCrmEditors } from './CrmEditors'
import { Alert, Avatar, Button, ConfirmModal, Empty, FilterSelect, Loading, PageHeader, Pill, Toolbar, fmtDate, fmtMoney, useAsync, useToast } from './ui'

const HEALTH = {
  ACHIEVED: ['green', 'Achieved', '#155C62'],
  ON_TRACK: ['teal', 'On track', '#1E8E94'],
  AT_RISK: ['amber', 'At risk', '#AD7406'],
  BEHIND: ['red', 'Behind', '#C4321F'],
  UPCOMING: ['blue', 'Upcoming', '#1D4E9A'],
  MISSED: ['red', 'Missed', '#C4321F'],
}

export default function TargetsPage() {
  const { user } = useAuth()
  const canEdit = permissionsFor(user?.role).has('crmadmin')
  const [toastNode, toast] = useToast()
  const [metric, setMetric] = useState('ALL')
  const [health, setHealth] = useState('ALL')
  const [toDelete, setToDelete] = useState(null)
  const { data, loading, error, reload } = useAsync(() => crm.targets(), [])
  const editors = useCrmEditors({ toast, onSaved: () => reload() })
  const rows = (data || [])
    .filter((t) => metric === 'ALL' || t.metric === metric)
    .filter((t) => health === 'ALL' || t.health === health)

  return (
    <div>
      <PageHeader
        title="Targets & quotas"
        subtitle="Set goals for new leads, calls, bookings, conversions, referrals and revenue — progress is calculated live from CRM activity."
        actions={canEdit && <Button onClick={() => editors.open.target()}><Icon name="plus" /> New target</Button>}
      />
      <Alert>{error}</Alert>
      <Toolbar>
        <FilterSelect label="Metric" value={metric} onChange={setMetric} options={TARGET_METRICS} />
        <FilterSelect label="Health" value={health} onChange={setHealth} options={Object.entries(HEALTH).map(([value, [, label]]) => ({ value, label }))} />
      </Toolbar>
      {loading && <Loading />}
      {!loading && rows.length === 0 && (
        <Empty title="No targets yet" action={canEdit && <Button onClick={() => editors.open.target()}>Create the first target</Button>}>
          {canEdit ? 'Give the front desk and outreach team clear monthly goals.' : 'Your manager has not set targets yet.'}
        </Empty>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
        {rows.map((t) => {
          const [tone, label, color] = HEALTH[t.health] || HEALTH.ON_TRACK
          const money = t.metric === 'REVENUE_WON'
          return (
            <div key={t.id} className="rounded-[14px] border border-mist-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={t.assigneeName} size="sm" tone={t.userId ? 'blue' : 'teal'} />
                  <div className="min-w-0">
                    <p className="m-0 truncate text-[13.5px] font-semibold text-navy">{t.assigneeName}</p>
                    <p className="m-0 text-[12px] text-mist-500">{t.periodLabel || `${fmtDate(t.periodStart)} – ${fmtDate(t.periodEnd)}`}</p>
                  </div>
                </div>
                <Pill tone={tone} dot>{label}</Pill>
              </div>
              <p className="m-0 mt-3 text-[12px] font-semibold text-mist-500">{labelOf(TARGET_METRICS, t.metric)}</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono text-[24px] font-semibold text-navy">{money ? fmtMoney(t.achieved) : Number(t.achieved)}</span>
                <span className="text-[13px] text-mist-500">of {money ? fmtMoney(t.targetValue) : Number(t.targetValue)} · <b className="text-navy">{t.percent}%</b></span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-sm bg-mist-50">
                <i className="block h-full rounded-sm transition-all" style={{ width: `${Math.min(100, t.percent)}%`, background: color }} />
              </div>
              <p className="m-0 mt-2 text-[12px] text-mist-500">{fmtDate(t.periodStart)} – {fmtDate(t.periodEnd)}</p>
              {t.notes && <p className="m-0 mt-1 text-[12.5px] text-mist-700">{t.notes}</p>}
              {canEdit && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => editors.open.target(t)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setToDelete(t)}>Delete</Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <ConfirmModal
        open={Boolean(toDelete)}
        title="Delete this target?"
        message="Only the goal is removed — CRM records are not affected."
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          await crm.deleteTarget(toDelete.id)
          setToDelete(null)
          toast('Target deleted')
          reload()
        }}
      />
      {editors.node}
      {toastNode}
    </div>
  )
}
