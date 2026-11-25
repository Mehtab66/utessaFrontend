import { useEffect, useState } from 'react'
import { Alert, FilterSelect, Kpi, PageHeader, SearchInput, Toolbar, fmtMoney, useToast } from '../crm/ui'
import { ops } from './opsApi'
import { InvoiceTable, invoiceState, invoiceTotals } from './vendorInvoices'

/** Every vendor invoice in one list: what is unpaid, overdue or disputed. */
export default function VendorInvoicesPage() {
  const [vendors, setVendors] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('ALL')
  const [fVendor, setFVendor] = useState('ALL')
  const [toast, showToast] = useToast()

  async function load() {
    setLoading(true)
    try {
      const [v, i] = await Promise.all([ops.vendors(), ops.invoices.list()])
      setVendors(v)
      setInvoices(i)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const t = invoiceTotals(invoices)
  const byId = Object.fromEntries(vendors.map((v) => [v.id, v]))
  const shown = invoices.filter((i) => (!q || `${byId[i.vendorId]?.name || ''} ${i.number} ${i.description || ''}`.toLowerCase().includes(q.toLowerCase()))
    && (fVendor === 'ALL' || i.vendorId === fVendor)
    && (fStatus === 'ALL' || (fStatus === 'Overdue' ? invoiceState(i).label === 'Overdue' : i.status === fStatus)))

  return (
    <div>
      <PageHeader title="Vendor invoices" subtitle="Invoices from every vendor: what is due, overdue, disputed and paid, with the PDF kept in the vendor’s Invoices folder." />
      <Alert>{error}</Alert>
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Unpaid" value={fmtMoney(t.unpaid)} hint={`${t.unpaidN} invoice${t.unpaidN === 1 ? '' : 's'}`} tone="amber" onClick={() => setFStatus('Unpaid')} />
        <Kpi label="Overdue" value={fmtMoney(t.overdue)} hint={`${t.overdueN} past due`} tone="red" onClick={() => setFStatus('Overdue')} />
        <Kpi label="Paid this year" value={fmtMoney(t.paidYear)} tone="green" onClick={() => setFStatus('Paid')} />
        <Kpi label="Disputed" value={t.disputedN} tone="gray" onClick={() => setFStatus('Disputed')} />
      </div>
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search vendor, invoice # or description…" />
        <FilterSelect label="Vendor" value={fVendor} onChange={setFVendor} allLabel="All vendors" options={vendors.map((v) => ({ value: v.id, label: v.name }))} />
        <FilterSelect label="Status" value={fStatus} onChange={setFStatus} allLabel="Any status" options={['Unpaid', 'Overdue', 'Paid', 'Disputed', 'Void'].map((s) => ({ value: s, label: s }))} />
      </Toolbar>
      <InvoiceTable invoices={shown} vendors={vendors} loading={loading} onChanged={load} onToast={showToast} />
      {toast}
    </div>
  )
}
