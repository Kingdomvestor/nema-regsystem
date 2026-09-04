import { supabase } from '../../lib/supabase'

export interface DashboardData {
  attendees: Array<{
    state: string | null
    gender: string | null
    accommodation_choice: string | null
    arrived: boolean
    review_flags: Record<string, boolean> | null
  }>
  rooms: Array<{ capacity: number; gender_designation: string; room_class: string }>
  allocations: Array<{ attendee_id: string }>
  sessions: Array<{ id: string; name: string; meal_type: string }>
  tickets: Array<{ session_id: string; registered: boolean; collected: boolean }>
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [attendees, rooms, allocations, sessions, tickets] = await Promise.all([
    supabase.from('attendees').select('state,gender,accommodation_choice,arrived,review_flags'),
    supabase.from('rooms').select('capacity,gender_designation,room_class'),
    supabase.from('allocations').select('attendee_id'),
    supabase.from('meal_sessions').select('id,name,meal_type').order('sort_order'),
    supabase.from('meal_tickets').select('session_id,registered,collected'),
  ])

  const response = [attendees, rooms, allocations, sessions, tickets].find((result) => result.error)
  if (response?.error) throw new Error(response.error.message)

  return {
    attendees: (attendees.data ?? []) as DashboardData['attendees'],
    rooms: (rooms.data ?? []) as DashboardData['rooms'],
    allocations: (allocations.data ?? []) as DashboardData['allocations'],
    sessions: (sessions.data ?? []) as DashboardData['sessions'],
    tickets: (tickets.data ?? []) as DashboardData['tickets'],
  }
}