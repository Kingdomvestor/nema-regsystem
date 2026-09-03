import { describe, expect, it } from 'vitest'
import type { CleanedAttendee } from '../../domain/types'
import { dedupeById, toAttendeeRow, toIso } from './toAttendeeRow'

const base: CleanedAttendee = {
  regId: 'REG-abc123',
  fullName: 'Ada Lovelace',
  whatsapp: '08030000000',
  email: 'ada@example.com',
  ageGroup: '26-35',
  locationRaw: 'Ikeja, Lagos',
  state: 'Lagos',
  occupation: 'Engineer',
  gender: 'Female',
  maritalStatus: 'Single',
  firstTime: true,
  heardVia: 'WhatsApp',
  accommodationChoice: 'private_paid',
  privateRoomType: 'ac',
  registeredAt: '2026-08-01T09:30:00.000Z',
  reviewFlags: { location: false, accommodation: false, duplicate: false },
}

describe('toAttendeeRow', () => {
  it('maps camelCase domain fields to snake_case DB columns', () => {
    const row = toAttendeeRow(base, 'batch-1')
    expect(row.id).toBe('REG-abc123')
    expect(row.full_name).toBe('Ada Lovelace')
    expect(row.age_group).toBe('26-35')
    expect(row.location_raw).toBe('Ikeja, Lagos')
    expect(row.state).toBe('Lagos')
    expect(row.marital_status).toBe('Single')
    expect(row.first_time).toBe(true)
    expect(row.heard_via).toBe('WhatsApp')
    expect(row.accommodation_choice).toBe('private_paid')
    expect(row.private_room_type).toBe('ac')
    expect(row.import_batch).toBe('batch-1')
  })

  it('mirrors reviewFlags.duplicate into dupe_flag and keeps the jsonb blob', () => {
    const row = toAttendeeRow(
      { ...base, reviewFlags: { location: true, accommodation: false, duplicate: true } },
      'b',
    )
    expect(row.dupe_flag).toBe(true)
    expect(row.review_flags).toEqual({ location: true, accommodation: false, duplicate: true })
  })

  it('omits operational columns so upsert never clobbers check-in state', () => {
    const row = toAttendeeRow(base, 'b')
    for (const k of ['arrived', 'arrived_at', 'checked_in_by', 'notes', 'created_at']) {
      expect(row).not.toHaveProperty(k)
    }
  })

  it('passes null state / accommodation / room type straight through', () => {
    const row = toAttendeeRow(
      { ...base, state: null, accommodationChoice: null, privateRoomType: null },
      'b',
    )
    expect(row.state).toBeNull()
    expect(row.accommodation_choice).toBeNull()
    expect(row.private_room_type).toBeNull()
  })

  it('normalizes registered_at to ISO, or null when unparseable/empty', () => {
    expect(toAttendeeRow(base, 'b').registered_at).toBe('2026-08-01T09:30:00.000Z')
    expect(toAttendeeRow({ ...base, registeredAt: 'not a date' }, 'b').registered_at).toBeNull()
    expect(toAttendeeRow({ ...base, registeredAt: '' }, 'b').registered_at).toBeNull()
  })
})

describe('toIso', () => {
  it('parses common formats and rejects junk', () => {
    expect(toIso('2026-08-01T09:30:00.000Z')).toBe('2026-08-01T09:30:00.000Z')
    expect(toIso('  ')).toBeNull()
    expect(toIso('garbage')).toBeNull()
  })
})

describe('dedupeById', () => {
  it('collapses rows sharing a primary key, last write wins', () => {
    const r1 = toAttendeeRow({ ...base, regId: 'DUP', fullName: 'First' }, 'b')
    const r2 = toAttendeeRow({ ...base, regId: 'DUP', fullName: 'Second' }, 'b')
    const r3 = toAttendeeRow({ ...base, regId: 'OTHER' }, 'b')
    const out = dedupeById([r1, r2, r3])
    expect(out).toHaveLength(2)
    expect(out.find((r) => r.id === 'DUP')?.full_name).toBe('Second')
  })
})
