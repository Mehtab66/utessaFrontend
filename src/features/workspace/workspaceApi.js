import { api } from '../../shared/api/client'

/** Fired after any workspace mutation so the shell can refresh badges + notifications. */
export const WORKSPACE_CHANGED = 'utessa:workspace-changed'
export function notifyWorkspaceChanged() {
  window.dispatchEvent(new Event(WORKSPACE_CHANGED))
}

const BASE = '/api/v1/workspace'
const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}
const qs = (params) => {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v != null && v !== '' && sp.set(k, v))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

async function mutate(promise) {
  const result = await promise
  notifyWorkspaceChanged()
  return result
}

export const workspace = {
  summary: () => api(`${BASE}/summary${qs({ tz: tz() })}`),
  team: () => api(`${BASE}/team`),

  tasks: () => api(`${BASE}/tasks`),
  createTask: (body) => mutate(api(`${BASE}/tasks`, { method: 'POST', body })),
  updateTask: (id, body) => mutate(api(`${BASE}/tasks/${id}`, { method: 'PUT', body })),
  setTaskStatus: (id, status) => mutate(api(`${BASE}/tasks/${id}/status`, { method: 'PATCH', body: { status } })),
  deleteTask: (id) => mutate(api(`${BASE}/tasks/${id}`, { method: 'DELETE' })),

  events: (from, to) => api(`${BASE}/events${qs({ from, to })}`),
  createEvent: (body) => mutate(api(`${BASE}/events`, { method: 'POST', body })),
  updateEvent: (id, body) => mutate(api(`${BASE}/events/${id}`, { method: 'PUT', body })),
  deleteEvent: (id) => mutate(api(`${BASE}/events/${id}`, { method: 'DELETE' })),

  notes: () => api(`${BASE}/notes`),
  createNote: (body) => mutate(api(`${BASE}/notes`, { method: 'POST', body })),
  updateNote: (id, body) => mutate(api(`${BASE}/notes/${id}`, { method: 'PUT', body })),
  deleteNote: (id) => mutate(api(`${BASE}/notes/${id}`, { method: 'DELETE' })),

  announcements: () => api(`${BASE}/announcements`),
  createAnnouncement: (body) => mutate(api(`${BASE}/announcements`, { method: 'POST', body })),
  updateAnnouncement: (id, body) => mutate(api(`${BASE}/announcements/${id}`, { method: 'PUT', body })),
  deleteAnnouncement: (id) => mutate(api(`${BASE}/announcements/${id}`, { method: 'DELETE' })),

  setModules: (enabledServices) => api('/api/v1/org/services', { method: 'PATCH', body: { enabledServices } }),
}

export const TASK_STATUSES = [
  { value: 'TODO', label: 'To do', tone: 'gray' },
  { value: 'IN_PROGRESS', label: 'In progress', tone: 'blue' },
  { value: 'DONE', label: 'Done', tone: 'green' },
]

export const PRIORITIES = [
  { value: 'LOW', label: 'Low', tone: 'gray' },
  { value: 'MEDIUM', label: 'Medium', tone: 'teal' },
  { value: 'HIGH', label: 'High', tone: 'amber' },
  { value: 'URGENT', label: 'Urgent', tone: 'red' },
]

export const EVENT_CATEGORIES = [
  { value: 'MEETING', label: 'Meeting', color: '#2E7FD9' },
  { value: 'HUDDLE', label: 'Team huddle', color: '#1E8E94' },
  { value: 'TRAINING', label: 'Training', color: '#6D74C9' },
  { value: 'TIME_OFF', label: 'Time off', color: '#D69508' },
  { value: 'REMINDER', label: 'Reminder', color: '#E5484D' },
  { value: 'OTHER', label: 'Other', color: '#727799' },
]
export const APPOINTMENT_COLOR = '#3BC4CA'

export const NOTE_COLORS = {
  yellow: { bg: '#FFF2C6', border: '#FFE58C', label: 'Sunshine' },
  mint: { bg: '#D3F3E3', border: '#A9E6C8', label: 'Mint' },
  sky: { bg: '#DCE8FA', border: '#B9D1F4', label: 'Sky' },
  lavender: { bg: '#EAECFC', border: '#ABB1EA', label: 'Lavender' },
  rose: { bg: '#FDE2DF', border: '#F9C4BE', label: 'Rose' },
  white: { bg: '#FFFFFF', border: '#DEE1EE', label: 'Paper' },
}

export const POST_CATEGORIES = [
  { value: 'GENERAL', label: 'General', tone: 'gray', icon: 'message' },
  { value: 'POLICY', label: 'Policy update', tone: 'ink', icon: 'shield' },
  { value: 'SCHEDULE', label: 'Schedule', tone: 'blue', icon: 'calendar' },
  { value: 'CELEBRATION', label: 'Celebration', tone: 'green', icon: 'sparkles' },
  { value: 'URGENT', label: 'Urgent', tone: 'red', icon: 'alert' },
]

/** yyyy-mm-dd in the browser's zone */
export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
