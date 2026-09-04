import type { AttendeeForAllocation, Room, AllocationResult } from './types'

type Mode = 'mix_states' | 'group_by_state'

function genderAllowed(room: Room, gender: string) {
  return room.genderDesignation === 'any' || room.genderDesignation === gender.toLowerCase()
}

function roomAllows(room: Room, attendees: AttendeeForAllocation[]) {
  return attendees.every((attendee) => genderAllowed(room, attendee.gender) && (!attendee.accessibilityRequired || room.accessible))
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
    if (!roomAllows(room, [a])) continue
    results.set(a.regId, rid)
    roomCap.set(rid, cap - 1)
  }

  // Helper to try assign an attendee to a matching room predicate
  function tryAssign(att: AttendeeForAllocation, predicate: (r: Room) => boolean) {
    for (const r of rooms) {
      if (!predicate(r)) continue
      const cap = roomCap.get(r.id) || 0
      if (cap <= 0) continue
      if (!roomAllows(r, [att])) continue
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

  const privateGroups = new Map<string, AttendeeForAllocation[]>()
  for (const attendee of privateOrder) {
    const key = attendee.togetherGroup?.trim()
    if (key) privateGroups.set(key, [...(privateGroups.get(key) ?? []), attendee])
  }
  const groupedIds = new Set([...privateGroups.values()].flat().map((attendee) => attendee.regId))

  for (const group of privateGroups.values()) {
    if (group.some((attendee) => results.get(attendee.regId))) continue
    const desired = privateClassFor(group[0].privateRoomType)
    if (!desired || group.some((attendee) => privateClassFor(attendee.privateRoomType) !== desired)) continue
    const room = rooms.find((candidate) => candidate.roomClass === desired && (roomCap.get(candidate.id) ?? 0) >= group.length && roomAllows(candidate, group))
    if (!room) continue
    for (const attendee of group) {
      results.set(attendee.regId, room.id)
    }
    roomCap.set(room.id, (roomCap.get(room.id) ?? 0) - group.length)
  }

  for (const p of privateOrder) {
    if (groupedIds.has(p.regId)) continue
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
