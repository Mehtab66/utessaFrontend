import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, ConfirmModal, FormModal, PageHeader, Pill, PromptModal, useToast } from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { ops } from './opsApi'
import { LinkButton } from './opsShared'

/* Folders are edited one per line; a child is written "Parent > Child". */
const foldersToText = (folders) => (folders || []).map((f) => (f.parent ? `${f.parent} > ${f.name}` : f.name)).join('\n')
function textToFolders(text) {
  const out = []
  const tops = new Set()
  String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const [a, b] = line.split('>').map((s) => s.trim())
    if (b) {
      if (!tops.has(a)) { tops.add(a); out.push({ name: a, parent: null }) }
      out.push({ name: b, parent: a })
    } else if (!tops.has(a)) {
      tops.add(a)
      out.push({ name: a, parent: null })
    }
  })
  return out
}
const lines = (t) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean)

/** Per-specialty templates: vendor folders, required provider credentials and patient intake questions. */
export default function SpecialtyTemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [vendors, setVendors] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [cloning, setCloning] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [toast, showToast] = useToast()

  async function load() {
    try {
      const [t, v] = await Promise.all([ops.specialties.list(), ops.vendors()])
      setTemplates(t)
      setVendors(v)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader
        title="Specialty templates"
        subtitle="Each specialty you run has its own vendor folders, required provider credentials and patient intake questions. Start from a built-in template, copy it, or create your own."
        actions={<Button onClick={() => setForm({})}><Icon name="plus" className="h-4 w-4" /> New specialty</Button>}
      />
      <Alert>{error}</Alert>
      <div className="grid gap-4 xl:grid-cols-2">
        {templates.map((t) => {
          const tops = t.folders.filter((f) => !f.parent)
          const mine = vendors.filter((v) => v.specialty === t.name)
          return (
            <Card
              key={t.id}
              title={<span className="flex items-center gap-2">{t.name}{t.systemTemplate && <Pill tone="gray">Built-in</Pill>}</span>}
              subtitle={`${mine.length} vendor${mine.length === 1 ? '' : 's'} · ${t.folders.length} folders`}
              actions={
                <>
                  <LinkButton onClick={() => setCloning(t)}>Copy</LinkButton>
                  <LinkButton onClick={() => setForm(t)}>Edit</LinkButton>
                  <LinkButton tone="danger" onClick={() => setConfirm(t)}>Delete</LinkButton>
                </>
              }
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="m-0 mb-1.5 text-[12px] font-semibold text-brand-700">Vendor folders</p>
                  <ul className="m-0 list-none space-y-1 p-0 text-[13px]">
                    {tops.map((f) => (
                      <li key={f.name}>
                        <span className="font-semibold text-ink-950">{f.name}</span>
                        {t.folders.filter((c) => c.parent === f.name).map((c) => <span key={c.name} className="block pl-3 text-mist-600">{c.name}</span>)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="m-0 mb-1.5 text-[12px] font-semibold text-brand-700">Required credentials</p>
                  <ul className="m-0 list-disc space-y-1 pl-4 text-[13px] text-ink-950">{t.credentials.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
                <div>
                  <p className="m-0 mb-1.5 text-[12px] font-semibold text-brand-700">Intake questions</p>
                  <ul className="m-0 list-decimal space-y-1 pl-4 text-[13px] text-ink-950">{t.intake.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
              </div>
              {mine.length > 0 && (
                <p className="m-0 mt-4 text-[12.5px] text-mist-600">
                  Vendors: {mine.slice(0, 8).map((v, i) => <span key={v.id}>{i ? ', ' : ''}<Link to={`/app/vendors/${v.id}`} className="font-semibold text-brand-700 hover:underline">{v.name}</Link></span>)}{mine.length > 8 ? ` and ${mine.length - 8} more` : ''}
                </p>
              )}
            </Card>
          )
        })}
      </div>

      <FormModal
        open={Boolean(form)}
        title={form?.id ? `Edit ${form.name}` : 'New specialty'}
        initial={form?.id ? { name: form.name, folders: foldersToText(form.folders), credentials: form.credentials.join('\n'), intake: form.intake.join('\n') } : { name: '', folders: 'Clinical Staffing\nMedical Supplies\nFacilities > Rent / Lease\nFacilities > Cleaning & Janitorial\nBusiness Services > IT & Phones\nBusiness Services > Billing / RCM', credentials: 'State license\nDEA registration\nMalpractice insurance\nCAQH ProView\nBoard certification', intake: 'Referral reason\nReferring provider\nInsurance' }}
        sections={[{
          fields: [
            { name: 'name', label: 'Specialty name *', required: true, span: 2 },
            { name: 'folders', label: 'Vendor folders (one per line; write “Parent > Child” for a subfolder)', type: 'textarea', rows: 8 },
            { name: 'credentials', label: 'Required provider credentials (one per line)', type: 'textarea', rows: 5 },
            { name: 'intake', label: 'Patient intake questions (one per line)', type: 'textarea', rows: 5 },
          ],
        }]}
        onClose={() => setForm(null)}
        onSubmit={async (v) => {
          const body = { name: v.name, folders: textToFolders(v.folders), credentials: lines(v.credentials), intake: lines(v.intake) }
          if (form.id) await ops.specialties.update(form.id, body)
          else await ops.specialties.create(body)
          setForm(null)
          showToast('Specialty saved')
          load()
        }}
      />
      <PromptModal
        open={Boolean(cloning)}
        title={`Copy ${cloning?.name || ''}`}
        label="Name of the new specialty"
        required
        confirmLabel="Copy"
        onClose={() => setCloning(null)}
        onConfirm={async (name) => {
          try { await ops.cloneSpecialty(cloning.id, name); setCloning(null); showToast('Specialty copied'); load() } catch (e) { showToast(e.message, 'error') }
        }}
      />
      <ConfirmModal
        open={Boolean(confirm)}
        title="Delete specialty template?"
        message={`Delete ${confirm?.name}? Vendors keep their records; they just no longer belong to this template.`}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          try { await ops.specialties.remove(confirm.id); showToast('Deleted'); load() } catch (e) { showToast(e.message, 'error') }
          setConfirm(null)
        }}
      />
      {toast}
    </div>
  )
}
