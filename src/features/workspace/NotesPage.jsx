import { useMemo, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { Alert, Button, ConfirmModal, Loading, Modal, useAsync, useToast } from '../crm/ui'
import { Chip, Hero, TextArea, TextField, Toggle, timeAgo, useNewParam } from './kit'
import { NOTE_COLORS, workspace } from './workspaceApi'

const EMPTY = { title: '', body: '', color: 'yellow', pinned: false, shared: false }

export default function NotesPage() {
  const { data, loading, error, setData } = useAsync(() => workspace.notes(), [])
  const [toast, showToast] = useToast()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  useNewParam(() => setEditing({ ...EMPTY }))

  const notes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data || [])
      .filter((n) => filter === 'all' || (filter === 'mine' ? n.mine : n.shared))
      .filter((n) => !q || n.title.toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q))
      .sort((a, b) => (b.pinned - a.pinned) || new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [data, filter, query])

  const counts = {
    all: data?.length ?? 0,
    mine: (data || []).filter((n) => n.mine).length,
    shared: (data || []).filter((n) => n.shared).length,
  }

  function replace(saved) {
    setData((prev) => {
      const list = prev || []
      return list.some((n) => n.id === saved.id) ? list.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...list]
    })
  }

  async function save(values) {
    const body = { title: values.title, body: values.body, color: values.color, pinned: values.pinned, shared: values.shared }
    const saved = values.id ? await workspace.updateNote(values.id, body) : await workspace.createNote(body)
    replace(saved)
    setEditing(null)
    showToast(values.id ? 'Note saved' : 'Note created')
  }

  async function togglePin(n) {
    try {
      replace(await workspace.updateNote(n.id, { ...n, pinned: !n.pinned }))
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function remove(n) {
    await workspace.deleteNote(n.id)
    setData((prev) => prev.filter((x) => x.id !== n.id))
    setConfirm(null)
    setEditing(null)
    showToast('Note deleted')
  }

  return (
    <div>
      {toast}
      <Hero
        icon="note"
        title="Notes"
        subtitle="Jot down call scripts, checklists and reminders. Keep them private or share them with the whole practice."
        actions={<Button onClick={() => setEditing({ ...EMPTY })}><Icon name="plus" className="h-4 w-4" /> New note</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>All notes</Chip>
          <Chip active={filter === 'mine'} onClick={() => setFilter('mine')} count={counts.mine}>Mine</Chip>
          <Chip active={filter === 'shared'} onClick={() => setFilter('shared')} count={counts.shared}>Shared with team</Chip>
        </div>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" className="h-9 w-60 rounded-lg border border-mist-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-brand-600" />
        </div>
      </div>

      <Alert>{error}</Alert>
      {loading && !data ? <Loading label="Loading notes…" /> : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
          <button
            type="button"
            onClick={() => setEditing({ ...EMPTY })}
            className="mb-4 flex w-full break-inside-avoid flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-mist-200 bg-white/60 px-4 py-10 text-mist-500 transition hover:border-brand-600 hover:text-brand-700"
          >
            <Icon name="plus" className="h-6 w-6" />
            <span className="text-[13px] font-semibold">Add a note</span>
          </button>
          {notes.map((n) => {
            const c = NOTE_COLORS[n.color] || NOTE_COLORS.yellow
            return (
              <article
                key={n.id}
                className="group relative mb-4 break-inside-avoid rounded-2xl border p-4 transition"
                style={{ backgroundColor: c.bg, borderColor: c.border }}
              >
                <div className="mb-2 flex items-start gap-2">
                  <button type="button" onClick={() => n.mine && setEditing({ ...n })} className="min-w-0 flex-1 text-left" disabled={!n.mine}>
                    <h3 className="m-0 text-[15px] font-bold leading-snug text-navy">{n.title}</h3>
                  </button>
                  {n.mine && (
                    <button type="button" onClick={() => togglePin(n)} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${n.pinned ? 'bg-navy text-white' : 'text-mist-600 opacity-0 hover:bg-black/5 group-hover:opacity-100'}`} aria-label={n.pinned ? 'Unpin' : 'Pin'}>
                      <Icon name="pin" className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!n.mine && n.pinned && <Icon name="pin" className="h-3.5 w-3.5 text-mist-600" />}
                </div>
                {n.body && <p className="m-0 whitespace-pre-wrap text-[13px] leading-relaxed text-mist-800">{n.body}</p>}
                <footer className="mt-3 flex items-center gap-2 text-[11px] text-mist-500">
                  {n.shared ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 font-semibold"><Icon name="users" className="h-3 w-3" /> Shared</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 font-semibold"><Icon name="lock" className="h-3 w-3" /> Private</span>
                  )}
                  {!n.mine && <span>by {n.ownerName}</span>}
                  <span className="ml-auto">{timeAgo(n.updatedAt)}</span>
                </footer>
              </article>
            )
          })}
        </div>
      )}
      {!loading && data && !notes.length && (
        <p className="mt-2 text-center text-[13px] text-mist-500">{query ? 'No notes match your search.' : 'No notes here yet.'}</p>
      )}

      <NoteModal note={editing} onClose={() => setEditing(null)} onSave={save} onDelete={(n) => setConfirm(n)} />
      <ConfirmModal open={!!confirm} title="Delete note?" message={`"${confirm?.title}" will be permanently removed.`} onConfirm={() => remove(confirm)} onClose={() => setConfirm(null)} />
    </div>
  )
}

function NoteModal({ note, onClose, onSave, onDelete }) {
  const [values, setValues] = useState(note)
  const [prev, setPrev] = useState(note)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  if (note !== prev) { setPrev(note); setValues(note); setError('') }
  if (!note || !values) return null
  const set = (k) => (v) => setValues((s) => ({ ...s, [k]: v }))
  const c = NOTE_COLORS[values.color] || NOTE_COLORS.yellow

  async function submit(e) {
    e?.preventDefault()
    if (!values.title?.trim()) { setError('Give the note a title.'); return }
    setSaving(true)
    try { await onSave(values) } catch (err) { setError(err.message || 'Could not save.') } finally { setSaving(false) }
  }

  return (
    <Modal
      open
      size="md"
      title={values.id ? 'Edit note' : 'New note'}
      onClose={onClose}
      footer={
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-warn">{error}</p>}
          {values.id && <Button variant="danger" onClick={() => onDelete(values)}><Icon name="trash" className="h-4 w-4" /> Delete</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save note'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-2xl border p-3 transition-colors" style={{ backgroundColor: c.bg, borderColor: c.border }}>
          <TextField label="Title" value={values.title} onChange={set('title')} autoFocus placeholder="e.g. New-patient intake script" />
          <TextArea className="mt-3" label="Note" value={values.body} onChange={set('body')} rows={7} placeholder="Write anything…" />
        </div>
        <div>
          <p className="m-0 mb-1.5 text-[12.5px] font-semibold text-navy">Color</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(NOTE_COLORS).map(([key, col]) => (
              <button
                key={key}
                type="button"
                onClick={() => set('color')(key)}
                title={col.label}
                className={`h-8 w-8 rounded-full border-2 transition ${values.color === key ? 'scale-110 border-navy' : 'border-transparent'}`}
                style={{ backgroundColor: col.bg, boxShadow: `inset 0 0 0 1px ${col.border}` }}
              />
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle checked={values.pinned} onChange={set('pinned')} label="Pin to top" />
          <Toggle checked={values.shared} onChange={set('shared')} label="Share with team" hint="Everyone can read it" />
        </div>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
