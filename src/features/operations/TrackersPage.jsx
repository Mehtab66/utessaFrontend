import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, ConfirmModal, DataTable, Field, FilterSelect, Modal, PageHeader, Pill, SearchInput, Tabs, Toolbar,
  fmtDate, fmtMoney, useToast,
} from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { ops } from './opsApi'
import { DueCell, LinkButton, personName, personOptions, today } from './opsShared'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'expiry', label: 'Expiration / due date (tracked)' },
  { value: 'select', label: 'Pick from a list' },
  { value: 'yesno', label: 'Yes / No' },
  { value: 'money', label: 'Money' },
  { value: 'file', label: 'File attachment' },
]

function toField(f) {
  const base = { name: f.id, label: `${f.label}${f.required ? ' *' : ''}`, required: f.required && f.type !== 'file' }
  switch (f.type) {
    case 'number': return { ...base, type: 'number', step: 'any' }
    case 'money': return { ...base, type: 'number', step: '0.01' }
    case 'date':
    case 'expiry': return { ...base, type: 'date' }
    case 'select': return { ...base, type: 'select', options: f.options || [] }
    case 'yesno': return { ...base, type: 'select', options: ['Yes', 'No'] }
    default: return { ...base, type: 'text' }
  }
}

export function cellValue(f, v) {
  if (v === undefined || v === null || v === '') return null
  if (f.type === 'expiry') return <DueCell date={v} />
  if (f.type === 'date') return fmtDate(v)
  if (f.type === 'money') return f.sensitive ? <span title={fmtMoney(v)}>•••••</span> : fmtMoney(v)
  return String(v)
}

/** Add or edit one tracker row, with optional file attachments saved to the document vault. */
export function TrackerRowModal({ open, tab, row, people, fixedStaffId, onClose, onSaved }) {
  const [v, setV] = useState({})
  const [files, setFiles] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setError('')
    setFiles({})
    setV(row?.id ? { staffId: row.staffId, ...row.vals } : { staffId: fixedStaffId || '' })
  }, [open, row, fixedStaffId])
  if (!tab) return null
  const fileFields = tab.fields.filter((f) => f.type === 'file')

  async function save() {
    if (!v.staffId) return setError('Pick a person.')
    const missing = tab.fields.filter((f) => f.required && f.type !== 'file' && !String(v[f.id] ?? '').trim())
    if (missing.length) return setError(`Please complete: ${missing.map((f) => f.label).join(', ')}`)
    setSaving(true)
    setError('')
    try {
      const { staffId, ...vals } = v
      const body = { tabId: tab.id, staffId, vals }
      const saved = row?.id ? await ops.updateRow(row.id, body) : await ops.createRow(body)
      for (const f of fileFields) {
        const file = files[f.id]
        if (file) {
          await ops.uploadFile('VAULT', file, {
            staffId, category: 'Credentialing file', docType: `${tab.name} · ${f.label}`,
            linkRef: `row:${saved.id}:${f.id}`, expiresOn: tab.fields.filter((x) => x.type === 'expiry').map((x) => vals[x.id]).find(Boolean) || '',
          })
        }
      }
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      size="lg"
      title={`${row?.id ? 'Edit' : 'Add'} · ${tab.name}`}
      subtitle={tab.description}
      onClose={onClose}
      footer={
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-warn" role="alert">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {!fixedStaffId && (
          <Field field={{ name: 'staffId', label: tab.scope === 'STAFF' ? 'Staff member *' : 'Provider *', type: 'select', options: personOptions(people) }} value={v.staffId} values={v} onChange={(val) => setV((p) => ({ ...p, staffId: val }))} />
        )}
        {tab.fields.filter((f) => f.type !== 'file').map((f) => (
          <Field key={f.id} field={toField(f)} value={v[f.id]} values={v} onChange={(val) => setV((p) => ({ ...p, [f.id]: val }))} />
        ))}
        {fileFields.map((f) => (
          <label key={f.id} className="block text-[12.5px] font-semibold text-navy sm:col-span-2">
            {f.label}
            <input type="file" onChange={(e) => setFiles((p) => ({ ...p, [f.id]: e.target.files?.[0] }))} className="mt-1 block w-full rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-mist-100 file:px-3 file:py-1 file:text-[12.5px] file:font-semibold" />
            <span className="mt-1 block text-[11.5px] font-normal text-mist-500">Saved to the document vault under this person.</span>
          </label>
        ))}
      </div>
    </Modal>
  )
}

/** Rows of one tracker as a table (used on the trackers page and on profiles). */
export function TrackerTable({ tab, rows, people, files = [], showPerson = true, loading, onEdit, onDelete, empty }) {
  const byId = Object.fromEntries(people.map((m) => [m.id, m]))
  const cols = [
    ...(showPerson ? [{ key: '__person', label: tab.scope === 'STAFF' ? 'Staff member' : 'Provider', sortValue: (r) => personName(byId[r.staffId]), render: (r) => <b className="font-semibold">{personName(byId[r.staffId]) || '—'}</b> }] : []),
    ...tab.fields.filter((f) => f.inTable !== false && f.type !== 'file').map((f) => ({
      key: f.id,
      label: f.label,
      sortValue: (r) => r.vals?.[f.id] ?? '',
      render: (r) => cellValue(f, r.vals?.[f.id]),
    })),
    ...(tab.fields.some((f) => f.type === 'file') ? [{
      key: '__files', label: 'Files', sortable: false,
      render: (r) => {
        const mine = files.filter((x) => String(x.linkRef || '').startsWith(`row:${r.id}:`))
        return mine.length ? (
          <span className="flex flex-col gap-0.5">
            {mine.map((x) => <a key={x.id} href={ops.fileUrl(x.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline"><Icon name="note" className="h-3.5 w-3.5" />{x.name}</a>)}
          </span>
        ) : null
      },
    }] : []),
    {
      key: '__actions', label: '', sortable: false,
      render: (r) => (
        <span className="flex justify-end gap-1">
          <LinkButton onClick={() => onEdit(r)}>Edit</LinkButton>
          <LinkButton tone="danger" onClick={() => onDelete(r)}>Delete</LinkButton>
        </span>
      ),
    },
  ]
  return <DataTable columns={cols} rows={rows} loading={loading} empty={empty || `Nothing recorded in ${tab.name} yet.`} />
}

/** Create or edit a tracker and its fields. */
function TrackerEditor({ open, tab, scope, onClose, onSaved }) {
  const [v, setV] = useState({ name: '', groupName: '', description: '', fields: [] })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setError('')
    setV(tab?.id
      ? { name: tab.name, groupName: tab.groupName || '', description: tab.description || '', fields: tab.fields.map((f) => ({ ...f, optionsText: (f.options || []).join(', ') })), goal: tab.goal, hidden: tab.hidden }
      : { name: '', groupName: scope === 'STAFF' ? 'Custom' : 'Custom', description: '', fields: [{ id: 'f1', label: '', type: 'text', required: true, optionsText: '' }] })
  }, [open, tab, scope])

  const setField = (i, patch) => setV((p) => ({ ...p, fields: p.fields.map((f, k) => (k === i ? { ...f, ...patch } : f)) }))

  async function save() {
    if (!v.name.trim()) return setError('Give the tracker a name.')
    const fields = v.fields.filter((f) => f.label.trim()).map((f, i) => {
      const { optionsText, ...rest } = f
      return {
        ...rest,
        id: rest.id || `f${i + 1}`,
        label: rest.label.trim(),
        options: ['select'].includes(rest.type) ? String(optionsText || '').split(',').map((s) => s.trim()).filter(Boolean) : [],
        inTable: rest.type !== 'file' && rest.inTable !== false,
      }
    })
    if (!fields.length) return setError('Add at least one field.')
    const ids = new Set()
    for (const f of fields) {
      if (ids.has(f.id)) return setError('Two fields share the same id.')
      ids.add(f.id)
    }
    setSaving(true)
    setError('')
    try {
      const body = { scope, name: v.name.trim(), groupName: v.groupName, description: v.description, fields, goal: v.goal || null, hidden: Boolean(v.hidden) }
      if (tab?.id) await ops.updateTracker(tab.id, body)
      else await ops.createTracker(body)
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      size="xl"
      title={tab?.id ? `Edit tracker · ${tab.name}` : 'New tracker'}
      subtitle="A tracker is a table you fill in per person. Fields marked “Expiration / due date” feed the compliance alerts."
      onClose={onClose}
      footer={
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-warn" role="alert">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save tracker'}</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field field={{ name: 'name', label: 'Tracker name *' }} value={v.name} onChange={(x) => setV((p) => ({ ...p, name: x }))} />
        <Field field={{ name: 'groupName', label: 'Group', placeholder: 'e.g. Compliance, Education, Employment' }} value={v.groupName} onChange={(x) => setV((p) => ({ ...p, groupName: x }))} />
        <Field field={{ name: 'description', label: 'Description', type: 'textarea', rows: 2 }} value={v.description} onChange={(x) => setV((p) => ({ ...p, description: x }))} />
        {v.goal && (
          <Field field={{ name: 'need', label: `Goal: ${v.goal.label || 'credits needed per cycle'}`, type: 'number', hint: `Counted over the last ${v.goal.years || 2} years.` }} value={v.goal.need} onChange={(x) => setV((p) => ({ ...p, goal: { ...p.goal, need: x === '' ? 0 : Number(x) } }))} />
        )}
      </div>
      <h3 className="m-0 mb-2 mt-5 text-[12px] font-semibold text-brand-700">Fields</h3>
      <div className="space-y-2">
        {v.fields.map((f, i) => (
          <div key={i} className="grid items-end gap-2 rounded-lg border border-mist-200 p-2.5 sm:grid-cols-[1.4fr_1fr_1.4fr_auto_auto]">
            <Field field={{ name: `l${i}`, label: 'Label' }} value={f.label} onChange={(x) => setField(i, { label: x, id: f.id || x.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20) })} />
            <Field field={{ name: `t${i}`, label: 'Type', type: 'select', noEmpty: true, options: FIELD_TYPES }} value={f.type} onChange={(x) => setField(i, { type: x })} />
            {f.type === 'select'
              ? <Field field={{ name: `o${i}`, label: 'Choices (comma separated)' }} value={f.optionsText} onChange={(x) => setField(i, { optionsText: x })} />
              : <span />}
            <label className="flex items-center gap-1.5 pb-2 text-[12.5px] font-semibold text-navy"><input type="checkbox" checked={Boolean(f.required)} onChange={(e) => setField(i, { required: e.target.checked })} />Required</label>
            <LinkButton tone="danger" onClick={() => setV((p) => ({ ...p, fields: p.fields.filter((_, k) => k !== i) }))}>Remove</LinkButton>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" className="mt-2" onClick={() => setV((p) => ({ ...p, fields: [...p.fields, { id: `f${p.fields.length + 1}_${Date.now() % 1000}`, label: '', type: 'text', required: false, optionsText: '' }] }))}>
        <Icon name="plus" className="h-3.5 w-3.5" /> Add field
      </Button>
    </Modal>
  )
}

/**
 * Configurable trackers page. scope PROVIDER: CME, education, malpractice, peer review, contracts,
 * provider onboarding. scope STAFF: onboarding checklist and performance evaluations.
 */
export default function TrackersPage({ scope = 'PROVIDER' }) {
  const isStaff = scope === 'STAFF'
  const [tabs, setTabs] = useState([])
  const [people, setPeople] = useState([])
  const [rows, setRows] = useState([])
  const [files, setFiles] = useState([])
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [person, setPerson] = useState('ALL')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [manage, setManage] = useState(false)
  const [editor, setEditor] = useState(null)
  const [toast, showToast] = useToast()

  async function loadTabs() {
    const t = await ops.trackers(scope)
    setTabs(t)
    setCurrent((c) => (c && t.some((x) => x.id === c && !x.hidden) ? c : t.find((x) => !x.hidden)?.id || null))
    return t
  }

  async function load() {
    setLoading(true)
    try {
      const [, p, f] = await Promise.all([
        loadTabs(),
        isStaff ? ops.staff() : ops.providers(),
        ops.files('VAULT').catch(() => []),
      ])
      setPeople(p.filter((m) => m.status !== 'INACTIVE'))
      setFiles(f)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [scope]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRows(tabId) {
    if (!tabId) return setRows([])
    try {
      setRows(await ops.trackerRows({ tabId }))
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { loadRows(current) }, [current])

  const tab = tabs.find((t) => t.id === current)
  const visibleTabs = tabs.filter((t) => !t.hidden)
  const byId = useMemo(() => Object.fromEntries(people.map((m) => [m.id, m])), [people])
  const shown = rows.filter((r) => byId[r.staffId]
    && (person === 'ALL' || r.staffId === person)
    && (!q || `${personName(byId[r.staffId])} ${Object.values(r.vals || {}).join(' ')}`.toLowerCase().includes(q.toLowerCase())))

  // CME-style goal: credits per person in the current window
  const goal = tab?.goal?.need ? tab.goal : null
  const goalRows = useMemo(() => {
    if (!goal) return []
    const from = new Date()
    from.setFullYear(from.getFullYear() - (goal.years || 2))
    const field = goal.field || 'credits'
    return people.map((m) => {
      const credits = rows.filter((r) => r.staffId === m.id && (!r.vals?.done || new Date(r.vals.done) >= from)).reduce((s, r) => s + Number(r.vals?.[field] || 0), 0)
      return { id: m.id, name: personName(m), credits, need: Number(goal.need) }
    }).sort((a, b) => a.credits / a.need - b.credits / b.need)
  }, [goal, people, rows])

  const groups = [...new Set(visibleTabs.map((t) => t.groupName || 'Custom'))]

  return (
    <div>
      <PageHeader
        title={isStaff ? 'Onboarding & reviews' : 'Provider trackers'}
        subtitle={isStaff
          ? 'New-hire checklists and performance evaluations for every staff member. Overdue steps and review dates are tracked automatically.'
          : 'CME, education, malpractice, peer review, contracts and provider onboarding. Expiration and due dates feed provider compliance.'}
        actions={
          <>
            <Button variant="secondary" onClick={() => setManage(true)}>Manage trackers</Button>
            {tab && <Button onClick={() => setEditing({})}><Icon name="plus" className="h-4 w-4" /> Add to {tab.name}</Button>}
          </>
        }
      />
      <Alert>{error}</Alert>
      {groups.length > 0 && (
        <Tabs
          value={current}
          onChange={setCurrent}
          tabs={groups.flatMap((g) => visibleTabs.filter((t) => (t.groupName || 'Custom') === g).map((t) => ({ value: t.id, label: t.name })))}
        />
      )}
      {tab && (
        <>
          {tab.description && <p className="-mt-1 mb-4 text-[13px] text-mist-600">{tab.groupName ? <b className="font-semibold text-mist-700">{tab.groupName} · </b> : null}{tab.description}</p>}
          {goal && (
            <div className="mb-4 rounded-[12px] border border-mist-200 bg-white p-4">
              <p className="m-0 mb-3 text-[13px] text-mist-700"><b className="font-semibold text-ink-950">Goal:</b> {goal.need} {goal.field || 'credits'} every {goal.years || 2} years{goal.label ? ` · ${goal.label}` : ''}</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {goalRows.slice(0, 12).map((g) => (
                  <div key={g.id} className="grid grid-cols-[minmax(0,1fr)_90px_auto] items-center gap-2 text-[13px]">
                    <span className="truncate font-medium text-navy">{g.name}</span>
                    <span className="h-2 overflow-hidden rounded-sm bg-mist-100"><i className={`block h-full rounded-sm ${g.credits >= g.need ? 'bg-brand-600' : 'bg-sun-400'}`} style={{ width: `${Math.min(100, (g.credits / g.need) * 100)}%` }} /></span>
                    <b className="font-mono text-[12.5px] font-semibold">{g.credits}/{g.need}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Toolbar>
            <SearchInput value={q} onChange={setQ} placeholder={`Search ${tab.name}…`} />
            <FilterSelect label={isStaff ? 'Staff member' : 'Provider'} value={person} onChange={setPerson} allLabel="Everyone" options={personOptions(people)} />
          </Toolbar>
          <TrackerTable tab={tab} rows={shown} people={people} files={files} loading={loading} onEdit={setEditing} onDelete={setDeleting} />
        </>
      )}
      {!loading && !tab && <p className="text-sm text-mist-600">No trackers are shown. Use “Manage trackers” to show or add one.</p>}

      <TrackerRowModal
        open={Boolean(editing)}
        tab={tab}
        row={editing}
        people={people}
        onClose={() => setEditing(null)}
        onSaved={async () => { showToast('Saved'); await loadRows(current); setFiles(await ops.files('VAULT').catch(() => [])) }}
      />
      <ConfirmModal
        open={Boolean(deleting)}
        title="Delete this row?"
        message="The row is removed. Files already saved to the document vault stay there."
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          try {
            await ops.deleteRow(deleting.id)
            showToast('Deleted')
            loadRows(current)
          } catch (e) {
            showToast(e.message, 'error')
          }
          setDeleting(null)
        }}
      />
      <Modal
        open={manage}
        size="lg"
        title="Manage trackers"
        subtitle="Show, hide, edit or add trackers. Standard trackers can be hidden but not deleted."
        onClose={() => setManage(false)}
        footer={<><Button variant="secondary" onClick={() => setEditor({})}><Icon name="plus" className="h-4 w-4" /> New tracker</Button><Button onClick={() => setManage(false)}>Done</Button></>}
      >
        <ul className="m-0 list-none divide-y divide-mist-100 p-0">
          {tabs.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0">
                <b className="text-[13.5px] font-semibold text-ink-950">{t.name}</b>
                <span className="ml-2 text-[12px] text-mist-500">{t.groupName || 'Custom'} · {t.fields.length} fields</span>
                {t.hidden && <Pill tone="gray" className="ml-2">Hidden</Pill>}
              </span>
              <span className="flex gap-1">
                <LinkButton onClick={async () => {
                  try {
                    await ops.updateTracker(t.id, { scope, name: t.name, groupName: t.groupName, description: t.description, fields: t.fields, goal: t.goal, hidden: !t.hidden, sortOrder: t.sortOrder })
                    await loadTabs()
                  } catch (e) { showToast(e.message, 'error') }
                }}>{t.hidden ? 'Show' : 'Hide'}</LinkButton>
                <LinkButton onClick={() => setEditor(t)}>Edit</LinkButton>
                {!t.standard && (
                  <LinkButton tone="danger" onClick={async () => {
                    if (!window.confirm(`Delete ${t.name} and all its rows?`)) return
                    try { await ops.deleteTracker(t.id); await loadTabs() } catch (e) { showToast(e.message, 'error') }
                  }}>Delete</LinkButton>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
      <TrackerEditor open={Boolean(editor)} tab={editor} scope={scope} onClose={() => setEditor(null)} onSaved={() => { showToast('Tracker saved'); loadTabs() }} />
      {toast}
    </div>
  )
}

