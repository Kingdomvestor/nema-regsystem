import { describe, expect, it } from 'vitest'
import { generateRegId } from './generateRegId'
import type { RegIdSeed } from './types'

const seed: RegIdSeed = {
  timestamp: '2026-09-02T10:15:00Z',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  whatsapp: '+2348012345678',
}

describe('generateRegId', () => {
  it('produces the REG- + 8 uppercase hex format', () => {
    expect(generateRegId(seed)).toMatch(/^REG-[0-9A-F]{8}$/)
  })

  it('is deterministic: the same seed always yields the same id', () => {
    expect(generateRegId(seed)).toBe(generateRegId({ ...seed }))
  })

  it('is case-insensitive across seed fields (input is lowercased)', () => {
    const upper: RegIdSeed = {
      timestamp: seed.timestamp.toUpperCase(),
      fullName: 'ADA LOVELACE',
      email: 'ADA@EXAMPLE.COM',
      whatsapp: seed.whatsapp,
    }
    expect(generateRegId(upper)).toBe(generateRegId(seed))
  })

  it('produces different ids for different seeds', () => {
    const other: RegIdSeed = { ...seed, email: 'grace@example.com' }
    expect(generateRegId(other)).not.toBe(generateRegId(seed))
  })

  it('matches the FNV-1a 32-bit reference vector for this seed', () => {
    // Golden value: FNV-1a over the lowercased "ts|name|email|whatsapp" string,
    // cross-checked against an independent Node computation of the same algorithm.
    expect(generateRegId(seed)).toBe('REG-01D64A39')
  })
})
