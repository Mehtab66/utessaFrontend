import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, ConfirmModal, DataTable, Field, FilterSelect, FormModal, Kpi, Modal, PageHeader, Pill, SearchInput,
  Segmented, Toolbar, fmtDate, useToast,
} from '../crm/ui'
import { ops } from './opsApi'
import { DueCell, HistoryList, LinkButton, daysUntil, personName, personOptions, today } from './opsShared'

export const PRIV_TONE = {
  'Not started': 'gray',
  'Application submitted': 'blue',
  'Credentials committee review': 'blue',
  'MEC / board approval pending': 'blue',
  Granted: 'green',
  'Temporary privileges': 'amber',
  Denied: 'red',
  'Resigned / inactive': 'gray',
}
const OPEN = ['Application submitted', 'Credentials committee review', 'MEC / board approval pending']
const ACTIVE = ['Granted', 'Temporary privileges']

/** Editor for one privilege record, used here and on the provider profile. */
export function PrivilegeModal({ open, record, providers, facilities, statuses, onClose, onSaved, fixedStaffId }) {
  const isNew = !record?.id
  const [v, setV] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    setError('')
    setV(record?.id ? { ...record, note: '' } : {
      staffId: fixedStaffId || '', facilityId: '', status: 'Application submitted', appliedOn: today(),
      category: 'Active staff', fppeStatus: 'Not started', note: '',
    })
  }, [open, record, fixedStaffId])

  async function save() {
    if (!v.staffId || !v.facilityId) return setError('Pick the provider and the facility.')
    setSaving(true)
    setError('')
    try {
      const body = { ...v }
      ;['appliedOn', 'approvedOn', 'reappointDue', 'fppeDue', 'oppeDue'].forEach((k) => { if (!body[k]) body[k] = null })
      if (isNew) await ops.privileges.create(body)
      else await ops.privileges.update(record.id, body)
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { name: 'staffId', label: 'Provider *', type: 'select', options: personOptions(providers), show: () => isNew && !fixedStaffId },
    { name: 'facilityId', label: 'Facility *', type: 'select', options: facilities.map((f) => ({ value: f.id, label: f.name })), show: () => isNew },
    { name: 'status', label: 'Status *', type: 'select', noEmpty: true, options: statuses },
    { name: 'category', label: 'Staff category', type: 'select', options: ['Active staff', 'Courtesy staff', 'Consulting staff', 'Allied health professional (AHP)', 'Telemedicine', 'Temporary'] },
    { name: 'department', label: 'Department' },
    { name: 'contact', label: 'Medical staff office contact' },
    { name: 'privileges', label: 'Privileges requested / granted', type: 'textarea', rows: 2 },
    { name: 'appliedOn', label: 'Applied', type: 'date' },
    { name: 'approvedOn', label: 'Approved', type: 'date', show: (x) => ACTIVE.includes(x.status) },
    { name: 'reappointDue', label: v.status === 'Temporary privileges' ? 'Temporary privileges end' : 'Reappointment due', type: 'date', show: (x) => ACTIVE.includes(x.status), hint: 'Left empty, it is set from the facility’s cycle.' },
    { name: 'fppeStatus', label: 'FPPE', type: 'select', options: ['Not started', 'In progress', 'Extended', 'Completed', 'Not required'] },
    { name: 'fppeDue', label: 'FPPE due', type: 'date' },
    { name: 'oppeDue', label: 'Next OPPE', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
    { name: 'note', label: isNew ? 'First history note' : 'Add to history', type: 'textarea', rows: 2 },
  ]
  const fac = facilities.find((f) => f.id === v.facilityId)

  return (
    <Modal
      open={open}
      size="lg"
      title={isNew ? 'Request hospital privileges' : `${personName(providers.find((p) => p.id === v.staffId))} · ${fac?.name || ''}`}
      subtitle={isNew ? 'Track the application from submission to board approval.' : 'Each status change and note is saved to the history.'}
      onClose={onClose}
      footer={
        <>
          {error && <p className="mr-auto text-[13px] font-semibold text-warn" role="alert">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create record' : 'Save update'}</Button>
        </>
      }
    >
      {isNew && facilities.length === 0 && <Alert tone="warn">Add a facility first (Facilities view).</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.filter((f) => !f.show || f.show(v)).map((f) => (
          <Field key={f.name} field={f} value={v[f.name]} values={v} onChange={(val) => setV((p) => ({ ...p, [f.name]: val }))} />
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

export default function HospitalPrivilegesPage() {
  const [view, setView] = useState('list')
  const [providers, setProviders] = useState([])
  const [facilities, setFacilities] = useState([])
  const [rows, setRows] = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [fFac, setFFac] = useState('ALL')
  const [fStatus, setFStatus] = useState('ALL')
  const [editing, setEditing] = useState(null)
  const [facForm, setFacForm] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [toast, showToast] = useToast()

  async function load() {
    setLoading(true)
    try {
      const [p, f, r, opt] = await Promise.all([ops.providers(), ops.facilities.list(), ops.privileges.list(), ops.credOptions()])
      setProviders(p.filter((m) => m.status !== 'INACTIVE'))
      setFacilities(f)
      setRows(r)
      setStatuses(opt.privilegeStatuses)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const provById = useMemo(() => Object.fromEntries(providers.map((m) => [m.id, m])), [providers])
  const facById = useMemo(() => Object.fromEntries(facilities.map((f) => [f.id, f])), [facilities])

  const list = rows.filter((r) => provById[r.staffId]).map((r) => ({ ...r, provider: personName(provById[r.staffId]), facility: facById[r.facilityId]?.name || '' }))
    .filter((r) => (!q || `${r.provider} ${r.facility}`.toLowerCase().includes(q.toLowerCase()))
      && (fFac === 'ALL' || r.facilityId === fFac) && (fStatus === 'ALL' || r.status === fStatus))

  const columns = [
    { key: 'provider', label: 'Provider', render: (r) => <b className="font-semibold">{r.provider}</b> },
    { key: 'facility', label: 'Facility' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={PRIV_TONE[r.status]} dot>{r.status}</Pill> },
    { key: 'appliedOn', label: 'Applied', render: (r) => fmtDate(r.appliedOn) },
    { key: 'reappointDue', label: 'Reappointment', render: (r) => (ACTIVE.includes(r.status) ? <DueCell date={r.reappointDue} window={120} /> : '—') },
    { key: 'fppeStatus', label: 'FPPE', render: (r) => r.fppeStatus || '—' },
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
  const facColumns = [
    { key: 'name', label: 'Facility', render: (f) => <b className="font-semibold">{f.name}</b> },
    { key: 'facilityType', label: 'Type' },
    { key: 'contact', label: 'Medical staff office' },
    { key: 'cycleMonths', label: 'Reappointment cycle', render: (f) => (f.cycleMonths ? `${f.cycleMonths} months` : '—') },
    { key: 'active', label: 'Active appointments', render: (f) => rows.filter((r) => r.facilityId === f.id && ACTIVE.includes(r.status)).length },
    { key: 'actions', label: '', sortable: false, render: (f) => <span className="flex justify-end"><LinkButton onClick={() => setFacForm(f)}>Edit</LinkButton></span> },
  ]

  return (
    <div>
      <PageHeader
        title="Hospital privileges"
        subtitle="Facility appointments for every provider: applications, committee and board review, temporary privileges, FPPE / OPPE and reappointment dates."
        actions={
          <>
            <Button variant="secondary" onClick={() => setFacForm({})}>Add facility</Button>
            <Button onClick={() => setEditing({})}>Request privileges</Button>
          </>
        }
      />
      <Alert>{error}</Alert>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Appointments granted" value={rows.filter((r) => r.status === 'Granted').length} />
        <Kpi label="Applications in process" value={rows.filter((r) => OPEN.includes(r.status)).length} tone="blue" onClick={() => { setView('list'); setFStatus('ALL') }} />
        <Kpi label="Temporary privileges" value={rows.filter((r) => r.status === 'Temporary privileges').length} tone="amber" onClick={() => { setView('list'); setFStatus('Temporary privileges') }} />
        <Kpi label="FPPE in progress" value={rows.filter((r) => ['In progress', 'Extended'].includes(r.fppeStatus)).length} tone="ink" />
        <Kpi label="Reappointment ≤ 120d" value={rows.filter((r) => ACTIVE.includes(r.status) && r.reappointDue && daysUntil(r.reappointDue) <= 120).length} tone="amber" />
        <Kpi label="No active privileges" value={providers.filter((m) => !rows.some((r) => r.staffId === m.id && ACTIVE.includes(r.status))).length} hint="Providers" tone="gray" />
      </div>
      <Toolbar right={<Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'Privileges' }, { value: 'facilities', label: 'Facilities' }]} />}>
        {view === 'list' && (
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Search provider or facility…" />
            <FilterSelect label="Facility" value={fFac} onChange={setFFac} allLabel="Any facility" options={facilities.map((f) => ({ value: f.id, label: f.name }))} />
            <FilterSelect label="Status" value={fStatus} onChange={setFStatus} allLabel="Any status" options={statuses.map((s) => ({ value: s, label: s }))} />
          </>
        )}
      </Toolbar>
      {view === 'list'
        ? <DataTable columns={columns} rows={list} loading={loading} empty={facilities.length ? 'No privilege records yet. Use “Request privileges”.' : 'Add the hospitals and surgery centers you work with first (“Add facility”).'} />
        : <DataTable columns={facColumns} rows={facilities} loading={loading} empty="No facilities yet." />}

      <PrivilegeModal
        open={Boolean(editing)}
        record={editing}
        providers={providers}
        facilities={facilities}
        statuses={statuses}
        onClose={() => setEditing(null)}
        onSaved={() => { showToast('Privileges saved'); load() }}
      />
      <FormModal
        open={Boolean(facForm)}
        title={facForm?.id ? 'Edit facility' : 'Add a facility'}
        size="md"
        initial={facForm?.id ? facForm : { facilityType: 'Hospital', cycleMonths: 24 }}
        sections={[{
          fields: [
            { name: 'name', label: 'Facility name *', required: true, span: 2 },
            { name: 'facilityType', label: 'Type', type: 'select', options: ['Hospital', 'Ambulatory surgery center', 'Imaging center', 'Skilled nursing facility', 'Other'] },
            { name: 'cycleMonths', label: 'Reappointment cycle (months)', type: 'number' },
            { name: 'contact', label: 'Medical staff office contact', span: 2 },
          ],
        }]}
        extraFooter={facForm?.id ? <Button variant="danger" className="mr-auto" onClick={() => { setConfirm({ facility: facForm }); setFacForm(null) }}>Delete</Button> : null}
        onClose={() => setFacForm(null)}
        onSubmit={async (v) => {
          const body = { ...v, cycleMonths: v.cycleMonths === '' ? null : v.cycleMonths }
          if (facForm.id) await ops.facilities.update(facForm.id, body)
          else await ops.facilities.create(body)
          setFacForm(null)
          showToast('Facility saved')
          load()
        }}
      />
      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.facility ? 'Delete facility?' : 'Delete privilege record?'}
        message={confirm?.facility ? `This removes ${confirm.facility.name} and every privilege record there.` : 'This removes the record and its history.'}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            if (confirm.facility) await ops.facilities.remove(confirm.facility.id)
            else await ops.privileges.remove(confirm.id)
            showToast('Deleted')
            load()
          } catch (e) {
            showToast(e.message, 'error')
          }
          setConfirm(null)
        }}
      />
      {toast}
    </div>
  )
}
