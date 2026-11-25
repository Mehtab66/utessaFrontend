import { api } from '../../shared/api/client'

const BASE = '/api/v1/assistant'
const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export const assistant = {
  status: () => api(`${BASE}/status`),
  /** messages: [{ role: 'user' | 'assistant', content }] → { reply, lookups } */
  chat: (messages) => api(`${BASE}/chat`, { method: 'POST', body: { messages, tz: tz() } }),
}
