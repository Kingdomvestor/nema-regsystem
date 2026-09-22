import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/AppLayout'
import { Card } from '../../components/ui'
import { generateRegId } from '../../domain/generateRegId'
import { registerAttendee, type RegistrationInput } from './registrationApi'

const states = ['Kwara', 'Lagos', 'Ogun', 'Oyo', 'Ekiti', 'Osun', 'Ondo'] as const

const initialForm: RegistrationInput = {
  fullName: '',
  whatsapp: '',
  email: '',
  ageGroup: '',
  state: '',
  occupation: '',
  gender: '',
  maritalStatus: '',
  firstTime: false,
  heardVia: '',
  accommodationChoice: '',
  privateRoomType: '',
  notes: '',
}

function Field({
  label,
  name,
  value,
  onChange,
  required = false,
  type = 'text',
}: {
  label: string
  name: keyof RegistrationInput
  value: string
  onChange: (name: keyof RegistrationInput, value: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <label className="block">
      <span className="field-label">{label}{required && ' *'}</span>
      <input
        required={required}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="futuristic-input mt-1 h-11 w-full"
      />
    </label>
  )
}

export default function RegistrationScreen() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function updateField(name: keyof RegistrationInput, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    const registeredAt = new Date().toISOString()
    const id = generateRegId({
      timestamp: registeredAt,
      fullName: form.fullName,
      email: form.email,
      whatsapp: form.whatsapp,
    })

    try {
      await registerAttendee(form, id, registeredAt)
      setForm(initialForm)
      setSuccess(`Registration created: ${id}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create registration.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout
      title="Register attendee"
      subtitle="Create a single attendee record for someone who was not included in the import."
      actions={<button type="button" className="secondary-action" onClick={() => navigate('/attendees')}>View attendees</button>}
    >
      <form onSubmit={submit} className="mx-auto max-w-4xl space-y-5">
        {error && <div className="rounded-lg border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        {success && <div className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{success}</div>}

        <Card className="p-4 sm:p-6">
          <h2 className="section-label">Identity and contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="fullName" value={form.fullName} onChange={updateField} required />
            <Field label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={updateField} />
            <Field label="Email" name="email" value={form.email} onChange={updateField} type="email" />
            <Field label="Age group" name="ageGroup" value={form.ageGroup} onChange={updateField} />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="section-label">Classification</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">State</span>
              <select value={form.state} onChange={(event) => updateField('state', event.target.value)} className="futuristic-input mt-1 h-11 w-full">
                <option value="">Select state</option>
                {states.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
            <Field label="Occupation" name="occupation" value={form.occupation} onChange={updateField} />
            <Field label="Gender" name="gender" value={form.gender} onChange={updateField} />
            <Field label="Marital status" name="maritalStatus" value={form.maritalStatus} onChange={updateField} />
            <Field label="How did they hear about the conference?" name="heardVia" value={form.heardVia} onChange={updateField} />
            <label className="flex items-center gap-3 self-end text-sm text-zinc-300">
              <input type="checkbox" checked={form.firstTime} onChange={(event) => setForm((current) => ({ ...current, firstTime: event.target.checked }))} className="h-4 w-4 accent-brand-300" />
              First time attending
            </label>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="section-label">Accommodation</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Accommodation choice</span>
              <select value={form.accommodationChoice} onChange={(event) => updateField('accommodationChoice', event.target.value)} className="futuristic-input mt-1 h-11 w-full">
                <option value="">Not specified</option>
                <option value="free_hostel">Free hostel</option>
                <option value="private_paid">Private paid</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Private room type</span>
              <select value={form.privateRoomType} onChange={(event) => updateField('privateRoomType', event.target.value)} className="futuristic-input mt-1 h-11 w-full">
                <option value="">Not specified</option>
                <option value="fan">Fan</option>
                <option value="ac">Air conditioning</option>
              </select>
            </label>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <label className="block">
            <span className="field-label">Notes</span>
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows={4} className="futuristic-input mt-1 w-full py-3" />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="secondary-action" onClick={() => setForm(initialForm)}>Clear</button>
            <button type="submit" className="primary-action" disabled={saving}>{saving ? 'Saving...' : 'Create registration'}</button>
          </div>
        </Card>
      </form>
    </AppLayout>
  )
}
