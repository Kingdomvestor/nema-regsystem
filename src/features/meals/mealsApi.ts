import { supabase } from '../../lib/supabase'

export interface MealSessionRecord {
  id: string
  name: string
  day: number
  meal_type: string
  session_date: string | null
  sort_order: number
}

export async function fetchMealSessions(): Promise<MealSessionRecord[]> {
  const { data, error } = await supabase.from('meal_sessions').select('*').order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []) as MealSessionRecord[]
}

export async function createMealSession(payload: Partial<MealSessionRecord>): Promise<MealSessionRecord> {
  const { data, error } = await supabase.from('meal_sessions').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as MealSessionRecord
}

export async function updateMealSession(id: string, patch: Partial<MealSessionRecord>): Promise<void> {
  const { error } = await supabase.from('meal_sessions').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteMealSession(id: string): Promise<void> {
  const { error } = await supabase.from('meal_sessions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
