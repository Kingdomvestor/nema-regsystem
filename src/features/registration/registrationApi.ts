import { supabase } from '../../lib/supabase'
import type { AccommodationChoice, CanonicalState, PrivateRoomType, ReviewFlags } from '../../domain/types'

export interface RegistrationInput {
  fullName: string
  whatsapp: string
  email: string
  ageGroup: string
  state: string
  occupation: string
  gender: string
  maritalStatus: string
  firstTime: boolean
  heardVia: string
  accommodationChoice: string
  privateRoomType: string
  notes: string
}

export async function registerAttendee(input: RegistrationInput, id: string, registeredAt: string): Promise<void> {
  const reviewFlags: ReviewFlags = { location: false, accommodation: false, duplicate: false }
  const accommodationChoice = input.accommodationChoice === 'free_hostel' || input.accommodationChoice === 'private_paid'
    ? input.accommodationChoice as AccommodationChoice
    : null
  const privateRoomType = input.privateRoomType === 'fan' || input.privateRoomType === 'ac'
    ? input.privateRoomType as PrivateRoomType
    : null

  const { error } = await supabase.from('attendees').insert({
    id,
    full_name: input.fullName.trim(),
    whatsapp: input.whatsapp.trim(),
    email: input.email.trim(),
    age_group: input.ageGroup.trim(),
    location_raw: input.state,
    state: input.state as CanonicalState,
    occupation: input.occupation.trim(),
    gender: input.gender.trim(),
    marital_status: input.maritalStatus.trim(),
    first_time: input.firstTime,
    heard_via: input.heardVia.trim(),
    accommodation_choice: accommodationChoice,
    private_room_type: privateRoomType,
    arrived: false,
    arrived_at: null,
    checked_in_by: null,
    dupe_flag: false,
    review_flags: reviewFlags,
    notes: input.notes.trim() || null,
    registered_at: registeredAt,
    import_batch: `manual-${registeredAt}`,
  })

  if (error) throw new Error(error.message)
}
