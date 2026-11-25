import { api } from '../../shared/api/client'

const BASE = '/api/v1/billing'

/**
 * A new Idempotency-Key for each billing action the user takes. Keep the same key when retrying
 * that same action (network error, double click) — the backend then charges only once.
 */
export function newIdempotencyKey() {
  try {
    if (crypto?.randomUUID) return `ui-${crypto.randomUUID()}`
  } catch {
    /* fall through */
  }
  return `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

const withKey = (key) => ({ 'Idempotency-Key': key })

export const billing = {
  pricing: () => api(`${BASE}/pricing`),
  entitlements: () => api(`${BASE}/entitlements`),
  subscription: () => api(`${BASE}/subscription`),
  invoices: (limit = 24) => api(`${BASE}/invoices?limit=${limit}`),
  refresh: () => api(`${BASE}/subscription/refresh`, { method: 'POST' }),

  /** Starts Stripe Checkout → { sessionId, checkoutUrl, expiresAt, trialEndsAt } */
  startCheckout: (body, key) => api(`${BASE}/subscriptions`, { method: 'POST', body, headers: withKey(key) }),
  checkoutStatus: (sessionId) => api(`${BASE}/checkout/${encodeURIComponent(sessionId)}`),

  preview: (body) => api(`${BASE}/preview`, { method: 'POST', body }),
  upgrade: (body, key) => api(`${BASE}/upgrade`, { method: 'POST', body, headers: withKey(key) }),
  downgrade: (body, key) => api(`${BASE}/downgrade`, { method: 'POST', body, headers: withKey(key) }),
  changeCycle: (body, key) => api(`${BASE}/change-billing-cycle`, { method: 'POST', body, headers: withKey(key) }),
  cancelScheduledChange: (key) => api(`${BASE}/scheduled-change/cancel`, { method: 'POST', headers: withKey(key) }),
  cancel: (mode, key) => api(`${BASE}/cancel`, { method: 'POST', body: { mode }, headers: withKey(key) }),
  reactivate: (key) => api(`${BASE}/reactivate`, { method: 'POST', headers: withKey(key) }),
}

/** Amounts come from the API in minor units (cents). */
export function formatMoney(minor, currency = 'usd') {
  const value = (Number(minor) || 0) / 100
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Live (not ended) Stripe subscription statuses. */
export const LIVE_STATUSES = ['trialing', 'active', 'past_due', 'unpaid', 'incomplete', 'paused']

export const MODULE_INFO = {
  crm: { name: 'CRM', color: '#2BBFBF', desc: 'Patient leads, call tracking, referrals, pipelines and contact history.' },
  ops: { name: 'Operations', color: '#2F5D78', desc: 'Staff, vendors with BAA flags, providers, documents and dashboard.' },
  mkt: { name: 'Marketing & Outreach', color: '#7F88DD', desc: 'Review requests, email campaigns, social posting and text campaigns.' },
  tc: { name: 'Time Clock', color: '#E5AE1B', desc: 'Clock in and out, timesheets, mobile app and payroll export.' },
}
