// Right-side drawer to edit one attendee.
import { type ReactNode, useState } from 'react'
import type {
  AccommodationChoice,
  CanonicalState,
  PrivateRoomType,
  ReviewFlags,
} from '../../domain/types'
import { CANONICAL_STATES } from '../../domain/normalizeLocation'
import { dismissDuplicate, resolveAccommodation, resolveLocation } from './resolve'
import type { AttendeeRecord, EditablePatch } from './types'

interface FormState {
  full_name: string
  whatsapp: string
  email: string
  age_group: string
  state: CanonicalState | null
  occupation: string
  gender: string
  marital_status: string
  first_time: boolean
  heard_via: string
  accommodation_choice: AccommodationChoice | null
  private_room_type: PrivateRoomType
  notes: string
  dupe_flag: boolean
  review_flags: ReviewFlags
}

function seed(r: AttendeeRecord): FormState {
  return {
    full_name: r.full_name,
    whatsapp: r.whatsapp,
    email: r.email,
    age_group: r.age_group,
    state: r.state,
    occupation: r.occupation,
    gender: r.gender,
    marital_status: r.marital_status,
    first_time: r.first_time,
    heard_via: r.heard_via,
    accommodation_choice: r.accommodation_choice,
    private_room_type: r.private_room_type,
    notes: r.notes ?? '',
    dupe_flag: r.dupe_flag,
    review_flags: r.review_flags,
  }
}

const input = 'futuristic-input mt-1 h-10 w-full'
const textarea = 'futuristic-input mt-1 min-h-24 w-full py-2'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="section-label">{children}</h3>
}

function initial(name: string): string {
  const c = name.trim()[0]
  return c ? c.toUpperCase() : '?'
}

export function AttendeeEditPanel({
  record,
  canDelete,
  saving,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  record: AttendeeRecord
  canDelete: boolean
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (patch: EditablePatch) => void
  onDelete: (id: string) => void
}) {
  const [form, setForm] = useState<FormState>(() => seed(record))
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))
  const applyResolve = (patch: EditablePatch) =>
    setForm((f) => ({ ...f, ...patch, notes: patch.notes ?? f.notes }))
  const flags = form.review_flags

  function save() {
    onSave({
      full_name: form.full_name,
      whatsapp: form.whatsapp,
      email: form.email,
      age_group: form.age_group,
      state: form.state,
      occupation: form.occupation,
      gender: form.gender,
      marital_status: form.marital_status,
      first_time: form.first_time,
      heard_via: form.heard_via,
      accommodation_choice: form.accommodation_choice,
      private_room_type: form.private_room_type,
      notes: form.notes.trim() === '' ? null : form.notes,
      dupe_flag: form.dupe_flag,
      review_flags: form.review_flags,
    })
  }

  function confirmDelete() {
    if (window.confirm(`Delete registration ${record.id} (${record.full_name})? This cannot be undone.`)) {
      onDelete(record.id)
    }
  }

  const anyFlag = flags.location || flags.accommodation || flags.duplicate

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-zinc-950/62 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/12 bg-zinc-950/86 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/35 bg-brand-300/15 text-sm font-semibold text-brand-100">
              {initial(record.full_name)}
            </span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-zinc-50">{record.full_name}</div>
              <div className="font-mono text-xs text-zinc-500">{record.id}</div>
            </div>
          </div>
          <button onClick={onClose} className="ghost-action shrink-0 px-2.5 py-1.5">
            Close
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-auto px-5 py-5">
          <section className="space-y-3">
            <SectionTitle>Identity</SectionTitle>
            <Field label="Full name">
              <input className={input} value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} />
            </Field>
            <Field label="WhatsApp">
              <input className={input} value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className={input} value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
          </section>

          <section className="space-y-3">
            <SectionTitle>Classification</SectionTitle>
            <Field label={`State (raw: ${record.location_raw || '-'})`}>
              <select
                className={input}
                value={form.state ?? ''}
                onChange={(e) => set({ state: e.target.value === '' ? null : (e.target.value as CanonicalState) })}
              >
                <option value="">- unknown -</option>
                {CANONICAL_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Gender">
              <input className={input} value={form.gender} onChange={(e) => set({ gender: e.target.value })} />
            </Field>
            <Field label="Age group">
              <input className={input} value={form.age_group} onChange={(e) => set({ age_group: e.target.value })} />
            </Field>
            <Field label="Marital status">
              <input
                className={input}
                value={form.marital_status}
                onChange={(e) => set({ marital_status: e.target.value })}
              />
            </Field>
            <Field label="Occupation">
              <input className={input} value={form.occupation} onChange={(e) => set({ occupation: e.target.value })} />
            </Field>
            <Field label="Heard via">
              <input className={input} value={form.heard_via} onChange={(e) => set({ heard_via: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.first_time}
                onChange={(e) => set({ first_time: e.target.checked })}
                className="accent-brand-300"
              />
              First-time attendee
            </label>
            <Field label="Accommodation">
              <select
                className={input}
                value={form.accommodation_choice ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : (e.target.value as AccommodationChoice)
                  set({ accommodation_choice: v, private_room_type: v === 'private_paid' ? form.private_room_type : null })
                }}
              >
                <option value="">- none -</option>
                <option value="free_hostel">Free hostel</option>
                <option value="private_paid">Private (paid)</option>
              </select>
            </Field>
            {form.accommodation_choice === 'private_paid' && (
              <Field label="Private room type">
                <select
                  className={input}
                  value={form.private_room_type ?? ''}
                  onChange={(e) =>
                    set({ private_room_type: e.target.value === '' ? null : (e.target.value as PrivateRoomType) })
                  }
                >
                  <option value="">- unset -</option>
                  <option value="fan">Fan</option>
                  <option value="ac">AC</option>
                </select>
              </Field>
            )}
          </section>

          <section className="space-y-3">
            <SectionTitle>Notes</SectionTitle>
            <textarea
              className={textarea}
              rows={3}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </section>

          <section className="space-y-2">
            <SectionTitle>Review flags</SectionTitle>
            {!anyFlag && <p className="text-sm text-zinc-500">No open flags.</p>}
            {flags.location && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                <span>Location needs review</span>
                <button
                  disabled={form.state === null}
                  onClick={() => applyResolve(resolveLocation(flags, form.state as CanonicalState))}
                  className="rounded-lg bg-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-200 disabled:opacity-40"
                  title={form.state === null ? 'Pick a state above first' : undefined}
                >
                  Mark resolved
                </button>
              </div>
            )}
            {flags.accommodation && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-sm text-orange-100">
                <span>Accommodation needs review</span>
                <button
                  disabled={form.accommodation_choice === null}
                  onClick={() =>
                    applyResolve(resolveAccommodation(flags, form.accommodation_choice as AccommodationChoice, form.private_room_type))
                  }
                  className="rounded-lg bg-orange-300 px-2.5 py-1 text-xs font-semibold text-orange-950 hover:bg-orange-200 disabled:opacity-40"
                  title={form.accommodation_choice === null ? 'Pick an accommodation above first' : undefined}
                >
                  Mark resolved
                </button>
              </div>
            )}
            {flags.duplicate && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                <span>Possible duplicate</span>
                <button onClick={() => applyResolve(dismissDuplicate(flags))} className="secondary-action px-2.5 py-1 text-xs">
                  Not a duplicate
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-2 border-t border-white/10 px-5 py-4">
          {error && <p className="text-sm text-red-200">{error}</p>}
          <div className="flex items-center justify-between">
            {canDelete ? (
              <button onClick={confirmDelete} disabled={saving} className="danger-action">
                Delete
              </button>
            ) : (
              <span />
            )}
            <button onClick={save} disabled={saving} className="primary-action px-5">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
