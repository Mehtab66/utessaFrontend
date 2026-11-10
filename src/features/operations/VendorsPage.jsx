import { api } from '../../shared/api/client'
import { ResourceWorkspace, StatusPill, useResourceList } from '../../shared/ui/ResourceWorkspace'

const BAA_TONE = {
  SIGNED: 'green',
  PENDING: 'amber',
  MISSING: 'red',
  NOT_REQUIRED: 'gray',
}

export default function VendorsPage() {
  const { rows, loading, error, refresh } = useResourceList(() => api('/api/v1/vendors'))

  return (
    <ResourceWorkspace
      title="Vendors"
      subtitle="Wireframe vendor record — PHI flag, contract terms, cost, BAA and account details."
      addLabel="+ Add vendor"
      columns={[
        { key: 'name', label: 'Vendor', render: (r) => <b>{r.name}</b> },
        { key: 'folder', label: 'Folder', render: (r) => r.folder || r.category },
        { key: 'contactName', label: 'Contact' },
        {
          key: 'handlesPhi',
          label: 'PHI',
          render: (r) => (r.handlesPhi ? <StatusPill tone="red">Yes</StatusPill> : 'No'),
        },
        {
          key: 'baaStatus',
          label: 'BAA',
          render: (r) => <StatusPill tone={BAA_TONE[r.baaStatus] || 'gray'}>{r.baaStatus}</StatusPill>,
        },
        {
          key: 'monthlyCost',
          label: 'Monthly',
          render: (r) => (r.monthlyCost != null ? `$${Number(r.monthlyCost).toLocaleString()}` : '—'),
        },
        {
          key: 'active',
          label: 'Active',
          render: (r) => (r.active ? 'Yes' : 'No'),
        },
      ]}
      rows={rows}
      loading={loading}
      error={error}
      empty="No vendors yet. Add labs, IT, billing companies and other BA partners."
      onRefresh={refresh}
      onCreate={(body) => api('/api/v1/vendors', { method: 'POST', body: toPayload(body) })}
      onEdit={(id, body) => api(`/api/v1/vendors/${id}`, { method: 'PUT', body: toPayload(body) })}
      onDelete={(id) => api(`/api/v1/vendors/${id}`, { method: 'DELETE' })}
      form={vendorForm}
    />
  )
}

const vendorForm = {
  defaults: () => ({
    name: '',
    category: 'IT / EHR',
    folder: 'IT / EHR',
    contactName: '',
    contactRole: '',
    email: '',
    phone: '',
    website: '',
    accountNumber: '',
    handlesPhi: true,
    contractStart: '',
    contractEnd: '',
    autoRenews: false,
    cancellationNoticeDays: '30',
    monthlyCost: '',
    paymentTerms: 'Net 30',
    baaStatus: 'PENDING',
    baaSignedOn: '',
    notes: '',
    active: true,
    documents: [],
  }),
  fromRow: (r) => ({
    name: r.name || '',
    category: r.category || '',
    folder: r.folder || r.category || '',
    contactName: r.contactName || '',
    contactRole: r.contactRole || '',
    email: r.email || '',
    phone: r.phone || '',
    website: r.website || '',
    accountNumber: r.accountNumber || '',
    handlesPhi: Boolean(r.handlesPhi),
    contractStart: r.contractStart || '',
    contractEnd: r.contractEnd || '',
    autoRenews: Boolean(r.autoRenews),
    cancellationNoticeDays: r.cancellationNoticeDays != null ? String(r.cancellationNoticeDays) : '',
    monthlyCost: r.monthlyCost != null ? String(r.monthlyCost) : '',
    paymentTerms: r.paymentTerms || '',
    baaStatus: r.baaStatus || 'PENDING',
    baaSignedOn: r.baaSignedOn || '',
    notes: r.notes || '',
    active: r.active !== false,
    documents: r.documents || [],
  }),
  sections: [
    {
      title: '1 · Vendor profile',
      fields: [
        { name: 'name', label: 'Vendor name *', required: true },
        {
          name: 'folder',
          label: 'Folder *',
          type: 'select',
          required: true,
          options: [
            'IT / EHR',
            'Laboratory',
            'Billing company',
            'Imaging',
            'Medical waste',
            'Cleaning',
            'Telecom',
            'Payroll',
            'Other',
          ].map((v) => ({ value: v, label: v })),
        },
        { name: 'category', label: 'Category *', required: true },
        { name: 'contactName', label: 'Contact name and role' },
        { name: 'contactRole', label: 'Contact role' },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'website', label: 'Website' },
        { name: 'accountNumber', label: 'Account / customer number' },
      ],
    },
    {
      title: '2 · PHI & BAA',
      fields: [
        {
          name: 'handlesPhi',
          label: 'Handles patient data (PHI)? *',
          type: 'checkbox',
          hint: 'Yes — requires a Business Associate Agreement',
        },
        {
          name: 'baaStatus',
          label: 'BAA status',
          type: 'select',
          required: true,
          options: [
            { value: 'SIGNED', label: 'Signed' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'MISSING', label: 'Missing' },
            { value: 'NOT_REQUIRED', label: 'Not required' },
          ],
        },
        { name: 'baaSignedOn', label: 'BAA signed', type: 'date' },
      ],
    },
    {
      title: '3 · Contract & cost',
      fields: [
        { name: 'contractStart', label: 'Contract start', type: 'date' },
        { name: 'contractEnd', label: 'Contract end / renewal date', type: 'date' },
        { name: 'autoRenews', label: 'Auto-renews?', type: 'checkbox', hint: 'Yes' },
        { name: 'cancellationNoticeDays', label: 'Cancellation notice (days)', type: 'number' },
        { name: 'monthlyCost', label: 'Monthly cost (USD)', type: 'number', step: '0.01' },
        { name: 'paymentTerms', label: 'Payment terms' },
        { name: 'active', label: 'Active vendor', type: 'checkbox', hint: 'Currently engaged' },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ],
    },
  ],
}

function toPayload(values) {
  return {
    ...values,
    category: values.category || values.folder,
    folder: values.folder || values.category,
    contractStart: values.contractStart || null,
    contractEnd: values.contractEnd || null,
    baaSignedOn: values.baaSignedOn || null,
    cancellationNoticeDays: values.cancellationNoticeDays === '' ? null : Number(values.cancellationNoticeDays),
    monthlyCost: values.monthlyCost === '' ? null : Number(values.monthlyCost),
    documents: values.documents || [],
  }
}
