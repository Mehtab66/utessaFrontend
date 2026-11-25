import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, ConfirmModal, DataTable, Field, FilterSelect, FormModal, Kpi, Modal, PageHeader, Pill, SearchInput,
  Segmented, Toolbar, fmtDate, useToast,
} from '../crm/ui'
import { ops } from './opsApi'
import { DueCell, HistoryList, LinkButton, personName, personOptions, today } from './opsShared'

export const ENROLL_TONE = {
  'Not started': 'gray',
  'Application submitted': 'blue',
  'In process': 'blue',
  'Additional info requested': 'red',
  Approved: 'green',
  Denied: 'red',
  'Not participating (by choice)': 'gray',
  Terminated: 'gray',
}
const OPEN = ['Application submitted', 'In process', 'Additional info requested']
const SHORT = { Approved: '✓', 'Additional info requested': '!', 'In process': '…', 'Application submitted': '…', Denied: '✕', 'Not started': '—', Terminated: '✕', 'Not participating (by choice)': '–' }

/** Shared editor for one payer enrollment (create or update, with history). */
export function EnrollmentModal({ open, record, providers, payers, statuses, onClose, onSaved, fixedStaffId, presetPayerId }) {
  const isNew = !record?.id
  const [v, setV] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setError('')
    setV(record?.id ? { ...record, note: '' } : {
      staffId: fixedStaffId || '', payerId: presetPayerId || '', allPayers: false, status: 'Application submitted', submittedOn: today(),
      enrollmentType: 'Individual, linked to group', ownerName: '', followUpOn: '', note: '',
    })
  }, [open, record, fixedStaffId, presetPayerId])
  const set = (k, val) => setV((p) => {
    const n = { ...p, [k]: val }
    if (k === 'status' && val === 'Approved' && !n.effectiveOn) n.effectiveOn = today()
    return n
  })
  const payer = payers.find((p) => p.id === v.payerId)

  async function save() {
    if (!v.staffId) return setError('Pick the provider.')
    if (isNew && !v.allPayers && !v.payerId) return setError('Pick a payer or “All payers”.')
    setSaving(true)
    setError('')
    try {
      const body = { ...v }
      ;['submittedOn', 'effectiveOn', 'recredDue', 'followUpOn'].forEach((k) => { if (!body[k]) body[k] = null })
      if (isNew) await ops.enrollments.create(body)
      else await ops.enrollments.update(record.id, body)
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    ...(isNew ? [
      { name: 'staffId', label: 'Provider *', type: 'select', options: personOptions(providers), show: () => !fixedStaffId },
      { name: 'allPayers', label: 'Open a record with every active payer', type: 'checkbox' },
      { name: 'payerId', label: 'Payer *', type: 'select', options: payers.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name })), show: (x) => !x.allPayers },
    ] : []),
    { name: 'status', label: 'Status *', type: 'select', noEmpty: true, options: statuses },
    { name: 'ownerName', label: 'Assigned to', placeholder: 'Who is working this' },
    { name: 'enrollmentType', label: 'Enrollment type', type: 'select', options: ['Individual, linked to group', 'Reassignment to group (CMS-855R)', 'Individual only', 'Group'] },
    { name: 'products', label: 'Products / lines of business', placeholder: payer?.payerType || 'PPO, HMO, EPO' },
    { name: 'method', label: 'How submitted', placeholder: payer?.method || 'Portal, CAQH, paper' },
    { name: 'groupInfo', label: 'Group (name · TIN · group NPI)' },
    { name: 'submittedOn', label: 'Submitted', type: 'date' },
    { name: 'reference', label: 'Application / reference #' },
    { name: 'followUpOn', label: 'Next follow-up', type: 'date' },
    { name: 'providerPin', label: 'Provider ID / PIN', show: (x) => x.status === 'Approved' },
    { name: 'effectiveOn', label: 'Effective date', type: 'date', show: (x) => x.status === 'Approved' },
    { name: 'recredDue', label: 'Re-credentialing due', type: 'date', show: (x) => x.status === 'Approved', hint: 'Left empty, it is set from the payer’s cycle.' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
    { name: 'note', label: isNew ? 'First history note' : 'Add to history', type: 'textarea', rows: 2, placeholder: 'What happened? e.g. “Payer asked for an updated COI.”' },
  ]

  return (
    <Modal
      open={open}
      size="lg"
      title={isNew ? 'Start a payer enrollment' : `${personName(providers.find((p) => p.id === v.staffId))} · ${payer?.name || ''}`}
      subtitle={isNew ? 'Pick the provider and payer, or “All payers” to open a record with every payer at once.' : 'Update the status as the payer responds. Each status change and note is saved to the history.'}
      onClose={onClose}
      footer={
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-warn" role="alert">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create enrollment' : 'Save update'}</Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.filter((f) => !f.show || f.show(v)).map((f) => (
          <Field key={f.name} field={f} value={v[f.name]} values={v} onChange={(val) => set(f.name, val)} />
        ))}
      </div>
      {!isNew && (
        <section className="mt-5">
          <h3 className="m-0 mb-2 text-[12px] font-semibold text-brand-700">History</h3>
          <HistoryList items={record.history} />
        </section>
      )}
    </Modal>
  )
}

export default function InsuranceCredentialingPage() {
  const [view, setView] = useState('matrix')
  const [providers, setProviders] = useState([])
  const [payers, setPayers] = useState([])
  const [rows, setRows] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [fPayer, setFPayer] = useState('ALL')
  const [fStatus, setFStatus] = useState('ALL')
  const [fOwner, setFOwner] = useState('ALL')
  const [editing, setEditing] = useState(null)
  const [payerForm, setPayerForm] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [toast, showToast] = useToast()

  async function load() {
    setLoading(true)
    try {
      const [p, py, en, opt] = await Promise.all([ops.providers(), ops.payers.list(), ops.enrollments.list(), ops.credOptions()])
      setProviders(p.filter((m) => m.status !== 'INACTIVE'))
      setPayers(py)
      setRows(en)
      setStatuses(opt.enrollmentStatuses)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const provById = useMemo(() => Object.fromEntries(providers.map((m) => [m.id, m])), [providers])
  const payerById = useMemo(() => Object.fromEntries(payers.map((p) => [p.id, p])), [payers])
  const owners = useMemo(() => [...new Set(rows.map((r) => r.ownerName).filter(Boolean))].sort(), [rows])
  const now = today()

  const approvedDays = rows.filter((r) => r.status === 'Approved' && r.submittedOn && r.effectiveOn)
    .map((r) => (new Date(r.effectiveOn) - new Date(r.submittedOn)) / 86400000)
  const avg = approvedDays.length ? Math.round(approvedDays.reduce((a, b) => a + b, 0) / approvedDays.length) : null

  const list = rows.filter((r) => {
    const m = provById[r.staffId]
    if (!m) return false
    if (q && !`${personName(m)} ${payerById[r.payerId]?.name || ''} ${r.reference || ''}`.toLowerCase().includes(q.toLowerCase())) return false
    if (fPayer !== 'ALL' && r.payerId !== fPayer) return false
    if (fStatus !== 'ALL' && r.status !== fStatus) return false
    if (fOwner !== 'ALL' && (r.ownerName || '') !== fOwner) return false
    return true
  }).map((r) => ({ ...r, provider: personName(provById[r.staffId]), payer: payerById[r.payerId]?.shortName || '' }))

  const matrixProviders = providers.filter((m) => !q || personName(m).toLowerCase().includes(q.toLowerCase()))
  const activePayers = payers.filter((p) => p.active && (fPayer === 'ALL' || p.id === fPayer))
  const cell = (m, p) => rows.find((r) => r.staffId === m.id && r.payerId === p.id)

  const listColumns = [
    { key: 'provider', label: 'Provider', render: (r) => <b className="font-semibold">{r.provider}</b> },
    { key: 'payer', label: 'Payer' },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={ENROLL_TONE[r.status]} dot>{r.status}</Pill> },
    { key: 'submittedOn', label: 'Submitted', render: (r) => fmtDate(r.submittedOn) },
    { key: 'followUpOn', label: 'Follow-up', render: (r) => (r.followUpOn ? <span className={r.followUpOn < now && OPEN.includes(r.status) ? 'font-semibold text-danger-600' : ''}>{fmtDate(r.followUpOn)}</span> : '—') },
    { key: 'effectiveOn', label: 'Effective', render: (r) => fmtDate(r.effectiveOn) },
    { key: 'recredDue', label: 'Re-credentialing', render: (r) => <DueCell date={r.recredDue} /> },
    { key: 'ownerName', label: 'Assigned to' },
    {
      key: 'actions', label: '', sortable: false,
      render: (r) => (
        <span className="flex justify-end gap-1">
          <LinkButton onClick={() => setEditing(r)}>Open</LinkButton>
          <LinkButton tone="danger" onClick={() => setConfirm(r)}>Delete</LinkButton>
        </span>
      ),
    },
  ]

  const payerColumns = [
    { key: 'name', label: 'Payer', render: (p) => <b className="font-semibold">{p.name}</b> },
    { key: 'shortName', label: 'Short name' },
    { key: 'payerType', label: 'Type' },
    { key: 'method', label: 'How to enroll' },
    { key: 'typicalDays', label: 'Typical days', render: (p) => (p.typicalDays ? `${p.typicalDays} days` : '—') },
    { key: 'recredMonths', label: 'Re-credential every', render: (p) => (p.recredMonths ? `${p.recredMonths} months` : '—') },
    { key: 'enrolled', label: 'Approved providers', render: (p) => rows.filter((r) => r.payerId === p.id && r.status === 'Approved').length },
    { key: 'active', label: 'Active', render: (p) => (p.active ? 'Yes' : 'No') },
    { key: 'actions', label: '', sortable: false, render: (p) => <span className="flex justify-end"><LinkButton onClick={() => setPayerForm(p)}>Edit</LinkButton></span> },
  ]

  return (
    <div>
      <PageHeader
        title="Insurance credentialing"
        subtitle="Payer enrollment for every provider: what was submitted, what the payer asked for, when it was approved and when re-credentialing is due."
        actions={
          <>
            {view === 'payers' && <Button variant="secondary" onClick={() => setPayerForm({})}>Add payer</Button>}
            <Button onClick={() => setEditing({})}>Start enrollment</Button>
          </>
        }
      />
      <Alert>{error}</Alert>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Active enrollments" value={rows.filter((r) => r.status === 'Approved').length} hint={`${providers.length} providers`} />
        <Kpi label="In process" value={rows.filter((r) => OPEN.includes(r.status)).length} hint="Applications open" tone="blue" onClick={() => { setView('list'); setFStatus('In process') }} />
        <Kpi label="Payer asked for info" value={rows.filter((r) => r.status === 'Additional info requested').length} hint="Respond to keep it moving" tone="red" onClick={() => { setView('list'); setFStatus('Additional info requested') }} />
        <Kpi label="Average to approval" value={avg == null ? '—' : `${avg}d`} hint="Submitted to effective" tone="gray" />
        <Kpi label="Re-credentialing ≤ 90d" value={rows.filter((r) => r.recredDue && (new Date(r.recredDue) - new Date(now)) / 86400000 <= 90).length} hint="Start early" tone="amber" />
        <Kpi label="Follow-ups overdue" value={rows.filter((r) => r.followUpOn && r.followUpOn < now && r.status !== 'Approved').length} hint="Call the payer" tone="red" />
      </div>
      <Toolbar right={<Segmented value={view} onChange={setView} options={[{ value: 'matrix', label: 'By provider and payer' }, { value: 'list', label: 'Enrollment list' }, { value: 'payers', label: 'Payers' }]} />}>
        {view !== 'payers' && (
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Search provider, payer or reference…" />
            <FilterSelect label="Payer" value={fPayer} onChange={setFPayer} allLabel="Any payer" options={payers.map((p) => ({ value: p.id, label: p.shortName }))} />
            {view === 'list' && <FilterSelect label="Status" value={fStatus} onChange={setFStatus} allLabel="Any status" options={statuses.map((s) => ({ value: s, label: s }))} />}
            {view === 'list' && owners.length > 0 && <FilterSelect label="Assigned to" value={fOwner} onChange={setFOwner} allLabel="Anyone" options={owners.map((o) => ({ value: o, label: o }))} />}
          </>
        )}
      </Toolbar>

      {view === 'matrix' && (
        <div className="overflow-hidden rounded-[12px] border border-mist-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-mist-25">
                  <th className="sticky left-0 whitespace-nowrap border-b border-mist-200 bg-mist-25 px-3 py-2.5 text-[12px] font-semibold text-mist-600">Provider</th>
                  {activePayers.map((p) => (
                    <th key={p.id} className="whitespace-nowrap border-b border-mist-200 px-2 py-2.5 text-center text-[12px] font-semibold text-mist-600" title={p.name}>{p.shortName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && matrixProviders.length === 0 && (
                  <tr><td colSpan={activePayers.length + 1} className="px-3 py-10 text-center text-sm text-mist-700">No providers yet. Register providers on the Providers page.</td></tr>
                )}
                {matrixProviders.map((m) => (
                  <tr key={m.id} className="hover:bg-mist-25">
                    <td className="sticky left-0 whitespace-nowrap border-b border-mist-100 bg-white px-3 py-2.5 text-[13.5px] font-semibold text-ink-950">{personName(m)}</td>
                    {activePayers.map((p) => {
                      const r = cell(m, p)
                      return (
                        <td key={p.id} className="border-b border-mist-100 px-1.5 py-2 text-center">
                          <button
                            type="button"
                            title={r ? `${p.name}: ${r.status}` : `Start ${p.name} enrollment`}
                            onClick={() => setEditing(r || { __new: true, staffId: m.id, payerId: p.id })}
                            className="inline-flex min-w-9 justify-center"
                          >
                            {r ? <Pill tone={ENROLL_TONE[r.status]}>{SHORT[r.status] || '·'}</Pill> : <span className="rounded-md px-2 py-1 text-[12px] font-semibold text-mist-300 hover:bg-brand-50 hover:text-brand-700">+</span>}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="m-0 border-t border-mist-200 px-3 py-2 text-[12px] text-mist-600">✓ approved · … in process · ! payer asked for information · ✕ denied or terminated · + start an enrollment</p>
        </div>
      )}
      {view === 'list' && <DataTable columns={listColumns} rows={list} loading={loading} empty="No enrollments match. Start one with “Start enrollment”." />}
      {view === 'payers' && <DataTable columns={payerColumns} rows={payers} loading={loading} empty="No payers yet." />}

      <EnrollmentModal
        open={Boolean(editing)}
        record={editing?.__new ? null : editing}
        fixedStaffId={editing?.__new ? editing.staffId : undefined}
        presetPayerId={editing?.__new ? editing.payerId : undefined}
        providers={providers}
        payers={editing?.__new ? payers.filter((p) => p.id === editing.payerId) : payers}
        statuses={statuses}
        onClose={() => setEditing(null)}
        onSaved={() => { showToast('Enrollment saved'); load() }}
      />
      <FormModal
        open={Boolean(payerForm)}
        title={payerForm?.id ? 'Edit payer' : 'Add a payer'}
        size="md"
        initial={payerForm?.id ? payerForm : { active: true, recredMonths: 36, typicalDays: 60 }}
        sections={[{
          fields: [
            { name: 'name', label: 'Payer name *', required: true, span: 2 },
            { name: 'shortName', label: 'Short name *', required: true },
            { name: 'payerType', label: 'Type', type: 'select', options: ['Medicare', 'Medicaid', 'Commercial', 'Medicare Advantage', 'Medicaid managed care', 'Military', 'Marketplace', 'Workers comp', 'Other'] },
            { name: 'method', label: 'How to enroll', span: 2, placeholder: 'e.g. Availity + CAQH ProView' },
            { name: 'typicalDays', label: 'Typical days to approval', type: 'number' },
            { name: 'recredMonths', label: 'Re-credential every (months)', type: 'number' },
            { name: 'active', label: 'Active payer', type: 'checkbox' },
          ],
        }]}
        extraFooter={payerForm?.id ? <Button variant="danger" className="mr-auto" onClick={() => { setConfirm({ payer: payerForm }); setPayerForm(null) }}>Delete</Button> : null}
        onClose={() => setPayerForm(null)}
        onSubmit={async (v) => {
          const body = { ...v, typicalDays: v.typicalDays === '' ? null : v.typicalDays, recredMonths: v.recredMonths === '' ? null : v.recredMonths }
          if (payerForm.id) await ops.payers.update(payerForm.id, body)
          else await ops.payers.create(body)
          setPayerForm(null)
          showToast('Payer saved')
          load()
        }}
      />
      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.payer ? 'Delete payer?' : 'Delete enrollment?'}
        message={confirm?.payer ? `This removes ${confirm.payer.name} and every enrollment record with it.` : 'This removes the enrollment record and its history.'}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm.payer) await ops.payers.remove(confirm.payer.id)
          else await ops.enrollments.remove(confirm.id)
          setConfirm(null)
          showToast('Deleted')
          load()
        }}
      />
      {toast}
    </div>
  )
}
