import { describe, expect, it } from 'vitest'
import { detectDuplicates } from './detectDuplicates'

describe('detectDuplicates', () => {
  it('flags nothing when all rows are distinct', () => {
    const flags = detectDuplicates([
      { regId: 'R1', fullName: 'Ada Lovelace', whatsapp: '0801', email: 'ada@x.com' },
      { regId: 'R2', fullName: 'Grace Hopper', whatsapp: '0802', email: 'grace@x.com' },
    ])
    expect(flags.get('R1')).toEqual({ byName: false, byPhone: false, byEmail: false })
    expect(flags.get('R2')).toEqual({ byName: false, byPhone: false, byEmail: false })
  })

  it('flags a shared name on both rows but not phone or email', () => {
    const flags = detectDuplicates([
      { regId: 'R1', fullName: 'Ada Lovelace', whatsapp: '0801', email: 'a@x.com' },
      { regId: 'R2', fullName: 'Ada Lovelace', whatsapp: '0802', email: 'b@x.com' },
    ])
    expect(flags.get('R1')).toEqual({ byName: true, byPhone: false, byEmail: false })
    expect(flags.get('R2')).toEqual({ byName: true, byPhone: false, byEmail: false })
  })

  it('flags a shared phone number', () => {
    const flags = detectDuplicates([
      { regId: 'R1', fullName: 'Ada', whatsapp: '0800', email: 'a@x.com' },
      { regId: 'R2', fullName: 'Bea', whatsapp: '0800', email: 'b@x.com' },
    ])
    expect(flags.get('R1')?.byPhone).toBe(true)
    expect(flags.get('R2')?.byPhone).toBe(true)
    expect(flags.get('R1')?.byName).toBe(false)
  })

  it('flags a shared email', () => {
    const flags = detectDuplicates([
      { regId: 'R1', fullName: 'Ada', whatsapp: '0801', email: 'shared@x.com' },
      { regId: 'R2', fullName: 'Bea', whatsapp: '0802', email: 'shared@x.com' },
    ])
    expect(flags.get('R1')?.byEmail).toBe(true)
    expect(flags.get('R2')?.byEmail).toBe(true)
  })

  it('normalizes with trim + lowercase before comparing', () => {
    const flags = detectDuplicates([
      { regId: 'R1', fullName: 'Ada Lovelace', whatsapp: '0801', email: 'ADA@X.com' },
      { regId: 'R2', fullName: '  ada lovelace ', whatsapp: '0802', email: ' ada@x.com ' },
    ])
    expect(flags.get('R1')).toEqual({ byName: true, byPhone: false, byEmail: true })
    expect(flags.get('R2')).toEqual({ byName: true, byPhone: false, byEmail: true })
  })

  it('never flags blank or whitespace-only values', () => {
    const flags = detectDuplicates([
      { regId: 'R1', fullName: '', whatsapp: '   ', email: '' },
      { regId: 'R2', fullName: '   ', whatsapp: '', email: '' },
    ])
    expect(flags.get('R1')).toEqual({ byName: false, byPhone: false, byEmail: false })
    expect(flags.get('R2')).toEqual({ byName: false, byPhone: false, byEmail: false })
  })

  it('flags every row that shares a value across three rows', () => {
    const flags = detectDuplicates([
      { regId: 'R1', fullName: 'Ada', whatsapp: '0801', email: 'a@x.com' },
      { regId: 'R2', fullName: 'Ada', whatsapp: '0802', email: 'b@x.com' },
      { regId: 'R3', fullName: 'Ada', whatsapp: '0803', email: 'c@x.com' },
    ])
    expect(flags.get('R1')?.byName).toBe(true)
    expect(flags.get('R2')?.byName).toBe(true)
    expect(flags.get('R3')?.byName).toBe(true)
  })

  it('returns a Map keyed by regId with one entry per row', () => {
    const flags = detectDuplicates([
      { regId: 'R1', fullName: 'Ada', whatsapp: '0801', email: 'a@x.com' },
      { regId: 'R2', fullName: 'Bea', whatsapp: '0802', email: 'b@x.com' },
    ])
    expect(flags).toBeInstanceOf(Map)
    expect(flags.size).toBe(2)
    expect([...flags.keys()].sort()).toEqual(['R1', 'R2'])
  })

  it('does not flag a single row against itself', () => {
    const flags = detectDuplicates([
      { regId: 'R1', fullName: 'Ada', whatsapp: '0801', email: 'a@x.com' },
    ])
    expect(flags.get('R1')).toEqual({ byName: false, byPhone: false, byEmail: false })
  })
})
