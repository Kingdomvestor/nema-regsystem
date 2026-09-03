// Right-side drawer to edit one attendee. Seeded from the row on mount (the screen
// remounts it per record via `key`). Review-flag resolution reuses the pure builders
// in resolve.ts, applied to local form state; a single Save persists the whole
// editable set. Delete is admin-only and confirmed.
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

const input =
  'mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</h3>
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
  // Merge a resolve.ts patch (EditablePatch, whose `notes` is nullable) into the
  // form without disturbing the current notes text.
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
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {initial(record.full_name)}
            </span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-900">{record.full_name}</div>
              <div className="font-mono text-xs text-slate-400">{record.id}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-auto px-5 py-5">
          {/* Identity */}
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

          {/* Classification */}
          <section className="space-y-3">
            <SectionTitle>Classification</SectionTitle>
            <Field label={`State (raw: ${record.location_raw || '—'})`}>
              <select
                className={input}
                value={form.state ?? ''}
                onChange={(e) => set({ state: e.target.value === '' ? null : (e.target.value as CanonicalState) })}
              >
                <option value="">— unknown —</option>
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
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.first_time}
                onChange={(e) => set({ first_time: e.target.checked })}
                className="accent-brand-600"
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
                <option value="">— none —</option>
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
                  <option value="">— unset —</option>
                  <option value="fan">Fan</option>
                  <option value="ac">AC</option>
                </select>
              </Field>
            )}
          </section>

          {/* Notes */}
          <section className="space-y-3">
            <SectionTitle>Notes</SectionTitle>
            <textarea
              className={input.replace('h-9', 'h-auto py-2')}
              rows={3}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </section>

          {/* Review flags */}
          <section className="space-y-2">
            <SectionTitle>Review flags</SectionTitle>
            {!anyFlag && <p className="text-sm text-slate-400">No open flags.</p>}
            {flags.location && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <span>Location needs review</span>
                <button
                  disabled={form.state === null}
                  onClick={() => applyResolve(resolveLocation(flags, form.state as CanonicalState))}
                  className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-40"
                  title={form.state === null ? 'Pick a state above first' : undefined}
                >
                  Mark resolved
                </button>
              </div>
            )}
            {flags.accommodation && (
              <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
                <span>Accommodation needs review</span>
                <button
                  disabled={form.accommodation_choice === null}
                  onClick={() =>
                    applyResolve(resolveAccommodation(flags, form.accommodation_choice as AccommodationChoice, form.private_room_type))
                  }
                  className="rounded-md bg-orange-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-40"
                  title={form.accommodation_choice === null ? 'Pick an accommodation above first' : undefined}
                >
                  Mark resolved
                </button>
              </div>
            )}
            {flags.duplicate && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <span>Possible duplicate</span>
                <button
                  onClick={() => applyResolve(dismissDuplicate(flags))}
                  className="rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Not a duplicate
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-2 border-t border-slate-200 px-5 py-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-between">
            {canDelete ? (
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
