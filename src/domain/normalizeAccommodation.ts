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
 * - Room type is relevant only for private_paid; hostel selections ignore it.
 * - `needsReview` when the choice is unknown or a private room type is missing.
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

  const relevantRoomType = choice === 'private_paid' ? roomType : null
  const conflict = false
  const needsReview = choice === null || (choice === 'private_paid' && relevantRoomType === null)

  return { choice, roomType: relevantRoomType, conflict, needsReview }
}
