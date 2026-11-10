const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'Utessa',
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = data?.message || 'Something went wrong'
    const error = new Error(message)
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}
