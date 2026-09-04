import { supabase } from '../../lib/supabase'

export interface MealTicketRecord {
  id: string
  attendee_id: string
  session_id: string
  registered: boolean
  collected: boolean
  collected_at: string | null
}

export async function fetchTicketsForSession(sessionId: string): Promise<MealTicketRecord[]> {
  const { data, error } = await supabase.from('meal_tickets').select('*').eq('session_id', sessionId).order('attendee_id')
  if (error) throw new Error(error.message)
  return (data ?? []) as MealTicketRecord[]
}

export async function registerTicket(sessionId: string, attendeeId: string): Promise<void> {
  const payload = { session_id: sessionId, attendee_id: attendeeId, registered: true }
  const { error } = await supabase.from('meal_tickets').upsert(payload, { onConflict: '(attendee_id, session_id)' })
  if (error) throw new Error(error.message)
}

export async function registerTickets(sessionId: string, attendeeIds: string[]): Promise<void> {
  if (attendeeIds.length === 0) return
  const payload = attendeeIds.map((attendee_id) => ({ session_id: sessionId, attendee_id, registered: true }))
  const { error } = await supabase.from('meal_tickets').upsert(payload, { onConflict: '(attendee_id, session_id)' })
  if (error) throw new Error(error.message)
}

export async function toggleCollected(ticketId: string, collected: boolean): Promise<void> {
  const patch = { collected, collected_at: collected ? new Date().toISOString() : null }
  const { error } = await supabase.from('meal_tickets').update(patch).eq('id', ticketId)
  if (error) throw new Error(error.message)
}

export async function toggleRegistered(ticketId: string, registered: boolean): Promise<void> {
  const patch = registered
    ? { registered }
    : { registered, collected: false, collected_at: null }
  const { error } = await supabase
    .from('meal_tickets')
    .update(patch)
    .eq('id', ticketId)
  if (error) throw new Error(error.message)
}

export async function deleteTicket(ticketId: string): Promise<void> {
  const { error } = await supabase.from('meal_tickets').delete().eq('id', ticketId)
  if (error) throw new Error(error.message)
}
