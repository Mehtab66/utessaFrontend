import { useMemo, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { useAuth } from '../../shared/auth/AuthContext'
import { Alert, Avatar, Button, ConfirmModal, Loading, Modal, Pill, useAsync, useToast } from '../crm/ui'
import { Chip, Hero, SelectField, StatTile, TextArea, TextField, relativeDay, useNewParam, useTeam } from './kit'
import { PRIORITIES, TASK_STATUSES, todayIso, workspace } from './workspaceApi'

const PRIORITY = Object.fromEntries(PRIORITIES.map((p) => [p.value, p]))
const COLUMN_ACCENT = { TODO: '#9DA2C0', IN_PROGRESS: '#2E7FD9', DONE: '#1FA971' }
const EMPTY = { title: '', notes: '', priority: 'MEDIUM', status: 'TODO', dueDate: '', assigneeUserId: '' }

export default function MyWorkPage() {
  const { user } = useAuth()
  const team = useTeam()
  const { data, loading, error, reload, setData } = useAsync(() => workspace.tasks(), [])
  const [toast, showToast] = useToast()
  const [scope, setScope] = useState('mine')
  const [view, setView] = useState('board')
  const [query, setQuery] = useState('')
  const [quick, setQuick] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [dragId, setDragId] = useState(null)

  useNewParam((params) => setEditing({ ...EMPTY, assigneeUserId: params.assignee || '' }))

  const tasks = useMemo(() => data || [], [data])
  const today = todayIso()

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks
      .filter((t) => scope === 'team' || (scope === 'mine' ? t.assigneeUserId === user.userId : t.createdByUserId === user.userId))
      .filter((t) => !q || t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q))
  }, [tasks, scope, query, user.userId])

  const mineOpen = tasks.filter((t) => t.assigneeUserId === user.userId && t.status !== 'DONE')
  const stats = {
    open: mineOpen.length,
    today: mineOpen.filter((t) => t.dueDate === today).length,
    overdue: mineOpen.filter((t) => t.dueDate && t.dueDate < today).length,
    doneWeek: tasks.filter((t) => t.assigneeUserId === user.userId && t.completedAt && Date.now() - new Date(t.completedAt) < 7 * 86400000).length,
  }

  async function quickAdd(e) {
    e.preventDefault()
    if (!quick.trim()) return
    try {
      const created = await workspace.createTask({ title: quick.trim(), priority: 'MEDIUM', status: 'TODO' })
      setData((prev) => [created, ...(prev || [])])
      setQuick('')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function move(task, status) {
    if (task.status === status) return
    setData((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)))
    try {
      const updated = await workspace.setTaskStatus(task.id, status)
      setData((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
      if (status === 'DONE') showToast('Nice — task completed')
    } catch (err) {
      showToast(err.message, 'error')
      reload()
    }
  }

  async function save(values) {
    const body = {
      ...values,
      dueDate: values.dueDate || null,
      assigneeUserId: values.assigneeUserId || null,
    }
    const saved = values.id ? await workspace.updateTask(values.id, body) : await workspace.createTask(body)
    setData((prev) => (values.id ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...(prev || [])]))
    setEditing(null)
    showToast(values.id ? 'Task updated' : 'Task added')
  }

  async function remove(task) {
    await workspace.deleteTask(task.id)
    setData((prev) => prev.filter((t) => t.id !== task.id))
    setConfirm(null)
    setEditing(null)
    showToast('Task deleted')
  }

  return (
    <div>
      {toast}
      <Hero
        icon="checkSquare"
        title="My work"
        subtitle="Everything on your plate — personal to-dos and work your team assigned to you, across every module."
        actions={<Button onClick={() => setEditing({ ...EMPTY })}><Icon name="plus" className="h-4 w-4" /> New task</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open tasks" value={stats.open} icon="checkSquare" tone="#1E8E94" />
        <StatTile label="Due today" value={stats.today} icon="calendar" tone="#2E7FD9" />
        <StatTile label="Overdue" value={stats.overdue} icon="alert" tone="#E5484D" />
        <StatTile label="Done this week" value={stats.doneWeek} icon="sparkles" tone="#1FA971" />
      </div>

      <form onSubmit={quickAdd} className="mb-4 flex items-center gap-2 rounded-2xl border border-mist-200 bg-white p-2 pl-4 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/10">
        <Icon name="plus" className="h-4 w-4 text-mist-500" />
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder="Quick add a task for yourself and press Enter…"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-navy outline-none placeholder:text-mist-500"
        />
        <Button type="submit" size="sm" disabled={!quick.trim()}>Add</Button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Chip active={scope === 'mine'} onClick={() => setScope('mine')}>Assigned to me</Chip>
          <Chip active={scope === 'created'} onClick={() => setScope('created')}>Created by me</Chip>
          <Chip active={scope === 'team'} onClick={() => setScope('team')}>Whole team</Chip>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks" className="h-9 w-52 rounded-lg border border-mist-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-brand-600" />
          </div>
          <div className="flex rounded-lg border border-mist-200 bg-white p-0.5">
            {[['board', 'grid'], ['list', 'list']].map(([v, icon]) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`flex h-8 w-8 items-center justify-center rounded-md ${view === v ? 'bg-ink-950 text-white' : 'text-mist-500 hover:bg-mist-50'}`} aria-label={`${v} view`}>
                <Icon name={icon} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <Alert>{error}</Alert>
      {loading && !data ? <Loading label="Loading your work…" /> : view === 'board' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {TASK_STATUSES.map((col) => {
            const items = scoped.filter((t) => t.status === col.value)
            return (
              <section
                key={col.value}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { const t = tasks.find((x) => x.id === dragId); if (t) move(t, col.value); setDragId(null) }}
                className={`flex min-h-[320px] flex-col rounded-2xl border bg-mist-25 p-3 transition ${dragId ? 'border-dashed border-mist-300' : 'border-mist-200'}`}
              >
                <header className="mb-3 flex items-center gap-2 px-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLUMN_ACCENT[col.value] }} />
                  <h2 className="m-0 text-[13px] font-semibold text-mist-600">{col.label}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-mist-500 ring-1 ring-mist-100">{items.length}</span>
                </header>
                <div className="flex flex-1 flex-col gap-2.5">
                  {items.map((t) => (
                    <TaskCard key={t.id} task={t} today={today} onOpen={() => setEditing({ ...t, dueDate: t.dueDate || '', assigneeUserId: t.assigneeUserId || '' })} onToggle={() => move(t, t.status === 'DONE' ? 'TODO' : 'DONE')} onDragStart={() => setDragId(t.id)} />
                  ))}
                  {!items.length && (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-mist-200 px-4 py-8 text-center text-[12.5px] text-mist-500">
                      {col.value === 'DONE' ? 'Completed work lands here' : 'Drop a task here'}
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-mist-200 bg-white">
          {scoped.length ? scoped.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b border-mist-100 px-4 py-3 last:border-0 hover:bg-mist-25">
              <CheckCircle done={t.status === 'DONE'} onClick={() => move(t, t.status === 'DONE' ? 'TODO' : 'DONE')} />
              <button type="button" onClick={() => setEditing({ ...t, dueDate: t.dueDate || '', assigneeUserId: t.assigneeUserId || '' })} className="min-w-0 flex-1 text-left">
                <span className={`block truncate text-[13.5px] font-semibold ${t.status === 'DONE' ? 'text-mist-500 line-through' : 'text-navy'}`}>{t.title}</span>
                {t.notes && <span className="block truncate text-[12px] text-mist-500">{t.notes}</span>}
              </button>
              <Pill tone={PRIORITY[t.priority]?.tone}>{PRIORITY[t.priority]?.label}</Pill>
              <DueChip due={t.dueDate} today={today} done={t.status === 'DONE'} />
              <span className="hidden w-36 items-center gap-2 truncate text-[12.5px] text-mist-600 md:flex"><Avatar name={t.assigneeName} size="sm" />{t.assigneeName}</span>
            </div>
          )) : <p className="m-0 px-4 py-10 text-center text-sm text-mist-500">No tasks match this view.</p>}
        </div>
      )}

      <TaskModal task={editing} team={team} onClose={() => setEditing(null)} onSave={save} onDelete={(t) => setConfirm(t)} />
      <ConfirmModal open={!!confirm} title="Delete task?" message={`"${confirm?.title}" will be removed for everyone.`} onConfirm={() => remove(confirm)} onClose={() => setConfirm(null)} />
    </div>
  )
}

function TaskCard({ task: t, today, onOpen, onToggle, onDragStart }) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      className="group cursor-grab rounded-xl border border-mist-200 bg-white p-3 transition hover:border-mist-200 hover:shadow-[0_10px_20px_-12px_rgba(17,24,52,0.3)] active:cursor-grabbing"
    >
      <div className="flex items-start gap-2.5">
        <CheckCircle done={t.status === 'DONE'} onClick={onToggle} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className={`m-0 text-[13.5px] font-semibold leading-snug ${t.status === 'DONE' ? 'text-mist-500 line-through' : 'text-navy'}`}>{t.title}</p>
          {t.notes && <p className="m-0 mt-1 line-clamp-2 text-[12px] text-mist-500">{t.notes}</p>}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Pill tone={PRIORITY[t.priority]?.tone} className="!px-2 !py-0.5 !text-[11px]">{PRIORITY[t.priority]?.label}</Pill>
        <DueChip due={t.dueDate} today={today} done={t.status === 'DONE'} />
        <span className="ml-auto" title={t.assigneeName}><Avatar name={t.assigneeName} size="sm" /></span>
      </div>
    </article>
  )
}

function CheckCircle({ done, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={done ? 'Mark as not done' : 'Mark as done'}
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${done ? 'border-success-500 bg-success-500 text-white' : 'border-mist-300 text-transparent hover:border-success-500 hover:text-success-500'}`}
    >
      <Icon name="check" className="h-3 w-3" strokeWidth={3} />
    </button>
  )
}

function DueChip({ due, today, done }) {
  if (!due) return null
  const overdue = !done && due < today
  const isToday = due === today
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${overdue ? 'bg-danger-50 text-danger-600' : isToday ? 'bg-info-50 text-info-700' : 'bg-mist-50 text-mist-600'}`}>
      <Icon name="calendar" className="h-3 w-3" />
      {relativeDay(due)}
    </span>
  )
}

function TaskModal({ task, team, onClose, onSave, onDelete }) {
  const [values, setValues] = useState(task)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [prev, setPrev] = useState(task)
  if (task !== prev) {
    setPrev(task)
    setValues(task)
    setError('')
  }
  if (!task || !values) return null
  const set = (k) => (v) => setValues((s) => ({ ...s, [k]: v }))

  async function submit(e) {
    e?.preventDefault()
    if (!values.title?.trim()) { setError('Give the task a title.'); return }
    setSaving(true)
    try {
      await onSave(values)
    } catch (err) {
      setError(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      size="md"
      title={values.id ? 'Edit task' : 'New task'}
      subtitle={values.createdByName ? `Created by ${values.createdByName}` : 'Add something to your list or hand it to a teammate.'}
      onClose={onClose}
      footer={
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-warn">{error}</p>}
          {values.id && <Button variant="danger" onClick={() => onDelete(values)}><Icon name="trash" className="h-4 w-4" /> Delete</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : values.id ? 'Save changes' : 'Add task'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label="Title" value={values.title} onChange={set('title')} autoFocus placeholder="e.g. Call back insurance about prior auth" />
        <TextArea className="sm:col-span-2" label="Details" value={values.notes} onChange={set('notes')} rows={3} placeholder="Optional notes, links, context…" />
        <SelectField label="Status" value={values.status} onChange={set('status')} options={TASK_STATUSES} />
        <SelectField label="Priority" value={values.priority} onChange={set('priority')} options={PRIORITIES} />
        <TextField label="Due date" type="date" value={values.dueDate} onChange={set('dueDate')} />
        <SelectField label="Assignee" value={values.assigneeUserId} onChange={set('assigneeUserId')} emptyLabel="Me" options={team.map((m) => ({ value: m.userId, label: m.you ? `${m.fullName} (you)` : m.fullName }))} />
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
