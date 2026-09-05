import { describe, expect, it } from 'vitest'
import { runImport } from './runImport'
import type { RawRow } from './types'

/** A well-formed baseline row; override just the fields a case cares about. */
function rawRow(overrides: Partial<RawRow> = {}): RawRow {
  return {
    timestamp: '2026-01-01 09:00',
    fullName: 'Ada Lovelace',
    whatsapp: '0801',
    email: 'ada@x.com',
    ageGroup: '25-34',
    location: 'Lagos',
    occupation: 'Engineer',
    gender: 'Female',
    maritalStatus: 'Single',
    firstTimeAttending: 'No',
    howHeard: 'Friend',
    accommodationOptions: 'Free hostel',
    privateRoomType: '',
    ...overrides,
  }
}

describe('runImport', () => {
  it('cleans a well-formed row with no review flags', () => {
    const { attendees, stats } = runImport([rawRow()])
    expect(attendees).toHaveLength(1)
    const a = attendees[0]!
    expect(a.regId).toMatch(/^REG-[0-9A-F]{8}$/)
    expect(a.state).toBe('Lagos')
    expect(a.locationRaw).toBe('Lagos')
    expect(a.accommodationChoice).toBe('free_hostel')
    expect(a.privateRoomType).toBeNull()
    expect(a.firstTime).toBe(false)
    expect(a.heardVia).toBe('Friend')
    expect(a.registeredAt).toBe('2026-01-01 09:00')
    expect(a.reviewFlags).toEqual({ location: false, accommodation: false, duplicate: false })
    expect(stats).toEqual({
      total: 1,
      byState: { Lagos: 1 },
      byGender: { Female: 1 },
      needingReview: 0,
      duplicates: 0,
      accommodationConflicts: 0,
    })
  })

  it('keeps an unmappable location without flagging it for review', () => {
    const { attendees, stats } = runImport([rawRow({ location: 'Abuja' })])
    const a = attendees[0]!
    expect(a.state).toBeNull()
    expect(a.locationRaw).toBe('Abuja')
    expect(a.reviewFlags.location).toBe(false)
    expect(stats.byState).toEqual({ Unknown: 1 })
    expect(stats.needingReview).toBe(0)
  })

  it('does not flag a room type on a free-hostel selection', () => {
    const { attendees, stats } = runImport([
      rawRow({ accommodationOptions: 'Free hostel', privateRoomType: 'Fan' }),
    ])
    const a = attendees[0]!
    expect(a.accommodationChoice).toBe('free_hostel')
    expect(a.privateRoomType).toBeNull()
    expect(a.reviewFlags.accommodation).toBe(false)
    expect(stats.accommodationConflicts).toBe(0)
    expect(stats.needingReview).toBe(0)
  })

  it('does not flag a duplicate pair that only shares a phone number', () => {
    const { attendees, stats } = runImport([
      rawRow({ fullName: 'Ada', email: 'a@x.com', whatsapp: '0900' }),
      rawRow({ fullName: 'Bea', email: 'b@x.com', whatsapp: '0900' }),
    ])
    expect(attendees[0]!.reviewFlags.duplicate).toBe(false)
    expect(attendees[1]!.reviewFlags.duplicate).toBe(false)
    expect(stats.duplicates).toBe(0)
    expect(stats.needingReview).toBe(0)
  })

  it('parses firstTime via /^y/i', () => {
    const { attendees } = runImport([
      rawRow({ firstTimeAttending: 'Yes', email: 'y1@x.com' }),
      rawRow({ firstTimeAttending: 'no', email: 'n1@x.com' }),
      rawRow({ firstTimeAttending: 'y', email: 'y2@x.com' }),
      rawRow({ firstTimeAttending: '', email: 'blank@x.com' }),
    ])
    expect(attendees.map((a) => a.firstTime)).toEqual([true, false, true, false])
  })

  it('aggregates counts by state (incl. city → state) and by gender', () => {
    const { stats } = runImport([
      rawRow({ location: 'Lagos', gender: 'Male', email: '1@x.com' }),
      rawRow({ location: 'Oyo', gender: 'Female', email: '2@x.com' }),
      rawRow({ location: 'Ibadan', gender: 'Male', email: '3@x.com' }), // city → Oyo
      rawRow({ location: 'Narnia', gender: 'Male', email: '4@x.com' }), // unknown → Unknown
    ])
    expect(stats.total).toBe(4)
    expect(stats.byState).toEqual({ Lagos: 1, Oyo: 2, Unknown: 1 })
    expect(stats.byGender).toEqual({ Male: 3, Female: 1 })
  })

  it('is deterministic: identical input yields identical output', () => {
    const rows = [rawRow({ email: 'd1@x.com' }), rawRow({ email: 'd2@x.com' })]
    expect(runImport(rows)).toEqual(runImport(rows))
  })

  it('returns empty attendees and zeroed stats for no rows', () => {
    const { attendees, stats } = runImport([])
    expect(attendees).toEqual([])
    expect(stats).toEqual({
      total: 0,
      byState: {},
      byGender: {},
      needingReview: 0,
      duplicates: 0,
      accommodationConflicts: 0,
    })
  })
})
