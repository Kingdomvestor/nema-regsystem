// Pure client-side search + filter over the loaded attendee set. No I/O; the screen
// loads all rows once and re-derives the visible list on every keystroke.
import type { AttendeeRecord } from './types'

export interface AttendeeFilter {
  /** Case-insensitive substring over name / whatsapp / email / RegID. */
  search: string
  /** Canonical state, or 'all'. */
  state: string
  /** Raw gender string, or 'all'. */
  gender: string
  /** 'all' | 'free_hostel' | 'private_paid' | 'none' (no choice set). */
  accommodation: 'all' | 'free_hostel' | 'private_paid' | 'none'
  /** When true, keep only rows with at least one review flag set. */
  needsReview: boolean
  arrived: 'all' | 'yes' | 'no'
}

export const emptyFilter: AttendeeFilter = {
  search: '',
  state: 'all',
  gender: 'all',
  accommodation: 'all',
  needsReview: false,
  arrived: 'all',
}

export function rowNeedsReview(r: AttendeeRecord): boolean {
  return r.review_flags.location || r.review_flags.accommodation || r.review_flags.duplicate
}

export function filterAttendees(rows: AttendeeRecord[], f: AttendeeFilter): AttendeeRecord[] {
  const q = f.search.trim().toLowerCase()
  return rows.filter((r) => {
    if (q) {
      const hay = `${r.full_name} ${r.whatsapp} ${r.email} ${r.id}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (f.state !== 'all' && (r.state ?? '') !== f.state) return false
    if (f.gender !== 'all' && r.gender !== f.gender) return false
    if (f.accommodation !== 'all') {
      if (f.accommodation === 'none' && r.accommodation_choice !== null) return false
      if (f.accommodation !== 'none' && r.accommodation_choice !== f.accommodation) return false
    }
    if (f.needsReview && !rowNeedsReview(r)) return false
    if (f.arrived === 'yes' && !r.arrived) return false
    if (f.arrived === 'no' && r.arrived) return false
    return true
  })
}
