import * as XLSX from 'xlsx'
import type { RawRow } from './types'

/** Coerce a possibly-missing cell to a string (numbers, dates, etc. → text). */
function cell(row: unknown[], index: number): string {
  const value = row[index]
  return value === undefined || value === null ? '' : String(value)
}

/**
 * Parse the first sheet of an in-memory workbook into positional RawRows.
 *
 * Columns A–M (0–12) are read by POSITION — robust to the long, free-text
 * headers a Google-Forms export produces. The header row is dropped, fully
 * blank rows are skipped, and every field is coerced to a string.
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

  const rows: RawRow[] = []
  // Skip the header row (index 0); map the rest positionally.
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i]
    const mapped: RawRow = {
      timestamp: cell(row, 0),
      fullName: cell(row, 1),
      whatsapp: cell(row, 2),
      email: cell(row, 3),
      ageGroup: cell(row, 4),
      location: cell(row, 5),
      occupation: cell(row, 6),
      gender: cell(row, 7),
      maritalStatus: cell(row, 8),
      firstTimeAttending: cell(row, 9),
      howHeard: cell(row, 10),
      accommodationOptions: cell(row, 11),
      privateRoomType: cell(row, 12),
    }
    // Skip rows that are blank across every mapped column.
    if (Object.values(mapped).some((v) => v.trim() !== '')) {
      rows.push(mapped)
    }
  }

  return rows
}
