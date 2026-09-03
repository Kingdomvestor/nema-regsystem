import { detectDuplicates } from './detectDuplicates'
import { generateRegId } from './generateRegId'
import { normalizeAccommodation } from './normalizeAccommodation'
import { normalizeLocation } from './normalizeLocation'
import type { CleanedAttendee, ImportResult, ImportStats, RawRow } from './types'

/** Bucket for rows whose location could not be resolved to a canonical state. */
const UNKNOWN_STATE = 'Unknown'

/**
 * Compose the cleaning primitives (Tasks 2–6) into a single import pass.
 *
 * Each row gets a stable RegID; location and accommodation are normalized, the
 * first-time flag is read, and duplicates are detected across the whole batch.
 * Every anomaly is surfaced in `reviewFlags` — nothing is dropped or corrected
 * ("surface, never silently fix"). `stats` gives the import preview its
 * headline counts. Pure and deterministic: identical rows yield identical output.
 */
export function runImport(rows: RawRow[]): ImportResult {
  // Pass 1: derive stable ids and the fields duplicate detection compares on.
  const withIds = rows.map((row) => ({
    row,
    regId: generateRegId({
      timestamp: row.timestamp,
      fullName: row.fullName,
      email: row.email,
      whatsapp: row.whatsapp,
    }),
  }))

  const duplicateFlags = detectDuplicates(
    withIds.map(({ row, regId }) => ({
      regId,
      fullName: row.fullName,
      whatsapp: row.whatsapp,
      email: row.email,
    })),
  )

  // Pass 2: clean each row and accumulate stats in one sweep.
  const attendees: CleanedAttendee[] = []
  const byState: Record<string, number> = {}
  const byGender: Record<string, number> = {}
  let needingReview = 0
  let duplicates = 0
  let accommodationConflicts = 0

  for (const { row, regId } of withIds) {
    const location = normalizeLocation(row.location)
    const accommodation = normalizeAccommodation(
      row.accommodationOptions,
      row.privateRoomType,
    )
    const dupe = duplicateFlags.get(regId)
    const duplicate =
      dupe !== undefined && (dupe.byName || dupe.byPhone || dupe.byEmail)

    const reviewFlags = {
      location: location.needsReview,
      accommodation: accommodation.needsReview,
      duplicate,
    }

    attendees.push({
      regId,
      fullName: row.fullName,
      whatsapp: row.whatsapp,
      email: row.email,
      ageGroup: row.ageGroup,
      locationRaw: location.raw,
      state: location.state,
      occupation: row.occupation,
      gender: row.gender,
      maritalStatus: row.maritalStatus,
      firstTime: /^y/i.test(row.firstTimeAttending),
      heardVia: row.howHeard,
      accommodationChoice: accommodation.choice,
      privateRoomType: accommodation.roomType,
      registeredAt: row.timestamp,
      reviewFlags,
    })

    const stateKey = location.state ?? UNKNOWN_STATE
    byState[stateKey] = (byState[stateKey] ?? 0) + 1
    byGender[row.gender] = (byGender[row.gender] ?? 0) + 1
    if (reviewFlags.location || reviewFlags.accommodation || duplicate) {
      needingReview++
    }
    if (duplicate) duplicates++
    if (accommodation.conflict) accommodationConflicts++
  }

  const stats: ImportStats = {
    total: rows.length,
    byState,
    byGender,
    needingReview,
    duplicates,
    accommodationConflicts,
  }

  return { attendees, stats }
}
