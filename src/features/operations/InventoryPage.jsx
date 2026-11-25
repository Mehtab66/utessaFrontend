import { useEffect, useMemo, useState } from 'react'
import {
  Alert, Button, ConfirmModal, DataTable, FilterSelect, FormModal, Kpi, Modal, PageHeader, Pill, SearchInput, Tabs, Toolbar,
  fmtDate, fmtMoney, useToast,
} from '../crm/ui'
import Icon from '../../shared/ui/Icon'
import { ops } from './opsApi'
import { DueCell, HistoryList, LinkButton, daysUntil, personName, personOptions } from './opsShared'

const REQ_TONE = { Requested: 'blue', Approved: 'teal', Ordered: 'ink', Received: 'green', Denied: 'red', Cancelled: 'gray' }
const CATEGORIES = ['Medical supplies', 'Specialty supplies', 'Cleaning & infection control', 'Office supplies', 'Medications', 'Vaccines', 'Lab supplies', 'Other']
const ASSET_TYPES = ['Exam table', 'EKG machine', 'Ultrasound / echo machine', 'Monitor', 'AED', 'Autoclave', 'Refrigerator (vaccine / med)', 'Computer', 'Laptop', 'Printer', 'Scanner', 'Phone', 'Tablet', 'Network equipment', 'Furniture', 'Other']
const IT_TYPES = new Set(['Computer', 'Laptop', 'Printer', 'Scanner', 'Phone', 'Tablet', 'Network equipment'])
const num = (v) => (v === '' || v == null ? null : Number(v))

function stockState(i) {
  if (i.qty <= 0) return { tone: 'red', label: 'Out of stock' }
  if (i.reorderLevel != null && i.qty <= i.reorderLevel) return { tone: 'amber', label: 'Reorder' }
  return null
}

/** Supplies, equipment and device logins. Anyone can request supplies; admins approve, order and receive. */
export default function InventoryPage() {
  const [tab, setTab] = useState('supplies')
  const [admin, setAdmin] = useState(false)
  const [items, setItems] = useState([])
  const [assets, setAssets] = useState([])
  const [requests, setRequests] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [fCat, setFCat] = useState('ALL')
  const [fLoc, setFLoc] = useState('ALL')
  const [fStock, setFStock] = useState('ALL')
  const [fReq, setFReq] = useState('open')
  const [itemForm, setItemForm] = useState(null)
  const [assetForm, setAssetForm] = useState(null)
  const [requestForm, setRequestForm] = useState(null)
  const [orderForm, setOrderForm] = useState(null)
  const [serviceForm, setServiceForm] = useState(null)
  const [secret, setSecret] = useState(null)
  const [logOf, setLogOf] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [toast, showToast] = useToast()

  async function load() {
    setLoading(true)
    try {
      const [acc, it, as, rq] = await Promise.all([ops.inventoryAccess(), ops.items.list(), ops.assets.list(), ops.requests()])
      setAdmin(acc.admin)
      setItems(it)
      setAssets(as)
      setRequests(rq)
      if (acc.admin) {
        const [p, s] = await Promise.all([ops.providers().catch(() => []), ops.staff().catch(() => [])])
        setPeople([...p, ...s].filter((m) => m.status !== 'INACTIVE'))
      }
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const peopleById = useMemo(() => Object.fromEntries(people.map((m) => [m.id, m])), [people])
  const locations = [...new Set([...items, ...assets].map((x) => x.location).filter(Boolean))].sort()
  const low = items.filter((i) => stockState(i))
  const expiringLots = items.filter((i) => i.expiresOn && daysUntil(i.expiresOn) <= 60)
  const openReq = requests.filter((r) => ['Requested', 'Approved', 'Ordered'].includes(r.status))
  const pmDue = assets.filter((a) => a.nextPmDue && daysUntil(a.nextPmDue) <= 30)

  const shownItems = items.filter((i) => (!q || `${i.name} ${i.sku || ''} ${i.vendorName || ''}`.toLowerCase().includes(q.toLowerCase()))
    && (fCat === 'ALL' || i.category === fCat) && (fLoc === 'ALL' || i.location === fLoc)
    && (fStock === 'ALL' || (fStock === 'low' && stockState(i)) || (fStock === 'exp' && i.expiresOn && daysUntil(i.expiresOn) <= 60)))
  const shownAssets = assets.filter((a) => (!q || `${a.name} ${a.tag || ''} ${a.serial || ''} ${a.assetType}`.toLowerCase().includes(q.toLowerCase()))
    && (fLoc === 'ALL' || a.location === fLoc))
  const shownReq = requests.filter((r) => (!q || `${r.name} ${r.requestedByName || ''}`.toLowerCase().includes(q.toLowerCase()))
    && (fReq === 'ALL' || (fReq === 'open' ? ['Requested', 'Approved', 'Ordered'].includes(r.status) : r.status === fReq)))

  async function act(fn, msg) {
    try {
      await fn()
      if (msg) showToast(msg)
      load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const itemColumns = [
    { key: 'name', label: 'Item', render: (i) => <span className="flex flex-col"><b className="font-semibold">{i.name}</b><span className="text-[12px] text-mist-500">{[i.sku, i.manufacturer].filter(Boolean).join(' · ')}</span></span> },
    { key: 'category', label: 'Category' },
    { key: 'location', label: 'Location' },
    {
      key: 'qty', label: 'On hand', sortValue: (i) => i.qty,
      render: (i) => { const st = stockState(i); return <span className="flex flex-col items-start gap-1"><b className="font-mono font-semibold">{i.qty} {i.unit || ''}</b>{st && <Pill tone={st.tone}>{st.label}</Pill>}</span> },
    },
    { key: 'levels', label: 'Reorder / par', sortable: false, render: (i) => (i.reorderLevel != null || i.parLevel != null ? `${i.reorderLevel ?? '—'} / ${i.parLevel ?? '—'}` : '—') },
    { key: 'price', label: 'Unit price', render: (i) => (i.price != null ? `$${Number(i.price).toFixed(2)}` : '—') },
    { key: 'vendorName', label: 'Vendor' },
    { key: 'expiresOn', label: 'Lot expires', render: (i) => (i.expiresOn ? <DueCell date={i.expiresOn} window={60} /> : '—') },
    {
      key: 'actions', label: '', sortable: false,
      render: (i) => (
        <span className="flex justify-end gap-1">
          <LinkButton onClick={() => setRequestForm({ itemId: i.id, qty: Math.max(1, (i.parLevel || 0) - i.qty) || 1, __item: i })}>Request</LinkButton>
          <LinkButton onClick={() => act(() => ops.adjustItem(i.id, -1), `Used 1 ${i.unit || ''}`)} disabled={i.qty <= 0}>Use 1</LinkButton>
          {admin && <LinkButton onClick={() => setItemForm(i)}>Edit</LinkButton>}
          {admin && <LinkButton tone="danger" onClick={() => setConfirm({ item: i })}>Delete</LinkButton>}
        </span>
      ),
    },
  ]

  const assetColumns = [
    { key: 'name', label: 'Equipment', render: (a) => <span className="flex flex-col"><b className="font-semibold">{a.name}</b><span className="text-[12px] text-mist-500">{[a.tag, a.assetType, a.manufacturer].filter(Boolean).join(' · ')}</span></span> },
    { key: 'location', label: 'Location', render: (a) => [a.location, a.room].filter(Boolean).join(' · ') },
    ...(admin ? [{ key: 'assigned', label: 'Assigned to', render: (a) => personName(peopleById[a.assignedStaffId]) || '—' }] : []),
    { key: 'status', label: 'Status', render: (a) => <Pill tone={a.status === 'In use' ? 'green' : a.status === 'Repair' ? 'amber' : 'gray'}>{a.status}</Pill> },
    { key: 'serial', label: 'Serial #' },
    { key: 'warrantyEnds', label: 'Warranty', render: (a) => (a.warrantyEnds ? <DueCell date={a.warrantyEnds} /> : '—') },
    { key: 'nextPmDue', label: 'Next maintenance', render: (a) => (a.nextPmDue ? <DueCell date={a.nextPmDue} window={30} /> : '—') },
    ...(admin ? [{ key: 'login', label: 'Device login', sortable: false, render: (a) => (a.itUsername || a.hasPassword ? <span className="flex flex-col text-[12.5px]"><span>{a.itHost}{a.itIp ? ` · ${a.itIp}` : ''}</span><span className="text-mist-600">{a.itUsername}{a.hasPassword ? ' · ••••••' : ''}</span></span> : '—') }] : []),
    {
      key: 'actions', label: '', sortable: false,
      render: (a) => (
        <span className="flex justify-end gap-1">
          {(a.service || []).length > 0 && <LinkButton onClick={() => setLogOf({ title: `${a.name} · service history`, items: a.service.map((s) => ({ date: s.date, status: s.kind, note: [s.notes, s.cost != null ? fmtMoney(s.cost) : null].filter(Boolean).join(' · '), by: s.by })) })}>History</LinkButton>}
          {admin && a.hasPassword && <LinkButton onClick={() => act(async () => { const s = await ops.revealPassword(a.id); setSecret({ asset: a, password: s.password }) })}>Show password</LinkButton>}
          {admin && <LinkButton onClick={() => setServiceForm({ asset: a })}>Log service</LinkButton>}
          {admin && <LinkButton onClick={() => setAssetForm(a)}>Edit</LinkButton>}
          {admin && <LinkButton tone="danger" onClick={() => setConfirm({ asset: a })}>Delete</LinkButton>}
        </span>
      ),
    },
  ]

  const requestColumns = [
    { key: 'name', label: 'Item', render: (r) => <span className="flex flex-col"><b className="font-semibold">{r.name}</b><span className="text-[12px] text-mist-500">{r.qty} {r.unit || ''}{r.sku ? ` · ${r.sku}` : ''}</span></span> },
    { key: 'requestedByName', label: 'Requested by', render: (r) => `${r.requestedByName || '—'}${r.mine ? ' (you)' : ''}` },
    { key: 'createdAt', label: 'Requested', render: (r) => fmtDate(r.createdAt) },
    { key: 'neededBy', label: 'Needed by', render: (r) => fmtDate(r.neededBy) },
    { key: 'priority', label: 'Priority', render: (r) => <Pill tone={r.priority === 'Urgent' ? 'red' : 'gray'}>{r.priority}</Pill> },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={REQ_TONE[r.status]} dot>{r.status}</Pill> },
    { key: 'estimate', label: 'Estimate', render: (r) => (r.estimate != null ? `$${Number(r.estimate).toFixed(2)}` : '—') },
    { key: 'order', label: 'Order', sortable: false, render: (r) => (r.poNumber || r.vendorName ? <span className="text-[12.5px]">{[r.vendorName, r.poNumber].filter(Boolean).join(' · ')}{r.eta ? <span className="block text-mist-500">ETA {fmtDate(r.eta)}</span> : null}</span> : '—') },
    {
      key: 'actions', label: '', sortable: false,
      render: (r) => {
        const st = r.status
        return (
          <span className="flex justify-end gap-1">
            <LinkButton onClick={() => setLogOf({ title: `${r.name} · activity`, items: (r.log || []).map((l) => ({ at: l.at, text: l.text })), reason: r.reason })}>Log</LinkButton>
            {admin && st === 'Requested' && <LinkButton onClick={() => act(() => ops.requestStatus(r.id, { status: 'Approved' }), 'Approved')}>Approve</LinkButton>}
            {admin && ['Requested', 'Approved'].includes(st) && <LinkButton onClick={() => setOrderForm({ request: r, mode: 'Ordered', vendorName: r.vendorName || '', qty: r.qty })}>Order</LinkButton>}
            {admin && ['Approved', 'Ordered'].includes(st) && <LinkButton onClick={() => setOrderForm({ request: r, mode: 'Received', receivedQty: r.qty, unitCost: r.unitCost ?? '' })}>Receive</LinkButton>}
            {admin && st === 'Requested' && <LinkButton tone="danger" onClick={() => setOrderForm({ request: r, mode: 'Denied' })}>Deny</LinkButton>}
            {(r.mine || admin) && ['Requested', 'Approved'].includes(st) && <LinkButton tone="danger" onClick={() => act(() => ops.requestStatus(r.id, { status: 'Cancelled' }), 'Cancelled')}>Cancel</LinkButton>}
          </span>
        )
      },
    },
  ]

  const tabs = [
    { value: 'supplies', label: 'Supplies', count: items.length || null },
    { value: 'equipment', label: 'Equipment & devices', count: assets.length || null },
    { value: 'requests', label: admin ? 'Requests' : 'My requests', count: openReq.length || null },
  ]

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={admin
          ? 'Supplies, equipment and device logins. Staff ask for what they need; you approve, order and receive it into stock.'
          : 'See what is in stock and ask for supplies. An admin approves and orders them, and you can follow your requests here.'}
        actions={
          <>
            <Button variant={admin ? 'secondary' : 'primary'} onClick={() => setRequestForm({ qty: 1, priority: 'Routine' })}>Request supplies</Button>
            {admin && tab === 'equipment' && <Button onClick={() => setAssetForm({})}><Icon name="plus" className="h-4 w-4" /> Add equipment</Button>}
            {admin && tab !== 'equipment' && <Button onClick={() => setItemForm({})}><Icon name="plus" className="h-4 w-4" /> Add supply</Button>}
          </>
        }
      />
      <Alert>{error}</Alert>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Low or out of stock" value={low.length} hint="At or below reorder level" tone="amber" onClick={() => { setTab('supplies'); setFStock('low') }} />
        <Kpi label="Lots expiring ≤ 60d" value={expiringLots.length} hint="Use first or replace" tone="red" onClick={() => { setTab('supplies'); setFStock('exp') }} />
        <Kpi label={admin ? 'Open requests' : 'My open requests'} value={openReq.length} hint={`${requests.filter((r) => r.status === 'Requested').length} waiting for approval`} tone="blue" onClick={() => { setTab('requests'); setFReq('open') }} />
        <Kpi label="Maintenance due ≤ 30d" value={pmDue.length} hint="Preventive maintenance" tone="ink" onClick={() => setTab('equipment')} />
        <Kpi label="Equipment tracked" value={assets.length} hint={admin ? fmtMoney(assets.reduce((s, a) => s + Number(a.price || 0), 0)) : 'In the practice'} tone="gray" onClick={() => setTab('equipment')} />
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search…" />
        {tab !== 'requests' && locations.length > 0 && <FilterSelect label="Location" value={fLoc} onChange={setFLoc} allLabel="All locations" options={locations.map((l) => ({ value: l, label: l }))} />}
        {tab === 'supplies' && <FilterSelect label="Category" value={fCat} onChange={setFCat} allLabel="Any category" options={CATEGORIES.map((c) => ({ value: c, label: c }))} />}
        {tab === 'supplies' && <FilterSelect label="Stock" value={fStock} onChange={setFStock} allLabel="All items" options={[{ value: 'low', label: 'Low or out' }, { value: 'exp', label: 'Lot expiring ≤ 60d' }]} />}
        {tab === 'requests' && <FilterSelect label="Status" value={fReq} onChange={setFReq} allLabel="All" options={[{ value: 'open', label: 'Open' }, ...Object.keys(REQ_TONE).map((s) => ({ value: s, label: s }))]} />}
      </Toolbar>
      {tab === 'supplies' && <DataTable columns={itemColumns} rows={shownItems} loading={loading} empty={admin ? 'No supplies yet. Add the items you stock, with reorder and par levels.' : 'No supplies have been added yet.'} />}
      {tab === 'equipment' && <DataTable columns={assetColumns} rows={shownAssets} loading={loading} empty={admin ? 'No equipment yet. Add exam tables, EKG machines, computers and other devices.' : 'No equipment has been added yet.'} />}
      {tab === 'requests' && <DataTable columns={requestColumns} rows={shownReq} loading={loading} empty="No requests here." />}

      <FormModal
        open={Boolean(itemForm)}
        title={itemForm?.id ? 'Edit supply' : 'Add a supply'}
        initial={itemForm?.id ? itemForm : { category: 'Medical supplies', unit: 'box', qty: 0 }}
        sections={[
          { title: 'Item', fields: [
            { name: 'name', label: 'Item name *', required: true, span: 2 },
            { name: 'sku', label: 'SKU / catalog #' },
            { name: 'manufacturer', label: 'Manufacturer' },
            { name: 'category', label: 'Category', type: 'select', options: CATEGORIES },
            { name: 'vendorName', label: 'Usual vendor' },
            { name: 'unit', label: 'Unit', placeholder: 'box, case, each' },
            { name: 'price', label: 'Unit price (USD)', type: 'number', step: '0.01' },
          ] },
          { title: 'Stock', fields: [
            { name: 'qty', label: 'On hand', type: 'number' },
            { name: 'location', label: 'Location' },
            { name: 'reorderLevel', label: 'Reorder at', type: 'number', hint: 'Flagged when stock falls to this level' },
            { name: 'parLevel', label: 'Par level', type: 'number', hint: 'How many you want on hand' },
            { name: 'lot', label: 'Lot #' },
            { name: 'expiresOn', label: 'Lot expires', type: 'date' },
            { name: 'notes', label: 'Notes', type: 'textarea' },
          ] },
        ]}
        onClose={() => setItemForm(null)}
        onSubmit={async (v) => {
          const body = { ...v, price: num(v.price), qty: num(v.qty) ?? 0, reorderLevel: num(v.reorderLevel), parLevel: num(v.parLevel), expiresOn: v.expiresOn || null }
          if (itemForm.id) await ops.items.update(itemForm.id, body)
          else await ops.items.create(body)
          setItemForm(null)
          showToast('Supply saved')
          load()
        }}
      />
      <FormModal
        open={Boolean(assetForm)}
        title={assetForm?.id ? 'Edit equipment' : 'Add equipment'}
        size="xl"
        initial={assetForm?.id ? { ...assetForm, itPassword: '' } : { assetType: 'Computer', status: 'In use' }}
        sections={[
          { title: 'Equipment', fields: [
            { name: 'assetType', label: 'Type *', required: true, type: 'select', noEmpty: true, options: ASSET_TYPES },
            { name: 'name', label: 'Name / model *', required: true },
            { name: 'tag', label: 'Asset tag', placeholder: 'Assigned automatically if empty' },
            { name: 'manufacturer', label: 'Manufacturer' },
            { name: 'serial', label: 'Serial #' },
            { name: 'status', label: 'Status', type: 'select', noEmpty: true, options: ['In use', 'In storage', 'Repair', 'Retired'] },
            { name: 'location', label: 'Location' },
            { name: 'room', label: 'Room' },
            { name: 'assignedStaffId', label: 'Assigned to', type: 'select', emptyLabel: 'Nobody', options: personOptions(people) },
            { name: 'vendorName', label: 'Service vendor' },
          ] },
          { title: 'Purchase & maintenance', fields: [
            { name: 'purchasedOn', label: 'Purchased', type: 'date' },
            { name: 'price', label: 'Price (USD)', type: 'number', step: '0.01' },
            { name: 'warrantyEnds', label: 'Warranty ends', type: 'date' },
            { name: 'pmMonths', label: 'Preventive maintenance every (months)', type: 'number' },
            { name: 'lastPmOn', label: 'Last maintenance', type: 'date' },
            { name: 'notes', label: 'Notes', type: 'textarea' },
          ] },
          { title: 'Device login', hint: 'Only inventory admins can see these. The password is stored encrypted and shown only on request.', fields: [
            { name: 'itHost', label: 'Hostname / extension', show: (v) => IT_TYPES.has(v.assetType) },
            { name: 'itIp', label: 'IP address', show: (v) => IT_TYPES.has(v.assetType) },
            { name: 'itUsername', label: 'Username', show: (v) => IT_TYPES.has(v.assetType) },
            { name: 'itPassword', label: 'Password', type: 'password', show: (v) => IT_TYPES.has(v.assetType), hint: assetForm?.hasPassword ? 'Leave empty to keep the saved password' : '' },
            { name: 'itOs', label: 'Operating system', show: (v) => IT_TYPES.has(v.assetType) },
            { name: 'itRotatedOn', label: 'Password last changed', type: 'date', show: (v) => IT_TYPES.has(v.assetType) },
          ] },
        ]}
        onClose={() => setAssetForm(null)}
        onSubmit={async (v) => {
          const body = { ...v, price: num(v.price), pmMonths: num(v.pmMonths), assignedStaffId: v.assignedStaffId || null }
          ;['purchasedOn', 'warrantyEnds', 'lastPmOn', 'itRotatedOn'].forEach((k) => { if (!body[k]) body[k] = null })
          body.itPassword = v.itPassword ? v.itPassword : null
          delete body.service
          if (assetForm.id) await ops.assets.update(assetForm.id, body)
          else await ops.assets.create(body)
          setAssetForm(null)
          showToast('Equipment saved')
          load()
        }}
      />
      <FormModal
        open={Boolean(requestForm)}
        size="md"
        title="Request supplies"
        subtitle={requestForm?.__item ? `${requestForm.__item.name} · ${requestForm.__item.qty} ${requestForm.__item.unit || ''} on hand` : 'Pick a stocked item or describe something new.'}
        initial={requestForm || {}}
        sections={[{
          fields: [
            { name: 'itemId', label: 'Item', type: 'select', emptyLabel: 'Something new (describe below)', options: items.map((i) => ({ value: i.id, label: `${i.name}${i.location ? ` · ${i.location}` : ''}` })), span: 2 },
            { name: 'name', label: 'What do you need? *', show: (v) => !v.itemId, span: 2 },
            { name: 'qty', label: 'Quantity *', required: true, type: 'number', min: 1 },
            { name: 'unit', label: 'Unit', show: (v) => !v.itemId },
            { name: 'neededBy', label: 'Needed by', type: 'date' },
            { name: 'priority', label: 'Priority', type: 'select', noEmpty: true, options: ['Routine', 'Urgent'] },
            { name: 'reason', label: 'Why / notes', type: 'textarea' },
          ],
        }]}
        submitLabel="Send request"
        onClose={() => setRequestForm(null)}
        onSubmit={async (v) => {
          if (!v.itemId && !String(v.name || '').trim()) throw new Error('Say what you need.')
          await ops.createRequest({ itemId: v.itemId || null, name: v.name, unit: v.unit, qty: Number(v.qty), neededBy: v.neededBy || null, priority: v.priority, reason: v.reason })
          setRequestForm(null)
          setTab('requests')
          setFReq('open')
          showToast('Request sent')
          load()
        }}
      />
      <FormModal
        open={Boolean(orderForm)}
        size="md"
        title={orderForm?.mode === 'Ordered' ? 'Mark as ordered' : orderForm?.mode === 'Received' ? 'Receive into stock' : 'Deny request'}
        subtitle={orderForm ? `${orderForm.request.name} · ${orderForm.request.qty} ${orderForm.request.unit || ''}` : ''}
        initial={orderForm || {}}
        sections={[{
          fields: orderForm?.mode === 'Ordered' ? [
            { name: 'vendorName', label: 'Vendor' },
            { name: 'poNumber', label: 'PO #' },
            { name: 'eta', label: 'Expected', type: 'date' },
            { name: 'unitCost', label: 'Unit cost (USD)', type: 'number', step: '0.01' },
            { name: 'note', label: 'Note', type: 'textarea' },
          ] : orderForm?.mode === 'Received' ? [
            { name: 'receivedQty', label: 'Quantity received', type: 'number', hint: orderForm?.request.itemId ? 'Added to the item’s stock' : 'New item: add it under Supplies to track stock' },
            { name: 'unitCost', label: 'Unit cost (USD)', type: 'number', step: '0.01' },
            { name: 'note', label: 'Note', type: 'textarea' },
          ] : [
            { name: 'note', label: 'Reason (shown to the requester)', type: 'textarea' },
          ],
        }]}
        submitLabel={orderForm?.mode === 'Ordered' ? 'Mark ordered' : orderForm?.mode === 'Received' ? 'Receive' : 'Deny'}
        onClose={() => setOrderForm(null)}
        onSubmit={async (v) => {
          await ops.requestStatus(orderForm.request.id, { status: orderForm.mode, poNumber: v.poNumber, vendorName: v.vendorName, eta: v.eta || null, unitCost: num(v.unitCost), receivedQty: num(v.receivedQty), note: v.note })
          setOrderForm(null)
          showToast(orderForm.mode)
          load()
        }}
      />
      <FormModal
        open={Boolean(serviceForm)}
        size="md"
        title="Log service"
        subtitle={serviceForm?.asset.name}
        initial={{ date: new Date().toISOString().slice(0, 10), kind: 'Preventive maintenance' }}
        sections={[{
          fields: [
            { name: 'date', label: 'Date *', type: 'date', required: true },
            { name: 'kind', label: 'Type *', required: true, type: 'select', noEmpty: true, options: ['Preventive maintenance', 'Repair', 'Calibration', 'Safety inspection', 'Software update', 'Other'] },
            { name: 'by', label: 'Done by' },
            { name: 'cost', label: 'Cost (USD)', type: 'number', step: '0.01' },
            { name: 'notes', label: 'Notes', type: 'textarea' },
          ],
        }]}
        onClose={() => setServiceForm(null)}
        onSubmit={async (v) => {
          await ops.addService(serviceForm.asset.id, { ...v, cost: num(v.cost) })
          setServiceForm(null)
          showToast('Service logged')
          load()
        }}
      />
      <Modal open={Boolean(secret)} size="sm" title={`${secret?.asset.name || ''} login`} onClose={() => setSecret(null)} footer={<Button onClick={() => setSecret(null)}>Done</Button>}>
        {secret && (
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
            <dt className="text-mist-600">Host</dt><dd className="m-0">{secret.asset.itHost || '—'}</dd>
            <dt className="text-mist-600">Username</dt><dd className="m-0 font-mono">{secret.asset.itUsername || '—'}</dd>
            <dt className="text-mist-600">Password</dt><dd className="m-0 font-mono">{secret.password}</dd>
          </dl>
        )}
      </Modal>
      <Modal open={Boolean(logOf)} size="md" title={logOf?.title} onClose={() => setLogOf(null)} footer={<Button onClick={() => setLogOf(null)}>Close</Button>}>
        {logOf?.reason && <p className="m-0 mb-3 text-[13px] text-mist-700"><b className="font-semibold text-ink-950">Reason:</b> {logOf.reason}</p>}
        <HistoryList items={logOf?.items} />
      </Modal>
      <ConfirmModal
        open={Boolean(confirm)}
        title="Delete?"
        message={confirm?.item ? `Delete ${confirm.item.name}?` : `Delete ${confirm?.asset?.name} and its service history?`}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          await act(() => (confirm.item ? ops.items.remove(confirm.item.id) : ops.assets.remove(confirm.asset.id)), 'Deleted')
          setConfirm(null)
        }}
      />
      {toast}
    </div>
  )
}
