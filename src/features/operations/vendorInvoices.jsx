import { useState } from 'react'
import { Button, DataTable, FormModal, Pill, fmtDate } from '../crm/ui'
import { ops } from './opsApi'
import { LinkButton, daysUntil, today } from './opsShared'

export const INVOICE_TONE = { Unpaid: 'amber', Paid: 'green', Disputed: 'red', Void: 'gray' }

export function invoiceState(inv) {
  if (inv.status === 'Unpaid' && inv.dueDate && daysUntil(inv.dueDate) < 0) return { tone: 'red', label: 'Overdue' }
  return { tone: INVOICE_TONE[inv.status] || 'gray', label: inv.status }
}

/** Table of invoices plus the add / edit form (with an optional PDF saved to the vendor's Invoices folder). */
export function InvoiceTable({ invoices, vendors, loading, showVendor = true, onChanged, onToast, fixedVendorId, addLabel }) {
  const [form, setForm] = useState(null)
  const [file, setFile] = useState(null)
  const vendorById = Object.fromEntries(vendors.map((v) => [v.id, v]))

  const columns = [
    ...(showVendor ? [{ key: 'vendor', label: 'Vendor', sortValue: (i) => vendorById[i.vendorId]?.name || '', render: (i) => <b className="font-semibold">{vendorById[i.vendorId]?.name || '—'}</b> }] : []),
    { key: 'number', label: 'Invoice #', render: (i) => <span className="font-mono text-[12.5px]">{i.number}</span> },
    { key: 'invoiceDate', label: 'Date', render: (i) => fmtDate(i.invoiceDate) },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount', align: 'right', sortValue: (i) => Number(i.amount || 0), render: (i) => (i.amount != null ? `$${Number(i.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—') },
    { key: 'dueDate', label: 'Due', render: (i) => fmtDate(i.dueDate) },
    { key: 'status', label: 'Status', render: (i) => { const s = invoiceState(i); return <Pill tone={s.tone} dot>{s.label}</Pill> } },
    { key: 'paid', label: 'Paid', sortable: false, render: (i) => (i.status === 'Paid' ? <span className="text-[12.5px]">{fmtDate(i.paidOn)}{i.method ? ` · ${i.method}` : ''}{i.reference ? <span className="block text-mist-500">{i.reference}</span> : null}</span> : '—') },
    {
      key: 'actions', label: '', sortable: false,
      render: (i) => (
        <span className="flex justify-end gap-1">
          {i.fileId && <a className="rounded-md px-2 py-1 text-[12.5px] font-semibold text-brand-700 hover:bg-brand-50" href={ops.fileUrl(i.fileId)} target="_blank" rel="noopener noreferrer">PDF</a>}
          {i.status === 'Unpaid' && <LinkButton onClick={() => setForm({ ...i, status: 'Paid', paidOn: today(), paidAmount: i.amount })}>Mark paid</LinkButton>}
          <LinkButton onClick={() => setForm(i)}>Edit</LinkButton>
          <LinkButton tone="danger" onClick={async () => {
            if (!window.confirm(`Delete invoice ${i.number}?`)) return
            try { await ops.invoices.remove(i.id); onToast?.('Invoice deleted'); onChanged() } catch (e) { onToast?.(e.message, 'error') }
          }}>Delete</LinkButton>
        </span>
      ),
    },
  ]

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => { setFile(null); setForm({ vendorId: fixedVendorId || '', status: 'Unpaid', invoiceDate: today() }) }}>{addLabel || 'Add invoice'}</Button>
      </div>
      <DataTable columns={columns} rows={invoices} loading={loading} empty="No invoices yet." />
      <FormModal
        open={Boolean(form)}
        size="md"
        title={form?.id ? `Invoice ${form.number}` : 'Add an invoice'}
        initial={form || {}}
        sections={[
          { fields: [
            { name: 'vendorId', label: 'Vendor *', required: true, type: 'select', options: vendors.map((v) => ({ value: v.id, label: v.name })), show: () => !fixedVendorId && !form?.id, span: 2 },
            { name: 'number', label: 'Invoice # *', required: true },
            { name: 'amount', label: 'Amount (USD)', type: 'number', step: '0.01' },
            { name: 'invoiceDate', label: 'Invoice date', type: 'date' },
            { name: 'dueDate', label: 'Due date', type: 'date' },
            { name: 'description', label: 'Description', span: 2 },
            { name: 'status', label: 'Status', type: 'select', noEmpty: true, options: ['Unpaid', 'Paid', 'Disputed', 'Void'] },
          ] },
          { title: 'Payment', fields: [
            { name: 'paidOn', label: 'Paid on', type: 'date', show: (v) => v.status === 'Paid' },
            { name: 'paidAmount', label: 'Amount paid', type: 'number', step: '0.01', show: (v) => v.status === 'Paid' },
            { name: 'method', label: 'Method', type: 'select', options: ['ACH', 'Autopay', 'Check', 'Credit card', 'Wire'], show: (v) => v.status === 'Paid' },
            { name: 'reference', label: 'Payment reference', show: (v) => v.status === 'Paid' },
          ] },
        ]}
        extraFooter={
          <label className="mr-auto flex items-center gap-2 text-[12.5px] font-semibold text-navy">
            Invoice PDF
            <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="max-w-[200px] text-[12px]" />
          </label>
        }
        onClose={() => setForm(null)}
        onSubmit={async (v) => {
          const vendorId = fixedVendorId || v.vendorId || form.vendorId
          let fileId = form.fileId || null
          if (file) {
            const folders = await ops.folders('VENDOR', vendorId)
            const inv = folders.find((f) => f.locked && f.name === 'Invoices')
            const up = await ops.uploadFile('VENDOR', file, { vendorId, folderId: inv?.id || '' })
            fileId = up.id
          }
          const body = {
            ...v, vendorId, fileId,
            amount: v.amount === '' || v.amount == null ? null : Number(v.amount),
            paidAmount: v.paidAmount === '' || v.paidAmount == null ? null : Number(v.paidAmount),
            invoiceDate: v.invoiceDate || null, dueDate: v.dueDate || null, paidOn: v.paidOn || null,
          }
          if (form.id) await ops.invoices.update(form.id, body)
          else await ops.invoices.create(body)
          setForm(null)
          onToast?.('Invoice saved')
          onChanged()
        }}
      />
    </>
  )
}

export function invoiceTotals(invoices) {
  const unpaid = invoices.filter((i) => i.status === 'Unpaid')
  const overdue = unpaid.filter((i) => i.dueDate && daysUntil(i.dueDate) < 0)
  const year = new Date().getFullYear()
  return {
    unpaidN: unpaid.length,
    unpaid: unpaid.reduce((s, i) => s + Number(i.amount || 0), 0),
    overdueN: overdue.length,
    overdue: overdue.reduce((s, i) => s + Number(i.amount || 0), 0),
    paidYear: invoices.filter((i) => i.status === 'Paid' && String(i.paidOn || '').startsWith(String(year))).reduce((s, i) => s + Number(i.paidAmount || i.amount || 0), 0),
    disputedN: invoices.filter((i) => i.status === 'Disputed').length,
  }
}

