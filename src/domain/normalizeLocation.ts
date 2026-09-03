import type { CanonicalState, LocationResult } from './types'

const CANONICAL_STATES: readonly CanonicalState[] = [
  'Kwara',
  'Lagos',
  'Ogun',
  'Oyo',
  'Ekiti',
  'Osun',
  'Ondo',
]

// Well-known cities that name their state only implicitly.
const CITY_TO_STATE: Readonly<Record<string, CanonicalState>> = {
  ibadan: 'Oyo',
  ogbomoso: 'Oyo',
  ilorin: 'Kwara',
}

/**
 * Normalize a free-text location cell to a canonical state.
 *
 * Strategy (surface, never silently fix): match canonical state names as
 * case-insensitive substrings first; a single distinct hit wins, two or more
 * distinct hits are contradictory and flagged for review. With no state name,
 * fall back to known city keywords under the same distinct-match rule. Anything
 * empty, unknown, or ambiguous resolves to null and is flagged. `raw` is always
 * returned untouched so a human can see exactly what was imported.
 */
export function normalizeLocation(raw: string): LocationResult {
  const lower = raw.toLowerCase()

  if (lower.trim() === '') {
    return { state: null, raw, needsReview: true }
  }

  const statesFound = new Set<CanonicalState>()
  for (const state of CANONICAL_STATES) {
    if (lower.includes(state.toLowerCase())) statesFound.add(state)
  }
  if (statesFound.size === 1) {
    return { state: [...statesFound][0], raw, needsReview: false }
  }
  if (statesFound.size >= 2) {
    return { state: null, raw, needsReview: true }
  }

  const citiesFound = new Set<CanonicalState>()
  for (const [city, state] of Object.entries(CITY_TO_STATE)) {
    if (lower.includes(city)) citiesFound.add(state)
  }
  if (citiesFound.size === 1) {
    return { state: [...citiesFound][0], raw, needsReview: false }
  }

  return { state: null, raw, needsReview: true }
}
