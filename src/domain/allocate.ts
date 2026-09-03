import type { AttendeeForAllocation, Room, AllocationResult } from './types'

type Mode = 'mix_states' | 'group_by_state'

function genderAllowed(room: Room, gender: string) {
  return room.genderDesignation === 'any' || room.genderDesignation === gender
}

function privateClassFor(type: string | null): Room['roomClass'] | null {
  if (type === 'fan') return 'private_fan'
  if (type === 'ac') return 'private_ac'
  return null
}

export default function allocate(
  attendees: AttendeeForAllocation[],
  rooms: Room[],
  mode: Mode = 'mix_states'
): AllocationResult[] {
  // Initialize room capacities map
  const roomCap = new Map<string, number>()
  const roomById = new Map<string, Room>()
  for (const r of rooms) {
    roomCap.set(r.id, r.capacity)
    roomById.set(r.id, r)
  }

  // Prepare result entries for every attendee (default unassigned)
  const results: Map<string, string | null> = new Map()
  for (const a of attendees) results.set(a.regId, null)

  // 1) Assign pinned attendees first when possible
  for (const a of attendees) {
    if (!a.pinnedRoomId) continue
    const rid = a.pinnedRoomId
    const room = roomById.get(rid)
    if (!room) continue
    const cap = roomCap.get(rid) || 0
    if (cap <= 0) continue
    if (!genderAllowed(room, a.gender)) continue
    results.set(a.regId, rid)
    roomCap.set(rid, cap - 1)
  }

  // Helper to try assign an attendee to a matching room predicate
  function tryAssign(att: AttendeeForAllocation, predicate: (r: Room) => boolean) {
    for (const r of rooms) {
      if (!predicate(r)) continue
      const cap = roomCap.get(r.id) || 0
      if (cap <= 0) continue
      if (!genderAllowed(r, att.gender)) continue
      results.set(att.regId, r.id)
      roomCap.set(r.id, cap - 1)
      return true
    }
    return false
  }

  // Order attendees according to mode
  const privateAttendees = attendees.filter((a) => a.accommodationChoice === 'private_paid')
  const hostelAttendees = attendees.filter((a) => a.accommodationChoice === 'free_hostel')

  // 2) Private-paid attendees -> match by requested room type
  const privateOrder = mode === 'group_by_state'
    ? [...privateAttendees].sort((x, y) => (x.state || '').localeCompare(y.state || ''))
    : privateAttendees

  for (const p of privateOrder) {
    if (results.get(p.regId)) continue
    const desired = privateClassFor(p.privateRoomType)
    if (!desired) continue
    tryAssign(p, (r) => r.roomClass === desired)
  }

  // 3) Hostel attendees -> fill hostel rooms (respect gender hard-wall)
  const hostelOrder = mode === 'group_by_state'
    ? [...hostelAttendees].sort((x, y) => (x.state || '').localeCompare(y.state || ''))
    : hostelAttendees

  for (const h of hostelOrder) {
    if (results.get(h.regId)) continue
    tryAssign(h, (r) => r.roomClass === 'hostel')
  }

  // Build final result array preserving input attendee order
  return attendees.map((a) => ({ attendeeId: a.regId, roomId: results.get(a.regId) ?? null }))
}
