import { Fragment, useEffect, useRef, useState } from 'react'
import UiIcon from '../../shared/ui/Icon'
import { assistant } from './assistantApi'

/*
 * "Ask Utessa AI": a top-bar button that opens a chat panel on the right. Answers come from the
 * backend assistant, which looks things up in the practice's own data (read-only).
 */

const SUGGESTIONS = [
  'Which leads have an overdue follow-up?',
  'What’s on my plate today?',
  'Show appointments for the next 3 days',
  'How many new leads did we get, and from which sources?',
]

const LOOKUP_LABELS = {
  search_records: 'Searched records',
  list_patients: 'Checked patients and leads',
  get_patient: 'Opened a patient record',
  list_tasks: 'Checked tasks',
  list_appointments: 'Checked appointments',
  crm_dashboard: 'Read the CRM dashboard',
  my_workspace_summary: 'Read your day',
}

export function AssistantButton({ onClick, open }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`group flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13.5px] font-semibold transition ${
        open
          ? 'border-iris-300 bg-iris-100 text-iris-700'
          : 'border-iris-200 bg-iris-50 text-iris-700 hover:border-iris-300 hover:bg-iris-100'
      }`}
      title="Ask Utessa AI"
    >
      <UiIcon name="sparkles" className="h-4 w-4 transition-transform group-hover:rotate-12" />
      <span className="hidden whitespace-nowrap lg:inline">Ask Utessa AI</span>
    </button>
  )
}

export function AssistantPanel({ open, onClose, userName }) {
  const [messages, setMessages] = useState([]) // { role, content, lookups? }
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    if (configured === null) assistant.status().then(s => setConfigured(Boolean(s?.configured))).catch(() => setConfigured(false))
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey) }
  }, [open, configured, onClose])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const send = async (text) => {
    const question = (text ?? draft).trim()
    if (!question || busy) return
    const next = [...messages, { role: 'user', content: question }]
    setMessages(next)
    setDraft('')
    setError('')
    setBusy(true)
    try {
      const res = await assistant.chat(next.map(({ role, content }) => ({ role, content })))
      setMessages([...next, { role: 'assistant', content: res.reply, lookups: res.lookups || [] }])
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
      setMessages(messages) // drop the unanswered question so the chat stays in order
      setDraft(question)
    } finally {
      setBusy(false)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const reset = () => { setMessages([]); setError(''); setDraft(''); inputRef.current?.focus() }
  const firstName = (userName || '').split(' ')[0]

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-ink-950/10 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-label="Utessa AI assistant"
        aria-hidden={!open}
        className={`fixed bottom-3 right-3 top-3 z-[61] flex w-[420px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-[0_24px_60px_-20px_rgba(17,20,58,0.35)] transition-transform duration-200 ${
          open ? 'translate-x-0' : 'pointer-events-none translate-x-[110%]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-mist-100 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-iris-100 text-iris-700">
            <UiIcon name="sparkles" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[15px] font-bold text-ink-950">Utessa AI</p>
            <p className="text-[12px] text-mist-500">Answers from your practice&apos;s data</p>
          </div>
          {messages.length > 0 && (
            <button type="button" onClick={reset} className="rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-mist-600 hover:bg-mist-50 hover:text-ink-950">
              New chat
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close assistant" className="flex h-8 w-8 items-center justify-center rounded-lg text-mist-500 hover:bg-mist-50 hover:text-ink-950">
            <UiIcon name="x" className="h-4 w-4" />
          </button>
        </div>

        {/* Conversation */}
        <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {configured === false ? (
            <div className="rounded-xl border border-sun-200 bg-sun-50 p-4 text-[13.5px] text-ink-900">
              <p className="font-semibold">The assistant isn&apos;t set up yet</p>
              <p className="mt-1 text-mist-600">An administrator needs to add an Anthropic API key on the server. Once that&apos;s done, you can ask questions here.</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="pt-6">
              <p className="text-[20px] font-bold text-ink-950">Hi{firstName ? ` ${firstName}` : ''}, what do you need?</p>
              <p className="mt-1 text-[13.5px] text-mist-600">Ask about patients, leads, follow-ups, tasks or the schedule.</p>
              <div className="mt-5 flex flex-col gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-mist-200 px-3.5 py-2.5 text-left text-[13.5px] font-medium text-ink-900 transition hover:border-iris-200 hover:bg-iris-50"
                  >
                    {s}
                    <UiIcon name="arrowRight" className="h-3.5 w-3.5 shrink-0 text-mist-400" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2.5 text-[13.5px] text-white">{m.content}</p>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-iris-100 text-iris-700">
                    <UiIcon name="sparkles" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {m.lookups?.length > 0 && (
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        {m.lookups.map(l => (
                          <span key={l} className="rounded-md bg-mist-50 px-1.5 py-0.5 text-[11px] font-medium text-mist-500">{LOOKUP_LABELS[l] || l}</span>
                        ))}
                      </div>
                    )}
                    <RichText text={m.content} />
                  </div>
                </div>
              )
            ))
          )}

          {busy && (
            <div className="flex items-center gap-2.5 text-[13px] text-mist-500">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-iris-100 text-iris-700">
                <UiIcon name="sparkles" className="h-4 w-4 animate-pulse" />
              </span>
              Looking through your data…
            </div>
          )}
          {error && <p className="rounded-lg bg-danger-50 px-3 py-2 text-[13px] text-danger-600">{error}</p>}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); send() }}
          className="border-t border-mist-100 p-3"
        >
          <div className="flex items-end gap-2 rounded-xl border border-mist-200 bg-mist-25 p-1.5 focus-within:border-iris-300 focus-within:ring-2 focus-within:ring-iris-100">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              disabled={configured === false}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Who still needs a call back this week?"
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[13.5px] text-ink-950 outline-none placeholder:text-mist-400"
            />
            <button
              type="submit"
              disabled={!draft.trim() || busy || configured === false}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-iris-600 text-white transition hover:bg-iris-700 disabled:bg-mist-200"
            >
              <UiIcon name="arrowRight" className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 px-1 text-[11.5px] text-mist-500">Read-only: it can look things up but can&apos;t change records. Double-check anything important.</p>
        </form>
      </aside>
    </>
  )
}

/* Minimal, safe formatting for replies: **bold**, bullet and numbered lists, paragraphs. No HTML. */
function RichText({ text }) {
  const blocks = String(text || '').split(/\n{2,}/)
  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed text-ink-900">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter(l => l.trim())
        const isList = lines.length > 0 && lines.every(l => /^\s*([-*•]|\d+[.)])\s+/.test(l))
        if (isList) {
          const ordered = /^\s*\d/.test(lines[0])
          const Tag = ordered ? 'ol' : 'ul'
          return (
            <Tag key={i} className={`space-y-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-mist-400`}>
              {lines.map((l, j) => <li key={j}><Inline text={l.replace(/^\s*([-*•]|\d+[.)])\s+/, '')} /></li>)}
            </Tag>
          )
        }
        return (
          <p key={i}>
            {lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}<Inline text={l.replace(/^#+\s*/, '')} /></Fragment>)}
          </p>
        )
      })}
    </div>
  )
}

function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g)
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i} className="font-semibold text-ink-950">{part.slice(2, -2)}</strong>
    if (/^_[^_]+_$/.test(part)) return <em key={i} className="text-mist-600">{part.slice(1, -1)}</em>
    return <Fragment key={i}>{part}</Fragment>
  })
}
