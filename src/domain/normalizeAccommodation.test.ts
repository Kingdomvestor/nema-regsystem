import { describe, expect, it } from 'vitest'
import { normalizeAccommodation } from './normalizeAccommodation'

describe('normalizeAccommodation', () => {
  it('maps a hostel option to free_hostel with no room type', () => {
    expect(normalizeAccommodation('Hostel', '')).toEqual({
      choice: 'free_hostel',
      roomType: null,
      conflict: false,
      needsReview: false,
    })
  })

  it('maps a private option with a fan room', () => {
    expect(normalizeAccommodation('Private room', 'Fan')).toEqual({
      choice: 'private_paid',
      roomType: 'fan',
      conflict: false,
      needsReview: false,
    })
  })

  it('detects an AC room via the "ac" substring', () => {
    expect(normalizeAccommodation('Private', 'AC')).toEqual({
      choice: 'private_paid',
      roomType: 'ac',
      conflict: false,
      needsReview: false,
    })
  })

  it('detects an AC room via separated a and c characters', () => {
    expect(normalizeAccommodation('Private', 'Air Conditioned')).toEqual({
      choice: 'private_paid',
      roomType: 'ac',
      conflict: false,
      needsReview: false,
    })
    // "a/c" has no "ac" substring but does contain both 'a' and 'c'.
    expect(normalizeAccommodation('Private', 'A/C')).toMatchObject({ roomType: 'ac' })
  })

  it('requires a room type for a private choice', () => {
    expect(normalizeAccommodation('Private', '')).toEqual({
      choice: 'private_paid',
      roomType: null,
      conflict: false,
      needsReview: true,
    })
  })

  it('ignores a room type when the choice is free_hostel', () => {
    expect(normalizeAccommodation('Hostel', 'Fan')).toEqual({
      choice: 'free_hostel',
      roomType: null,
      conflict: false,
      needsReview: false,
    })
  })

  it('flags an unrecognized choice even when a room type is set', () => {
    expect(normalizeAccommodation('', 'AC')).toEqual({
      choice: null,
      roomType: null,
      conflict: false,
      needsReview: true,
    })
  })

  it('flags an unrecognized choice with no room type for review', () => {
    expect(normalizeAccommodation('', '')).toEqual({
      choice: null,
      roomType: null,
      conflict: false,
      needsReview: true,
    })
  })

  it('prefers fan over ac when the room text mentions both', () => {
    expect(normalizeAccommodation('Private', 'fan (backup ac)')).toMatchObject({
      roomType: 'fan',
    })
  })
})
