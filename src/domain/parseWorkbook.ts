import * as XLSX from 'xlsx'
import type { RawRow } from './types'

/** Coerce a possibly-missing cell to a string (numbers, dates, etc. → text). */
function cell(row: unknown[], index: number): string {
  const value = row[index]
  return value === undefined || value === null ? '' : String(value)
}

function headerIndex(headers: unknown[], predicate: (header: string) => boolean, fallback: number): number {
  const index = headers.findIndex((header) => predicate(String(header).toLowerCase()))
  return index >= 0 ? index : fallback
}

/**
 * Parse the first sheet of an in-memory workbook into positional RawRows.
 *
 * Known columns are read from their headers, with the original A–M positions
 * used as a fallback for legacy files. The header row is dropped, fully blank
 * rows are skipped, and every field is coerced to a string.
 *
 * Pure: operates only on the bytes handed in; it never reads the filesystem.
 */
export function parseWorkbook(data: ArrayBuffer | Uint8Array): RawRow[] {
  const workbook = XLSX.read(data, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []
  const sheet = workbook.Sheets[firstSheetName]
  if (!sheet) return []

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  })

  const headers = grid[0] ?? []
  const column = {
    timestamp: headerIndex(headers, (header) => header.includes('timestamp'), -1),
    fullName: headerIndex(headers, (header) => header.includes('full name') || header === 'name', 1),
    whatsapp: headerIndex(headers, (header) => header.includes('whatsapp') || header.includes('phone'), 2),
    email: headerIndex(headers, (header) => header.includes('email'), 3),
    ageGroup: headerIndex(headers, (header) => header.includes('age'), 4),
    location: headerIndex(headers, (header) => header.includes('location') || header.includes('state'), 5),
    occupation: headerIndex(headers, (header) => header.includes('occupation'), 6),
    gender: headerIndex(headers, (header) => header === 'gender' || header.includes('gender'), 7),
    maritalStatus: headerIndex(headers, (header) => header.includes('marital'), 8),
    firstTimeAttending: headerIndex(headers, (header) => header.includes('first time') || header.includes('first-time'), 9),
    howHeard: headerIndex(headers, (header) => header.includes('how did you hear') || header.includes('hear about'), 10),
    accommodationOptions: headerIndex(headers, (header) => header.includes('accommodation'), 11),
    privateRoomType: headerIndex(headers, (header) => header.includes('private') && (header.includes('room') || header.includes('type')), 12),
  }

  const rows: RawRow[] = []
  // Skip the header row (index 0); map the rest positionally.
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i]
    const mapped: RawRow = {
      timestamp: cell(row, column.timestamp),
      fullName: cell(row, column.fullName),
      whatsapp: cell(row, column.whatsapp),
      email: cell(row, column.email),
      ageGroup: cell(row, column.ageGroup),
      location: cell(row, column.location),
      occupation: cell(row, column.occupation),
      gender: cell(row, column.gender),
      maritalStatus: cell(row, column.maritalStatus),
      firstTimeAttending: cell(row, column.firstTimeAttending),
      howHeard: cell(row, column.howHeard),
      accommodationOptions: cell(row, column.accommodationOptions),
      privateRoomType: cell(row, column.privateRoomType),
    }
    // Skip rows that are blank across every mapped column.
    if (Object.values(mapped).some((v) => v.trim() !== '')) {
      rows.push(mapped)
    }
  }

  return rows
}
