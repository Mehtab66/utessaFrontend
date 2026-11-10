import { useEffect, useState } from 'react'

export function ResourceWorkspace({
  title,
  subtitle,
  addLabel,
  columns,
  rows,
  loading,
  error,
  empty,
  onRefresh,
  onCreate,
  onEdit,
  onDelete,
  form,
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(0)
  const [values, setValues] = useState(() => form.defaults())

  const sections = form.sections
    ? form.sections
    : [{ title: null, fields: form.fields || [] }]
  const stepped = form.stepped !== false && sections.length > 1
  const current = sections[step] || sections[0]
  const isLast = step >= sections.length - 1

  function openCreate() {
    setEditing(null)
    setValues(form.defaults())
    setFormError('')
    setStep(0)
    setOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setValues(form.fromRow(row))
    setFormError('')
    setStep(0)
    setOpen(true)
  }

  function validateStep() {
    const missing = (current.fields || []).filter((field) => {
      if (!field.required) return false
      if (field.type === 'checkbox' || field.type === 'heading') return false
      const v = values[field.name]
      return v === undefined || v === null || String(v).trim() === ''
    })
    if (missing.length) {
      setFormError(`Please complete: ${missing.map((f) => f.label.replace(' *', '')).join(', ')}`)
      return false
    }
    setFormError('')
    return true
  }

  function goNext(e) {
    e.preventDefault()
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, sections.length - 1))
  }

  function goBack() {
    setFormError('')
    setStep((s) => Math.max(s - 1, 0))
  }

  async function submit(e) {
    e.preventDefault()
    if (!validateStep()) return
    setSaving(true)
    setFormError('')
    try {
      if (editing) await onEdit(editing.id, values)
      else await onCreate(values)
      setOpen(false)
      await onRefresh()
    } catch (err) {
      setFormError(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-[28px] font-bold tracking-[-0.02em] text-navy">{title}</h1>
          <p className="mt-1 text-sm text-[#43476A]">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="min-h-11 rounded-lg bg-[#0A7A82] px-4 text-sm font-semibold text-white hover:bg-[#075E66]"
        >
          {addLabel}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-[#F3C1BC] bg-[#FFF5F4] px-3.5 py-3 text-sm font-semibold text-warn" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-[12px] border border-[#D9DAE1] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="border-b border-[#DFE0E6] px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4C5077]"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="border-b border-[#DFE0E6] px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#4C5077]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-8 text-sm text-[#4C5076]">Loading…</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-10 text-center text-sm text-[#4C5076]">{empty}</td>
                </tr>
              )}
              {!loading && rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#F7F8FB]">
                  {columns.map((col) => (
                    <td key={col.key} className="border-b border-[#EBECF4] px-3 py-3 text-sm text-navy">
                      {col.render ? col.render(row) : row[col.key] || '—'}
                    </td>
                  ))}
                  <td className="border-b border-[#EBECF4] px-3 py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="font-semibold text-[#0A7A82] underline" onClick={() => openEdit(row)}>Edit</button>
                      <button
                        type="button"
                        className="font-semibold text-warn underline"
                        onClick={async () => {
                          if (!window.confirm('Delete this record?')) return
                          await onDelete(row.id)
                          await onRefresh()
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#151940]/45 px-3 py-4 sm:px-4 sm:py-6">
          <form
            onSubmit={stepped && !isLast ? goNext : submit}
            className="flex h-[min(820px,94vh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="shrink-0 border-b border-[#EAEBF4] px-5 pt-4 pb-0">
              <div className="flex items-start justify-between gap-3 pb-3">
                <div>
                  <h2 className="m-0 text-xl font-bold text-navy">{editing ? 'Edit record' : addLabel}</h2>
                </div>
                <button type="button" className="text-sm font-semibold text-[#4C5076] hover:text-navy" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>

              {stepped && (
                <div
                  className="grid gap-0"
                  style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
                  role="tablist"
                  aria-label="Form steps"
                >
                  {sections.map((section, i) => {
                    const label = (section.title || '').replace(/^\d+\s·\s/, '') || `Step ${i + 1}`
                    const active = i === step
                    const done = i < step
                    const clickable = i <= step
                    return (
                      <button
                        key={section.title || i}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        disabled={!clickable}
                        title={label}
                        onClick={() => {
                          if (!clickable) return
                          setFormError('')
                          setStep(i)
                        }}
                        className={`relative flex min-w-0 items-center justify-center gap-2 border-b-2 px-2 py-3 text-left transition sm:justify-start sm:px-3 ${
                          active
                            ? 'border-[#0A7A82] bg-[#F3FAFA]'
                            : done
                              ? 'border-transparent hover:bg-[#F7F8FB]'
                              : 'border-transparent opacity-55'
                        } ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      >
                        <span
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                            active
                              ? 'bg-[#0A7A82] text-white'
                              : done
                                ? 'bg-[#DDEFEF] text-[#075E66]'
                                : 'bg-[#E8E9F3] text-[#717490]'
                          }`}
                        >
                          {done ? '✓' : i + 1}
                        </span>
                        <span className="hidden min-w-0 sm:block">
                          <span className={`block truncate text-[12px] font-semibold leading-tight ${active ? 'text-[#0A7A82]' : 'text-navy'}`}>
                            {label}
                          </span>
                          <span className="block text-[10px] font-medium uppercase tracking-[0.04em] text-[#8A8DA8]">
                            {done ? 'Done' : active ? 'Current' : 'Upcoming'}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <section className="flex min-h-full flex-col rounded-xl border border-[#EAEBF4] bg-[#FBFBFD] p-5">
                  {current.title && (
                    <h3 className="mb-1 text-[16px] font-bold text-navy">{current.title}</h3>
                  )}
                  {current.hint && <p className="mb-4 text-[13px] text-[#4C5076]">{current.hint}</p>}
                  {!current.hint && current.title && <div className="mb-4" />}
                  <div className="grid flex-1 content-start gap-3 sm:grid-cols-2">
                    {(current.fields || []).map((field) => (
                      <Field
                        key={field.name}
                        field={field}
                        value={values[field.name]}
                        onChange={(next) => setValues((prev) => ({ ...prev, [field.name]: next }))}
                      />
                    ))}
                  </div>
                </section>
              </div>

              {formError && (
                <p className="shrink-0 px-5 pb-2 text-sm font-semibold text-warn" role="alert">
                  {formError}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#EAEBF4] bg-white px-5 py-4">
              <button type="button" className="min-h-11 rounded-lg border border-[#C8C9D4] px-4 text-sm font-semibold" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <div className="flex flex-wrap gap-2">
                {stepped && step > 0 && (
                  <button type="button" className="min-h-11 rounded-lg border border-[#C8C9D4] px-4 text-sm font-semibold" onClick={goBack}>
                    Back
                  </button>
                )}
                {stepped && !isLast ? (
                  <button type="submit" className="min-h-11 rounded-lg bg-[#0A7A82] px-4 text-sm font-semibold text-white hover:bg-[#075E66]">
                    Continue
                  </button>
                ) : (
                  <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-[#0A7A82] px-4 text-sm font-semibold text-white hover:bg-[#075E66] disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ field, value, onChange }) {
  if (field.type === 'heading') {
    return (
      <div className="sm:col-span-2 mt-1 border-t border-[#E4E5EF] pt-4 first:mt-0 first:border-t-0 first:pt-0">
        <h4 className="m-0 text-[13px] font-bold uppercase tracking-[0.05em] text-[#0A7A82]">{field.label}</h4>
        {field.hint && <p className="mt-1 text-[12px] font-normal text-[#4C5076]">{field.hint}</p>}
      </div>
    )
  }

  return (
    <label
      className={`block text-[12.5px] font-semibold text-navy ${field.full ? 'sm:col-span-2' : field.span2 ? 'sm:col-span-2' : ''}`}
    >
      {field.label}
      {field.type === 'select' ? (
        <select
          className="mt-1 w-full rounded-lg border border-[#CDCED8] bg-white px-3 py-2.5 text-sm font-normal"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          className="mt-1 w-full rounded-lg border border-[#CDCED8] bg-white px-3 py-2.5 text-sm font-normal"
          rows={field.rows || 3}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === 'checkbox' ? (
        <span className="mt-2 flex items-center gap-2 font-normal">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.hint || 'Yes'}
        </span>
      ) : (
        <input
          className="mt-1 w-full rounded-lg border border-[#CDCED8] bg-white px-3 py-2.5 text-sm font-normal"
          type={field.type || 'text'}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={field.placeholder}
          step={field.step}
        />
      )}
    </label>
  )
}

export function useResourceList(loader) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      setRows(await loader())
    } catch (err) {
      setError(err.message || 'Failed to load')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return { rows, loading, error, refresh }
}

export function StatusPill({ children, tone = 'gray' }) {
  const tones = {
    green: 'bg-[#DEF2F3] text-[#155E62]',
    amber: 'bg-[#FDF0DC] text-[#7E4305]',
    red: 'bg-[#FDE7E4] text-[#9B1C12]',
    blue: 'bg-[#E2ECFA] text-[#1D4E9A]',
    gray: 'bg-[#E8E9F3] text-[#3B3F5D]',
    teal: 'bg-[#DDEFEF] text-[#0A7A82]',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  )
}

export function emptyToNull(obj, keys = []) {
  const out = { ...obj }
  for (const key of keys) {
    if (out[key] === '') out[key] = null
  }
  return out
}
