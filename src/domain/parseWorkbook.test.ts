import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseWorkbook } from './parseWorkbook'
import type { RawRow } from './types'

/** Build an in-memory .xlsx (bytes) from an array-of-arrays — no real file touched. */
function workbookBytes(aoa: unknown[][]): ArrayBuffer | Uint8Array {
  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Form responses 1')
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' })
}

// A long, Google-Forms-style header — parsing must ignore its text and go by position.
const HEADER = [
  'Timestamp',
  'Full Name',
  'WhatsApp number',
  'Email Address',
  'Age group',
  'Location / State of residence',
  'Occupation',
  'Gender',
  'Marital Status',
  'Is this your first time attending?',
  'How did you hear about the conference?',
  'Accommodation Options',
  'If private, which room type?',
]

describe('parseWorkbook', () => {
  it('drops the header row and maps columns 0–12 positionally', () => {
    const bytes = workbookBytes([
      HEADER,
      [
        '2026-01-02 10:00',
        'Ada Lovelace',
        '0801',
        'ada@x.com',
        '25-34',
        'Ibadan',
        'Engineer',
        'Female',
        'Single',
        'Yes',
        'Friend',
        'Free hostel',
        '',
      ],
    ])
    const rows = parseWorkbook(bytes)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual<RawRow>({
      timestamp: '2026-01-02 10:00',
      fullName: 'Ada Lovelace',
      whatsapp: '0801',
      email: 'ada@x.com',
      ageGroup: '25-34',
      location: 'Ibadan',
      occupation: 'Engineer',
      gender: 'Female',
      maritalStatus: 'Single',
      firstTimeAttending: 'Yes',
      howHeard: 'Friend',
      accommodationOptions: 'Free hostel',
      privateRoomType: '',
    })
  })

  it('skips fully-blank rows', () => {
    const bytes = workbookBytes([
      HEADER,
      ['2026', 'Bea', '0802', 'bea@x.com', '', '', '', 'Male', '', 'No', '', 'Private paid', 'Fan'],
      ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    ])
    const rows = parseWorkbook(bytes)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.fullName).toBe('Bea')
  })

  it('coerces every field to a string, including numeric cells', () => {
    const bytes = workbookBytes([
      HEADER,
      ['2026', 'Cid', 8030000, 'cid@x.com', '', 'Lagos', '', 'Male', '', 'y', '', 'Free hostel', ''],
    ])
    const rows = parseWorkbook(bytes)
    const row = rows[0] as RawRow
    for (const value of Object.values(row)) {
      expect(typeof value).toBe('string')
    }
    expect(row.whatsapp).toBe('8030000')
  })

  it('finds accommodation columns by header when extra columns shift their position', () => {
    const bytes = workbookBytes([
      [...HEADER.slice(0, 11), 'Extra column', HEADER[11], HEADER[12]],
      ['2026', 'Ada', '0801', 'ada@x.com', '', 'Lagos', '', 'Female', '', 'No', '', 'ignored', 'Free hostel', ''],
    ])
    const rows = parseWorkbook(bytes)
    expect(rows[0]?.accommodationOptions).toBe('Free hostel')
    expect(rows[0]?.privateRoomType).toBe('')
  })

  it('maps all fields when the timestamp column is absent', () => {
    const headers = HEADER.slice(1)
    const bytes = workbookBytes([
      headers,
      ['Ada Lovelace', '0801', 'ada@x.com', '25-34', 'Lagos', 'Engineer', 'Female', 'Single', 'No', 'Friend', 'Free hostel', ''],
    ])
    const row = parseWorkbook(bytes)[0]
    expect(row?.fullName).toBe('Ada Lovelace')
    expect(row?.whatsapp).toBe('0801')
    expect(row?.location).toBe('Lagos')
    expect(row?.occupation).toBe('Engineer')
    expect(row?.gender).toBe('Female')
    expect(row?.accommodationOptions).toBe('Free hostel')
  })

  it('returns an empty array for a header-only sheet', () => {
    expect(parseWorkbook(workbookBytes([HEADER]))).toEqual([])
  })

  it('accepts a Uint8Array as well as an ArrayBuffer', () => {
    const out = workbookBytes([HEADER, ['t', 'n', 'w', 'e', '', 'Oyo', '', 'Male', '', 'No', '', 'Free hostel', '']])
    const bytes = out instanceof Uint8Array ? out : new Uint8Array(out)
    const rows = parseWorkbook(bytes)
    expect(rows[0]?.location).toBe('Oyo')
  })
})
