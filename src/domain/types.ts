// Shared domain types for the import & cleaning core (Plan 1, Tasks 2–7).
// Pure type declarations only — no runtime code, no I/O. Later tasks add more here.

/** The seven South-West-zone states we balance room allocation across. */
export type CanonicalState =
  | 'Kwara'
  | 'Lagos'
  | 'Ogun'
  | 'Oyo'
  | 'Ekiti'
  | 'Osun'
  | 'Ondo'

/** Result of normalizing a free-text "location" cell (Task 2). */
export interface LocationResult {
  /** Resolved canonical state, or null when unknown/ambiguous. */
  state: CanonicalState | null
  /** The original, unmodified input — always preserved for human review. */
  raw: string
  /** True when a human must eyeball this row (empty, unknown, or contradictory). */
  needsReview: boolean
}

/** Which bed an attendee signed up for (Task 3). */
export type AccommodationChoice = 'free_hostel' | 'private_paid'

/** Room subtype for a private-paid room; null when not applicable/unknown. */
export type PrivateRoomType = 'fan' | 'ac' | null

/** Result of reconciling the two accommodation columns (Task 3). */
export interface AccommodationResult {
  choice: AccommodationChoice | null
  roomType: PrivateRoomType
  /** A room type was picked but the choice is not private_paid — a contradiction. */
  conflict: boolean
  needsReview: boolean
}

/** Seed fields used to derive a stable registration id (Task 4). */
export interface RegIdSeed {
  timestamp: string
  fullName: string
  email: string
  whatsapp: string
}

/** Per-row duplicate flags; returned in a Map keyed by regId (Task 5). */
export interface DuplicateFlag {
  byName: boolean
  byPhone: boolean
  byEmail: boolean
}

/**
 * One raw registration row, columns A–M (0–12) of the Google-Forms export
 * mapped positionally (Task 6). Every field is a string — cleaning happens later.
 */
export interface RawRow {
  timestamp: string
  fullName: string
  whatsapp: string
  email: string
  ageGroup: string
  location: string
  occupation: string
  gender: string
  maritalStatus: string
  firstTimeAttending: string
  howHeard: string
  accommodationOptions: string
  privateRoomType: string
}

/** The three review gates surfaced per attendee (Task 7). */
export interface ReviewFlags {
  location: boolean
  accommodation: boolean
  duplicate: boolean
}

/** A single attendee after cleaning, normalization, and flagging (Task 7). */
export interface CleanedAttendee {
  regId: string
  fullName: string
  whatsapp: string
  email: string
  ageGroup: string
  /** Original location cell, preserved verbatim for review. */
  locationRaw: string
  /** Normalized state, or null when unknown/ambiguous. */
  state: CanonicalState | null
  occupation: string
  gender: string
  maritalStatus: string
  firstTime: boolean
  heardVia: string
  accommodationChoice: AccommodationChoice | null
  privateRoomType: PrivateRoomType
  /** Form-submission timestamp (raw). */
  registeredAt: string
  reviewFlags: ReviewFlags
}

/** Headline counts for the import preview / dashboard (Task 7). */
export interface ImportStats {
  total: number
  /** Count per canonical state; null/unmapped counted under 'Unknown'. */
  byState: Record<string, number>
  /** Count per raw gender string. */
  byGender: Record<string, number>
  /** Attendees with any review flag set. */
  needingReview: number
  /** Attendees flagged as a likely duplicate. */
  duplicates: number
  /** Attendees whose accommodation columns contradict each other. */
  accommodationConflicts: number
}

/** The full result of running an import over raw rows (Task 7). */
export interface ImportResult {
  attendees: CleanedAttendee[]
  stats: ImportStats
}

/**
 * Types used by the allocation engine (separate from the import pipeline).
 * These are intentionally lightweight and pure — no I/O.
 */
export interface AttendeeForAllocation {
  regId: string
  fullName?: string
  whatsapp?: string
  email?: string
  togetherGroup?: string | null
  accessibilityRequired?: boolean
  state: CanonicalState | null
  gender: string
  accommodationChoice: AccommodationChoice | null
  privateRoomType: PrivateRoomType
  pinnedRoomId?: string | null
}

export type RoomGenderDesignation = 'male' | 'female' | 'any'
export type RoomClass = 'hostel' | 'private_fan' | 'private_ac'

export interface Room {
  id: string
  capacity: number
  genderDesignation: RoomGenderDesignation
  roomClass: RoomClass
  accessible?: boolean
}

export interface AllocationResult {
  attendeeId: string
  roomId: string | null
}
