import type {
  AccommodationChoice,
  AccommodationResult,
  PrivateRoomType,
} from './types'

/**
 * Reconcile the two accommodation columns into a single, review-aware result.
 *
 * - `accommodationOptions`: "hostel" → free_hostel, else "private" → private_paid,
 *   else unknown (null).
 * - `privateRoomType`: "fan" → fan, else an "ac" substring or a stray 'a' + 'c'
 *   (e.g. "a/c", "air conditioned") → ac, else null.
 * - A room type paired with anything other than private_paid is a `conflict`.
 * - `needsReview` when there is a conflict or the choice could not be recognized.
 */
export function normalizeAccommodation(
  accommodationOptions: string,
  privateRoomType: string,
): AccommodationResult {
  const options = accommodationOptions.toLowerCase()
  const room = privateRoomType.toLowerCase()

  let choice: AccommodationChoice | null = null
  if (options.includes('hostel')) choice = 'free_hostel'
  else if (options.includes('private')) choice = 'private_paid'

  let roomType: PrivateRoomType = null
  if (room.includes('fan')) roomType = 'fan'
  else if (room.includes('ac') || (room.includes('a') && room.includes('c'))) {
    roomType = 'ac'
  }

  const conflict = roomType !== null && choice !== 'private_paid'
  const needsReview = conflict || choice === null

  return { choice, roomType, conflict, needsReview }
}
