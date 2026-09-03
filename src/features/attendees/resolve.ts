// Pure flag-resolution patch builders. Each clears exactly one review flag and sets
// the corrected value, leaving the other flags untouched. Resolution is always an
// explicit human action — never automatic ("surface, never silently fix").
import type {
  AccommodationChoice,
  CanonicalState,
  PrivateRoomType,
  ReviewFlags,
} from '../../domain/types'
import type { EditablePatch } from './types'

function clear(flags: ReviewFlags, key: keyof ReviewFlags): ReviewFlags {
  return { ...flags, [key]: false }
}

/** Confirm the state → clears the location flag. */
export function resolveLocation(flags: ReviewFlags, state: CanonicalState): EditablePatch {
  return { state, review_flags: clear(flags, 'location') }
}

/** Confirm the accommodation choice → clears the accommodation flag. */
export function resolveAccommodation(
  flags: ReviewFlags,
  choice: AccommodationChoice,
  roomType: PrivateRoomType,
): EditablePatch {
  return {
    accommodation_choice: choice,
    private_room_type: choice === 'private_paid' ? roomType : null,
    review_flags: clear(flags, 'accommodation'),
  }
}

/** "Not a duplicate" → clears both the duplicate review flag and the dupe_flag column. */
export function dismissDuplicate(flags: ReviewFlags): EditablePatch {
  return { dupe_flag: false, review_flags: clear(flags, 'duplicate') }
}
