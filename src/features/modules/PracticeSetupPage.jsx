import { useEffect, useState } from 'react'
import { api } from '../../shared/api/client'
import { useAuth } from '../../shared/auth/AuthContext'

const MODULE_OPTIONS = [
  { id: 'crm', label: 'CRM', description: 'Patient leads, callbacks, pipelines, and contact history.' },
  { id: 'ops', label: 'Operations', description: 'Providers, staff, vendors, document vault, and training.' },
  { id: 'mkt', label: 'Marketing & outreach', description: 'Reviews, campaigns, social posting, and provider leads.' },
  { id: 'tc', label: 'Time clock', description: 'Clock in/out, timesheets, and payroll exports.' },
]

export default function PracticeSetupPage() {
  const { user, setSessionUser } = useAuth()
  const [enabled, setEnabled] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const org = await api('/api/v1/org')
        if (!active) return
        setEnabled(Array.isArray(org.enabledServices) ? org.enabledServices : [])
      } catch (err) {
        if (active) setError(err.message || 'Could not load practice modules.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  function toggle(id) {
    setEnabled((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id)
      return [...prev, id]
    })
    setSuccess('')
  }

  async function save() {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const next = await api('/api/v1/org/services', {
        method: 'PATCH',
        body: { enabledServices: enabled },
      })

      const merged = {
        ...user,
        enabledServices: next.enabledServices || enabled,
      }
      setSessionUser(merged)
      setEnabled(next.enabledServices || enabled)
      setSuccess('Practice modules updated.')
    } catch (err) {
      setError(err.message || 'Could not update the active modules.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <p className="text-[12px] font-semibold text-mist-500">Practice settings</p>
        <h1 className="mt-2 text-[clamp(30px,3vw,40px)] font-extrabold tracking-[-0.02em] text-ink-950">
          Modules and sidebar access
        </h1>
      </div>

      <div className="rounded-[18px] border border-mist-200 bg-white p-5">
        <p className="text-sm leading-relaxed text-mist-700">
          Turn services on or off for this practice. Hidden modules disappear from the sidebar, and direct links to them are blocked automatically.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {MODULE_OPTIONS.map((module) => {
          const active = enabled.includes(module.id)
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => toggle(module.id)}
              className={`rounded-[16px] border p-4 text-left transition ${
                active
                  ? 'border-brand-400 bg-brand-100 shadow-[0_0_0_3px_rgba(59,196,202,0.18)]'
                  : 'border-mist-200 bg-white hover:border-mist-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-ink-950">{module.label}</div>
                  <div className="mt-1 text-sm leading-relaxed text-mist-700">{module.description}</div>
                </div>
                <span
                  className={`inline-flex h-6 w-11 items-center rounded-full border transition ${
                    active ? 'border-brand-600 bg-brand-600' : 'border-mist-300 bg-mist-100'
                  }`}
                >
                  <span
                    className={`ml-1 h-4 w-4 rounded-full bg-white transition ${active ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-3 text-sm font-semibold text-danger-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-success-100 bg-success-50 px-3.5 py-3 text-sm font-semibold text-success-600">
          {success}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setEnabled(['crm', 'ops', 'mkt', 'tc'])}
          className="rounded-xl border border-mist-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-mist-25"
        >
          Add all
        </button>

        <button
          type="button"
          onClick={() => setEnabled([])}
          className="rounded-xl border border-mist-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-mist-25"
        >
          Remove all
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="rounded-xl bg-ink-950 px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save modules'}
        </button>
      </div>
    </div>
  )
}
