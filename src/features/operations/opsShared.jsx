import { useEffect, useRef, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { Alert, Button, Field, Modal, Pill, fmtDate } from '../crm/ui'
import { ops } from './opsApi'

/* Shared pieces for the Practice Operations pages. They reuse the app's existing UI kit
   (features/crm/ui) so every new screen looks like the rest of Utessa. */

export const personName = (m) => (m ? `${m.firstName || ''} ${m.lastName || ''}`.trim() : '')

export function daysUntil(date) {
  if (!date) return null
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((d - now) / 86400000)
}

/** Tone + label for an expiration or due date. */
export function dueState(date, window = 90) {
  const n = daysUntil(date)
  if (n === null) return null
  if (n < 0) return { tone: 'red', label: `Expired ${Math.abs(n)}d ago`, n }
  if (n <= 30) return { tone: 'red', label: n === 0 ? 'Due today' : `Due in ${n}d`, n }
  if (n <= window) return { tone: 'amber', label: `Due in ${n}d`, n }
  return { tone: 'green', label: 'Current', n }
}

export function DueCell({ date, window, empty = '—' }) {
  if (!date) return <span className="text-mist-300">{empty}</span>
  const st = dueState(date, window)
  return (
    <span className="inline-flex flex-col gap-1">
      <span className="whitespace-nowrap">{fmtDate(date)}</span>
      {st && <Pill tone={st.tone}>{st.label}</Pill>}
    </span>
  )
}

export function fmtSize(bytes) {
  const n = Number(bytes || 0)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export const today = () => new Date().toISOString().slice(0, 10)

/** Loads providers + staff once per mount; returns a combined list and a lookup. */
export function usePeople({ providers = true, staff = true } = {}) {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      providers ? ops.providers().catch((e) => { if (e.status !== 403) throw e; return [] }) : Promise.resolve([]),
      staff ? ops.staff().catch((e) => { if (e.status !== 403) throw e; return [] }) : Promise.resolve([]),
    ])
      .then(([p, s]) => {
        if (!alive) return
        const map = new Map()
        ;[...(p || []), ...(s || [])].forEach((m) => map.set(m.id, m))
        setPeople([...map.values()].sort((a, b) => personName(a).localeCompare(personName(b))))
        setError('')
      })
      .catch((e) => alive && setError(e.message || 'Could not load people'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [providers, staff, tick])
  const byId = Object.fromEntries(people.map((m) => [m.id, m]))
  return { people, byId, loading, error, reload: () => setTick((t) => t + 1) }
}

export function personOptions(list) {
  return list.map((m) => ({ value: m.id, label: `${personName(m)}${m.specialty || m.designation || m.jobTitle ? ` · ${m.specialty || m.designation || m.jobTitle}` : ''}` }))
}

/** Status history (newest first). */
export function HistoryList({ items, empty = 'No history yet.' }) {
  const list = [...(items || [])].reverse()
  if (!list.length) return <p className="m-0 text-[13px] text-mist-500">{empty}</p>
  return (
    <ol className="m-0 list-none space-y-2.5 p-0">
      {list.map((h, i) => (
        <li key={i} className="flex gap-3 text-[13px]">
          <span className="w-24 shrink-0 text-mist-500">{fmtDate(h.date || h.at)}</span>
          <span className="min-w-0">
            {h.status && <b className="font-semibold text-ink-950">{h.status}</b>}
            {h.text && <span className="text-ink-950">{h.text}</span>}
            {h.note && <span className="text-mist-700"> · {h.note}</span>}
            {h.by && <span className="text-mist-500"> · {h.by}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Renders a written document: lines starting with "# " become headings. */
export function DocumentText({ text }) {
  return (
    <div className="space-y-1 text-[13.5px] leading-relaxed text-ink-950">
      {String(text || '').split('\n').map((line, i) => {
        if (line.startsWith('# ')) return <h3 key={i} className="m-0 pt-3 text-[14px] font-semibold text-ink-950">{line.slice(2)}</h3>
        if (!line.trim()) return <div key={i} className="h-1.5" />
        return <p key={i} className="m-0 whitespace-pre-wrap">{line}</p>
      })}
    </div>
  )
}

/** Opens a file: written documents show in a modal, uploads open in a new tab. */
export function useFileViewer() {
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState('')
  async function open(file) {
    setError('')
    if (file.written) {
      try {
        const d = await ops.fileText(file.id)
        setDoc(d)
      } catch (e) {
        setError(e.message)
      }
    } else {
      window.open(ops.fileUrl(file.id), '_blank', 'noopener')
    }
  }
  const node = (
    <Modal
      open={Boolean(doc)}
      title={doc?.name}
      subtitle="Written document"
      size="lg"
      onClose={() => setDoc(null)}
      footer={
        <>
          <a className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-mist-300 bg-white px-3.5 text-[13.5px] font-semibold text-ink-950 hover:bg-mist-25" href={doc ? ops.fileUrl(doc.id, true) : '#'}>
            <Icon name="download" className="h-4 w-4" /> Download
          </a>
          <Button onClick={() => setDoc(null)}>Close</Button>
        </>
      }
    >
      {doc && <DocumentText text={doc.text} />}
    </Modal>
  )
  return { open, node, error }
}

/**
 * Upload dialog: a file picker plus any extra fields (same field config as FormModal).
 * onSubmit(file, values) must return a promise.
 */
export function UploadModal({ open, title, subtitle, fields = [], initial = {}, onSubmit, onClose, submitLabel = 'Upload', multiple = false }) {
  const [files, setFiles] = useState([])
  const [values, setValues] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)
  useEffect(() => {
    if (open) {
      setFiles([])
      setValues(initial || {})
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function submit() {
    if (!files.length) {
      setError('Choose a file.')
      return
    }
    const missing = fields.filter((f) => f.required && (!f.show || f.show(values)) && !String(values[f.name] ?? '').trim())
    if (missing.length) {
      setError(`Please complete: ${missing.map((f) => f.label.replace(' *', '')).join(', ')}`)
      return
    }
    const big = files.find((f) => f.size > 10 * 1024 * 1024)
    if (big) {
      setError(`${big.name} is larger than 10 MB.`)
      return
    }
    setSaving(true)
    setError('')
    try {
      for (const f of files) await onSubmit(f, values)
      onClose()
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      size="md"
      onClose={onClose}
      footer={
        <>
          {error && <p className="mr-auto max-w-[60%] text-[13px] font-semibold text-warn" role="alert">{error}</p>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Uploading…' : submitLabel}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-[12.5px] font-semibold text-navy">
          File{multiple ? 's' : ''} *
          <input
            ref={inputRef}
            type="file"
            multiple={multiple}
            onChange={(e) => setFiles([...(e.target.files || [])])}
            className="mt-1 block w-full rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm text-navy file:mr-3 file:rounded-md file:border-0 file:bg-mist-100 file:px-3 file:py-1 file:text-[12.5px] file:font-semibold file:text-ink-950"
          />
          <span className="mt-1 block text-[11.5px] font-normal text-mist-500">PDF, images or office files, up to 10 MB each.</span>
        </label>
        {fields.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.filter((f) => !f.show || f.show(values)).map((f) => (
              <Field key={f.name} field={f} value={values[f.name]} values={values} onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

/** Small text-link style action button used inside tables. */
export function LinkButton({ children, tone = 'brand', ...props }) {
  const cls = tone === 'danger' ? 'text-danger-600 hover:bg-danger-50' : 'text-brand-700 hover:bg-brand-50'
  return (
    <button type="button" className={`rounded-md px-2 py-1 text-[12.5px] font-semibold transition-colors ${cls}`} {...props}>
      {children}
    </button>
  )
}

export function Notice({ children }) {
  return <Alert tone="info">{children}</Alert>
}

/* ── Document vault catalog (categories and document types) ────────────── */
export const DOC_CATALOG = [
  ['Identity and employment eligibility', ['Government photo ID (driver license or passport)', 'I-9 employment eligibility verification', 'W-4 tax withholding']],
  ['Employment', ['Employment contract', 'Offer letter', 'Signed job description', 'Confidentiality agreement', 'Background check result', 'OIG / SAM exclusion check']],
  ['Education and training', ['Diploma or degree', 'Professional school diploma (MD, DO, NP, PA)', 'Residency certificate', 'Fellowship certificate', 'ECFMG certificate', 'Transcript']],
  ['Licenses and certifications', ['License copy', 'License primary-source verification printout', 'Board certificate', 'DEA certificate', 'Life support card (BLS / ACLS / PALS)', 'Specialty or registry certificate']],
  ['Credentialing file', ['Curriculum vitae (CV)', 'Work history and gap explanation', 'Peer references', 'CAQH attestation', 'NPDB query result', 'Malpractice certificate of insurance (COI)', 'Malpractice claims history / loss runs', 'Credentialing attestation and release']],
  ['Hospital privileges', ['Privileges application', 'Hospital privileges letter', 'Delineation of privileges (signed)', 'FPPE / OPPE report', 'Case logs / procedure volume', 'Reappointment application']],
  ['Payer enrollment', ['Payer application', 'Payer approval / welcome letter', 'Payer participation agreement', 'CMS-855I / CMS-855R', 'W-9']],
  ['Health and safety', ['Immunization record', 'TB screening', 'Hepatitis B vaccine or declination', 'Influenza vaccine', 'Respirator fit test']],
  ['Training', ['HIPAA training certificate', 'OSHA / bloodborne pathogens training', 'Compliance training certificate', 'Other training certificate']],
  ['Other', ['Other document']],
]
/** Document types that usually expire (shown with an expiration date field). */
export const EXPIRING_DOCS = new Set([
  'Government photo ID (driver license or passport)', 'OIG / SAM exclusion check', 'License copy', 'Board certificate', 'DEA certificate',
  'Life support card (BLS / ACLS / PALS)', 'Specialty or registry certificate', 'CAQH attestation', 'Malpractice certificate of insurance (COI)',
  'Hospital privileges letter', 'TB screening', 'Influenza vaccine', 'Respirator fit test', 'HIPAA training certificate',
  'OSHA / bloodborne pathogens training', 'Compliance training certificate', 'Other training certificate',
])

const CLINICAL = /clinical|nurs|medical assist|\brn\b|lpn|lvn|tech|provider|physician|therap/i

/** Documents every person should have on file, by role. */
export function requiredDocs(m) {
  const r = ['Government photo ID (driver license or passport)', 'I-9 employment eligibility verification', 'W-4 tax withholding', 'Employment contract', 'Confidentiality agreement', 'Background check result', 'HIPAA training certificate']
  const clinical = m.provider || CLINICAL.test(`${m.category || ''} ${m.designation || ''} ${m.jobTitle || ''}`)
  if (clinical) r.push('Immunization record', 'TB screening', 'Hepatitis B vaccine or declination', 'Life support card (BLS / ACLS / PALS)')
  if (m.licenseNumber || m.provider) r.push('License copy')
  if (m.provider) r.push('Curriculum vitae (CV)', 'Professional school diploma (MD, DO, NP, PA)', 'Work history and gap explanation', 'Peer references', 'NPDB query result', 'Malpractice certificate of insurance (COI)', 'Credentialing attestation and release', 'CAQH attestation')
  if (m.deaNumber) r.push('DEA certificate')
  return r
}

export function categoryOf(docType) {
  const hit = DOC_CATALOG.find(([, types]) => types.includes(docType))
  return hit ? hit[0] : 'Other'
}

/* ── Credential catalog used by the credentials editor ─────────────────── */
export const CREDENTIAL_TYPES = [
  ['State license', ['RN license', 'LPN / LVN license', 'APRN license', 'APRN prescriptive authority', 'PA license', 'Medical license (MD / DO)', 'Physical therapist license', 'Pharmacist license', 'Radiologic technologist license', 'Other license']],
  ['Controlled substances', ['DEA registration', 'State controlled substance registration']],
  ['Board and national certification', ['NP national board certification', 'NCCPA certification (PA-C)', 'NBCRNA certification', 'AMCB certification (CNM)', 'Board certification (additional / subspecialty)', 'Medical assistant certification', 'Phlebotomy certification', 'EKG technician certification', 'Coding certification']],
  ['Specialty nursing certification', ['CCRN', 'PCCN', 'CEN', 'CNOR', 'IV therapy certification']],
  ['Registry', ['Echo registry credential', 'RVT (vascular technology)', 'Nuclear medicine registry', 'ARRT registry']],
  ['Life support', ['BLS', 'ACLS', 'PALS', 'NRP', 'ATLS']],
  ['Enrollment and insurance', ['Malpractice insurance', 'CAQH ProView', 'Medicare PTAN']],
  ['Other', ['Other certification']],
]
