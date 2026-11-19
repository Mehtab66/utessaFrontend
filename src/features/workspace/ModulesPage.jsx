import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../shared/ui/Icon'
import { useAuth } from '../../shared/auth/AuthContext'
import { MODULES, WORKSPACE_NAV, canManageModules, enabledModuleIds } from '../../shared/security/roles'
import { Alert, Button, Modal, useToast } from '../crm/ui'
import { Hero } from './kit'
import { workspace } from './workspaceApi'

const WORKSPACE_BLURB = {
  home: 'A dashboard built only from the modules you use.',
  'my-work': 'Personal and assigned tasks with a drag-and-drop board.',
  inbox: 'Team email linked to your records.',
  calendar: 'Shared practice calendar with CRM appointments layered in.',
  notes: 'Private or shared sticky notes for scripts and checklists.',
  board: 'Announcements, policy updates and shout-outs.',
  team: 'Directory of everyone in the practice.',
}

export default function ModulesPage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [toast, showToast] = useToast()
  const [pending, setPending] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const enabled = enabledModuleIds(user?.enabledServices)
  const canManage = canManageModules(user?.role)

  async function apply() {
    const { module, turnOn } = pending
    const next = turnOn ? [...new Set([...enabled, module.id])] : enabled.filter((id) => id !== module.id)
    setSaving(true)
    setError('')
    try {
      await workspace.setModules(next)
      await refresh()
      showToast(turnOn ? `${module.name} added to your workspace` : `${module.name} removed from the sidebar`)
      setPending(null)
    } catch (err) {
      setError(err.message || 'Could not update modules.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {toast}
      <Hero
        icon="apps"
        eyebrow="Settings"
        title="Apps & modules"
        subtitle="Your sidebar only shows the modules your practice turned on. Add more as you grow — your data stays put if you switch one off."
      />

      {!canManage && (
        <Alert tone="warn">Only an owner or admin can add or remove modules. Ask them if your team needs something here.</Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {MODULES.map((m) => {
          const on = enabled.includes(m.id)
          return (
            <article key={m.id} className={`relative overflow-hidden rounded-2xl border bg-white transition ${on ? 'border-mist-200' : 'border-dashed border-mist-200'}`}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: on ? m.accent : '#ECEEF6' }} />
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${m.accent}1F`, color: m.accent }}>
                    <Icon name={m.icon} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="m-0 text-[18px] font-bold text-navy">{m.fullName}</h2>
                      {on ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-success-50 px-2 py-0.5 text-[11px] font-bold text-success-600"><Icon name="check" className="h-3 w-3" strokeWidth={3} /> Active</span>
                      ) : (
                        <span className="rounded-md bg-mist-50 px-2 py-0.5 text-[11px] font-bold text-mist-500">Not added</span>
                      )}
                    </div>
                    <p className="m-0 mt-1 text-[13.5px] text-mist-600">{m.tagline}</p>
                  </div>
                </div>
                <ul className="m-0 mt-4 grid list-none gap-2 p-0 sm:grid-cols-2">
                  {m.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12.5px] text-mist-800">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: `${m.accent}26`, color: m.accent }}><Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-mist-100 pt-4">
                  {on && <Button variant="secondary" size="sm" onClick={() => navigate(m.home)}>Open {m.name} <Icon name="arrowRight" className="h-3.5 w-3.5" /></Button>}
                  {canManage && (on ? (
                    <Button variant="ghost" size="sm" className="ml-auto !text-danger-600" onClick={() => setPending({ module: m, turnOn: false })} disabled={enabled.length <= 1} title={enabled.length <= 1 ? 'Keep at least one module on' : undefined}>
                      Remove
                    </Button>
                  ) : (
                    <Button size="sm" className="ml-auto" onClick={() => setPending({ module: m, turnOn: true })}><Icon name="plus" className="h-3.5 w-3.5" /> Add module</Button>
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="sparkles" className="h-4 w-4 text-brand-700" />
          <h2 className="m-0 text-[15px] font-bold text-navy">Included in every workspace</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {WORKSPACE_NAV.map((w) => (
            <button key={w.id} type="button" onClick={() => navigate(w.to)} className="flex items-start gap-3 rounded-2xl border border-mist-200 bg-white p-4 text-left transition hover:border-brand-100">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name={w.icon} className="h-4.5 w-4.5" /></span>
              <span>
                <span className="block text-[13.5px] font-semibold text-navy">{w.label}</span>
                <span className="block text-[12px] text-mist-500">{WORKSPACE_BLURB[w.id]}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <Modal
        open={!!pending}
        size="sm"
        title={pending?.turnOn ? `Add ${pending?.module.fullName}?` : `Remove ${pending?.module.fullName}?`}
        onClose={() => setPending(null)}
        footer={
          <>
            {error && <p className="mr-auto text-[13px] font-semibold text-warn">{error}</p>}
            <Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
            <Button variant={pending?.turnOn ? 'primary' : 'danger'} onClick={apply} disabled={saving}>
              {saving ? 'Saving…' : pending?.turnOn ? 'Add module' : 'Remove module'}
            </Button>
          </>
        }
      >
        <p className="m-0 text-[13.5px] text-mist-700">
          {pending?.turnOn
            ? `${pending?.module.name} will appear in the sidebar for everyone in ${user?.organizationName} whose role can use it.`
            : `${pending?.module.name} will disappear from the sidebar and home dashboard for the whole practice. Nothing is deleted — add it back any time.`}
        </p>
      </Modal>
    </div>
  )
}
