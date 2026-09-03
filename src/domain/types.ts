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
