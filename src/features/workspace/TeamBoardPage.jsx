import { useMemo, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { useAuth } from '../../shared/auth/AuthContext'
import { Alert, Avatar, Button, ConfirmModal, Loading, Pill, useAsync, useToast } from '../crm/ui'
import { Chip, Hero, timeAgo, useNewParam } from './kit'
import { POST_CATEGORIES, workspace } from './workspaceApi'

const CATEGORY = Object.fromEntries(POST_CATEGORIES.map((c) => [c.value, c]))
const MANAGERS = ['OWNER', 'ADMIN', 'MANAGER', 'HR']

export default function TeamBoardPage() {
  const { user } = useAuth()
  const { data, loading, error, setData } = useAsync(() => workspace.announcements(), [])
  const [toast, showToast] = useToast()
  const [filter, setFilter] = useState('ALL')
  const [draft, setDraft] = useState({ title: '', body: '', category: 'GENERAL', pinned: false })
  const [composerOpen, setComposerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [posting, setPosting] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const canPin = MANAGERS.includes(String(user?.role || '').toUpperCase())
  useNewParam(() => setComposerOpen(true))

  const posts = useMemo(() => (data || []).filter((p) => filter === 'ALL' || p.category === filter), [data, filter])

  function reset() {
    setDraft({ title: '', body: '', category: 'GENERAL', pinned: false })
    setEditingId(null)
    setComposerOpen(false)
  }

  async function submit(e) {
    e.preventDefault()
    if (!draft.title.trim() || !draft.body.trim()) { showToast('Add a title and a message.', 'error'); return }
    setPosting(true)
    try {
      const saved = editingId ? await workspace.updateAnnouncement(editingId, draft) : await workspace.createAnnouncement(draft)
      setData((prev) => {
        const list = editingId ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...(prev || [])]
        return [...list].sort((a, b) => (b.pinned - a.pinned) || new Date(b.createdAt) - new Date(a.createdAt))
      })
      showToast(editingId ? 'Post updated' : 'Posted to the team board')
      reset()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setPosting(false)
    }
  }

  async function remove(p) {
    await workspace.deleteAnnouncement(p.id)
    setData((prev) => prev.filter((x) => x.id !== p.id))
    setConfirm(null)
    showToast('Post removed')
  }

  return (
    <div className="mx-auto max-w-4xl">
      {toast}
      <Hero icon="board" title="Team board" subtitle="Policy updates, schedule changes and shout-outs — one place the whole practice checks every morning." />

      {/* Composer */}
      <form onSubmit={submit} className="mb-6 rounded-2xl border border-mist-200 bg-white p-4">
        <div className="flex gap-3">
          <Avatar name={user?.fullName} tone="blue" />
          <div className="min-w-0 flex-1">
            {!composerOpen ? (
              <button type="button" onClick={() => setComposerOpen(true)} className="w-full rounded-lg border border-mist-200 bg-mist-25 px-4 py-2.5 text-left text-[13.5px] text-mist-500 transition hover:border-mist-300">
                Share an update with the team…
              </button>
            ) : (
              <div className="space-y-2.5">
                <input
                  autoFocus
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Headline"
                  className="w-full rounded-xl border border-mist-200 px-3.5 py-2 text-[15px] font-semibold text-navy outline-none focus:border-brand-600"
                />
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  rows={4}
                  placeholder="What does the team need to know?"
                  className="w-full rounded-xl border border-mist-200 px-3.5 py-2 text-[13.5px] text-navy outline-none focus:border-brand-600"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {POST_CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, category: c.value }))}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition ${draft.category === c.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-mist-200 text-mist-600 hover:border-mist-300'}`}
                    >
                      <Icon name={c.icon} className="h-3.5 w-3.5" />{c.label}
                    </button>
                  ))}
                  {canPin && (
                    <label className="ml-auto flex items-center gap-1.5 text-[12.5px] font-semibold text-mist-600">
                      <input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft((d) => ({ ...d, pinned: e.target.checked }))} />
                      Pin to top
                    </label>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={reset}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={posting}>{posting ? 'Posting…' : editingId ? 'Save' : 'Post'}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip active={filter === 'ALL'} onClick={() => setFilter('ALL')}>Everything</Chip>
        {POST_CATEGORIES.map((c) => <Chip key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)}>{c.label}</Chip>)}
      </div>

      <Alert>{error}</Alert>
      {loading && !data ? <Loading label="Loading the board…" /> : (
        <div className="space-y-4">
          {posts.map((p) => {
            const cat = CATEGORY[p.category] || CATEGORY.GENERAL
            return (
              <article key={p.id} className={`rounded-2xl border bg-white p-5 ${p.category === 'URGENT' ? 'border-danger-200' : p.pinned ? 'border-brand-100' : 'border-mist-200'}`}>
                <header className="mb-3 flex items-center gap-3">
                  <Avatar name={p.authorName} />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[13.5px] font-semibold text-navy">{p.authorName || 'Team member'}</p>
                    <p className="m-0 text-[11.5px] text-mist-500">{timeAgo(p.createdAt)}</p>
                  </div>
                  {p.pinned && <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700"><Icon name="pin" className="h-3 w-3" /> Pinned</span>}
                  <Pill tone={cat.tone} dot>{cat.label}</Pill>
                  {p.canManage && (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => { setDraft({ title: p.title, body: p.body, category: p.category, pinned: p.pinned }); setEditingId(p.id); setComposerOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex h-7 w-7 items-center justify-center rounded-lg text-mist-500 hover:bg-mist-50 hover:text-navy" aria-label="Edit post"><Icon name="edit" className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setConfirm(p)} className="flex h-7 w-7 items-center justify-center rounded-lg text-mist-500 hover:bg-danger-50 hover:text-danger-600" aria-label="Delete post"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </header>
                <h2 className="m-0 text-[17px] font-bold text-navy">{p.title}</h2>
                <p className="m-0 mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-mist-800">{p.body}</p>
              </article>
            )
          })}
          {!posts.length && (
            <div className="rounded-2xl border border-dashed border-mist-200 bg-white px-6 py-14 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon name="board" className="h-6 w-6" /></span>
              <p className="m-0 text-[15px] font-semibold text-navy">The board is quiet</p>
              <p className="m-0 mt-1 text-[13px] text-mist-500">Post the first update — a schedule change, a policy reminder, or a team win.</p>
            </div>
          )}
        </div>
      )}
      <ConfirmModal open={!!confirm} title="Delete post?" message={`"${confirm?.title}" will be removed from the board.`} onConfirm={() => remove(confirm)} onClose={() => setConfirm(null)} />
    </div>
  )
}
