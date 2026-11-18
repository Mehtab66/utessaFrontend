import { useEffect, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { useAuth } from '../../shared/auth/AuthContext'
import { permissionsFor } from '../../shared/security/roles'
import { EHR_PROVIDERS, PHONE_PROVIDERS, crm } from './crmApi'
import { Alert, Button, Card, Field, Loading, PageHeader, Pill, fmtDateTime, useAsync, useToast } from './ui'

const STATUS = {
  NOT_CONNECTED: ['gray', 'Not connected'],
  PENDING: ['amber', 'Connection requested'],
  CONNECTED: ['green', 'Connected'],
  ERROR: ['red', 'Error'],
  DISABLED: ['gray', 'Disabled'],
}

export default function IntegrationsPage() {
  const { user } = useAuth()
  const canEdit = permissionsFor(user?.role).has('crmadmin')
  const [toastNode, toast] = useToast()
  const { data, loading, error, reload } = useAsync(() => crm.integrations(), [])
  const phone = data?.find((i) => i.kind === 'PHONE')
  const ehr = data?.find((i) => i.kind === 'EHR')

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Connect your phone system for caller ID & call logging, and your EHR to sync patients and appointments."
      />
      <Alert>{error}</Alert>
      <Alert tone="info">
        Live connectors are being rolled out. Save your preferences now — Utessa marks the connection as requested and
        queues new patients and appointments so nothing is missed when the link goes live. Credentials are never stored on this page.
      </Alert>
      {!canEdit && <Alert tone="warn">Only owners, admins and office managers can change integration settings.</Alert>}
      {loading && <Loading />}
      {data && (
        <div className="grid gap-4 xl:grid-cols-2">
          <IntegrationCard
            integration={phone}
            canEdit={canEdit}
            title="Phone system"
            icon="phone"
            description="Inbound calls pop the matching patient or lead on the Call desk, outbound calls are click-to-dial, and every call is logged to the timeline."
            providers={PHONE_PROVIDERS}
            settingsFields={[
              { name: 'mainNumber', label: 'Main practice number', type: 'tel' },
              { name: 'accountId', label: 'Account / tenant ID' },
              { name: 'screenPop', label: 'Open caller record automatically (screen-pop)', type: 'checkbox' },
              { name: 'logCallsAutomatically', label: 'Log every call to the patient timeline', type: 'checkbox' },
              { name: 'createLeadForUnknownCallers', label: 'Create a lead for unknown callers', type: 'checkbox' },
              { name: 'recordCalls', label: 'Attach call recordings (requires consent notice)', type: 'checkbox' },
              { name: 'smsEnabled', label: 'Enable two-way SMS (TCPA consent enforced)', type: 'checkbox' },
            ]}
            capabilities={['Caller ID screen-pop', 'Click-to-call', 'Automatic call logging', 'Missed-call follow-up tasks', 'Two-way SMS']}
            onSaved={() => {
              toast('Phone system preferences saved')
              reload()
            }}
          />
          <IntegrationCard
            integration={ehr}
            canEdit={canEdit}
            title="EHR / practice management"
            icon="stethoscope"
            description="Look up existing patients in the EHR, create new patients automatically when a lead converts, and push appointments booked in the CRM."
            providers={EHR_PROVIDERS}
            settingsFields={[
              { name: 'practiceId', label: 'Practice / tenant ID' },
              { name: 'baseUrl', label: 'FHIR base URL', placeholder: 'https://…/fhir/r4' },
              { name: 'matchOn', label: 'Patient matching', type: 'select', noEmpty: true, options: [{ value: 'NAME_DOB_PHONE', label: 'Name + DOB + phone' }, { value: 'NAME_DOB', label: 'Name + DOB' }, { value: 'MRN', label: 'MRN only' }] },
              { name: 'syncDirection', label: 'Sync direction', type: 'select', noEmpty: true, options: [{ value: 'BIDIRECTIONAL', label: 'Two-way' }, { value: 'EHR_TO_CRM', label: 'EHR → CRM only' }, { value: 'CRM_TO_EHR', label: 'CRM → EHR only' }] },
              { name: 'autoCreatePatients', label: 'Create new patients in the EHR when a lead converts', type: 'checkbox' },
              { name: 'syncAppointments', label: 'Push CRM appointments to the EHR schedule', type: 'checkbox' },
              { name: 'importExistingPatients', label: 'Import existing EHR patients for caller lookup', type: 'checkbox' },
            ]}
            capabilities={['Patient search & match', 'Auto-create new patients', 'Appointment sync', 'MRN back-fill', 'Insurance on file']}
            stats={[
              ['Patients queued for EHR', ehr?.pendingPatients ?? 0],
              ['Appointments queued', ehr?.pendingAppointments ?? 0],
              ['Patients linked', ehr?.linkedPatients ?? 0],
            ]}
            onSaved={() => {
              toast('EHR preferences saved')
              reload()
            }}
          />
        </div>
      )}
      {toastNode}
    </div>
  )
}

function IntegrationCard({ integration, canEdit, title, icon, description, providers, settingsFields, capabilities, stats, onSaved }) {
  const [provider, setProvider] = useState('')
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setProvider(integration?.provider || '')
    setSettings(integration?.settings || {})
  }, [integration])

  const [tone, label] = STATUS[integration?.status] || STATUS.NOT_CONNECTED

  async function save(status) {
    setSaving(true)
    setError('')
    try {
      await crm.saveIntegration(integration.kind, { provider: provider || null, status: status || null, settings })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      title={<span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name={icon} /></span>{title}</span>}
      actions={<Pill tone={tone} dot>{label}</Pill>}
    >
      <p className="m-0 text-[13px] text-mist-700">{description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {capabilities.map((c) => <Pill key={c} tone="ink">{c}</Pill>)}
      </div>
      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {stats.map(([l, v]) => (
            <div key={l} className="rounded-lg bg-mist-25 px-3 py-2">
              <p className="m-0 font-mono text-[18px] font-semibold text-navy">{v}</p>
              <p className="m-0 text-[11.5px] text-mist-500">{l}</p>
            </div>
          ))}
        </div>
      )}
      <fieldset disabled={!canEdit} className="m-0 mt-4 border-0 p-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field field={{ name: 'provider', label: 'Provider', type: 'select', options: providers, emptyLabel: 'Choose…' }} value={provider} onChange={setProvider} />
          {settingsFields.map((f) => (
            <Field key={f.name} field={f} value={settings[f.name] ?? (f.type === 'checkbox' ? false : '')} onChange={(v) => setSettings((s) => ({ ...s, [f.name]: v }))} />
          ))}
        </div>
      </fieldset>
      {error && <p className="m-0 mt-2 text-[13px] font-semibold text-warn">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-mist-500">{integration?.updatedAt ? `Last updated ${fmtDateTime(integration.updatedAt)}` : 'Not configured yet'}</span>
        {canEdit && (
          <div className="flex gap-2">
            {integration?.status && integration.status !== 'NOT_CONNECTED' && integration.status !== 'DISABLED' && (
              <Button variant="secondary" disabled={saving} onClick={() => save('DISABLED')}>Disable</Button>
            )}
            <Button disabled={saving || !provider} onClick={() => save(null)}>{saving ? 'Saving…' : 'Save & request connection'}</Button>
          </div>
        )}
      </div>
    </Card>
  )
}
