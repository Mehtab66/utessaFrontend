import { api } from '../../shared/api/client'

/* Practice Operations API (all under /api/v1/operations, gated by the Operations module). */

const BASE = '/api/v1/operations'
const API_ROOT = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

function qs(params = {}) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'ALL') return
    sp.set(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

async function upload(path, form) {
  const res = await fetch(`${API_ROOT}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'Utessa' },
    body: form,
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const error = new Error(data?.message || (res.status === 413 ? 'That file is too large (10 MB max).' : 'Upload failed'))
    error.status = res.status
    throw error
  }
  return data
}

const crud = (path) => ({
  list: (params) => api(`${BASE}/${path}${qs(params)}`),
  create: (body) => api(`${BASE}/${path}`, { method: 'POST', body }),
  update: (id, body) => api(`${BASE}/${path}/${id}`, { method: 'PUT', body }),
  remove: (id) => api(`${BASE}/${path}/${id}`, { method: 'DELETE' }),
})

export const ops = {
  // People (existing endpoints)
  providers: () => api('/api/v1/providers'),
  staff: () => api('/api/v1/staff'),
  updateProvider: (id, body) => api(`/api/v1/providers/${id}`, { method: 'PUT', body }),
  updateStaff: (id, body) => api(`/api/v1/staff/${id}`, { method: 'PUT', body }),
  createStaff: (body) => api('/api/v1/staff', { method: 'POST', body }),
  vendors: () => api('/api/v1/vendors'),

  // Credentialing
  credOptions: () => api(`${BASE}/credentialing/options`),
  compliance: () => api(`${BASE}/compliance/providers`),
  payers: crud('payers'),
  enrollments: crud('enrollments'),
  facilities: crud('facilities'),
  privileges: crud('privileges'),

  // Trackers
  trackers: (scope) => api(`${BASE}/trackers${qs({ scope })}`),
  createTracker: (body) => api(`${BASE}/trackers`, { method: 'POST', body }),
  updateTracker: (id, body) => api(`${BASE}/trackers/${id}`, { method: 'PUT', body }),
  deleteTracker: (id) => api(`${BASE}/trackers/${id}`, { method: 'DELETE' }),
  trackerRows: (params) => api(`${BASE}/trackers/rows${qs(params)}`),
  createRow: (body) => api(`${BASE}/trackers/rows`, { method: 'POST', body }),
  updateRow: (id, body) => api(`${BASE}/trackers/rows/${id}`, { method: 'PUT', body }),
  deleteRow: (id) => api(`${BASE}/trackers/rows/${id}`, { method: 'DELETE' }),

  // Folders, files, drafts
  libraryAccess: (space) => api(`${BASE}/libraries/${space}/access`),
  folders: (space, vendorId) => api(`${BASE}/folders${qs({ space, vendorId })}`),
  createFolder: (body) => api(`${BASE}/folders`, { method: 'POST', body }),
  updateFolder: (id, body) => api(`${BASE}/folders/${id}`, { method: 'PUT', body }),
  deleteFolder: (id) => api(`${BASE}/folders/${id}`, { method: 'DELETE' }),
  files: (space, params = {}) => api(`${BASE}/files${qs({ space, ...params })}`),
  uploadFile: (space, file, meta = {}) => {
    const form = new FormData()
    form.append('file', file)
    Object.entries(meta).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') form.append(k, v)
    })
    return upload(`${BASE}/files${qs({ space })}`, form)
  },
  createText: (body) => api(`${BASE}/files/text`, { method: 'POST', body }),
  updateFile: (id, body) => api(`${BASE}/files/${id}`, { method: 'PUT', body }),
  deleteFile: (id) => api(`${BASE}/files/${id}`, { method: 'DELETE' }),
  fileText: (id) => api(`${BASE}/files/${id}/text`),
  fileUrl: (id, download = false) => `${API_ROOT}${BASE}/files/${id}/content${download ? '?download=true' : ''}`,
  draft: (body) => api(`${BASE}/drafts`, { method: 'POST', body }),

  // Vendors
  invoices: crud('vendor-invoices'),
  specialties: crud('specialty-templates'),
  cloneSpecialty: (id, name) => api(`${BASE}/specialty-templates/${id}/clone`, { method: 'POST', body: { name } }),

  // Inventory
  inventoryAccess: () => api(`${BASE}/inventory/access`),
  items: crud('inventory/items'),
  adjustItem: (id, delta, note) => api(`${BASE}/inventory/items/${id}/adjust`, { method: 'POST', body: { delta, note } }),
  assets: crud('inventory/assets'),
  addService: (id, body) => api(`${BASE}/inventory/assets/${id}/service`, { method: 'POST', body }),
  revealPassword: (id) => api(`${BASE}/inventory/assets/${id}/password`, { method: 'POST' }),
  requests: () => api(`${BASE}/inventory/requests`),
  createRequest: (body) => api(`${BASE}/inventory/requests`, { method: 'POST', body }),
  requestStatus: (id, body) => api(`${BASE}/inventory/requests/${id}/status`, { method: 'POST', body }),
}
