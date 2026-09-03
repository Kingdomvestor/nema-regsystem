// Session + staff-row context. RLS gates every table on a public.staff row, so
// the app must know whether the signed-in user has one (and their role) before
// it can render meaningfully. See spec §5.2.
import type { Session } from '@supabase/supabase-js'
import { createContext, type ReactNode, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface StaffRow {
  id: string
  role: string
  full_name: string | null
}

export interface AuthState {
  session: Session | null
  staff: StaffRow | null
  loading: boolean
}

export const AuthContext = createContext<AuthState>({
  session: null,
  staff: null,
  loading: true,
})

async function fetchStaff(userId: string): Promise<StaffRow | null> {
  const { data } = await supabase
    .from('staff')
    .select('id, role, full_name')
    .eq('id', userId)
    .maybeSingle()
  return (data as StaffRow | null) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [staff, setStaff] = useState<StaffRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadStaff(next: Session | null) {
      const row = next?.user ? await fetchStaff(next.user.id) : null
      if (!active) return
      setStaff(row)
      setLoading(false)
    }

    // Initial read (safe to call supabase.from here — outside the auth callback).
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      void loadStaff(data.session)
    })

    // Later changes. Defer the DB call out of the callback to avoid the
    // supabase-js auth-lock reentrancy warning.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      setLoading(true)
      setTimeout(() => void loadStaff(next), 0)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ session, staff, loading }}>{children}</AuthContext.Provider>
}
