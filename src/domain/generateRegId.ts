import type { RegIdSeed } from './types'

// FNV-1a 32-bit constants.
const FNV_OFFSET_BASIS = 0x811c9dc5 // 2166136261
const FNV_PRIME = 0x01000193 // 16777619

/**
 * Derive a stable, collision-resistant registration id from a seed.
 *
 * Deterministic: the same seed always yields the same id, and the id is
 * case-insensitive across seed fields (the composed string is lowercased).
 * Uses FNV-1a 32-bit over `timestamp|fullName|email|whatsapp` and formats the
 * result as `REG-` + 8 uppercase hex digits.
 */
export function generateRegId(seed: RegIdSeed): string {
  const input =
    `${seed.timestamp}|${seed.fullName}|${seed.email}|${seed.whatsapp}`.toLowerCase()

  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME) >>> 0
  }

  return `REG-${hash.toString(16).toUpperCase().padStart(8, '0')}`
}
