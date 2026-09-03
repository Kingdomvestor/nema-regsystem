import { supabase } from '../../lib/supabase'

export interface CommitAllocation {
  attendeeId: string
  roomId: string
  pinned?: boolean
}

export async function commitAllocations(rows: CommitAllocation[]): Promise<void> {
  const payload = rows
    .filter((r) => r.roomId)
    .map((r) => ({ attendee_id: r.attendeeId, room_id: r.roomId, pinned: !!r.pinned }))

  if (payload.length === 0) return

  const { error } = await supabase.from('allocations').upsert(payload, { onConflict: 'attendee_id' })
  if (error) throw new Error(error.message)
}

export async function fetchAllocations(): Promise<{ attendee_id: string; room_id: string; pinned: boolean }[]> {
  const { data, error } = await supabase.from('allocations').select('attendee_id,room_id,pinned')
  if (error) throw new Error(error.message)
  return (data ?? []) as any
}

export async function pinAllocation(attendeeId: string, roomId: string): Promise<void> {
  const payload = { attendee_id: attendeeId, room_id: roomId, pinned: true }
  const { error } = await supabase.from('allocations').upsert(payload, { onConflict: 'attendee_id' })
  if (error) throw new Error(error.message)
}

export async function unpinAllocation(attendeeId: string): Promise<void> {
  const { error } = await supabase.from('allocations').delete().eq('attendee_id', attendeeId)
  if (error) throw new Error(error.message)
}
