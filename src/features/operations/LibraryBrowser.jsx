import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, ConfirmModal, DataTable, Field, Modal, PromptModal, SearchInput, Toolbar, fmtDate, useToast,
} from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { ops } from './opsApi'
import { DocumentText, LinkButton, UploadModal, fmtSize, useFileViewer } from './opsShared'

const TRAINING_TYPES = [
  ['guide', 'Training guide'], ['sop', 'Step-by-step procedure (SOP)'], ['check', 'Checklist'], ['quiz', 'Quiz with answer key'],
  ['script', 'Phone or patient script'], ['comp', 'Competency sign-off'],
]
const RESOURCE_TYPES = [
  ['handout', 'Patient handout'], ['policy', 'Policy'], ['sop', 'Step-by-step procedure (SOP)'], ['form', 'Form template'],
  ['letter', 'Letter template'], ['faq', 'FAQ'], ['check', 'Checklist'],
]
const SUGGESTIONS = {
  TRAINING: ['How to check in a new patient and verify insurance', 'Phone etiquette and scheduling new referrals', 'HIPAA privacy basics for new hires', 'Rooming a patient and taking accurate vitals', 'Hand hygiene and cleaning exam rooms', 'Handling upset patients at the front desk'],
  RESOURCES: ['Cancellation and no-show policy', 'Financial responsibility for patients', 'Prescription refill policy', 'Getting ready for your telehealth visit', 'Your first visit with us', 'Work excuse letter'],
}

/** Writes a first draft with the built-in writer, lets the user edit it, then saves it to a folder. */
function DraftModal({ open, space, folders, folderId, onClose, onSaved }) {
  const training = space === 'TRAINING'
  const [v, setV] = useState({})
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const tops = folders.filter((f) => !f.parentId)
  useEffect(() => {
    if (!open) return
    setDraft(null)
    setError('')
    const top = folders.find((f) => f.id === folderId)
    setV({ prompt: '', type: training ? 'guide' : 'handout', audience: training ? (top && !top.parentId ? top.name : 'All staff') : '', length: 'std', quiz: training, signature: training, folderId: folderId || '' })
  }, [open, space, folderId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    if (!String(v.prompt || '').trim()) return setError('Describe what the document should cover.')
    setBusy(true)
    setError('')
    try {
      const d = await ops.draft({ space, prompt: v.prompt, type: v.type, audience: v.audience, length: v.length, quiz: v.quiz, signature: v.signature })
      setDraft({ ...d, name: d.title })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!draft.name.trim()) return setError('Give the document a name.')
    setBusy(true)
    try {
      await ops.createText({ space, folderId: v.folderId || null, name: draft.name.trim(), docType: (training ? TRAINING_TYPES : RESOURCE_TYPES).find(([k]) => k === v.type)?.[1], text: draft.text })
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const folderOptions = folders.map((f) => ({ value: f.id, label: pathOf(folders, f.id).map((x) => x.name).join(' › ') }))

  return (
    <Modal
      open={open}
      size="xl"
      title={training ? 'Write a training document' : 'Write a practice resource'}
      subtitle="Describe what you need. A first draft is written from the built-in library; edit it, then save it to a folder. Always review drafts before use."
      onClose={onClose}
      footer={
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-warn" role="alert">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {draft ? (
            <>
              <Button variant="secondary" onClick={() => setDraft(null)}>Back</Button>
              <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save document'}</Button>
            </>
          ) : <Button onClick={generate} disabled={busy}><Icon name="sparkles" className="h-4 w-4" /> {busy ? 'Writing…' : 'Write draft'}</Button>}
        </>
      }
    >
      {!draft ? (
        <div className="space-y-4">
          <Field field={{ name: 'prompt', label: 'What should it cover? *', type: 'textarea', rows: 3, placeholder: training ? 'e.g. How to check in a new patient and verify insurance' : 'e.g. Cancellation and no-show policy' }} value={v.prompt} onChange={(x) => setV((p) => ({ ...p, prompt: x }))} />
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS[space].map((s) => (
              <button key={s} type="button" onClick={() => setV((p) => ({ ...p, prompt: s }))} className="rounded-md border border-mist-200 bg-white px-2.5 py-1 text-[12px] font-medium text-mist-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">{s}</button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field field={{ name: 'type', label: 'Document type', type: 'select', noEmpty: true, options: (training ? TRAINING_TYPES : RESOURCE_TYPES).map(([value, label]) => ({ value, label })) }} value={v.type} onChange={(x) => setV((p) => ({ ...p, type: x }))} />
            {training && <Field field={{ name: 'audience', label: 'For (designation)', type: 'select', noEmpty: true, options: ['All staff', ...tops.map((f) => f.name).filter((n) => n !== 'All staff')] }} value={v.audience} onChange={(x) => setV((p) => ({ ...p, audience: x }))} />}
            <Field field={{ name: 'length', label: 'Length', type: 'select', noEmpty: true, options: [{ value: 'short', label: 'Short' }, { value: 'std', label: 'Standard' }, { value: 'long', label: 'Detailed' }] }} value={v.length} onChange={(x) => setV((p) => ({ ...p, length: x }))} />
            <Field field={{ name: 'folderId', label: 'Save to folder', type: 'select', emptyLabel: 'Top level', options: folderOptions }} value={v.folderId} onChange={(x) => setV((p) => ({ ...p, folderId: x }))} />
            {training && <Field field={{ name: 'quiz', label: 'Add a short quiz with answer key', type: 'checkbox' }} value={v.quiz} onChange={(x) => setV((p) => ({ ...p, quiz: x }))} />}
            {training && <Field field={{ name: 'signature', label: 'Add an acknowledgment signature line', type: 'checkbox' }} value={v.signature} onChange={(x) => setV((p) => ({ ...p, signature: x }))} />}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {!draft.matched && <Alert tone="warn">This topic isn’t in the built-in library, so the draft is a general outline. Fill in the specifics before use.</Alert>}
            <Field field={{ name: 'name', label: 'Document name *' }} value={draft.name} onChange={(x) => setDraft((d) => ({ ...d, name: x }))} />
            <Field field={{ name: 'text', label: 'Text (lines starting with “# ” are headings)', type: 'textarea', rows: 18 }} value={draft.text} onChange={(x) => setDraft((d) => ({ ...d, text: x }))} />
          </div>
          <div className="max-h-[60vh] overflow-y-auto rounded-[12px] border border-mist-200 bg-mist-25 p-4">
            <p className="m-0 mb-2 text-[12px] font-semibold text-mist-600">Preview</p>
            <DocumentText text={draft.text} />
          </div>
        </div>
      )}
    </Modal>
  )
}

function pathOf(folders, id) {
  const out = []
  let cur = folders.find((f) => f.id === id)
  const seen = new Set()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    out.unshift(cur)
    cur = cur.parentId ? folders.find((f) => f.id === cur.parentId) : null
  }
  return out
}

/**
 * Folder tree + file list for one library: RESOURCES, TRAINING, or a vendor's VENDOR cabinet.
 * Readers can browse and open; editors can add folders, upload, write drafts, rename, move and delete.
 */
export default function LibraryBrowser({ space, vendorId, writer = false, extraColumns = [], onChange }) {
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [canEdit, setCanEdit] = useState(false)
  const [current, setCurrent] = useState(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [newFolder, setNewFolder] = useState(false)
  const [rename, setRename] = useState(null)
  const [move, setMove] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [editText, setEditText] = useState(null)
  const [toast, showToast] = useToast()
  const viewer = useFileViewer()

  async function load() {
    setLoading(true)
    try {
      const [f, d, acc] = await Promise.all([ops.folders(space, vendorId), ops.files(space, { vendorId }), ops.libraryAccess(space).catch(() => ({ canEdit: false }))])
      setFolders(f)
      setFiles(d)
      setCanEdit(Boolean(acc.canEdit))
      setError('')
      onChange?.({ folders: f, files: d })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [space, vendorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const kids = (pid) => folders.filter((f) => (f.parentId || null) === (pid || null))
  const descendants = (id) => [id, ...kids(id).flatMap((k) => descendants(k.id))]
  const countIn = (id) => { const ids = new Set(descendants(id)); return files.filter((x) => ids.has(x.folderId)).length }
  const path = current ? pathOf(folders, current) : []

  const shown = useMemo(() => {
    if (q.trim()) return files.filter((f) => `${f.name} ${f.docType || ''}`.toLowerCase().includes(q.toLowerCase()))
    return files.filter((f) => (f.folderId || null) === (current || null))
  }, [files, current, q])

  const subfolders = q.trim() ? [] : kids(current)

  const tree = []
  ;(function walk(pid, depth) {
    kids(pid).forEach((f) => {
      const hasKids = kids(f.id).length > 0
      const isOpen = open[f.id] || path.some((p) => p.id === f.id)
      tree.push({ f, depth, hasKids, isOpen })
      if (isOpen) walk(f.id, depth + 1)
    })
  })(null, 0)

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (f) => (
        <button type="button" onClick={() => viewer.open(f)} className="flex items-center gap-2 text-left font-semibold text-ink-950 hover:text-brand-700">
          <Icon name={f.written ? 'edit' : 'note'} className="h-4 w-4 shrink-0 text-mist-500" />{f.name}
        </button>
      ),
    },
    ...(q.trim() ? [{ key: 'folder', label: 'Folder', render: (f) => (f.folderId ? pathOf(folders, f.folderId).map((x) => x.name).join(' › ') : 'Top level') }] : []),
    { key: 'docType', label: 'Type', render: (f) => f.docType || (f.written ? 'Written document' : (f.contentType || '').split('/').pop()) },
    ...extraColumns,
    { key: 'sizeBytes', label: 'Size', render: (f) => fmtSize(f.sizeBytes), sortValue: (f) => f.sizeBytes || 0 },
    { key: 'updatedAt', label: 'Updated', render: (f) => fmtDate(f.updatedAt) },
    {
      key: 'actions', label: '', sortable: false,
      render: (f) => (
        <span className="flex justify-end gap-1">
          <a className="rounded-md px-2 py-1 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50" href={ops.fileUrl(f.id, true)}>Download</a>
          {canEdit && f.written && <LinkButton onClick={async () => { try { const t = await ops.fileText(f.id); setEditText({ ...t }) } catch (e) { showToast(e.message, 'error') } }}>Edit</LinkButton>}
          {canEdit && <LinkButton onClick={() => setRename({ file: f })}>Rename</LinkButton>}
          {canEdit && <LinkButton onClick={() => setMove({ file: f, target: f.folderId || '' })}>Move</LinkButton>}
          {canEdit && <LinkButton tone="danger" onClick={() => setConfirm({ file: f })}>Delete</LinkButton>}
        </span>
      ),
    },
  ]

  const folderOptions = (exclude) => folders
    .filter((f) => !exclude || !descendants(exclude).includes(f.id))
    .map((f) => ({ value: f.id, label: pathOf(folders, f.id).map((x) => x.name).join(' › ') }))

  return (
    <div>
      <Alert>{error}</Alert>
      <Alert tone="error">{viewer.error}</Alert>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="self-start rounded-[12px] border border-mist-200 bg-white p-2">
          <p className="m-0 px-2 pb-1 pt-1.5 text-[12px] font-semibold text-mist-600">Folders</p>
          <button type="button" onClick={() => { setCurrent(null); setQ('') }} className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] ${!current && !q ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-950 hover:bg-mist-25'}`}>
            <span>All folders</span><span className="text-[11.5px] text-mist-500">{files.length}</span>
          </button>
          {tree.map(({ f, depth, hasKids, isOpen }) => (
            <div key={f.id} className="flex items-center" style={{ paddingLeft: depth * 14 }}>
              <button type="button" aria-label={isOpen ? `Collapse ${f.name}` : `Expand ${f.name}`} onClick={() => setOpen((o) => ({ ...o, [f.id]: !isOpen }))} className={`flex h-6 w-5 shrink-0 items-center justify-center text-mist-400 ${hasKids ? '' : 'invisible'}`}>
                <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => { setCurrent(f.id); setQ('') }} className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] ${current === f.id && !q ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-950 hover:bg-mist-25'}`}>
                <span className="truncate">{f.name}</span><span className="text-[11.5px] text-mist-500">{countIn(f.id) || ''}</span>
              </button>
            </div>
          ))}
        </aside>
        <div className="min-w-0">
          <Toolbar
            right={canEdit && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setNewFolder(true)}><Icon name="plus" className="h-3.5 w-3.5" /> Folder</Button>
                {writer && <Button variant="secondary" size="sm" onClick={() => setDrafting(true)}><Icon name="sparkles" className="h-3.5 w-3.5" /> Write with AI</Button>}
                <Button size="sm" onClick={() => setUploading(true)}><Icon name="upload" className="h-3.5 w-3.5" /> Upload</Button>
              </>
            )}
          >
            <SearchInput value={q} onChange={setQ} placeholder="Search all files…" />
          </Toolbar>
          {!q.trim() && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px]">
              <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => setCurrent(null)}>All folders</button>
              {path.map((p) => (
                <span key={p.id} className="flex items-center gap-1.5"><span className="text-mist-400">›</span><button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => setCurrent(p.id)}>{p.name}</button></span>
              ))}
              {current && canEdit && (() => {
                const f = folders.find((x) => x.id === current)
                return f && !f.locked ? (
                  <span className="ml-2 flex gap-1">
                    <LinkButton onClick={() => setRename({ folder: f })}>Rename</LinkButton>
                    <LinkButton onClick={() => setMove({ folder: f, target: f.parentId || '' })}>Move</LinkButton>
                    <LinkButton tone="danger" onClick={() => setConfirm({ folder: f })}>Delete folder</LinkButton>
                  </span>
                ) : null
              })()}
            </div>
          )}
          {subfolders.length > 0 && (
            <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {subfolders.map((f) => (
                <button key={f.id} type="button" onClick={() => setCurrent(f.id)} className="flex items-center justify-between gap-2 rounded-[12px] border border-mist-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:border-brand-300">
                  <span className="flex min-w-0 items-center gap-2"><Icon name="list" className="h-4 w-4 shrink-0 text-mist-500" /><span className="truncate text-[13.5px] font-semibold text-ink-950">{f.name}</span></span>
                  <span className="text-[12px] text-mist-500">{countIn(f.id)} file{countIn(f.id) === 1 ? '' : 's'}</span>
                </button>
              ))}
            </div>
          )}
          <DataTable columns={columns} rows={shown} loading={loading} empty={q.trim() ? 'No files match.' : canEdit ? (writer ? 'No files in this folder yet. Upload one or write a draft.' : 'No files in this folder yet. Upload one.') : 'No files in this folder yet.'} />
        </div>
      </div>

      <UploadModal
        open={uploading}
        multiple
        title="Upload files"
        subtitle={`To ${path.length ? path.map((p) => p.name).join(' › ') : 'the top level'}`}
        onClose={() => setUploading(false)}
        onSubmit={async (file) => { await ops.uploadFile(space, file, { folderId: current || '', vendorId }) }}
        submitLabel="Upload"
      />
      {/* UploadModal closes itself after the last file; reload whenever it closes */}
      <ReloadOnClose open={uploading} onClosed={load} />
      {writer && <DraftModal open={drafting} space={space} folders={folders} folderId={current} onClose={() => setDrafting(false)} onSaved={() => { showToast('Document saved'); load() }} />}
      <PromptModal
        open={newFolder}
        title="New folder"
        label={`Folder name${path.length ? ` (inside ${path[path.length - 1].name})` : ''}`}
        required
        confirmLabel="Create"
        onClose={() => setNewFolder(false)}
        onConfirm={async (name) => {
          try {
            await ops.createFolder({ space, vendorId, parentId: current, name })
            setNewFolder(false)
            load()
          } catch (e) { showToast(e.message, 'error') }
        }}
      />
      <PromptModal
        open={Boolean(rename)}
        title={rename?.folder ? 'Rename folder' : 'Rename file'}
        label="New name"
        required
        confirmLabel="Rename"
        onClose={() => setRename(null)}
        onConfirm={async (name) => {
          try {
            if (rename.folder) await ops.updateFolder(rename.folder.id, { name })
            else await ops.updateFile(rename.file.id, { name })
            setRename(null)
            load()
          } catch (e) { showToast(e.message, 'error') }
        }}
      />
      <Modal
        open={Boolean(move)}
        size="sm"
        title={move?.folder ? `Move folder ${move.folder.name}` : `Move ${move?.file?.name || ''}`}
        onClose={() => setMove(null)}
        footer={<><Button variant="secondary" onClick={() => setMove(null)}>Cancel</Button><Button onClick={async () => {
          try {
            if (move.folder) await ops.updateFolder(move.folder.id, move.target ? { parentId: move.target } : { moveToTop: true })
            else await ops.updateFile(move.file.id, move.target ? { folderId: move.target } : { moveToTop: true })
            setMove(null)
            load()
          } catch (e) { showToast(e.message, 'error') }
        }}>Move</Button></>}
      >
        {move && <Field field={{ name: 'target', label: 'Move to', type: 'select', emptyLabel: 'Top level', options: folderOptions(move.folder?.id) }} value={move.target} onChange={(x) => setMove((m) => ({ ...m, target: x }))} />}
      </Modal>
      <Modal
        open={Boolean(editText)}
        size="xl"
        title={`Edit ${editText?.name || ''}`}
        onClose={() => setEditText(null)}
        footer={<><Button variant="secondary" onClick={() => setEditText(null)}>Cancel</Button><Button onClick={async () => {
          try { await ops.updateFile(editText.id, { text: editText.text }); setEditText(null); showToast('Saved'); load() } catch (e) { showToast(e.message, 'error') }
        }}>Save</Button></>}
      >
        {editText && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Field field={{ name: 'text', label: 'Text (lines starting with “# ” are headings)', type: 'textarea', rows: 20 }} value={editText.text} onChange={(x) => setEditText((t) => ({ ...t, text: x }))} />
            <div className="max-h-[60vh] overflow-y-auto rounded-[12px] border border-mist-200 bg-mist-25 p-4"><DocumentText text={editText.text} /></div>
          </div>
        )}
      </Modal>
      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.folder ? 'Delete folder?' : 'Delete file?'}
        message={confirm?.folder ? `Delete ${confirm.folder.name}, its subfolders and every file inside? This cannot be undone.` : `Delete ${confirm?.file?.name}? This cannot be undone.`}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            if (confirm.folder) {
              await ops.deleteFolder(confirm.folder.id)
              setCurrent(confirm.folder.parentId || null)
            } else await ops.deleteFile(confirm.file.id)
            load()
          } catch (e) { showToast(e.message, 'error') }
          setConfirm(null)
        }}
      />
      {viewer.node}
      {toast}
    </div>
  )
}

function ReloadOnClose({ open, onClosed }) {
  const [was, setWas] = useState(open)
  useEffect(() => {
    if (was && !open) onClosed()
    setWas(open)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
