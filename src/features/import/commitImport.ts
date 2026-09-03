// Commits cleaned attendees to Supabase via a chunked upsert on the RegID PK.
// This is the one I/O module of the import feature; the row shaping and dedup it
// relies on are the pure, tested helpers in ./toAttendeeRow. See spec §6.3–6.4.
import type { CleanedAttendee } from '../../domain/types'
import { supabase } from '../../lib/supabase'
import { type AttendeeRow, dedupeById, toAttendeeRow } from './toAttendeeRow'

/** Rows per upsert request. 537 attendees fits in one, but chunk to be safe. */
const CHUNK_SIZE = 200

export interface CommitResult {
  /** The import_batch stamp written on every row of this run. */
  batch: string
  /** Number of rows sent (post-dedup). */
  written: number
}

/** The per-run import batch id — an ISO timestamp, written on every row. */
export function newImportBatch(now: Date = new Date()): string {
  return `import-${now.toISOString()}`
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Upsert cleaned attendees. Idempotent per RegID: only import-owned columns are
 * sent, so re-running refreshes cleaning data without clobbering check-in state
 * or deleting anyone. Throws with a readable message on the first failed chunk.
 */
export async function commitImport(
  attendees: CleanedAttendee[],
  opts: { batch?: string; onProgress?: (written: number, total: number) => void } = {},
): Promise<CommitResult> {
  const batch = opts.batch ?? newImportBatch()
  const rows: AttendeeRow[] = dedupeById(attendees.map((a) => toAttendeeRow(a, batch)))

  let written = 0
  for (const part of chunk(rows, CHUNK_SIZE)) {
    const { error } = await supabase.from('attendees').upsert(part, { onConflict: 'id' })
    if (error) {
      throw new Error(
        `Commit failed after ${written} of ${rows.length} rows: ${error.message}`,
      )
    }
    written += part.length
    opts.onProgress?.(written, rows.length)
  }

  return { batch, written }
}
