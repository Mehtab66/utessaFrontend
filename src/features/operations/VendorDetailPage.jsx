import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Card, DetailGrid, Kpi, Loading, PageHeader, Pill, Tabs, fmtDate, fmtMoney, useToast } from '../crm/ui'
import { ops } from './opsApi'
import LibraryBrowser from './LibraryBrowser'
import { InvoiceTable, invoiceTotals } from './vendorInvoices'
import { DueCell } from './opsShared'

const BAA_TONE = { SIGNED: 'green', PENDING: 'amber', MISSING: 'red', NOT_REQUIRED: 'gray' }

/** One vendor: details, invoices and its file cabinet. */
export default function VendorDetailPage() {
  const { id } = useParams()
  const [vendor, setVendor] = useState(null)
  const [vendors, setVendors] = useState([])
  const [invoices, setInvoices] = useState([])
  const [tab, setTab] = useState('overview')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, showToast] = useToast()

  async function load() {
    try {
      const [all, inv] = await Promise.all([ops.vendors(), ops.invoices.list({ vendorId: id })])
      const v = all.find((x) => x.id === id)
      if (!v) throw new Error('Vendor not found.')
      setVendors(all)
      setVendor(v)
      setInvoices(inv)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loading />
  if (!vendor) return <div><PageHeader title="Vendor" /><Alert>{error}</Alert><Link to="/app/vendors" className="text-sm font-semibold text-brand-700">Back to vendors</Link></div>
  const t = invoiceTotals(invoices)

  return (
    <div>
      <p className="mb-2 text-[13px]"><Link to="/app/vendors" className="font-semibold text-brand-700 hover:underline">Vendors</Link> <span className="text-mist-400">›</span> <span className="text-mist-600">{vendor.name}</span></p>
      <PageHeader
        title={vendor.name}
        subtitle={[vendor.specialty, vendor.folder || vendor.category, vendor.contactName].filter(Boolean).join(' · ')}
        actions={<><Pill tone={vendor.handlesPhi ? 'red' : 'gray'}>{vendor.handlesPhi ? 'Handles PHI' : 'No PHI'}</Pill><Pill tone={BAA_TONE[vendor.baaStatus]} dot>BAA {String(vendor.baaStatus || '').replace('_', ' ').toLowerCase()}</Pill></>}
      />
      <Alert>{error}</Alert>
      {vendor.handlesPhi && vendor.baaStatus !== 'SIGNED' && <Alert tone="warn">This vendor handles patient data but has no signed Business Associate Agreement. Upload the signed BAA to “BAA and compliance” and update the vendor record.</Alert>}
      <Tabs tabs={[{ value: 'overview', label: 'Overview' }, { value: 'invoices', label: 'Invoices', count: invoices.length || null }, { value: 'files', label: 'Files' }]} value={tab} onChange={setTab} />
      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card title="Vendor details">
            <DetailGrid items={[
              ['Contact', [vendor.contactName, vendor.contactRole].filter(Boolean).join(' · ')],
              ['Phone', vendor.phone],
              ['Email', vendor.email],
              ['Website', vendor.website],
              ['Account #', vendor.accountNumber],
              ['Specialty', vendor.specialty],
              ['Folder', vendor.folder || vendor.category],
              ['Contract', vendor.contractStart || vendor.contractEnd ? `${fmtDate(vendor.contractStart)} – ${fmtDate(vendor.contractEnd)}` : null],
              ['Auto-renews', vendor.autoRenews ? `Yes${vendor.cancellationNoticeDays ? ` · ${vendor.cancellationNoticeDays} days notice` : ''}` : 'No'],
              ['Monthly cost', vendor.monthlyCost != null ? fmtMoney(vendor.monthlyCost) : null],
              ['Payment terms', vendor.paymentTerms],
              ['BAA signed', fmtDate(vendor.baaSignedOn)],
              ['Notes', vendor.notes],
            ]} />
            <p className="m-0 mt-3 text-[12.5px] text-mist-600">Edit these details from the vendor list.</p>
          </Card>
          <div className="space-y-4">
            {vendor.contractEnd && (
              <Card title="Contract renewal">
                <DueCell date={vendor.contractEnd} />
                {vendor.autoRenews && <p className="m-0 mt-2 text-[12.5px] text-mist-600">Auto-renews — review before the {vendor.cancellationNoticeDays || 30}-day notice window.</p>}
              </Card>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Unpaid" value={fmtMoney(t.unpaid)} hint={`${t.unpaidN} invoices`} tone="amber" onClick={() => setTab('invoices')} />
              <Kpi label="Paid this year" value={fmtMoney(t.paidYear)} tone="green" onClick={() => setTab('invoices')} />
            </div>
          </div>
        </div>
      )}
      {tab === 'invoices' && <InvoiceTable invoices={invoices} vendors={vendors} showVendor={false} fixedVendorId={vendor.id} onChanged={load} onToast={showToast} />}
      {tab === 'files' && <LibraryBrowser space="VENDOR" vendorId={vendor.id} />}
      {toast}
    </div>
  )
}
