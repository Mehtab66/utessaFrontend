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
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#717490]">Practice settings</p>
        <h1 className="mt-2 text-[clamp(30px,3vw,40px)] font-extrabold tracking-[-0.02em] text-[#151940]">
          Modules and sidebar access
        </h1>
      </div>

      <div className="rounded-[18px] border border-[#E1E3F0] bg-white p-5">
        <p className="text-sm leading-relaxed text-[#4C5076]">
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
                  ? 'border-[#3BC4CA] bg-[#DDF6F7] shadow-[0_0_0_3px_rgba(59,196,202,0.18)]'
                  : 'border-[#E1E3F0] bg-white hover:border-[#B7BCD4]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-[#151940]">{module.label}</div>
                  <div className="mt-1 text-sm leading-relaxed text-[#4C5076]">{module.description}</div>
                </div>
                <span
                  className={`inline-flex h-6 w-11 items-center rounded-full border transition ${
                    active ? 'border-[#1E8E94] bg-[#1E8E94]' : 'border-[#CBD1E1] bg-[#EEF0FA]'
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
        <div className="rounded-xl border border-[#F3C1BC] bg-[#FFF5F4] px-3.5 py-3 text-sm font-semibold text-[#B4472F]">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-[#D9F5E8] bg-[#EAFBF2] px-3.5 py-3 text-sm font-semibold text-[#1E7A4C]">
          {success}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setEnabled(['crm', 'ops', 'mkt', 'tc'])}
          className="rounded-xl border border-[#DCDFEE] bg-white px-4 py-2.5 text-sm font-semibold text-[#151940] hover:bg-[#F7F8FC]"
        >
          Add all
        </button>

        <button
          type="button"
          onClick={() => setEnabled([])}
          className="rounded-xl border border-[#DCDFEE] bg-white px-4 py-2.5 text-sm font-semibold text-[#151940] hover:bg-[#F7F8FC]"
        >
          Remove all
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="rounded-xl bg-[#151940] px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save modules'}
        </button>
      </div>
    </div>
  )
}
