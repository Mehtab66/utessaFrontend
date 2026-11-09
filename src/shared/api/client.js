const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export function getToken() {
  return localStorage.getItem('utessa_token')
}

export function setToken(token) {
  if (token) localStorage.setItem('utessa_token', token)
  else localStorage.removeItem('utessa_token')
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const auth = token ?? getToken()
  if (auth) headers.Authorization = `Bearer ${auth}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
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
