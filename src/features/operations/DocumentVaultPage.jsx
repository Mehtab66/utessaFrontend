import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert, Button, ConfirmModal, DataTable, FilterSelect, FormModal, Kpi, PageHeader, Pill, SearchInput, Segmented, Toolbar,
  fmtDate, useToast,
} from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { ops } from './opsApi'
import {
  DOC_CATALOG, DueCell, EXPIRING_DOCS, LinkButton, UploadModal, daysUntil, fmtSize, personName, personOptions, requiredDocs, useFileViewer,
} from './opsShared'

/** Credentialing, HR and compliance documents for every provider and staff member. */
export default function DocumentVaultPage() {
  const [view, setView] = useState('all')
  const [people, setPeople] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [fCat, setFCat] = useState('ALL')
  const [fPerson, setFPerson] = useState('ALL')
  const [fStatus, setFStatus] = useState('ALL')
  const [upload, setUpload] = useState(null)
  const [edit, setEdit] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [toast, showToast] = useToast()
  const viewer = useFileViewer()

  async function load() {
    setLoading(true)
    try {
      const [p, s, f] = await Promise.all([
        ops.providers().catch((e) => { if (e.status === 403) return []; throw e }),
        ops.staff().catch((e) => { if (e.status === 403) return []; throw e }),
        ops.files('VAULT'),
      ])
      const map = new Map()
      ;[...p, ...s].forEach((m) => map.set(m.id, m))
      setPeople([...map.values()].filter((m) => m.status !== 'INACTIVE').sort((a, b) => personName(a).localeCompare(personName(b))))
      setFiles(f)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const byId = useMemo(() => Object.fromEntries(people.map((m) => [m.id, m])), [people])
  const rows = files.filter((f) => byId[f.staffId]).map((f) => ({ ...f, person: personName(byId[f.staffId]) }))
  const expired = rows.filter((f) => f.expiresOn && daysUntil(f.expiresOn) < 0)
  const soon = rows.filter((f) => f.expiresOn && daysUntil(f.expiresOn) >= 0 && daysUntil(f.expiresOn) <= 90)

  const missing = useMemo(() => people.map((m) => {
    const have = new Set(files.filter((f) => f.staffId === m.id).map((f) => f.docType))
    const req = requiredDocs(m)
    return { id: m.id, person: m, name: personName(m), missing: req.filter((t) => !have.has(t)), required: req.length }
  }).filter((r) => r.missing.length), [people, files])

  const shownDocs = (view === 'expiring' ? [...expired, ...soon] : rows).filter((f) =>
    (!q || `${f.person} ${f.docType || ''} ${f.name}`.toLowerCase().includes(q.toLowerCase()))
    && (fCat === 'ALL' || f.category === fCat)
    && (fPerson === 'ALL' || f.staffId === fPerson)
    && (fStatus === 'ALL'
      || (fStatus === 'expired' && f.expiresOn && daysUntil(f.expiresOn) < 0)
      || (fStatus === 'soon' && f.expiresOn && daysUntil(f.expiresOn) >= 0 && daysUntil(f.expiresOn) <= 90)
      || (fStatus === 'current' && (!f.expiresOn || daysUntil(f.expiresOn) > 90))))

  const docColumns = [
    { key: 'person', label: 'Person', render: (f) => <Link to={`${byId[f.staffId]?.provider ? '/app/providers' : '/app/staff'}/${f.staffId}`} className="font-semibold text-ink-950 hover:text-brand-700">{f.person}</Link> },
    { key: 'docType', label: 'Document', render: (f) => <button type="button" className="text-left font-semibold text-brand-700 hover:underline" onClick={() => viewer.open(f)}>{f.docType || f.name}</button> },
    { key: 'category', label: 'Category' },
    { key: 'expiresOn', label: 'Expires', render: (f) => <DueCell date={f.expiresOn} />, sortValue: (f) => f.expiresOn || '9999' },
    { key: 'name', label: 'File', render: (f) => <span className="text-mist-600">{f.name} · {fmtSize(f.sizeBytes)}</span> },
    { key: 'createdAt', label: 'Added', render: (f) => `${fmtDate(f.createdAt)}${f.uploadedBy ? ` · ${f.uploadedBy}` : ''}` },
    {
      key: 'actions', label: '', sortable: false,
      render: (f) => (
        <span className="flex justify-end gap-1">
          <a className="rounded-md px-2 py-1 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50" href={ops.fileUrl(f.id, true)}>Download</a>
          <LinkButton onClick={() => setEdit(f)}>Edit</LinkButton>
          <LinkButton tone="danger" onClick={() => setConfirm(f)}>Delete</LinkButton>
        </span>
      ),
    },
  ]

  const missColumns = [
    { key: 'name', label: 'Person', render: (r) => <Link to={`${r.person.provider ? '/app/providers' : '/app/staff'}/${r.id}`} className="font-semibold text-ink-950 hover:text-brand-700">{r.name}</Link> },
    { key: 'role', label: 'Role', render: (r) => r.person.designation || r.person.jobTitle },
    { key: 'count', label: 'On file', sortValue: (r) => r.required - r.missing.length, render: (r) => `${r.required - r.missing.length} of ${r.required}` },
    {
      key: 'missing', label: 'Missing', sortable: false,
      render: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.missing.map((d) => (
            <button key={d} type="button" onClick={() => setUpload({ staffId: r.id, category: DOC_CATALOG.find(([, t]) => t.includes(d))?.[0] || 'Other', docType: d })} title="Upload this document">
              <Pill tone="amber">{d}</Pill>
            </button>
          ))}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Document vault"
        subtitle="Credentialing, HR and compliance documents for every provider and staff member, with expiration tracking and a list of what is still missing."
        actions={<Button onClick={() => setUpload({ category: 'Credentialing file', docType: '' })}><Icon name="upload" className="h-4 w-4" /> Upload document</Button>}
      />
      <Alert>{error}</Alert>
      <Alert tone="error">{viewer.error}</Alert>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Documents on file" value={rows.length} onClick={() => { setView('all'); setFStatus('ALL') }} />
        <Kpi label="Expired" value={expired.length} hint="Replace now" tone="red" onClick={() => { setView('all'); setFStatus('expired') }} />
        <Kpi label="Expiring in 90 days" value={soon.length} hint="Collect renewals" tone="amber" onClick={() => { setView('all'); setFStatus('soon') }} />
        <Kpi label="Missing required" value={missing.length} hint="People with gaps" tone="amber" onClick={() => setView('missing')} />
        <Kpi label="Providers with files" value={new Set(rows.filter((f) => byId[f.staffId]?.provider).map((f) => f.staffId)).size} hint="Credentialing files" tone="gray" />
      </div>
      <Toolbar right={<Segmented value={view} onChange={setView} options={[{ value: 'all', label: 'All documents' }, { value: 'missing', label: 'Missing required' }, { value: 'expiring', label: 'Expired or expiring' }]} />}>
        {view !== 'missing' && (
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Search person or document…" />
            <FilterSelect label="Category" value={fCat} onChange={setFCat} allLabel="Any category" options={DOC_CATALOG.map(([c]) => ({ value: c, label: c }))} />
            <FilterSelect label="Person" value={fPerson} onChange={setFPerson} allLabel="Everyone" options={personOptions(people)} />
            {view === 'all' && <FilterSelect label="Status" value={fStatus} onChange={setFStatus} allLabel="Any" options={[{ value: 'expired', label: 'Expired' }, { value: 'soon', label: 'Expiring in 90 days' }, { value: 'current', label: 'Current' }]} />}
          </>
        )}
      </Toolbar>
      {view === 'missing'
        ? <DataTable columns={missColumns} rows={missing} loading={loading} empty="Everyone has their required documents on file." />
        : <DataTable columns={docColumns} rows={shownDocs} loading={loading} empty={rows.length ? 'No documents match these filters.' : 'No documents yet. Upload IDs, licenses, certificates and signed forms here.'} />}

      <UploadModal
        open={Boolean(upload)}
        title="Upload a document"
        subtitle="Saved to the person’s file. Documents with an expiration date are tracked."
        initial={upload || {}}
        fields={[
          { name: 'staffId', label: 'Person *', required: true, type: 'select', options: personOptions(people), span: 2 },
          { name: 'category', label: 'Category *', required: true, type: 'select', noEmpty: true, options: DOC_CATALOG.map(([c]) => c) },
          { name: 'docType', label: 'Document type *', required: true, type: 'select', options: (v) => DOC_CATALOG.find(([c]) => c === v.category)?.[1] || [] },
          { name: 'expiresOn', label: 'Expires', type: 'date', show: (v) => EXPIRING_DOCS.has(v.docType) },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ]}
        onClose={() => setUpload(null)}
        onSubmit={async (file, v) => {
          await ops.uploadFile('VAULT', file, { staffId: v.staffId, category: v.category, docType: v.docType, expiresOn: v.expiresOn, notes: v.notes })
          showToast('Uploaded')
          load()
        }}
      />
      <FormModal
        open={Boolean(edit)}
        size="md"
        title="Edit document details"
        initial={edit ? { category: edit.category || 'Other', docType: edit.docType || '', expiresOn: edit.expiresOn || '', notes: edit.notes || '', staffId: edit.staffId } : {}}
        sections={[{
          fields: [
            { name: 'staffId', label: 'Person', type: 'select', noEmpty: true, options: personOptions(people), span: 2 },
            { name: 'category', label: 'Category', type: 'select', noEmpty: true, options: DOC_CATALOG.map(([c]) => c) },
            { name: 'docType', label: 'Document type', type: 'select', options: (v) => DOC_CATALOG.find(([c]) => c === v.category)?.[1] || [] },
            { name: 'expiresOn', label: 'Expires', type: 'date' },
            { name: 'notes', label: 'Notes', type: 'textarea' },
          ],
        }]}
        onClose={() => setEdit(null)}
        onSubmit={async (v) => {
          await ops.updateFile(edit.id, { ...v, expiresOn: v.expiresOn || null, clearExpiry: !v.expiresOn })
          setEdit(null)
          showToast('Saved')
          load()
        }}
      />
      <ConfirmModal
        open={Boolean(confirm)}
        title="Delete document?"
        message={`Delete ${confirm?.docType || confirm?.name} for ${confirm?.person}? This cannot be undone.`}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          try { await ops.deleteFile(confirm.id); showToast('Deleted'); load() } catch (e) { showToast(e.message, 'error') }
          setConfirm(null)
        }}
      />
      {viewer.node}
      {toast}
    </div>
  )
}
