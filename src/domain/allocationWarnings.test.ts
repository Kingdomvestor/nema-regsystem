import { describe, expect, it } from 'vitest'
import { allocationWarnings } from './allocationWarnings'
import type { AttendeeForAllocation, Room } from './types'

const rooms: Room[] = [
  { id: 'male', capacity: 1, genderDesignation: 'male', roomClass: 'hostel' },
  { id: 'female', capacity: 1, genderDesignation: 'female', roomClass: 'hostel' },
]

const attendees: AttendeeForAllocation[] = [
  { regId: 'A', state: 'Oyo', gender: 'female', accommodationChoice: 'free_hostel', privateRoomType: null },
  { regId: 'B', state: 'Oyo', gender: 'male', accommodationChoice: 'free_hostel', privateRoomType: null },
  { regId: 'C', state: 'Oyo', gender: 'male', accommodationChoice: 'free_hostel', privateRoomType: null, pinnedRoomId: 'missing' },
]

describe('allocationWarnings', () => {
  it('reports unallocated, gender, capacity, and invalid pin issues', () => {
    const warnings = allocationWarnings(attendees, rooms, [
      { attendeeId: 'A', roomId: 'male' },
      { attendeeId: 'B', roomId: 'male' },
      { attendeeId: 'C', roomId: null },
    ])
    expect(warnings).toHaveLength(4)
    expect(warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining([
      'gender_mismatch',
      'over_capacity',
      'unallocated',
      'invalid_pin',
    ]))
  })
})