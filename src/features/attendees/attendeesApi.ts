// I/O module for the Attendees screen — the only place it touches Supabase.
// RLS enforces access: any staff may SELECT/UPDATE; DELETE is admin-only.
import { supabase } from '../../lib/supabase'
import type { AttendeeRecord, EditablePatch } from './types'

export async function fetchAttendees(): Promise<AttendeeRecord[]> {
  const { data, error } = await supabase.from('attendees').select('*').order('full_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as AttendeeRecord[]
}

export async function updateAttendee(id: string, patch: EditablePatch): Promise<void> {
  const { error } = await supabase.from('attendees').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteAttendee(id: string): Promise<void> {
  const { error } = await supabase.from('attendees').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
