// Types for the Attendees screen. AttendeeRecord is a snake_case row as stored in
// public.attendees; EditablePatch structurally excludes id, raw/audit columns, and
// every operational (check-in) column so the screen can never write check-in state.
import type {
  AccommodationChoice,
  CanonicalState,
  PrivateRoomType,
  ReviewFlags,
} from '../../domain/types'

export interface AttendeeRecord {
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
  arrived: boolean
  dupe_flag: boolean
  review_flags: ReviewFlags
  notes: string | null
  registered_at: string | null
  import_batch: string | null
  created_at: string | null
}

/** The only columns the Attendees screen is allowed to write. */
export type EditablePatch = Partial<
  Pick<
    AttendeeRecord,
    | 'full_name'
    | 'whatsapp'
    | 'email'
    | 'age_group'
    | 'state'
    | 'occupation'
    | 'gender'
    | 'marital_status'
    | 'first_time'
    | 'heard_via'
    | 'accommodation_choice'
    | 'private_room_type'
    | 'notes'
    | 'dupe_flag'
    | 'review_flags'
  >
>
