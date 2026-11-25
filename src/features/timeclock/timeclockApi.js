import { api } from '../../shared/api/client'

const BASE = '/api/v1/timeclock'
const qs = (params = {}) => {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v != null && v !== '' && sp.set(k, v))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const tc = {
  // Punching
  status: () => api(`${BASE}/status`),
  clockIn: (note) => api(`${BASE}/clock-in`, { method: 'POST', body: { note } }),
  clockOut: (note) => api(`${BASE}/clock-out`, { method: 'POST', body: { note } }),
  startBreak: () => api(`${BASE}/break/start`, { method: 'POST' }),
  endBreak: () => api(`${BASE}/break/end`, { method: 'POST' }),
  teamNow: () => api(`${BASE}/team/now`),

  // Shifts
  createEntry: (body) => api(`${BASE}/entries`, { method: 'POST', body }),
  updateEntry: (id, body) => api(`${BASE}/entries/${id}`, { method: 'PUT', body }),
  deleteEntry: (id, reason) => api(`${BASE}/entries/${id}${qs({ reason })}`, { method: 'DELETE' }),
  history: (id) => api(`${BASE}/entries/${id}/history`),

  // Timesheets
  timesheet: (params) => api(`${BASE}/timesheet${qs(params)}`),
  submit: (periodStart, note) => api(`${BASE}/timesheet/submit`, { method: 'POST', body: { periodStart, note } }),
  approve: (userId, periodStart, note) => api(`${BASE}/timesheet/approve`, { method: 'POST', body: { userId, periodStart, note } }),
  reject: (userId, periodStart, note) => api(`${BASE}/timesheet/reject`, { method: 'POST', body: { userId, periodStart, note } }),
  teamTimesheets: (periodStart) => api(`${BASE}/team/timesheets${qs({ periodStart })}`),

  // Time off
  pto: (scope = 'mine') => api(`${BASE}/pto${qs({ scope })}`),
  requestPto: (body) => api(`${BASE}/pto`, { method: 'POST', body }),
  approvePto: (id, note) => api(`${BASE}/pto/${id}/approve`, { method: 'POST', body: { note } }),
  denyPto: (id, note) => api(`${BASE}/pto/${id}/deny`, { method: 'POST', body: { note } }),
  cancelPto: (id) => api(`${BASE}/pto/${id}/cancel`, { method: 'POST' }),

  // Payroll
  payroll: (from, to) => api(`${BASE}/payroll${qs({ from, to })}`),
  payrollCsvUrl: (from, to) => `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}${BASE}/payroll.csv${qs({ from, to })}`,

  // Settings & people
  settings: () => api(`${BASE}/settings`),
  saveSettings: (body) => api(`${BASE}/settings`, { method: 'PUT', body }),
  members: () => api(`${BASE}/members`),
}
