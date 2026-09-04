import type { AttendeeForAllocation, AllocationResult, Room } from './types'

export type AllocationWarningCode =
  | 'unallocated'
  | 'over_capacity'
  | 'gender_mismatch'
  | 'room_class_mismatch'
  | 'invalid_pin'
  | 'accessibility_unmet'
  | 'together_requires_private'
  | 'together_group_split'

export interface AllocationWarning {
  attendeeId?: string
  roomId?: string
  code: AllocationWarningCode
  message: string
}

function genderAllowed(room: Room, gender: string) {
  return room.genderDesignation === 'any' || room.genderDesignation === gender.toLowerCase()
}

function requiredClass(attendee: AttendeeForAllocation): Room['roomClass'] | null {
  if (attendee.accommodationChoice === 'free_hostel') return 'hostel'
  if (attendee.accommodationChoice !== 'private_paid') return null
  if (attendee.privateRoomType === 'fan') return 'private_fan'
  if (attendee.privateRoomType === 'ac') return 'private_ac'
  return null
}

export function allocationWarnings(
  attendees: AttendeeForAllocation[],
  rooms: Room[],
  results: AllocationResult[],
): AllocationWarning[] {
  const roomById = new Map(rooms.map((room) => [room.id, room]))
  const attendeeById = new Map(attendees.map((attendee) => [attendee.regId, attendee]))
  const roomOccupants = new Map<string, string[]>()
  const warnings: AllocationWarning[] = []

  for (const result of results) {
    const attendee = attendeeById.get(result.attendeeId)
    if (!attendee || !result.roomId) {
      if (attendee) warnings.push({ attendeeId: attendee.regId, code: 'unallocated', message: `${attendee.regId} has no room assignment.` })
      continue
    }
    const room = roomById.get(result.roomId)
    if (!room) {
      warnings.push({ attendeeId: attendee.regId, roomId: result.roomId, code: 'invalid_pin', message: `${attendee.regId} points to a room that no longer exists.` })
      continue
    }
    if (attendee.accessibilityRequired && !room.accessible) warnings.push({ attendeeId: attendee.regId, roomId: room.id, code: 'accessibility_unmet', message: `${attendee.regId} requires an accessible room.` })
    const occupants = roomOccupants.get(room.id) ?? []
    occupants.push(attendee.regId)
    roomOccupants.set(room.id, occupants)
    if (!genderAllowed(room, attendee.gender)) warnings.push({ attendeeId: attendee.regId, roomId: room.id, code: 'gender_mismatch', message: `${attendee.regId} does not match ${room.genderDesignation} room ${room.id}.` })
    const expectedClass = requiredClass(attendee)
    if (expectedClass && room.roomClass !== expectedClass) warnings.push({ attendeeId: attendee.regId, roomId: room.id, code: 'room_class_mismatch', message: `${attendee.regId} requests ${expectedClass}, but is assigned to ${room.roomClass}.` })
  }

  for (const [roomId, occupants] of roomOccupants) {
    const room = roomById.get(roomId)
    if (room && occupants.length > room.capacity) warnings.push({ roomId, code: 'over_capacity', message: `${room.id} has ${occupants.length} occupants for ${room.capacity} beds.` })
  }

  for (const attendee of attendees) {
    if (!attendee.pinnedRoomId) continue
    const result = results.find((item) => item.attendeeId === attendee.regId)
    if (!result || result.roomId !== attendee.pinnedRoomId) warnings.push({ attendeeId: attendee.regId, roomId: attendee.pinnedRoomId, code: 'invalid_pin', message: `${attendee.regId} could not keep its pinned room.` })
  }

  const groups = new Map<string, AttendeeForAllocation[]>()
  for (const attendee of attendees) {
    const group = attendee.togetherGroup?.trim()
    if (group) groups.set(group, [...(groups.get(group) ?? []), attendee])
  }
  for (const group of groups.values()) {
    const assignments = new Set(group.map((attendee) => results.find((result) => result.attendeeId === attendee.regId)?.roomId ?? null))
    if (group.some((attendee) => attendee.accommodationChoice !== 'private_paid')) {
      warnings.push({ attendeeId: group[0].regId, code: 'together_requires_private', message: `${group[0].togetherGroup} must use paid private accommodation to stay together.` })
    } else if (assignments.size > 1) {
      warnings.push({ attendeeId: group[0].regId, code: 'together_group_split', message: `${group[0].togetherGroup} is split across rooms or has an unassigned member.` })
    }
  }

  return warnings
}