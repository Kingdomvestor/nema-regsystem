import { supabase } from '../../lib/supabase'

export interface RoomRecord {
  id: string
  block: string
  room_number: string
  capacity: number
  gender_designation: string
  room_class: string
  accessible: boolean
  notes: string | null
}

export async function fetchRooms(): Promise<RoomRecord[]> {
  const { data, error } = await supabase.from('rooms').select('*').order('block')
  if (error) throw new Error(error.message)
  return (data ?? []) as RoomRecord[]
}

export async function createRoom(payload: Partial<RoomRecord>): Promise<RoomRecord> {
  const { data, error } = await supabase.from('rooms').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as RoomRecord
}

export async function updateRoom(id: string, patch: Partial<RoomRecord>): Promise<void> {
  const { error } = await supabase.from('rooms').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
