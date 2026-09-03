import { describe, expect, it } from 'vitest'
import { type AttendeeFilter, emptyFilter, filterAttendees } from './attendeesFilter'
import type { AttendeeRecord } from './types'

function rec(over: Partial<AttendeeRecord>): AttendeeRecord {
  return {
    id: 'REG-1',
    full_name: 'Ada Bello',
    whatsapp: '08030000000',
    email: 'ada@example.com',
    age_group: '26-35',
    location_raw: 'Ibadan',
    state: 'Oyo',
    occupation: 'Nurse',
    gender: 'Female',
    marital_status: 'Single',
    first_time: false,
    heard_via: 'Church',
    accommodation_choice: 'free_hostel',
    private_room_type: null,
    arrived: false,
    arrived_at: null,
    checked_in_by: null,
    dupe_flag: false,
    review_flags: { location: false, accommodation: false, duplicate: false },
    notes: null,
    registered_at: null,
    import_batch: null,
    created_at: null,
    ...over,
  }
}

function filter(over: Partial<AttendeeFilter>): AttendeeFilter {
  return { ...emptyFilter, ...over }
}

describe('filterAttendees', () => {
  it('returns everything with the empty filter', () => {
    const rows = [rec({ id: 'A' }), rec({ id: 'B' })]
    expect(filterAttendees(rows, emptyFilter)).toHaveLength(2)
  })

  it('matches search across name, phone, email, and RegID (case-insensitive)', () => {
    const rows = [
      rec({ id: 'REG-AAA', full_name: 'Ada Bello', email: 'ada@x.com', whatsapp: '0803111' }),
      rec({ id: 'REG-BBB', full_name: 'Tunde Cole', email: 'tunde@y.com', whatsapp: '0805222' }),
    ]
    expect(filterAttendees(rows, filter({ search: 'ada' })).map((r) => r.id)).toEqual(['REG-AAA'])
    expect(filterAttendees(rows, filter({ search: '0805222' })).map((r) => r.id)).toEqual(['REG-BBB'])
    expect(filterAttendees(rows, filter({ search: 'reg-bbb' })).map((r) => r.id)).toEqual(['REG-BBB'])
    expect(filterAttendees(rows, filter({ search: 'y.com' })).map((r) => r.id)).toEqual(['REG-BBB'])
  })

  it('filters by state, treating null state as no match', () => {
    const rows = [rec({ id: 'A', state: 'Oyo' }), rec({ id: 'B', state: 'Lagos' }), rec({ id: 'C', state: null })]
    expect(filterAttendees(rows, filter({ state: 'Lagos' })).map((r) => r.id)).toEqual(['B'])
  })

  it('filters by gender', () => {
    const rows = [rec({ id: 'A', gender: 'Male' }), rec({ id: 'B', gender: 'Female' })]
    expect(filterAttendees(rows, filter({ gender: 'Male' })).map((r) => r.id)).toEqual(['A'])
  })

  it('supports accommodation "none" for rows with no choice', () => {
    const rows = [
      rec({ id: 'A', accommodation_choice: 'free_hostel' }),
      rec({ id: 'B', accommodation_choice: 'private_paid' }),
      rec({ id: 'C', accommodation_choice: null }),
    ]
    expect(filterAttendees(rows, filter({ accommodation: 'none' })).map((r) => r.id)).toEqual(['C'])
    expect(filterAttendees(rows, filter({ accommodation: 'private_paid' })).map((r) => r.id)).toEqual(['B'])
  })

  it('keeps only flagged rows when needsReview is set', () => {
    const rows = [
      rec({ id: 'A', review_flags: { location: true, accommodation: false, duplicate: false } }),
      rec({ id: 'B', review_flags: { location: false, accommodation: false, duplicate: false } }),
    ]
    expect(filterAttendees(rows, filter({ needsReview: true })).map((r) => r.id)).toEqual(['A'])
  })

  it('filters by arrived state', () => {
    const rows = [rec({ id: 'A', arrived: true }), rec({ id: 'B', arrived: false })]
    expect(filterAttendees(rows, filter({ arrived: 'yes' })).map((r) => r.id)).toEqual(['A'])
    expect(filterAttendees(rows, filter({ arrived: 'no' })).map((r) => r.id)).toEqual(['B'])
  })

  it('combines filters (AND)', () => {
    const rows = [
      rec({ id: 'A', state: 'Oyo', gender: 'Female' }),
      rec({ id: 'B', state: 'Oyo', gender: 'Male' }),
      rec({ id: 'C', state: 'Lagos', gender: 'Female' }),
    ]
    expect(filterAttendees(rows, filter({ state: 'Oyo', gender: 'Female' })).map((r) => r.id)).toEqual(['A'])
  })
})
