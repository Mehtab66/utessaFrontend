import { PageHeader, Panel, StatusPill } from './ui'

const FLAGS = [
  { name: 'Missed-call text-back', desc: 'Texts a caller back automatically when a call goes unanswered.', mode: 'Selected' },
  { name: 'SMS appointment reminders', desc: 'Reminder texts 48 and 2 hours before a visit, with consent on file.', mode: 'Off' },
  { name: 'CAQH tracker and payer board', desc: 'Tracks CAQH attestation and payer enrollment status per provider.', mode: 'Selected' },
  { name: 'AI Voice Caller', desc: 'Books visits and confirms meetings; always says it is an AI assistant.', mode: 'Off' },
]

export default function FlagsPage() {
  return (
    <div>
      <PageHeader
        title="Feature rollout"
        subtitle="Turn modules on for everyone, selected organizations, or keep them off. Changes are written to the audit log."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {FLAGS.map((f) => (
          <Panel key={f.name} title={f.name} right={<StatusPill tone={f.mode === 'Off' ? 'mute' : 'info'}>{f.mode}</StatusPill>}>
            <p className="m-0 text-sm text-[#4A4E7A]">{f.desc}</p>
          </Panel>
        ))}
      </div>
    </div>
  )
}
