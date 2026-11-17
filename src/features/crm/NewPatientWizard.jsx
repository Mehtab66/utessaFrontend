import { useEffect, useState } from 'react'
import Icon from '../../shared/ui/Icon'
import { COMMON_PAYERS, LANGUAGES, POLICY_HOLDERS, crm } from './crmApi'
import { Button, Field, Loading, Modal, fmtDate, fmtDateTime, useCrmRefs } from './ui'

const STEPS = ['Patient', 'Insurance', 'Appointment', 'Review']
const VISIT_TYPES = [
  { value: 'NEW_PATIENT|40', label: 'New patient visit · 40 min' },
  { value: 'TELEHEALTH|30', label: 'New patient telehealth · 30 min' },
  { value: 'CONSULTATION|30', label: 'Consultation · 30 min' },
]

const SYNC_STYLE = {
  DONE: ['bg-[#0A7A82] text-white', 'check'],
  QUEUED: ['border-2 border-[#0A7A82] bg-white text-[#0A7A82]', 'clock'],
  WAITING: ['bg-[#FDF0DC] text-[#7E4305]', 'clock'],
  SKIPPED: ['bg-[#EEF0FA] text-[#5B6080]', 'x'],
  FAILED: ['bg-[#B42318] text-white', 'alert'],
}

/** Progress rows for what was saved locally and what is queued for the EHR / phone system. */
export function SyncList({ steps }) {
  return (
    <ul className="m-0 list-none p-0">
      {steps.map((s) => {
        const [cls, icon] = SYNC_STYLE[s.state] || SYNC_STYLE.WAITING
        return (
          <li key={s.label} className="flex items-start gap-3 border-t border-[#EDEEF5] py-2.5 first:border-0 first:pt-0">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${cls}`}><Icon name={icon} className="h-3.5 w-3.5" strokeWidth={2.4} /></span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-navy">{s.label}</span>
              {s.detail && <span className="block text-[12.5px] text-[#5B6080]">{s.detail}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function blank(initial, number) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return {
    firstName: initial?.first || '', lastName: initial?.last || '', dateOfBirth: initial?.dob || '', gender: '', preferredLanguage: 'English',
    phone: number || '', email: '', street: '', city: '', state: '', zip: '', referredBy: '', referralPartnerId: '',
    coverageType: 'INSURANCE', insurancePayer: '', insuranceMemberId: '', insuranceGroup: '', policyHolder: 'Patient',
    reasonForVisit: '', visit: VISIT_TYPES[0].value, providerName: '', location: '', from: tomorrow.toISOString().slice(0, 10),
    startsAt: '', smsConsent: true,
  }
}

export default function NewPatientWizard({ open, onClose, number, line, timer, elapsed, initial, callNotes, onCreated }) {
  const [step, setStep] = useState(0)
  const [f, setF] = useState(() => blank(initial, number))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [providers, setProviders] = useState([])
  const [openings, setOpenings] = useState(null)
  const { partners } = useCrmRefs()
  const set = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }))
  const [type, duration] = f.visit.split('|')

  useEffect(() => {
    if (!open) return
    setStep(0)
    setError('')
    setF(blank(initial, number))
    crm.providers().then(setProviders).catch(() => setProviders([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || step !== 2) return undefined
    let alive = true
    setOpenings(null)
    crm.openings({ provider: f.providerName || undefined, from: f.from, duration, days: 3 })
      .then((d) => alive && setOpenings(d))
      .catch(() => alive && setOpenings([]))
    return () => {
      alive = false
    }
  }, [open, step, f.providerName, f.from, duration])

  function validate(i) {
    if (i === 0) {
      if (!f.firstName.trim() || !f.lastName.trim()) return 'Enter first and last name.'
      if (!f.dateOfBirth) return 'Date of birth is required.'
      if (f.phone.replace(/\D/g, '').length < 10) return 'Enter a 10-digit mobile number.'
    }
    if (i === 1 && f.coverageType === 'INSURANCE' && (!f.insurancePayer || !f.insuranceMemberId.trim())) {
      return 'Choose the insurance plan and enter the member ID, or switch to self-pay.'
    }
    if (i === 2) {
      if (!f.reasonForVisit.trim()) return 'Reason for visit is required.'
      if (!f.startsAt) return 'Pick an opening.'
    }
    return ''
  }

  function next() {
    const msg = validate(step)
    setError(msg)
    if (!msg) setStep((s) => s + 1)
  }

  async function confirm() {
    setSaving(true)
    setError('')
    try {
      const res = await crm.intake({
        mode: 'BOOK', phone: f.phone, firstName: f.firstName.trim(), lastName: f.lastName.trim(), dateOfBirth: f.dateOfBirth,
        gender: f.gender || null, preferredLanguage: f.preferredLanguage || null, email: f.email || null,
        street: f.street || null, city: f.city || null, state: f.state || null, zip: f.zip || null,
        referredBy: f.referredBy || null, referralPartnerId: f.referralPartnerId || null,
        coverageType: f.coverageType, insurancePayer: f.coverageType === 'INSURANCE' ? f.insurancePayer : null,
        insuranceMemberId: f.coverageType === 'INSURANCE' ? f.insuranceMemberId : null,
        insuranceGroup: f.coverageType === 'INSURANCE' ? f.insuranceGroup || null : null,
        policyHolder: f.coverageType === 'INSURANCE' ? f.policyHolder : null,
        reasonForVisit: f.reasonForVisit, appointmentType: type, durationMinutes: Number(duration),
        providerName: f.providerName || null, location: f.location || null, startsAt: f.startsAt,
        smsConsent: f.smsConsent, callNotes: callNotes || null, durationSeconds: elapsed || null, phoneLine: line,
      })
      onCreated(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const choice = (on) => `min-h-10 rounded-lg border px-3.5 text-[13px] font-semibold transition ${on ? 'border-[#0A7A82] bg-[#E6F4F4] text-[#0B4F4F] shadow-[inset_0_0_0_1px_#0A7A82]' : 'border-[#CDD0E3] bg-white text-navy hover:border-[#8D91B3]'}`
  const review = [
    ['Patient', `${f.firstName} ${f.lastName}`],
    ['Date of birth', fmtDate(f.dateOfBirth)],
    ['Mobile', f.phone],
    ['Coverage', f.coverageType === 'SELF_PAY' ? 'Self-pay' : `${f.insurancePayer} · ${f.insuranceMemberId}`],
    ['Appointment', f.startsAt ? fmtDateTime(f.startsAt) : '—'],
    ['Visit', `${VISIT_TYPES.find((v) => v.value === f.visit)?.label}${f.providerName ? ` · ${f.providerName}` : ''}${f.location ? ` · ${f.location}` : ''}`],
    ['Reason', f.reasonForVisit],
    ['Referred by', f.referredBy || '—'],
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="New patient appointment"
      subtitle={<span className="font-mono">On call {timer}</span>}
      footer={
        <>
          {error && <p role="alert" className="mr-auto max-w-[55%] text-[13px] font-semibold text-warn">{error}</p>}
          {step > 0 && <Button variant="secondary" onClick={() => { setError(''); setStep((s) => s - 1) }}>Back</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {step < 3
            ? <Button onClick={next}>Next</Button>
            : <Button onClick={confirm} disabled={saving}>{saving ? 'Creating…' : 'Confirm and create patient'}</Button>}
        </>
      }
    >
      <ol className="m-0 mb-5 flex list-none flex-wrap gap-x-6 gap-y-2 border-b border-[#EDEEF5] p-0 pb-4">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 text-[13px] font-bold ${i === step ? 'text-navy' : i < step ? 'text-[#0A7A82]' : 'text-[#8A8DA8]'}`}>
            <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 text-[12px] ${i === step ? 'border-[#0A7A82] bg-[#0A7A82] text-white' : i < step ? 'border-[#0A7A82] text-[#0A7A82]' : 'border-[#CDD0E3]'}`}>
              {i < step ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} /> : i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-3"><Field field={{ name: 'fn', label: 'First name *' }} value={f.firstName} onChange={set('firstName')} /></div>
          <div className="sm:col-span-3"><Field field={{ name: 'ln', label: 'Last name *' }} value={f.lastName} onChange={set('lastName')} /></div>
          <div className="sm:col-span-2"><Field field={{ name: 'dob', label: 'Date of birth *', type: 'date', max: new Date().toISOString().slice(0, 10) }} value={f.dateOfBirth} onChange={set('dateOfBirth')} /></div>
          <div className="sm:col-span-2"><Field field={{ name: 'sex', label: 'Sex at birth', type: 'select', options: ['Female', 'Male', 'Unknown'], emptyLabel: 'Choose…' }} value={f.gender} onChange={set('gender')} /></div>
          <div className="sm:col-span-2"><Field field={{ name: 'lang', label: 'Preferred language', type: 'select', options: LANGUAGES, noEmpty: true }} value={f.preferredLanguage} onChange={set('preferredLanguage')} /></div>
          <div className="sm:col-span-3"><Field field={{ name: 'ph', label: 'Mobile phone *', type: 'tel' }} value={f.phone} onChange={set('phone')} /></div>
          <div className="sm:col-span-3"><Field field={{ name: 'em', label: 'Email', type: 'email' }} value={f.email} onChange={set('email')} /></div>
          <div className="sm:col-span-6"><Field field={{ name: 'st', label: 'Street address' }} value={f.street} onChange={set('street')} /></div>
          <div className="sm:col-span-3"><Field field={{ name: 'city', label: 'City' }} value={f.city} onChange={set('city')} /></div>
          <div className="sm:col-span-1"><Field field={{ name: 'state', label: 'State' }} value={f.state} onChange={set('state')} /></div>
          <div className="sm:col-span-2"><Field field={{ name: 'zip', label: 'ZIP' }} value={f.zip} onChange={set('zip')} /></div>
          <div className="sm:col-span-3"><Field field={{ name: 'ref', label: 'Referred by', placeholder: 'Referring provider, or how they heard about us' }} value={f.referredBy} onChange={set('referredBy')} /></div>
          <div className="sm:col-span-3">
            <Field field={{ name: 'rp', label: 'Referring partner (directory)', type: 'select', options: partners.map((p) => ({ value: p.id, label: p.name })), emptyLabel: 'None' }} value={f.referralPartnerId} onChange={set('referralPartnerId')} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="m-0 mb-1.5 text-[12px] font-bold text-[#3B3F5D]">Coverage</p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" className={choice(f.coverageType === 'INSURANCE')} aria-pressed={f.coverageType === 'INSURANCE'} onClick={() => set('coverageType')('INSURANCE')}>Insurance</button>
            <button type="button" className={choice(f.coverageType === 'SELF_PAY')} aria-pressed={f.coverageType === 'SELF_PAY'} onClick={() => set('coverageType')('SELF_PAY')}>Self-pay</button>
          </div>
          {f.coverageType === 'INSURANCE' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field field={{ name: 'pay', label: 'Insurance plan *', type: 'select', options: COMMON_PAYERS, emptyLabel: 'Choose…' }} value={f.insurancePayer} onChange={set('insurancePayer')} />
                <Field field={{ name: 'mid', label: 'Member ID *' }} value={f.insuranceMemberId} onChange={set('insuranceMemberId')} />
                <Field field={{ name: 'grp', label: 'Group number' }} value={f.insuranceGroup} onChange={set('insuranceGroup')} />
                <Field field={{ name: 'sub', label: 'Policy holder', type: 'select', options: POLICY_HOLDERS, noEmpty: true }} value={f.policyHolder} onChange={set('policyHolder')} />
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-[#F4F5FA] px-3.5 py-3 text-[13px] text-[#3B3F5D]">
                <Icon name="info" className="mt-0.5 h-4 w-4 text-[#0A7A82]" />
                <span>Real-time eligibility runs through your EHR or clearinghouse once it’s connected. Until then, coverage is saved as <b>not verified</b> for the front desk to confirm before the visit.</span>
              </div>
            </>
          ) : (
            <p className="m-0 rounded-[10px] bg-[#F4F5FA] px-3.5 py-3 text-[13.5px] text-navy">Self-pay new patient. The caller can add insurance later from their intake forms.</p>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="grid gap-3 sm:grid-cols-6">
            <div className="sm:col-span-4"><Field field={{ name: 'rs', label: 'Reason for visit *', placeholder: 'e.g. Palpitations, referred by primary care' }} value={f.reasonForVisit} onChange={set('reasonForVisit')} /></div>
            <div className="sm:col-span-2"><Field field={{ name: 'vt', label: 'Visit type', type: 'select', options: VISIT_TYPES, noEmpty: true }} value={f.visit} onChange={(v) => setF((p) => ({ ...p, visit: v, startsAt: '' }))} /></div>
            <div className="sm:col-span-4">
              <p className="m-0 mb-1 text-[12.5px] font-semibold text-navy">Provider</p>
              {providers.length ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={choice(!f.providerName)} onClick={() => setF((p) => ({ ...p, providerName: '', startsAt: '' }))}>Any provider</button>
                  {providers.map((p) => (
                    <button key={p.name} type="button" className={choice(f.providerName === p.name)} aria-pressed={f.providerName === p.name} onClick={() => setF((prev) => ({ ...prev, providerName: p.name, location: prev.location || p.location || '', startsAt: '' }))}>
                      {p.name}
                    </button>
                  ))}
                </div>
              ) : (
                <Field field={{ name: 'pv', label: '', placeholder: 'Add providers under Operations → Providers' }} value={f.providerName} onChange={set('providerName')} />
              )}
            </div>
            <div className="sm:col-span-2"><Field field={{ name: 'loc', label: 'Location', placeholder: 'e.g. Main office' }} value={f.location} onChange={set('location')} /></div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-56"><Field field={{ name: 'from', label: 'Show openings from', type: 'date', min: new Date().toISOString().slice(0, 10) }} value={f.from} onChange={(v) => setF((p) => ({ ...p, from: v, startsAt: '' }))} /></div>
            <span className="pb-2.5 text-[12.5px] text-[#5B6080]">Next 3 clinic days · {f.providerName || 'any provider'} · {duration} min</span>
          </div>
          <div className="mt-3">
            {openings === null ? <Loading label="Finding openings…" /> : openings.length === 0 ? (
              <p className="m-0 rounded-[10px] bg-[#F4F5FA] px-3.5 py-3 text-[13.5px] text-navy">No openings in this range. Try a later date or another provider.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {openings.map((d) => (
                  <div key={d.date} className="rounded-[10px] border border-[#E1E3F0] p-3">
                    <p className="m-0 mb-2 text-[13.5px] font-bold text-navy">{new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {d.slots.map((s) => (
                        <button key={s} type="button" aria-pressed={f.startsAt === s} onClick={() => set('startsAt')(s)} className={`${choice(f.startsAt === s)} min-h-9 px-2.5 font-mono text-[12.5px]`}>
                          {new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {review.map(([k, v]) => (
              <div key={k} className="rounded-[10px] bg-[#F4F5FA] px-3.5 py-3">
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6080]">{k}</p>
                <p className="m-0 mt-1 text-[13.5px] font-semibold text-navy">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-[10px] border border-[#E1E3F0] px-3.5 py-3">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6080]">Call notes moving to the profile</p>
            <p className="m-0 mt-1 whitespace-pre-line text-[13.5px] text-navy">{callNotes || 'No notes typed.'}</p>
          </div>
          <div className="mt-3">
            <Field field={{ name: 'sms', label: 'Caller agreed to appointment reminders and intake forms by text', type: 'checkbox' }} value={f.smsConsent} onChange={set('smsConsent')} />
          </div>
          <p className="m-0 mt-2 text-[12.5px] text-[#5B6080]">On confirm, Utessa checks for a duplicate by name and date of birth, creates the patient, books the slot and queues the chart, appointment and call notes for the EHR.</p>
        </div>
      )}
    </Modal>
  )
}
