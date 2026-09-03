import { describe, expect, it } from 'vitest'
import { normalizeLocation } from './normalizeLocation'

describe('normalizeLocation', () => {
  it('resolves an exact single-state cell and does not flag it', () => {
    expect(normalizeLocation('Lagos')).toEqual({
      state: 'Lagos',
      raw: 'Lagos',
      needsReview: false,
    })
  })

  it('matches a state name as a case-insensitive substring', () => {
    expect(normalizeLocation('coming from LAGOS state')).toEqual({
      state: 'Lagos',
      raw: 'coming from LAGOS state',
      needsReview: false,
    })
  })

  it('preserves the original raw casing even when it matches', () => {
    const result = normalizeLocation('OnDo')
    expect(result.state).toBe('Ondo')
    expect(result.raw).toBe('OnDo')
    expect(result.needsReview).toBe(false)
  })

  it('flags a multi-state cell for review and resolves to null', () => {
    expect(normalizeLocation('Lagos, Ogun')).toEqual({
      state: null,
      raw: 'Lagos, Ogun',
      needsReview: true,
    })
  })

  it('falls back to the city → state map when no state name appears', () => {
    expect(normalizeLocation('Ibadan')).toMatchObject({ state: 'Oyo', needsReview: false })
    expect(normalizeLocation('ilorin')).toMatchObject({ state: 'Kwara', needsReview: false })
    expect(normalizeLocation('Ogbomoso town')).toMatchObject({ state: 'Oyo', needsReview: false })
  })

  it('resolves when several known cities all map to the same state', () => {
    expect(normalizeLocation('Ibadan / Ogbomoso axis')).toMatchObject({
      state: 'Oyo',
      needsReview: false,
    })
  })

  it('flags cities that map to different states as ambiguous', () => {
    expect(normalizeLocation('Ibadan and Ilorin')).toEqual({
      state: null,
      raw: 'Ibadan and Ilorin',
      needsReview: true,
    })
  })

  it('flags an empty string for review, preserving raw', () => {
    expect(normalizeLocation('')).toEqual({ state: null, raw: '', needsReview: true })
  })

  it('flags a whitespace-only string for review, preserving raw', () => {
    expect(normalizeLocation('   ')).toEqual({ state: null, raw: '   ', needsReview: true })
  })

  it('flags an unknown location for review', () => {
    expect(normalizeLocation('Abuja')).toEqual({
      state: null,
      raw: 'Abuja',
      needsReview: true,
    })
  })
})
