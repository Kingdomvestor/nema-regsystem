// I/O module for the Attendees screen — the only place it touches Supabase.
// RLS enforces access: any staff may SELECT/UPDATE; DELETE is admin-only.
import { supabase } from '../../lib/supabase'
import type { AttendeeRecord, EditablePatch } from './types'

const ARRIVAL_QUEUE_KEY = 'conference-reg-arrival-queue'

interface QueuedArrival {
  id: string
  arrived: boolean
}

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

export async function deleteAttendees(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('attendees').delete().in('id', ids)
  if (error) throw new Error(error.message)
}

export async function setAttendeeArrived(id: string, arrived: boolean): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)

  const { error } = await supabase
    .from('attendees')
    .update({
      arrived,
      arrived_at: arrived ? new Date().toISOString() : null,
      checked_in_by: arrived ? user?.id ?? null : null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export function queueAttendeeArrival(id: string, arrived: boolean): void {
  const current = JSON.parse(window.localStorage.getItem(ARRIVAL_QUEUE_KEY) ?? '[]') as QueuedArrival[]
  const next = [...current.filter((item) => item.id !== id), { id, arrived }]
  window.localStorage.setItem(ARRIVAL_QUEUE_KEY, JSON.stringify(next))
}

export async function flushQueuedArrivals(): Promise<void> {
  const queued = JSON.parse(window.localStorage.getItem(ARRIVAL_QUEUE_KEY) ?? '[]') as QueuedArrival[]
  if (queued.length === 0) return
  for (const item of queued) await setAttendeeArrived(item.id, item.arrived)
  window.localStorage.removeItem(ARRIVAL_QUEUE_KEY)
}
