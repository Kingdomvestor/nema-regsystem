// Maps a cleaned domain attendee to the snake_case `attendees` row we send to
// Supabase, and de-duplicates a batch by primary key. Pure, no I/O — this is
// where the domain type meets the DB schema (0001_core_schema.sql).
//
// Only *import-owned* columns are produced. Operational columns
// (arrived, arrived_at, checked_in_by, notes, created_at) are deliberately
// omitted so an upsert re-import refreshes cleaning data WITHOUT clobbering
// check-in state — Postgres ON CONFLICT DO UPDATE only touches supplied columns.
// See spec §6.4.

import type {
  AccommodationChoice,
  CanonicalState,
  CleanedAttendee,
  PrivateRoomType,
  ReviewFlags,
} from '../../domain/types'

/** A row shaped for `public.attendees` — import-owned columns only. */
export interface AttendeeRow {
  id: string
  full_name: string
  whatsapp: string
  email: string
  age_group: string
  location_raw: string
  state: CanonicalState | null
  occupation: string
  gender: string
  marital_status: string
  first_time: boolean
  heard_via: string
  accommodation_choice: AccommodationChoice | null
  private_room_type: PrivateRoomType
  dupe_flag: boolean
  review_flags: ReviewFlags
  /** ISO-8601, or null when the raw form timestamp could not be parsed. */
  registered_at: string | null
  import_batch: string
}

/**
 * Normalize a raw form-timestamp string to ISO-8601, or null if it is empty or
 * unparseable. Prevents one odd cell from failing the whole `timestamptz`
 * insert. Not a "silent fix" of a review category — purely a serialization guard.
 */
export function toIso(raw: string): string | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  const ms = Date.parse(t)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

/** Map one cleaned attendee to a DB row, stamping the shared import batch id. */
export function toAttendeeRow(a: CleanedAttendee, importBatch: string): AttendeeRow {
  return {
    id: a.regId,
    full_name: a.fullName,
    whatsapp: a.whatsapp,
    email: a.email,
    age_group: a.ageGroup,
    location_raw: a.locationRaw,
    state: a.state,
    occupation: a.occupation,
    gender: a.gender,
    marital_status: a.maritalStatus,
    first_time: a.firstTime,
    heard_via: a.heardVia,
    accommodation_choice: a.accommodationChoice,
    private_room_type: a.privateRoomType,
    dupe_flag: a.reviewFlags.duplicate,
    review_flags: a.reviewFlags,
    registered_at: toIso(a.registeredAt),
    import_batch: importBatch,
  }
}

/**
 * Collapse rows sharing a primary key (an exact-duplicate submission yields the
 * same RegID) to one, last-write-wins. A single upsert request cannot carry two
 * rows with the same PK ("ON CONFLICT DO UPDATE command cannot affect row a
 * second time"). The duplicate is still surfaced via review_flags.duplicate on
 * the surviving row. See spec §6.4.
 */
export function dedupeById(rows: AttendeeRow[]): AttendeeRow[] {
  const byId = new Map<string, AttendeeRow>()
  for (const r of rows) byId.set(r.id, r)
  return [...byId.values()]
}
