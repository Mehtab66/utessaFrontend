import { useEffect, useState } from 'react'
import { Alert, Button, Card, Loading, PageHeader, useToast } from '../crm/ui'
import { tc } from './timeclockApi'
import { fmtRange } from './tcShared'

const INPUT = 'mt-1 w-full rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15 disabled:bg-mist-25 disabled:text-mist-600'
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const cap = (d) => d.charAt(0) + d.slice(1).toLowerCase()

function timeZones(current) {
  let list = []
  try { list = Intl.supportedValuesOf('timeZone') } catch { list = [] }
  if (!list.length) list = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'UTC']
  if (current && !list.includes(current)) list = [current, ...list]
  return list
}

/** Pay period, overtime, rounding and staff self-corrections. Managers can read; owners and admins edit. */
export default function TimeClockSettingsPage() {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, showToast] = useToast()

  useEffect(() => {
    tc.settings()
      .then((s) => { setSettings(s); setForm(toForm(s)) })
      .catch((e) => setError(e.message || 'Could not load settings.'))
  }, [])

  if (!form && !error) return <Loading label="Loading settings…" />
  if (!form) return <Alert>{error}</Alert>

  const readOnly = !settings.canEdit
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const s = await tc.saveSettings({
        timezone: form.timezone,
        payPeriod: form.payPeriod,
        periodAnchor: form.periodAnchor || null,
        weekStart: form.weekStart,
        weeklyOtHours: form.weeklyOt ? Number(form.weeklyOtHours) : 0,
        dailyOtHours: form.dailyOt ? Number(form.dailyOtHours) : 0,
        roundingMinutes: Number(form.roundingMinutes),
        allowManualEntries: form.allowManualEntries,
      })
      setSettings(s)
      setForm(toForm(s))
      showToast('Settings saved')
    } catch (err) {
      setError(err.message || 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {toast}
      <PageHeader
        title="Time clock settings"
        subtitle={`Current pay period: ${fmtRange(settings.currentPeriodStart, settings.currentPeriodEnd)}`}
      />
      {readOnly && <Alert tone="warn">Only the practice owner or an admin can change these settings.</Alert>}
      <Alert>{error}</Alert>

      <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
        <Card title="Pay period" subtitle="How often you run payroll">
          <div className="grid gap-3">
            <label className="text-[13px] font-medium text-ink-900">
              Pay frequency
              <select className={INPUT} value={form.payPeriod} onChange={set('payPeriod')} disabled={readOnly}>
                <option value="WEEKLY">Every week</option>
                <option value="BIWEEKLY">Every two weeks</option>
                <option value="SEMI_MONTHLY">Twice a month (1st–15th, 16th–end)</option>
              </select>
            </label>
            {form.payPeriod !== 'SEMI_MONTHLY' && (
              <label className="text-[13px] font-medium text-ink-900">
                A day in the first week of any pay period
                <input type="date" className={INPUT} value={form.periodAnchor} onChange={set('periodAnchor')} disabled={readOnly} />
                <span className="mt-1 block text-[12px] font-normal text-mist-600">Periods start on the first day of that workweek.</span>
              </label>
            )}
            <label className="text-[13px] font-medium text-ink-900">
              Workweek starts on
              <select className={INPUT} value={form.weekStart} onChange={set('weekStart')} disabled={readOnly}>
                {DAYS.map((d) => <option key={d} value={d}>{cap(d)}</option>)}
              </select>
            </label>
            <label className="text-[13px] font-medium text-ink-900">
              Practice time zone
              <select className={INPUT} value={form.timezone} onChange={set('timezone')} disabled={readOnly}>
                {timeZones(form.timezone).map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
              </select>
              <span className="mt-1 block text-[12px] font-normal text-mist-600">Days, weeks and pay periods follow this time zone.</span>
            </label>
          </div>
        </Card>

        <Card title="Overtime" subtitle="Check your state's rules (for example California pays daily overtime after 8 hours)">
          <div className="grid gap-3">
            <label className="flex items-start gap-2.5 text-[13px] text-ink-900">
              <input type="checkbox" className="mt-0.5" checked={form.weeklyOt} onChange={set('weeklyOt')} disabled={readOnly} />
              <span>
                <span className="font-medium">Weekly overtime</span>
                <span className="block text-mist-600">Hours over the weekly limit in a workweek</span>
              </span>
            </label>
            {form.weeklyOt && (
              <label className="text-[13px] font-medium text-ink-900">
                Weekly limit (hours)
                <input type="number" min="1" max="168" step="0.5" className={INPUT} value={form.weeklyOtHours} onChange={set('weeklyOtHours')} disabled={readOnly} />
              </label>
            )}
            <label className="flex items-start gap-2.5 text-[13px] text-ink-900">
              <input type="checkbox" className="mt-0.5" checked={form.dailyOt} onChange={set('dailyOt')} disabled={readOnly} />
              <span>
                <span className="font-medium">Daily overtime</span>
                <span className="block text-mist-600">Hours over the daily limit in one day (counted before weekly overtime)</span>
              </span>
            </label>
            {form.dailyOt && (
              <label className="text-[13px] font-medium text-ink-900">
                Daily limit (hours)
                <input type="number" min="1" max="24" step="0.5" className={INPUT} value={form.dailyOtHours} onChange={set('dailyOtHours')} disabled={readOnly} />
              </label>
            )}
          </div>
        </Card>

        <Card title="Rounding" subtitle="Applied to finished shifts when hours are totalled">
          <label className="text-[13px] font-medium text-ink-900">
            Round clock-in and clock-out to the nearest
            <select className={INPUT} value={form.roundingMinutes} onChange={set('roundingMinutes')} disabled={readOnly}>
              <option value="0">No rounding (exact minute)</option>
              <option value="5">5 minutes</option>
              <option value="6">6 minutes (tenth of an hour)</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes (quarter hour)</option>
            </select>
          </label>
        </Card>

        <Card title="Corrections" subtitle="Who can fix mistakes">
          <label className="flex items-start gap-2.5 text-[13px] text-ink-900">
            <input type="checkbox" className="mt-0.5" checked={form.allowManualEntries} onChange={set('allowManualEntries')} disabled={readOnly} />
            <span>
              <span className="font-medium">Staff can add missed shifts and fix their own time</span>
              <span className="block text-mist-600">Until they submit their timesheet. Every change needs a reason and is kept in the history. Managers can always correct time.</span>
            </span>
          </label>
        </Card>

        {!readOnly && (
          <div className="flex justify-end lg:col-span-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
          </div>
        )}
      </form>
    </div>
  )
}

function toForm(s) {
  return {
    timezone: s.timezone,
    payPeriod: s.payPeriod,
    periodAnchor: s.periodAnchor || '',
    weekStart: s.weekStart,
    weeklyOt: s.weeklyOtHours != null,
    weeklyOtHours: s.weeklyOtHours != null ? String(Number(s.weeklyOtHours)) : '40',
    dailyOt: s.dailyOtHours != null,
    dailyOtHours: s.dailyOtHours != null ? String(Number(s.dailyOtHours)) : '8',
    roundingMinutes: String(s.roundingMinutes),
    allowManualEntries: s.allowManualEntries,
  }
}
