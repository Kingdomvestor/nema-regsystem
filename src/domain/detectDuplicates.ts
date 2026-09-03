import type { DuplicateFlag } from './types'

const normalize = (value: string): string => value.trim().toLowerCase()

/**
 * Flag rows that share a normalized name, phone (whatsapp), or email with any
 * other row. Values are compared after trim + lowercase; blank/whitespace-only
 * values never flag. Returns a Map keyed by regId with one entry per input row.
 *
 * Surfaces potential duplicates for human review — it never removes or merges.
 */
export function detectDuplicates(
  rows: { regId: string; fullName: string; whatsapp: string; email: string }[],
): Map<string, DuplicateFlag> {
  const nameCounts = new Map<string, number>()
  const phoneCounts = new Map<string, number>()
  const emailCounts = new Map<string, number>()

  const tally = (counts: Map<string, number>, value: string): void => {
    if (value === '') return
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  for (const row of rows) {
    tally(nameCounts, normalize(row.fullName))
    tally(phoneCounts, normalize(row.whatsapp))
    tally(emailCounts, normalize(row.email))
  }

  const isShared = (counts: Map<string, number>, value: string): boolean =>
    value !== '' && (counts.get(value) ?? 0) > 1

  const flags = new Map<string, DuplicateFlag>()
  for (const row of rows) {
    flags.set(row.regId, {
      byName: isShared(nameCounts, normalize(row.fullName)),
      byPhone: isShared(phoneCounts, normalize(row.whatsapp)),
      byEmail: isShared(emailCounts, normalize(row.email)),
    })
  }

  return flags
}
