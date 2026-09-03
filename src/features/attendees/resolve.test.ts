import { describe, expect, it } from 'vitest'
import type { ReviewFlags } from '../../domain/types'
import { dismissDuplicate, resolveAccommodation, resolveLocation } from './resolve'

const allFlagged: ReviewFlags = { location: true, accommodation: true, duplicate: true }

describe('resolveLocation', () => {
  it('sets the state and clears only the location flag', () => {
    const patch = resolveLocation(allFlagged, 'Oyo')
    expect(patch.state).toBe('Oyo')
    expect(patch.review_flags).toEqual({ location: false, accommodation: true, duplicate: true })
  })
})

describe('resolveAccommodation', () => {
  it('keeps the room type for private_paid and clears only the accommodation flag', () => {
    const patch = resolveAccommodation(allFlagged, 'private_paid', 'ac')
    expect(patch.accommodation_choice).toBe('private_paid')
    expect(patch.private_room_type).toBe('ac')
    expect(patch.review_flags).toEqual({ location: true, accommodation: false, duplicate: true })
  })

  it('nulls the room type when the choice is free_hostel', () => {
    const patch = resolveAccommodation(allFlagged, 'free_hostel', 'fan')
    expect(patch.accommodation_choice).toBe('free_hostel')
    expect(patch.private_room_type).toBeNull()
    expect(patch.review_flags?.accommodation).toBe(false)
  })
})

describe('dismissDuplicate', () => {
  it('clears the dupe_flag column and only the duplicate review flag', () => {
    const patch = dismissDuplicate(allFlagged)
    expect(patch.dupe_flag).toBe(false)
    expect(patch.review_flags).toEqual({ location: true, accommodation: true, duplicate: false })
  })
})
