import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import { useAuth } from '../../shared/auth/AuthContext'
import { permissionsFor, serviceAllowed } from '../../shared/security/roles'
import { crm } from '../crm/crmApi'
import { Alert, Button, ConfirmModal, Modal, useToast } from '../crm/ui'
import { Hero, SelectField, TextArea, TextField, Toggle, useNewParam } from './kit'
import { APPOINTMENT_COLOR, EVENT_CATEGORIES, workspace } from './workspaceApi'

const CATEGORY = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c.value, c]))
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toLocalInput = (d) => `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const fmtTime = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export default function CalendarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [toast, showToast] = useToast()
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d })
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()))
  const [showAppts, setShowAppts] = useState(true)

  const crmOn = permissionsFor(user?.role).has('patients') && serviceAllowed(user?.enabledServices, 'patients')

  /* 6-week grid starting on the Sunday before the 1st */
  const grid = useMemo(() => {
    const start = new Date(cursor)
    start.setDate(1 - start.getDay())
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }, [cursor])

  const load = useCallback(async () => {
    setError('')
    const from = grid[0].toISOString()
    const end = new Date(grid[41]); end.setDate(end.getDate() + 1)
    const to = end.toISOString()
    try {
      const [events, appts] = await Promise.all([
        workspace.events(from, to),
        crmOn ? crm.appointments({ from, to }).catch(() => []) : Promise.resolve([]),
      ])
      const mapped = [
        ...events.map((e) => ({ ...e, start: new Date(e.startsAt), end: new Date(e.endsAt), color: CATEGORY[e.category]?.color || '#64748B' })),
        ...(appts || []).filter((a) => a.status !== 'CANCELLED').map((a) => {
          const start = new Date(a.startsAt)
          return {
            id: `appt-${a.id}`, source: 'crm', title: a.patientName ? `${a.patientName}` : (a.title || 'Appointment'),
            description: [a.appointmentType, a.providerName].filter(Boolean).join(' · '),
            start, end: new Date(start.getTime() + (a.durationMinutes || 30) * 60000), color: APPOINTMENT_COLOR, patientId: a.patientId,
          }
        }),
      ].sort((a, b) => a.start - b.start)
      setItems(mapped)
    } catch (err) {
      setError(err.message || 'Could not load the calendar.')
    }
  }, [grid, crmOn])

  useEffect(() => { load() }, [load])

  const newEvent = useCallback((day) => {
    const start = day ? new Date(`${day}T09:00`) : new Date()
    if (!day) { start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 1) }
    const end = new Date(start.getTime() + 3600000)
    setEditing({ title: '', description: '', location: '', category: 'MEETING', allDay: false, startsAt: toLocalInput(start), endsAt: toLocalInput(end) })
  }, [])
  useNewParam(() => newEvent(null))

  const visible = items.filter((i) => showAppts || i.source !== 'crm')
  const byDay = useMemo(() => {
    const map = {}
    visible.forEach((it) => {
      const d = new Date(it.start); d.setHours(0, 0, 0, 0)
      const last = new Date(it.end.getTime() - 1); last.setHours(0, 0, 0, 0)
      for (let x = new Date(d); x <= last && x <= grid[41]; x.setDate(x.getDate() + 1)) {
        (map[dayKey(x)] ||= []).push(it)
      }
    })
    return map
  }, [visible, grid])

  const todayKey = dayKey(new Date())
  const dayItems = byDay[selectedDay] || []
  const monthLabel = cursor.toLocaleDateString([], { month: 'long', year: 'numeric' })

  function shift(n) {
    setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() + n); return d })
  }

  function open(item) {
    if (item.source === 'crm') {
      navigate(item.patientId ? `/app/crm/patients/${item.patientId}` : '/app/crm/appointments')
      return
    }
    setEditing({
      ...item,
      startsAt: toLocalInput(item.start),
      endsAt: toLocalInput(item.end),
    })
  }

  async function save(values) {
    const body = {
      title: values.title,
      description: values.description,
      location: values.location,
      category: values.category,
      allDay: values.allDay,
      startsAt: new Date(values.allDay ? `${values.startsAt.slice(0, 10)}T00:00` : values.startsAt).toISOString(),
      endsAt: new Date(values.allDay ? `${(values.endsAt || values.startsAt).slice(0, 10)}T23:59` : values.endsAt).toISOString(),
    }
    if (values.id) await workspace.updateEvent(values.id, body)
    else await workspace.createEvent(body)
    setEditing(null)
    showToast(values.id ? 'Event updated' : 'Event added')
    load()
  }

  async function remove(item) {
    await workspace.deleteEvent(item.id)
    setConfirm(null)
    setEditing(null)
    showToast('Event deleted')
    load()
  }

  return (
    <div>
      {toast}
      <Hero
        icon="calendar"
        title="Calendar"
        subtitle={crmOn ? 'Team meetings, huddles, trainings and time off — with CRM patient appointments layered in.' : 'Team meetings, huddles, trainings and time off for the whole practice.'}
        actions={<Button onClick={() => newEvent(selectedDay)}><Icon name="plus" className="h-4 w-4" /> New event</Button>}
      />
      <Alert>{error}</Alert>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-[#E6E9F2] bg-white shadow-[0_1px_2px_rgba(24,28,66,0.04)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F1F7] px-4 py-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shift(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E1E4EE] text-[#4C5678] hover:bg-[#F4F6FB]" aria-label="Previous month"><Icon name="chevronLeft" className="h-4 w-4" /></button>
              <button type="button" onClick={() => shift(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E1E4EE] text-[#4C5678] hover:bg-[#F4F6FB]" aria-label="Next month"><Icon name="chevronRight" className="h-4 w-4" /></button>
              <h2 className="m-0 ml-1 text-[17px] font-bold text-navy">{monthLabel}</h2>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setCursor(d); setSelectedDay(todayKey) }}>Today</Button>
          </header>
          <div className="grid grid-cols-7 border-b border-[#F0F1F7] bg-[#FAFBFD]">
            {WEEKDAYS.map((w) => <div key={w} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-[#9AA3BF]">{w}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((d) => {
              const key = dayKey(d)
              const inMonth = d.getMonth() === cursor.getMonth()
              const list = byDay[key] || []
              const isToday = key === todayKey
              const isSel = key === selectedDay
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  onDoubleClick={() => newEvent(key)}
                  className={`group relative flex min-h-[104px] flex-col border-b border-r border-[#F0F1F7] p-1.5 text-left align-top transition [&:nth-child(7n)]:border-r-0 ${inMonth ? 'bg-white' : 'bg-[#FAFBFD]'} ${isSel ? 'ring-2 ring-inset ring-[#0A7A82]/40' : 'hover:bg-[#F7FAFC]'}`}
                >
                  <span className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${isToday ? 'bg-[#0A7A82] text-white' : inMonth ? 'text-navy' : 'text-[#B9C0D6]'}`}>{d.getDate()}</span>
                  <span className="flex flex-col gap-0.5">
                    {list.slice(0, 3).map((it) => (
                      <span key={`${key}-${it.id}`} className="truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${it.color}1F`, color: it.color }}>
                        {!it.allDay && <span className="font-normal opacity-80">{fmtTime(it.start)} </span>}{it.title}
                      </span>
                    ))}
                    {list.length > 3 && <span className="px-1.5 text-[11px] font-semibold text-[#8A93B2]">+{list.length - 3} more</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#E6E9F2] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="m-0 text-[15px] font-bold text-navy">
                {new Date(`${selectedDay}T00:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              <button type="button" onClick={() => newEvent(selectedDay)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF7F8] text-[#0A7A82] hover:bg-[#DDF0F1]" aria-label="Add event on this day"><Icon name="plus" className="h-4 w-4" /></button>
            </div>
            {dayItems.length ? (
              <ul className="m-0 list-none space-y-2 p-0">
                {dayItems.map((it) => (
                  <li key={it.id}>
                    <button type="button" onClick={() => open(it)} className="flex w-full gap-3 rounded-xl border border-[#F0F1F7] p-2.5 text-left transition hover:border-[#D5DCEA] hover:bg-[#FAFBFD]">
                      <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-navy">{it.title}</span>
                        <span className="block text-[11.5px] text-[#8A93B2]">
                          {it.allDay ? 'All day' : `${fmtTime(it.start)} – ${fmtTime(it.end)}`}
                          {it.source === 'crm' ? ' · CRM appointment' : ` · ${CATEGORY[it.category]?.label || ''}`}
                        </span>
                        {(it.location || it.description) && <span className="block truncate text-[11.5px] text-[#9AA3BF]">{it.location || it.description}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 rounded-xl bg-[#FAFBFD] px-3 py-6 text-center text-[12.5px] text-[#9AA3BF]">Nothing scheduled. Double-click a day to add an event.</p>
            )}
          </section>

          <section className="rounded-2xl border border-[#E6E9F2] bg-white p-4">
            <h3 className="m-0 mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#8A93B2]">Legend</h3>
            <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
              {EVENT_CATEGORIES.map((c) => (
                <li key={c.value} className="flex items-center gap-2 text-[12.5px] text-[#4C5678]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.label}</li>
              ))}
              {crmOn && <li className="flex items-center gap-2 text-[12.5px] text-[#4C5678]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: APPOINTMENT_COLOR }} />Appointments</li>}
            </ul>
            {crmOn && <div className="mt-3"><Toggle checked={showAppts} onChange={setShowAppts} label="Show CRM appointments" hint="Patient visits from the CRM module" /></div>}
          </section>
        </aside>
      </div>

      <EventModal event={editing} onClose={() => setEditing(null)} onSave={save} onDelete={(e) => setConfirm(e)} />
      <ConfirmModal open={!!confirm} title="Delete event?" message={`"${confirm?.title}" will be removed from the practice calendar.`} onConfirm={() => remove(confirm)} onClose={() => setConfirm(null)} />
    </div>
  )
}

function EventModal({ event, onClose, onSave, onDelete }) {
  const [values, setValues] = useState(event)
  const [prev, setPrev] = useState(event)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  if (event !== prev) { setPrev(event); setValues(event); setError('') }
  if (!event || !values) return null
  const set = (k) => (v) => setValues((s) => ({ ...s, [k]: v }))

  async function submit(e) {
    e?.preventDefault()
    if (!values.title?.trim()) { setError('Give the event a title.'); return }
    if (!values.allDay && values.endsAt && values.endsAt < values.startsAt) { setError('The end must be after the start.'); return }
    setSaving(true)
    try { await onSave(values) } catch (err) { setError(err.message || 'Could not save.') } finally { setSaving(false) }
  }

  return (
    <Modal
      open
      size="md"
      title={values.id ? 'Edit event' : 'New event'}
      subtitle="Visible to everyone in the practice."
      onClose={onClose}
      footer={
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-warn">{error}</p>}
          {values.id && <Button variant="danger" onClick={() => onDelete(values)}><Icon name="trash" className="h-4 w-4" /> Delete</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save event'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label="Title" value={values.title} onChange={set('title')} autoFocus placeholder="e.g. Monday morning huddle" />
        <SelectField label="Type" value={values.category} onChange={set('category')} options={EVENT_CATEGORIES} />
        <TextField label="Location" value={values.location} onChange={set('location')} placeholder="Room, address or video link" />
        <div className="sm:col-span-2"><Toggle checked={values.allDay} onChange={set('allDay')} label="All-day event" /></div>
        <TextField label="Starts" type={values.allDay ? 'date' : 'datetime-local'} value={values.allDay ? values.startsAt?.slice(0, 10) : values.startsAt} onChange={(v) => set('startsAt')(values.allDay ? `${v}T00:00` : v)} />
        <TextField label="Ends" type={values.allDay ? 'date' : 'datetime-local'} value={values.allDay ? values.endsAt?.slice(0, 10) : values.endsAt} onChange={(v) => set('endsAt')(values.allDay ? `${v}T00:00` : v)} />
        <TextArea className="sm:col-span-2" label="Description" value={values.description} onChange={set('description')} rows={3} />
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
