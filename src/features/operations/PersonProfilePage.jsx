import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Avatar, Button, Card, ConfirmModal, DataTable, DetailGrid, FormModal, Loading, PageHeader, Pill, fmtDate, useToast,
} from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { ops } from './opsApi'
import {
  CREDENTIAL_TYPES, DOC_CATALOG, DueCell, EXPIRING_DOCS, HistoryList, LinkButton, UploadModal, categoryOf, dueState, fmtSize,
  personName, requiredDocs, useFileViewer,
} from './opsShared'
import { staffFromRow, staffSections, toStaffPayload } from './staffFormConfig'
import { ENROLL_TONE, EnrollmentModal } from './InsuranceCredentialingPage'
import { PRIV_TONE, PrivilegeModal } from './HospitalPrivilegesPage'
import { TrackerRowModal, TrackerTable } from './TrackersPage'

const STATUS_LABEL = { ACTIVE: 'Active', ONBOARDING: 'Onboarding', SUSPENDED: 'Suspended', INACTIVE: 'Inactive' }
const ITEM_TONE = { EXPIRED: 'red', ACTION: 'red', MISSING: 'amber', DUE: 'amber' }
const ITEM_LABEL = { EXPIRED: 'Expired', ACTION: 'Action needed', MISSING: 'Missing', DUE: 'Due soon' }
const COMP_TONE = { 'Fully compliant': 'green', 'Renewal coming up': 'amber', 'Action needed': 'red' }

/* Folder order and the tracker groups that belong to each folder (prototype: Licenses, NPI & IDs,
   Education, Payers, Hospital affiliations, Risk & quality, Employment, Records). */
const TRACKER_FOLDER = { Education: 'Education', 'Risk & quality': 'Risk & quality', Compliance: 'Risk & quality', Employment: 'Employment', 'HR & contracts': 'Employment', Onboarding: 'Onboarding & reviews', Reviews: 'Onboarding & reviews' }

/* Files kept with a section: what the upload is filed as in the document vault. */
const SECTION_DOCS = {
  lic: ['Licenses and certifications', 'License copy'],
  dea: ['Licenses and certifications', 'DEA certificate'],
  board: ['Licenses and certifications', 'Board certificate'],
  creds: ['Licenses and certifications', 'Specialty or registry certificate'],
  caqh: ['Credentialing file', 'CAQH attestation'],
  npi: ['Credentialing file', 'Other document'],
  hp: ['Hospital privileges', 'Hospital privileges letter'],
  payers: ['Payer enrollment', 'Payer approval / welcome letter'],
}

const mask = (v) => (v ? `${String(v).slice(0, 2)}•••••${String(v).slice(-2)}` : '')

/** Full profile for one provider (mode="provider") or staff member (mode="staff"), laid out as a folder tree of sections. */
export default function PersonProfilePage({ mode = 'provider' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isProvider = mode === 'provider'
  const base = isProvider ? '/app/providers' : '/app/staff'
  const [person, setPerson] = useState(null)
  const [section, setSection] = useState('overview')
  const [closed, setClosed] = useState({})
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState({ compliance: null, enrollments: [], payers: [], privileges: [], facilities: [], trackers: [], rows: [], files: [], options: null })
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [cred, setCred] = useState(null)
  const [enroll, setEnroll] = useState(null)
  const [priv, setPriv] = useState(null)
  const [rowEdit, setRowEdit] = useState(null)
  const [upload, setUpload] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [toast, showToast] = useToast()
  const viewer = useFileViewer()

  async function load() {
    setLoading(true)
    try {
      const list = isProvider ? await ops.providers() : await ops.staff()
      const m = list.find((x) => x.id === id)
      if (!m) throw new Error(`${isProvider ? 'Provider' : 'Staff member'} not found.`)
      setPerson(m)
      const scope = isProvider ? 'PROVIDER' : 'STAFF'
      const [trackers, rows, files, extra] = await Promise.all([
        ops.trackers(scope).catch(() => []),
        ops.trackerRows({ staffId: id }).catch(() => []),
        ops.files('VAULT', { staffId: id }).catch(() => []),
        isProvider
          ? Promise.all([ops.compliance(), ops.enrollments.list({ staffId: id }), ops.payers.list(), ops.privileges.list(), ops.facilities.list(), ops.credOptions()])
          : Promise.resolve(null),
      ])
      const next = { trackers, rows, files, compliance: null, enrollments: [], payers: [], privileges: [], facilities: [], options: null }
      if (extra) {
        const [comp, en, py, pr, fa, opt] = extra
        Object.assign(next, { compliance: comp.find((c) => c.staffId === id) || null, enrollments: en, payers: py, privileges: pr.filter((p) => p.staffId === id), facilities: fa, options: opt })
      }
      setData(next)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveRecord(values) {
    const body = toStaffPayload(values, { forceProvider: isProvider })
    const saved = isProvider ? await ops.updateProvider(id, body) : await ops.updateStaff(id, body)
    setPerson(saved)
    return saved
  }

  async function saveCredentials(list) {
    // Keep every stored field exactly as it is (staffFromRow would fill empty ones with form defaults)
    const values = staffFromRow(person)
    Object.keys(values).forEach((k) => { if (k in person) values[k] = person[k] ?? '' })
    values.credentials = list
    await saveRecord(values)
  }

  const payerById = useMemo(() => Object.fromEntries(data.payers.map((p) => [p.id, p])), [data.payers])
  const facById = useMemo(() => Object.fromEntries(data.facilities.map((f) => [f.id, f])), [data.facilities])

  if (loading && !person) return <Loading />
  if (!person) return <div><PageHeader title="Profile" /><Alert>{error}</Alert><Link to={base} className="text-sm font-semibold text-brand-700">Back to the list</Link></div>

  const name = personName(person)
  const comp = data.compliance
  const req = requiredDocs(person)
  const haveTypes = new Set(data.files.map((f) => f.docType))
  const missingDocs = req.filter((t) => !haveTypes.has(t))
  const visibleTrackers = data.trackers.filter((t) => !t.hidden)
  const otherCreds = (person.credentials || []).map((c, i) => ({ ...c, id: c.id || `c${i}`, index: i }))
  const trackerByName = Object.fromEntries(visibleTrackers.map((t) => [t.name, t]))

  /* Which section an open compliance item belongs to (used for counts and the "Open" links). */
  function sectionOfItem(i) {
    if (i.kind === 'License') return 'lic'
    if (i.kind === 'DEA') return 'dea'
    if (i.kind === 'NPI') return 'npi'
    if (i.kind === 'CAQH') return 'caqh'
    if (i.kind === 'Board') return 'board'
    if (i.kind === 'Credential') return 'creds'
    if (i.kind === 'Privileges') return 'hp'
    if (i.kind === 'Payer') {
      // Longest name first, so "Medicaid MCO: …" is not filed under "Medicaid"
      const p = [...data.payers].sort((a, b) => b.shortName.length - a.shortName.length)
        .find((x) => i.label.startsWith(`${x.shortName} `) || i.label.startsWith(`${x.shortName}:`))
      return p && data.enrollments.some((e) => e.payerId === p.id) ? `p:${p.id}` : 'payers'
    }
    if (i.kind === 'Malpractice') { const t = visibleTrackers.find((x) => x.code === 'mal'); return t ? `t:${t.id}` : 'overview' }
    if (i.kind === 'CME') { const t = visibleTrackers.find((x) => x.code === 'cme'); return t ? `t:${t.id}` : 'overview' }
    if (i.kind === 'Onboarding') { const t = visibleTrackers.find((x) => x.code === 'onb'); return t ? `t:${t.id}` : 'overview' }
    const t = trackerByName[i.kind]
    return t ? `t:${t.id}` : 'overview'
  }
  const counts = {}
  ;(comp?.openItems || []).forEach((i) => { const k = sectionOfItem(i); counts[k] = (counts[k] || 0) + 1 })
  if (!isProvider) {
    data.rows.forEach((r) => {
      const t = data.trackers.find((x) => x.id === r.tabId)
      t?.fields.filter((f) => f.type === 'expiry').forEach((f) => { const st = dueState(r.vals?.[f.id]); if (st && st.n <= 90) counts[`t:${t.id}`] = (counts[`t:${t.id}`] || 0) + 1 })
    })
    if (missingDocs.length) counts.docs = missingDocs.length
  }

  /* ── Folder tree ─────────────────────────────────────────────────── */
  const folders = []
  const addFolder = (name, items) => { if (items.length) folders.push({ name, items }) }
  addFolder(isProvider ? 'Licenses' : 'Licenses & certifications', [
    ...(isProvider || person.licenseNumber ? [{ key: 'lic', label: 'State license' }] : []),
    ...(isProvider || person.deaNumber ? [{ key: 'dea', label: 'DEA' }] : []),
    ...(isProvider ? [{ key: 'board', label: 'Board certification' }] : []),
    { key: 'creds', label: isProvider ? 'Other licenses & certifications' : 'Certifications' },
  ])
  if (isProvider) addFolder('NPI & IDs', [{ key: 'npi', label: 'Individual NPI' }, { key: 'caqh', label: 'CAQH ProView' }])
  const trackerFolders = {}
  visibleTrackers.forEach((t) => {
    const f = TRACKER_FOLDER[t.groupName] || t.groupName || 'Custom'
    ;(trackerFolders[f] = trackerFolders[f] || []).push({ key: `t:${t.id}`, label: t.name })
  })
  if (trackerFolders.Education) addFolder('Education', trackerFolders.Education)
  if (isProvider) {
    const enrolledPayers = data.payers.filter((p) => data.enrollments.some((e) => e.payerId === p.id))
    addFolder('Payers', [...enrolledPayers.map((p) => ({ key: `p:${p.id}`, label: p.shortName })), { key: 'payers', label: 'All payers' }])
    addFolder('Hospital affiliations', [{ key: 'hp', label: 'Hospital privileges' }])
  }
  Object.entries(trackerFolders).filter(([f]) => f !== 'Education').forEach(([f, items]) => addFolder(f, items))
  addFolder('Records', [{ key: 'docs', label: 'Documents' }, { key: 'notes', label: 'Notes & activity' }])
  const allItems = folders.flatMap((f) => f.items.map((i) => ({ ...i, folder: f.name })))
  const current = allItems.find((i) => i.key === section)

  /* ── Dates and activity ──────────────────────────────────────────── */
  const upcoming = []
  const pushDate = (date, label, key) => { const st = dueState(date); if (st && st.n >= -365) upcoming.push({ date, label, st, key }) }
  pushDate(person.licenseExpiresOn, 'State license', 'lic')
  pushDate(person.deaExpiresOn, 'DEA registration', 'dea')
  pushDate(person.boardExpiresOn, person.boardName || 'Board certification', 'board')
  otherCreds.forEach((c) => pushDate(c.expiresOn, c.label || c.type, 'creds'))
  data.enrollments.forEach((e) => e.recredDue && pushDate(e.recredDue, `${payerById[e.payerId]?.shortName || 'Payer'} re-credentialing`, `p:${e.payerId}`))
  data.privileges.forEach((p) => p.reappointDue && pushDate(p.reappointDue, `${facById[p.facilityId]?.name || 'Facility'} reappointment`, 'hp'))
  data.rows.forEach((r) => {
    const t = data.trackers.find((x) => x.id === r.tabId)
    t?.fields.filter((f) => f.type === 'expiry').forEach((f) => r.vals?.[f.id] && pushDate(r.vals[f.id], `${t.name} · ${f.label}`, `t:${t.id}`))
  })
  data.files.forEach((f) => f.expiresOn && pushDate(f.expiresOn, f.docType || f.name, 'docs'))
  upcoming.sort((a, b) => a.date.localeCompare(b.date))
  const future = upcoming.filter((u) => u.st.n >= 0)

  const activity = [
    ...data.enrollments.flatMap((e) => (e.history || []).map((h) => ({ ...h, what: payerById[e.payerId]?.shortName || 'Payer', key: `p:${e.payerId}` }))),
    ...data.privileges.flatMap((p) => (p.history || []).map((h) => ({ ...h, what: facById[p.facilityId]?.name || 'Facility', key: 'hp' }))),
    ...data.files.map((f) => ({ date: f.createdAt, what: 'Document', status: `${f.docType || f.name} added`, by: f.uploadedBy, key: 'docs' })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)))

  const nextItem = comp?.openItems?.[0] || (missingDocs.length ? { label: `${missingDocs[0]} not on file`, state: 'MISSING' } : null)
  const go = (key) => { setSection(key); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  /* ── Section building blocks ─────────────────────────────────────── */
  function SectionFiles({ k }) {
    const [cat, type] = SECTION_DOCS[k] || ['Other', 'Other document']
    const files = data.files.filter((f) => f.linkRef === `sec:${k}` || (SECTION_DOCS[k] && f.docType === type))
    return (
      <Card title="Files in this section" subtitle={`${files.length} file${files.length === 1 ? '' : 's'}`} actions={<Button size="sm" variant="secondary" onClick={() => setUpload({ category: cat, docType: type, linkRef: `sec:${k}` })}><Icon name="upload" className="h-3.5 w-3.5" /> Upload file</Button>} bodyClassName="p-0">
        <DataTable
          columns={[
            { key: 'name', label: 'File', render: (f) => <button type="button" className="text-left font-semibold text-ink-950 hover:text-brand-700" onClick={() => viewer.open(f)}>{f.name}</button> },
            { key: 'docType', label: 'Document' },
            { key: 'expiresOn', label: 'Expires', render: (f) => <DueCell date={f.expiresOn} /> },
            { key: 'size', label: 'Size', render: (f) => fmtSize(f.sizeBytes) },
            { key: 'createdAt', label: 'Added', render: (f) => fmtDate(f.createdAt) },
            { key: 'actions', label: '', sortable: false, render: (f) => <span className="flex justify-end gap-1"><a className="rounded-md px-2 py-1 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50" href={ops.fileUrl(f.id, true)}>Download</a><LinkButton tone="danger" onClick={() => setConfirm({ file: f })}>Delete</LinkButton></span> },
          ]}
          rows={files}
          empty="No files in this section yet."
        />
      </Card>
    )
  }

  function RecordTable({ rows, numberLabel = 'Number', note }) {
    return (
      <Card bodyClassName="p-0">
        <DataTable
          columns={[
            { key: 'label', label: 'Record', render: (r) => <b className="font-semibold">{r.label}</b> },
            { key: 'number', label: numberLabel, render: (r) => r.number || <span className="text-mist-500">Not on file</span> },
            { key: 'status', label: 'Status', sortable: false, render: (r) => (r.noExp ? (r.number ? <Pill tone="green">On file</Pill> : <Pill tone="amber">Missing</Pill>) : r.number || r.expiresOn ? (dueState(r.expiresOn) ? <Pill tone={dueState(r.expiresOn).tone}>{dueState(r.expiresOn).label}</Pill> : <Pill tone="gray">No expiration set</Pill>) : <Pill tone="amber">Missing</Pill>) },
            { key: 'issuedOn', label: 'Issued', render: (r) => fmtDate(r.issuedOn) },
            { key: 'expiresOn', label: 'Expires', render: (r) => (r.noExp ? 'No expiration' : fmtDate(r.expiresOn)) },
            { key: 'actions', label: '', sortable: false, render: (r) => <span className="flex justify-end gap-1">{r.index != null ? <><LinkButton onClick={() => setCred(r)}>Renew / update</LinkButton><LinkButton tone="danger" onClick={() => setConfirm({ cred: r })}>Delete</LinkButton></> : <LinkButton onClick={() => setEditOpen(true)}>Renew / update</LinkButton>}</span> },
          ]}
          rows={rows}
          empty="Nothing on file yet."
        />
        {note && <p className="m-0 border-t border-mist-200 px-4 py-2.5 text-[12.5px] text-mist-600">{note}</p>}
      </Card>
    )
  }

  function renderSection() {
    if (section === 'overview') {
      const total = comp ? comp.checks : req.length
      const rowsComplete = [
        ...(comp ? [
          ['Core credentials current', comp.checksOk, comp.checks],
          ['Payers approved', comp.payersApproved, comp.payersTotal],
          ['Privileges granted', comp.privilegesGranted, comp.privilegesTotal],
          ...(comp.cmeNeeded > 0 ? [['CME credits', comp.cmeCredits, comp.cmeNeeded]] : []),
        ] : []),
        ['Required documents', req.length - missingDocs.length, req.length],
      ]
      const attention = comp ? comp.openItems : missingDocs.map((d) => ({ label: d, kind: 'Document', state: 'MISSING', __key: 'docs' }))
      return (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <Card title="Needs attention" subtitle={attention.length ? `${attention.length} open item${attention.length === 1 ? '' : 's'}` : 'Nothing open'} bodyClassName="p-0">
              {attention.length ? (
                <ul className="m-0 list-none divide-y divide-mist-100 p-0">
                  {attention.map((i, k) => (
                    <li key={k} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-[104px] shrink-0"><Pill tone={ITEM_TONE[i.state]}>{i.days != null && i.state !== 'MISSING' ? (i.days < 0 ? `${Math.abs(i.days)}d overdue` : `${i.days} days`) : ITEM_LABEL[i.state]}</Pill></span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-[13.5px] font-semibold text-ink-950">{i.label}</b>
                        <span className="text-[12.5px] text-mist-600">{i.kind}{i.dueOn ? ` · ${i.state === 'ACTION' ? 'Follow up' : i.state === 'EXPIRED' ? 'Expired' : 'Due'} ${fmtDate(i.dueOn)}` : ''}</span>
                      </span>
                      <LinkButton onClick={() => go(i.__key || sectionOfItem(i))}>Open</LinkButton>
                    </li>
                  ))}
                </ul>
              ) : <p className="m-0 px-5 py-4 text-sm text-mist-600">Everything tracked is current.</p>}
            </Card>
            <Card title="File completeness" subtitle={total ? null : undefined}>
              <ul className="m-0 list-none space-y-3.5 p-0">
                {rowsComplete.map(([label, a, b]) => {
                  const pct = b ? Math.min(100, Math.round((a / b) * 100)) : 0
                  return (
                    <li key={label}>
                      <div className="mb-1 flex justify-between text-[13px]"><span className="text-mist-700">{label}</span><b className="font-mono text-[12.5px] font-semibold">{a} of {b}</b></div>
                      <span className="block h-1.5 overflow-hidden rounded-sm bg-mist-100"><i className={`block h-full rounded-sm ${pct >= 90 ? 'bg-brand-600' : pct >= 60 ? 'bg-sun-400' : 'bg-danger-500'}`} style={{ width: `${pct}%` }} /></span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>
          <Card title="Upcoming dates" subtitle={future.length ? `Next ${Math.min(future.length, 8)} of ${future.length}` : null}>
            {future.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {future.slice(0, 8).map((u, k) => (
                  <button key={k} type="button" onClick={() => go(u.key)} className="rounded-[10px] border border-mist-200 bg-white p-3 text-left transition-colors hover:border-brand-300">
                    <span className="block text-[12px] font-medium text-mist-600">{fmtDate(u.date)}</span>
                    <b className="mt-0.5 block text-[13.5px] font-semibold text-ink-950">{u.label}</b>
                    <span className="mt-1.5 inline-block"><Pill tone={u.st.tone}>{u.st.n} days</Pill></span>
                  </button>
                ))}
              </div>
            ) : <p className="m-0 text-sm text-mist-600">No upcoming dates on file.</p>}
          </Card>
          <Card title="Recent activity">
            {activity.length ? (
              <ul className="m-0 list-none space-y-2.5 p-0">
                {activity.slice(0, 8).map((a, k) => (
                  <li key={k} className="flex gap-3 text-[13px]">
                    <span className="w-24 shrink-0 text-mist-500">{fmtDate(a.date)}</span>
                    <span><b className="font-semibold">{a.what}:</b> {a.status}{a.by ? <span className="text-mist-500"> · {a.by}</span> : null}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="m-0 text-sm text-mist-600">No activity yet.</p>}
          </Card>
        </div>
      )
    }
    if (section === 'lic') {
      return (
        <div className="space-y-4">
          <RecordTable rows={[{ label: person.licenseType || 'State license', number: person.licenseNumber, expiresOn: person.licenseExpiresOn }, ...otherCreds.filter((c) => c.group === 'State license')]} numberLabel="License number" note="Use Renew / update for each renewal. Upload each license copy below." />
          <SectionFiles k="lic" />
        </div>
      )
    }
    if (section === 'dea') {
      return (
        <div className="space-y-4">
          <RecordTable rows={[{ label: 'DEA registration', number: reveal ? person.deaNumber : mask(person.deaNumber), expiresOn: person.deaExpiresOn }, ...otherCreds.filter((c) => c.group === 'Controlled substances')]} numberLabel="DEA number" note={reveal ? null : 'The DEA number is masked. Use “Reveal DEA” above to show it.'} />
          <SectionFiles k="dea" />
        </div>
      )
    }
    if (section === 'board') {
      return (
        <div className="space-y-4">
          <RecordTable rows={[{ label: person.boardName || 'Board certification', number: person.boardStatus, expiresOn: person.boardExpiresOn }, ...otherCreds.filter((c) => c.group === 'Board and national certification')]} numberLabel="Status / number" />
          <SectionFiles k="board" />
        </div>
      )
    }
    if (section === 'creds') {
      return (
        <div className="space-y-4">
          <div className="flex justify-end"><Button size="sm" onClick={() => setCred({})}><Icon name="plus" className="h-3.5 w-3.5" /> Add credential</Button></div>
          <RecordTable rows={[...(!isProvider && person.licenseNumber ? [{ label: person.licenseType || 'License', number: person.licenseNumber, expiresOn: person.licenseExpiresOn }] : []), ...otherCreds]} />
          <SectionFiles k="creds" />
        </div>
      )
    }
    if (section === 'npi') {
      return (
        <div className="space-y-4">
          <RecordTable rows={[{ label: 'Individual NPI', number: person.npi, noExp: true }, { label: 'Taxonomy code', number: person.taxonomyCode, noExp: true }]} />
          <SectionFiles k="npi" />
        </div>
      )
    }
    if (section === 'caqh') {
      return (
        <div className="space-y-4">
          <RecordTable rows={[{ label: 'CAQH ProView', number: person.caqhId, noExp: true }, ...otherCreds.filter((c) => c.type === 'CAQH ProView')]} numberLabel="CAQH ID" note="Re-attest in CAQH every 120 days and upload the attestation below." />
          <SectionFiles k="caqh" />
        </div>
      )
    }
    if (section === 'payers') {
      return (
        <div className="space-y-4">
          <div className="flex justify-end"><Button size="sm" onClick={() => setEnroll({})}><Icon name="plus" className="h-3.5 w-3.5" /> Start enrollment</Button></div>
          <Card bodyClassName="p-0">
            <DataTable
              columns={[
                { key: 'payer', label: 'Payer', render: (e) => <button type="button" className="text-left font-semibold text-ink-950 hover:text-brand-700" onClick={() => go(`p:${e.payerId}`)}>{payerById[e.payerId]?.name}</button> },
                { key: 'status', label: 'Status', render: (e) => <Pill tone={ENROLL_TONE[e.status]} dot>{e.status}</Pill> },
                { key: 'submittedOn', label: 'Submitted', render: (e) => fmtDate(e.submittedOn) },
                { key: 'effectiveOn', label: 'Effective', render: (e) => fmtDate(e.effectiveOn) },
                { key: 'recredDue', label: 'Re-credentialing', render: (e) => <DueCell date={e.recredDue} /> },
                { key: 'actions', label: '', sortable: false, render: (e) => <span className="flex justify-end"><LinkButton onClick={() => setEnroll(e)}>Update</LinkButton></span> },
              ]}
              rows={data.enrollments}
              empty="No payer enrollments yet. Start one, or pick “All payers” to open a record with every payer."
            />
          </Card>
          <SectionFiles k="payers" />
        </div>
      )
    }
    if (section.startsWith('p:')) {
      const e = data.enrollments.find((x) => x.payerId === section.slice(2))
      const p = payerById[section.slice(2)]
      if (!e) return null
      return (
        <div className="space-y-4">
          <Card title={p?.name} subtitle={[p?.payerType, p?.method].filter(Boolean).join(' · ')} actions={<><Pill tone={ENROLL_TONE[e.status]} dot>{e.status}</Pill><Button size="sm" onClick={() => setEnroll(e)}>Update status</Button></>}>
            <DetailGrid items={[
              ['Enrollment type', e.enrollmentType], ['Products', e.products], ['Submitted', fmtDate(e.submittedOn)], ['Reference #', e.reference],
              ['Follow-up', fmtDate(e.followUpOn)], ['Assigned to', e.ownerName], ['Effective', fmtDate(e.effectiveOn)], ['Provider ID / PIN', e.providerPin],
              ['Re-credentialing due', e.recredDue ? <DueCell date={e.recredDue} /> : '—'], ['Group', e.groupInfo], ['Notes', e.notes],
            ]} />
          </Card>
          <Card title="History"><HistoryList items={e.history} /></Card>
          <SectionFiles k={section} />
        </div>
      )
    }
    if (section === 'hp') {
      return (
        <div className="space-y-4">
          <div className="flex justify-end"><Button size="sm" onClick={() => setPriv({})}><Icon name="plus" className="h-3.5 w-3.5" /> Request privileges</Button></div>
          <Card bodyClassName="p-0">
            <DataTable
              columns={[
                { key: 'facility', label: 'Facility', render: (p) => <b className="font-semibold">{facById[p.facilityId]?.name}</b> },
                { key: 'category', label: 'Category' },
                { key: 'status', label: 'Status', render: (p) => <Pill tone={PRIV_TONE[p.status]} dot>{p.status}</Pill> },
                { key: 'approvedOn', label: 'Approved', render: (p) => fmtDate(p.approvedOn) },
                { key: 'reappointDue', label: 'Reappointment', render: (p) => <DueCell date={p.reappointDue} window={120} /> },
                { key: 'fppeStatus', label: 'FPPE' },
                { key: 'actions', label: '', sortable: false, render: (p) => <span className="flex justify-end"><LinkButton onClick={() => setPriv(p)}>Update</LinkButton></span> },
              ]}
              rows={data.privileges}
              empty="No hospital privileges yet."
            />
          </Card>
          <SectionFiles k="hp" />
        </div>
      )
    }
    if (section.startsWith('t:')) {
      const t = data.trackers.find((x) => `t:${x.id}` === section)
      if (!t) return null
      const mine = data.rows.filter((r) => r.tabId === t.id)
      const goal = t.goal?.need ? t.goal : null
      const credits = goal ? mine.reduce((s, r) => s + Number(r.vals?.[goal.field || 'credits'] || 0), 0) : 0
      return (
        <div className="space-y-4">
          {goal && (
            <Card>
              <div className="mb-1.5 flex justify-between text-[13px]"><span className="text-mist-700">{goal.label || 'Credits this cycle'}</span><b className="font-mono font-semibold">{credits} of {goal.need}</b></div>
              <span className="block h-2 overflow-hidden rounded-sm bg-mist-100"><i className={`block h-full rounded-sm ${credits >= goal.need ? 'bg-brand-600' : 'bg-sun-400'}`} style={{ width: `${Math.min(100, (credits / goal.need) * 100)}%` }} /></span>
            </Card>
          )}
          <div className="flex justify-end"><Button size="sm" onClick={() => setRowEdit({ tab: t, row: {} })}><Icon name="plus" className="h-3.5 w-3.5" /> Add</Button></div>
          <Card bodyClassName="p-0">
            <TrackerTable tab={t} rows={mine} people={[person]} files={data.files} showPerson={false} onEdit={(r) => setRowEdit({ tab: t, row: r })} onDelete={(r) => setConfirm({ row: r })} />
          </Card>
          <SectionFiles k={section} />
        </div>
      )
    }
    if (section === 'docs') {
      return (
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Card title="Documents on file" subtitle={`${data.files.length} document${data.files.length === 1 ? '' : 's'}`} actions={<Button size="sm" onClick={() => setUpload({ category: 'Credentialing file', docType: '' })}><Icon name="upload" className="h-3.5 w-3.5" /> Upload</Button>} bodyClassName="p-0">
            <DataTable
              columns={[
                { key: 'docType', label: 'Document', render: (f) => <button type="button" className="text-left font-semibold text-ink-950 hover:text-brand-700" onClick={() => viewer.open(f)}>{f.docType || f.name}</button> },
                { key: 'category', label: 'Category' },
                { key: 'expiresOn', label: 'Expires', render: (f) => <DueCell date={f.expiresOn} /> },
                { key: 'createdAt', label: 'Added', render: (f) => fmtDate(f.createdAt) },
                { key: 'actions', label: '', sortable: false, render: (f) => <span className="flex justify-end gap-1"><a className="rounded-md px-2 py-1 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50" href={ops.fileUrl(f.id, true)}>Download</a><LinkButton tone="danger" onClick={() => setConfirm({ file: f })}>Delete</LinkButton></span> },
              ]}
              rows={data.files}
              empty="No documents yet."
            />
          </Card>
          <Card title="Required documents" subtitle={`${req.length - missingDocs.length} of ${req.length} on file`}>
            <ul className="m-0 list-none space-y-2 p-0">
              {req.map((d) => (
                <li key={d} className="flex items-center justify-between gap-2 text-[13px]">
                  <span>{d}</span>
                  {haveTypes.has(d) ? <Pill tone="green">On file</Pill> : <LinkButton onClick={() => setUpload({ category: categoryOf(d), docType: d })}>Upload</LinkButton>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )
    }
    if (section === 'notes') {
      return (
        <div className="space-y-4">
          <Card title="Notes" actions={<Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>Edit notes</Button>}>
            {person.notes ? <p className="m-0 whitespace-pre-wrap text-[13.5px] text-ink-950">{person.notes}</p> : <p className="m-0 text-sm text-mist-600">No notes yet. Add them from Edit details.</p>}
          </Card>
          <Card title="Activity">
            {activity.length ? <HistoryList items={[...activity].reverse().map((a) => ({ date: a.date, status: `${a.what}: ${a.status}`, note: a.note, by: a.by }))} /> : <p className="m-0 text-sm text-mist-600">No activity yet.</p>}
          </Card>
        </div>
      )
    }
    return null
  }

  return (
    <div>
      <p className="mb-2 text-[13px]"><Link to={base} className="font-semibold text-brand-700 hover:underline">{isProvider ? 'Providers' : 'Staff'}</Link> <span className="text-mist-400">›</span> <span className="text-mist-600">{name}</span></p>

      {/* Header card */}
      <section className="mb-4 rounded-[12px] border border-mist-200 bg-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-ink-950">{name}</h1>
              {comp ? <Pill tone={COMP_TONE[comp.status]} dot>{comp.status}</Pill> : <Pill tone={missingDocs.length ? 'amber' : 'green'} dot>{missingDocs.length ? 'Documents missing' : 'File complete'}</Pill>}
            </div>
            <p className="m-0 mt-1 text-[13.5px] text-mist-700">{[person.designation || person.jobTitle, person.department].filter(Boolean).join(' · ')}</p>
            <p className="m-0 text-[13px] text-mist-600">{[person.location, STATUS_LABEL[person.status]].filter(Boolean).join(' · ')}</p>
            {person.npi && <p className="m-0 mt-0.5 font-mono text-[12px] text-mist-500">NPI {person.npi}</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-8 border-t border-mist-100 pt-4">
          {comp && (
            <div>
              <p className="m-0 text-[12px] font-medium text-mist-600">Readiness</p>
              <p className="m-0 font-mono text-[24px] font-semibold leading-tight text-ink-950">{comp.readiness}%</p>
            </div>
          )}
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-medium text-mist-600">Next due</p>
            {nextItem ? (
              <>
                <button type="button" onClick={() => go(nextItem.__key || (comp ? sectionOfItem(nextItem) : 'docs'))} className={`m-0 text-left text-[13.5px] font-semibold hover:underline ${ITEM_TONE[nextItem.state] === 'red' ? 'text-danger-700' : 'text-sun-700'}`}>{nextItem.label}</button>
                {nextItem.dueOn && <p className="m-0 text-[12.5px] text-mist-600">{nextItem.state === 'ACTION' ? 'Follow up' : 'Due'} {fmtDate(nextItem.dueOn)}</p>}
              </>
            ) : <p className="m-0 text-[13.5px] font-semibold text-success-600">Nothing due</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-mist-100 pt-4">
          <Button onClick={() => setEditOpen(true)}><Icon name="edit" className="h-4 w-4" /> Edit details</Button>
          <Button variant="secondary" onClick={() => go('docs')}>Documents ({data.files.length})</Button>
          {(person.deaNumber || isProvider) && <Button variant="secondary" onClick={() => setReveal((r) => !r)}>{reveal ? 'Hide DEA' : 'Reveal DEA'}</Button>}
          <Button variant="secondary" onClick={() => navigate(isProvider ? '/app/providers/compliance' : base)}>Back to all {isProvider ? 'providers' : 'staff'}</Button>
        </div>
      </section>
      <Alert>{error}</Alert>
      <Alert tone="error">{viewer.error}</Alert>

      <div className="grid items-start gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
        {/* Folder tree */}
        <nav aria-label="Profile sections" className="rounded-[12px] border border-mist-200 bg-white p-2 lg:sticky lg:top-4">
          <button type="button" onClick={() => go('overview')} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13.5px] ${section === 'overview' ? 'bg-brand-50 font-semibold text-brand-800' : 'font-medium text-ink-950 hover:bg-mist-25'}`}>
            <Icon name="home" className="h-4 w-4" /> Overview
          </button>
          <p className="m-0 px-3 pb-1 pt-3 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-mist-500">Folders</p>
          {folders.map((f) => {
            const open = !closed[f.name] || f.items.some((i) => i.key === section)
            const n = f.items.reduce((s, i) => s + (counts[i.key] || 0), 0)
            return (
              <div key={f.name}>
                <button type="button" aria-expanded={open} onClick={() => setClosed((c) => ({ ...c, [f.name]: open }))} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold text-ink-950 hover:bg-mist-25">
                  <Icon name={open ? 'chevronDown' : 'chevronRight'} className="h-3 w-3 text-mist-400" />
                  <span className="flex-1">{f.name}</span>
                  {n > 0 && !open && <span className="rounded-md bg-danger-100 px-1.5 text-[11px] font-semibold text-danger-700">{n}</span>}
                </button>
                {open && f.items.map((i) => (
                  <button key={i.key} type="button" onClick={() => go(i.key)} className={`flex w-full items-center gap-2 rounded-lg py-1.5 pl-7 pr-2 text-left text-[13px] ${section === i.key ? 'bg-brand-50 font-semibold text-brand-800' : 'text-mist-700 hover:bg-mist-25 hover:text-ink-950'}`}>
                    <Icon name="note" className="h-3.5 w-3.5 shrink-0 text-mist-400" />
                    <span className="min-w-0 flex-1 truncate">{i.label}</span>
                    {counts[i.key] > 0 && <span className="rounded-md bg-danger-100 px-1.5 text-[11px] font-semibold text-danger-700">{counts[i.key]}</span>}
                  </button>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Section content */}
        <div className="min-w-0">
          {section !== 'overview' && current && (
            <div className="mb-3">
              <p className="m-0 text-[12.5px] text-mist-600"><button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => go('overview')}>Overview</button> <span className="text-mist-400">›</span> {current.folder}</p>
              <h2 className="m-0 mt-0.5 text-[18px] font-semibold text-ink-950">{current.label}</h2>
              {section.startsWith('t:') && <p className="m-0 mt-0.5 text-[13px] text-mist-600">{data.trackers.find((x) => `t:${x.id}` === section)?.description}</p>}
            </div>
          )}
          {renderSection()}
        </div>
      </div>

      <FormModal
        open={editOpen}
        size="xl"
        title={`Edit ${name}`}
        initial={staffFromRow(person)}
        sections={staffSections({ providerMode: isProvider }).map((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f, span: f.full ? 2 : f.span })) }))}
        onClose={() => setEditOpen(false)}
        onSubmit={async (v) => { await saveRecord(v); setEditOpen(false); showToast('Profile saved'); load() }}
      />
      <FormModal
        open={Boolean(cred)}
        size="md"
        title={cred?.index != null ? 'Renew / update credential' : 'Add a credential'}
        initial={cred?.index != null ? cred : { group: 'State license', type: '' }}
        sections={[{
          fields: [
            { name: 'group', label: 'Category', type: 'select', noEmpty: true, options: CREDENTIAL_TYPES.map(([g]) => g) },
            { name: 'type', label: 'Credential *', required: true, type: 'select', options: (v) => (CREDENTIAL_TYPES.find(([g]) => g === v.group)?.[1] || []) },
            { name: 'label', label: 'Name shown (optional)', placeholder: 'e.g. Texas RN license' },
            { name: 'number', label: 'License / certificate number' },
            { name: 'state', label: 'State' },
            { name: 'issuer', label: 'Issuing body' },
            { name: 'issuedOn', label: 'Issued', type: 'date' },
            { name: 'expiresOn', label: 'Expires', type: 'date' },
            { name: 'notes', label: 'Notes', type: 'textarea' },
          ],
        }]}
        onClose={() => setCred(null)}
        onSubmit={async (v) => {
          const list = [...(person.credentials || [])]
          const item = { id: v.id || `cr${Date.now()}`, group: v.group, type: v.type, label: v.label || v.type, number: v.number || '', state: v.state || '', issuer: v.issuer || '', issuedOn: v.issuedOn || '', expiresOn: v.expiresOn || '', notes: v.notes || '' }
          if (cred?.index != null) list[cred.index] = item
          else list.push(item)
          await saveCredentials(list)
          setCred(null)
          showToast('Credential saved')
          load()
        }}
      />
      {isProvider && (
        <>
          <EnrollmentModal
            open={Boolean(enroll)}
            record={enroll?.id ? enroll : null}
            fixedStaffId={id}
            providers={[person]}
            payers={data.payers}
            statuses={data.options?.enrollmentStatuses || []}
            onClose={() => setEnroll(null)}
            onSaved={() => { showToast('Enrollment saved'); load() }}
          />
          <PrivilegeModal
            open={Boolean(priv)}
            record={priv?.id ? priv : null}
            fixedStaffId={id}
            providers={[person]}
            facilities={data.facilities}
            statuses={data.options?.privilegeStatuses || []}
            onClose={() => setPriv(null)}
            onSaved={() => { showToast('Privileges saved'); load() }}
          />
        </>
      )}
      <TrackerRowModal
        open={Boolean(rowEdit)}
        tab={rowEdit?.tab}
        row={rowEdit?.row?.id ? rowEdit.row : null}
        people={[person]}
        fixedStaffId={id}
        onClose={() => setRowEdit(null)}
        onSaved={() => { showToast('Saved'); load() }}
      />
      <UploadModal
        open={Boolean(upload)}
        title={`Upload a document for ${name}`}
        initial={upload || {}}
        fields={[
          { name: 'category', label: 'Category *', required: true, type: 'select', noEmpty: true, options: DOC_CATALOG.map(([c]) => c) },
          { name: 'docType', label: 'Document type *', required: true, type: 'select', options: (v) => DOC_CATALOG.find(([c]) => c === v.category)?.[1] || [] },
          { name: 'expiresOn', label: 'Expires', type: 'date', show: (v) => EXPIRING_DOCS.has(v.docType) },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ]}
        onClose={() => setUpload(null)}
        onSubmit={async (file, v) => {
          await ops.uploadFile('VAULT', file, { staffId: id, category: v.category, docType: v.docType, expiresOn: v.expiresOn, notes: v.notes, linkRef: upload?.linkRef })
          showToast('Uploaded')
          load()
        }}
      />
      <ConfirmModal
        open={Boolean(confirm)}
        title="Delete?"
        message={confirm?.file ? `Delete ${confirm.file.name}? This cannot be undone.` : confirm?.cred ? `Remove ${confirm.cred.label || confirm.cred.type}?` : 'Delete this row?'}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            if (confirm.file) await ops.deleteFile(confirm.file.id)
            else if (confirm.row) await ops.deleteRow(confirm.row.id)
            else if (confirm.cred) await saveCredentials((person.credentials || []).filter((_, i) => i !== confirm.cred.index))
            showToast('Deleted')
            load()
          } catch (e) {
            showToast(e.message, 'error')
          }
          setConfirm(null)
        }}
      />
      {viewer.node}
      {toast}
    </div>
  )
}
