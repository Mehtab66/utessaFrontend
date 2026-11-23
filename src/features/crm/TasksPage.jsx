import { useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { Link } from 'react-router-dom'
import { PRIORITIES, TASK_TYPES, crm, labelOf } from './crmApi'
import { useCrmEditors } from './CrmEditors'
import {
  Alert, Button, DataTable, EnumPill, Field, FilterSelect, Modal, PageHeader, Pill, Tabs, Toolbar, fmtDateTime,
  fmtRelative, fromLocalInput, useAsync, useCrmRefs, useToast,
} from './ui'

const BUCKETS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'open', label: 'All open' },
  { value: 'done', label: 'Completed' },
]

export default function TasksPage() {
  const [toastNode, toast] = useToast()
  const { team } = useCrmRefs()
  const [bucket, setBucket] = useState('today')
  const [who, setWho] = useState('ALL')
  const [type, setType] = useState('ALL')
  const [completing, setCompleting] = useState(null)
  const all = useAsync(() => crm.tasks({ bucket: 'open', mine: who === 'ME' || undefined, assignedUserId: who !== 'ME' ? who : undefined }), [who])
  const list = useAsync(() => crm.tasks({ bucket, mine: who === 'ME' || undefined, assignedUserId: who !== 'ME' ? who : undefined }), [bucket, who])
  const reload = () => Promise.all([all.reload(), list.reload()])
  const editors = useCrmEditors({ toast, onSaved: reload })

  const open = all.data || []
  const now = Date.now()
  const startTomorrow = new Date()
  startTomorrow.setHours(24, 0, 0, 0)
  const counts = {
    overdue: open.filter((t) => new Date(t.dueAt).getTime() < now).length,
    today: open.filter((t) => new Date(t.dueAt).toDateString() === new Date().toDateString()).length,
    upcoming: open.filter((t) => new Date(t.dueAt) >= startTomorrow).length,
    open: open.length,
  }
  const rows = (list.data || []).filter((t) => type === 'ALL' || t.taskType === type)

  return (
    <div>
      <PageHeader
        title="Tasks & follow-ups"
        subtitle="Callbacks, insurance checks, records requests and no-show recovery — automated tasks land here alongside your own."
        actions={<Button onClick={() => editors.open.task()}><Icon name="plus" /> New task</Button>}
      />
      <Alert>{list.error}</Alert>
      <Tabs value={bucket} onChange={setBucket} tabs={BUCKETS.map((b) => ({ ...b, count: counts[b.value] }))} />
      <Toolbar>
        <FilterSelect label="Assigned to" value={who} onChange={setWho} allLabel="Anyone" options={[{ value: 'ME', label: 'Me' }, ...team.map((m) => ({ value: m.userId, label: m.fullName }))]} />
        <FilterSelect label="Type" value={type} onChange={setType} options={TASK_TYPES} />
      </Toolbar>
      <DataTable
        rows={rows}
        loading={list.loading}
        onRowClick={(t) => editors.open.task(t)}
        empty={bucket === 'overdue' ? 'Nothing overdue — nice work.' : 'No tasks here.'}
        columns={[
          {
            key: 'done',
            label: '',
            sortable: false,
            render: (t) => (t.status === 'OPEN' || t.status === 'IN_PROGRESS' ? (
              <button
                type="button"
                aria-label="Complete task"
                onClick={(e) => {
                  e.stopPropagation()
                  setCompleting(t)
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-mist-300 text-[11px] text-transparent transition hover:border-brand-600 hover:text-brand-700"
              >
                <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
              </button>
            ) : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-800 text-white"><Icon name="check" className="h-3 w-3" strokeWidth={2.6} /></span>),
          },
          { key: 'title', label: 'Task', render: (t) => <span className={t.status === 'DONE' ? 'text-mist-500 line-through' : 'font-semibold'}>{t.title}</span> },
          {
            key: 'patientName',
            label: 'Patient / lead',
            render: (t) => (t.patientId ? (
              <span>
                <Link onClick={(e) => e.stopPropagation()} to={`/app/crm/patients/${t.patientId}`} className="font-semibold text-brand-700">{t.patientName}</Link>
                {t.patientPhone && <span className="block text-[12px] text-mist-500">{t.patientPhone}</span>}
              </span>
            ) : '—'),
          },
          { key: 'taskType', label: 'Type', render: (t) => labelOf(TASK_TYPES, t.taskType) },
          { key: 'priority', label: 'Priority', toneList: PRIORITIES, render: (t) => <EnumPill list={PRIORITIES} value={t.priority} />, sortValue: (t) => PRIORITIES.findIndex((p) => p.value === t.priority) },
          {
            key: 'dueAt',
            label: 'Due',
            nowrap: true,
            render: (t) => (
              <span>
                <span className={t.overdue ? 'font-semibold text-danger-600' : ''}>{fmtDateTime(t.dueAt)}</span>
                <span className="block text-[11.5px] text-mist-500">{t.status === 'DONE' ? `done ${fmtRelative(t.completedAt)}` : fmtRelative(t.dueAt)}</span>
              </span>
            ),
          },
          { key: 'assignedName', label: 'Assignee', render: (t) => t.assignedName || <span className="text-mist-500">Unassigned</span> },
          { key: 'createdByName', label: 'Source', render: (t) => (t.createdByName ? <Pill tone="gray">{t.createdByName}</Pill> : '—') },
        ]}
      />
      <CompleteModal
        task={completing}
        onClose={() => setCompleting(null)}
        onDone={async () => {
          setCompleting(null)
          toast('Task completed')
          await reload()
        }}
      />
      {editors.node}
      {toastNode}
    </div>
  )
}

function CompleteModal({ task, onClose, onDone }) {
  const [outcome, setOutcome] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!task) return null
  return (
    <Modal
      open
      title="Complete task"
      subtitle={task.title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          {error && <span className="mr-auto text-[13px] font-semibold text-warn">{error}</span>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={async () => {
            setBusy(true)
            try {
              await crm.completeTask(task.id, { outcome: outcome || null, nextFollowUpAt: fromLocalInput(next) })
              setOutcome('')
              setNext('')
              await onDone()
            } catch (err) {
              setError(err.message)
            } finally {
              setBusy(false)
            }
          }}>{busy ? 'Saving…' : 'Complete'}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field field={{ name: 'outcome', label: 'Outcome (optional)', type: 'textarea', placeholder: 'e.g. Left voicemail, verified Aetna PPO active…' }} value={outcome} onChange={setOutcome} />
        <Field field={{ name: 'next', label: 'Schedule the next follow-up (optional)', type: 'datetime' }} value={next} onChange={setNext} />
      </div>
    </Modal>
  )
}
