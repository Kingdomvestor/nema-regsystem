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
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [attendees, rooms, allocations] = await Promise.all([
    supabase.from('attendees').select('state,gender,accommodation_choice,arrived,review_flags'),
    supabase.from('rooms').select('capacity,gender_designation,room_class'),
    supabase.from('allocations').select('attendee_id'),
  ])

  const response = [attendees, rooms, allocations].find((result) => result.error)
  if (response?.error) throw new Error(response.error.message)

  return {
    attendees: (attendees.data ?? []) as DashboardData['attendees'],
    rooms: (rooms.data ?? []) as DashboardData['rooms'],
    allocations: (allocations.data ?? []) as DashboardData['allocations'],
  }
}