import type { DuplicateFlag } from './types'

const normalize = (value: string): string => value.trim().toLowerCase()

/**
 * Flag rows that share a normalized full name with any other row. Names are
 * compared after trim + lowercase; blank/whitespace-only names never flag.
 * Returns a Map keyed by regId with one entry per input row.
 *
 * Surfaces potential duplicates for human review — it never removes or merges.
 */
export function detectDuplicates(
  rows: { regId: string; fullName: string; whatsapp: string; email: string }[],
): Map<string, DuplicateFlag> {
  const nameCounts = new Map<string, number>()

  const tally = (counts: Map<string, number>, value: string): void => {
    if (value === '') return
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  for (const row of rows) {
    tally(nameCounts, normalize(row.fullName))
  }

  const isShared = (value: string): boolean => value !== '' && (nameCounts.get(value) ?? 0) > 1

  const flags = new Map<string, DuplicateFlag>()
  for (const row of rows) {
    flags.set(row.regId, {
      byName: isShared(normalize(row.fullName)),
      byPhone: false,
      byEmail: false,
    })
  }

  return flags
}
