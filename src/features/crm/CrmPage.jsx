import { api } from '../../shared/api/client'
import { ResourceWorkspace, StatusPill, useResourceList } from '../../shared/ui/ResourceWorkspace'

const STATUS_TONE = {
  NEW: 'blue',
  CONTACTED: 'amber',
  SCHEDULED: 'teal',
  SHOWED: 'green',
  CONVERTED: 'green',
  CLOSED: 'gray',
}

export default function CrmPage() {
  const { rows, loading, error, refresh } = useResourceList(() => api('/api/v1/leads'))

  return (
    <ResourceWorkspace
      title="Patient leads & calls"
      subtitle="Track every inquiry — source, insurance interest, owner, follow-ups and call outcome."
      addLabel="+ Log lead"
      columns={[
        { key: 'fullName', label: 'Name', render: (r) => <b>{r.fullName}</b> },
        { key: 'phone', label: 'Phone' },
        { key: 'source', label: 'Source' },
        { key: 'interestedService', label: 'Service' },
        {
          key: 'status',
          label: 'Status',
          render: (r) => <StatusPill tone={STATUS_TONE[r.status] || 'gray'}>{r.status}</StatusPill>,
        },
        { key: 'ownerName', label: 'Owner' },
        {
          key: 'nextFollowUp',
          label: 'Follow-up',
          render: (r) => r.nextFollowUp || '—',
        },
      ]}
      rows={rows}
      loading={loading}
      error={error}
      empty="No patient leads yet. Log a call or web inquiry to start the pipeline."
      onRefresh={refresh}
      onCreate={(body) => api('/api/v1/leads', { method: 'POST', body: toPayload(body) })}
      onEdit={(id, body) => api(`/api/v1/leads/${id}`, { method: 'PUT', body: toPayload(body) })}
      onDelete={(id) => api(`/api/v1/leads/${id}`, { method: 'DELETE' })}
      form={leadForm}
    />
  )
}

const leadForm = {
  defaults: () => ({
    fullName: '',
    phone: '',
    email: '',
    source: 'Phone',
    preferredContact: 'Mobile',
    referralSourceDetail: '',
    interestedService: '',
    preferredProvider: '',
    insurancePayer: '',
    status: 'NEW',
    ownerName: '',
    nextFollowUp: '',
    callOutcome: '',
    notes: '',
  }),
  fromRow: (r) => ({
    fullName: r.fullName || '',
    phone: r.phone || '',
    email: r.email || '',
    source: r.source || '',
    preferredContact: r.preferredContact || '',
    referralSourceDetail: r.referralSourceDetail || '',
    interestedService: r.interestedService || '',
    preferredProvider: r.preferredProvider || '',
    insurancePayer: r.insurancePayer || '',
    status: r.status || 'NEW',
    ownerName: r.ownerName || '',
    nextFollowUp: r.nextFollowUp || '',
    callOutcome: r.callOutcome || '',
    notes: r.notes || '',
  }),
  sections: [
    {
      title: '1 · Patient / caller',
      fields: [
        { name: 'fullName', label: 'Full name *', required: true },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        {
          name: 'preferredContact',
          label: 'Preferred contact',
          type: 'select',
          options: ['Mobile', 'Home', 'Email', 'Text'].map((v) => ({ value: v, label: v })),
        },
      ],
    },
    {
      title: '2 · Source & interest',
      fields: [
        {
          name: 'source',
          label: 'Source',
          type: 'select',
          options: ['Phone', 'Web form', 'Walk-in', 'Referral', 'Insurance directory', 'Other'].map((v) => ({
            value: v,
            label: v,
          })),
        },
        { name: 'referralSourceDetail', label: 'Referral / source detail', span2: true },
        { name: 'interestedService', label: 'Interested service' },
        { name: 'preferredProvider', label: 'Preferred provider' },
        { name: 'insurancePayer', label: 'Insurance / payer' },
      ],
    },
    {
      title: '3 · Ownership & follow-up',
      fields: [
        {
          name: 'status',
          label: 'Status *',
          type: 'select',
          required: true,
          options: [
            { value: 'NEW', label: 'New' },
            { value: 'CONTACTED', label: 'Contacted' },
            { value: 'SCHEDULED', label: 'Scheduled' },
            { value: 'SHOWED', label: 'Showed' },
            { value: 'CONVERTED', label: 'Converted' },
            { value: 'CLOSED', label: 'Closed' },
          ],
        },
        { name: 'ownerName', label: 'Assigned to' },
        { name: 'nextFollowUp', label: 'Next follow-up', type: 'date' },
        {
          name: 'callOutcome',
          label: 'Last call outcome',
          type: 'select',
          options: [
            { value: '', label: '—' },
            { value: 'Reached', label: 'Reached' },
            { value: 'Voicemail', label: 'Voicemail' },
            { value: 'No answer', label: 'No answer' },
            { value: 'Wrong number', label: 'Wrong number' },
            { value: 'Scheduled', label: 'Scheduled' },
          ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ],
    },
  ],
}

function toPayload(values) {
  return {
    ...values,
    nextFollowUp: values.nextFollowUp || null,
    lastContactAt: null,
  }
}

export function ModuleStub({ title, color, copy }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className={`h-3 w-3 rounded-sm ${color}`} />
        <h1 className="m-0 text-[28px] font-bold text-navy">{title}</h1>
      </div>
      <p className="text-sm text-[#43476A]">{copy}</p>
    </div>
  )
}
