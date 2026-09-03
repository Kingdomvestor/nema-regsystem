import { describe, expect, it } from 'vitest'
import allocate from './allocate'
import type { AttendeeForAllocation, Room } from './types'

function room(id: string, cap: number, gender: Room['genderDesignation'], cls: Room['roomClass']): Room {
  return { id, capacity: cap, genderDesignation: gender, roomClass: cls }
}

describe('allocate', () => {
  it('allocates hostel attendees by gender and respects capacity', () => {
    const rooms: Room[] = [room('r1', 2, 'male', 'hostel'), room('r2', 2, 'female', 'hostel')]
    const attendees: AttendeeForAllocation[] = [
      { regId: 'A', state: 'Oyo', gender: 'male', accommodationChoice: 'free_hostel', privateRoomType: null },
      { regId: 'B', state: 'Oyo', gender: 'male', accommodationChoice: 'free_hostel', privateRoomType: null },
      { regId: 'C', state: 'Oyo', gender: 'male', accommodationChoice: 'free_hostel', privateRoomType: null },
      { regId: 'D', state: 'Oyo', gender: 'female', accommodationChoice: 'free_hostel', privateRoomType: null },
    ]

    const res = allocate(attendees, rooms, 'mix_states')
    const map = new Map(res.map((r) => [r.attendeeId, r.roomId]))
    expect(map.get('A')).toBe('r1')
    expect(map.get('B')).toBe('r1')
    // one male left unallocated
    expect(map.get('C')).toBeNull()
    expect(map.get('D')).toBe('r2')
  })

  it('allocates private attendees into matching private room classes', () => {
    const rooms: Room[] = [room('f1', 2, 'any', 'private_fan'), room('a1', 1, 'any', 'private_ac')]
    const attendees: AttendeeForAllocation[] = [
      { regId: 'P1', state: 'Lagos', gender: 'female', accommodationChoice: 'private_paid', privateRoomType: 'fan' },
      { regId: 'P2', state: 'Lagos', gender: 'female', accommodationChoice: 'private_paid', privateRoomType: 'ac' },
      { regId: 'P3', state: 'Lagos', gender: 'female', accommodationChoice: 'private_paid', privateRoomType: 'ac' },
    ]

    const res = allocate(attendees, rooms, 'group_by_state')
    const map = new Map(res.map((r) => [r.attendeeId, r.roomId]))
    expect(map.get('P1')).toBe('f1')
    expect(map.get('P2')).toBe('a1')
    // a1 capacity 1 -> P3 unallocated
    expect(map.get('P3')).toBeNull()
  })

  it('honors pinnedRoomId when capacity allows', () => {
    const rooms: Room[] = [room('r1', 1, 'any', 'hostel')]
    const attendees: AttendeeForAllocation[] = [
      { regId: 'X', state: 'Oyo', gender: 'male', accommodationChoice: 'free_hostel', privateRoomType: null, pinnedRoomId: 'r1' },
      { regId: 'Y', state: 'Oyo', gender: 'male', accommodationChoice: 'free_hostel', privateRoomType: null },
    ]

    const res = allocate(attendees, rooms, 'mix_states')
    const map = new Map(res.map((r) => [r.attendeeId, r.roomId]))
    expect(map.get('X')).toBe('r1')
    expect(map.get('Y')).toBeNull()
  })
})
