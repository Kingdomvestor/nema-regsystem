// Route guard. Order: loading -> spinner; no session -> /login; session but no
// staff row -> "Awaiting access"; requireAdmin && not admin -> blocked. Import
// is admin-only because attendees INSERT is admin-only under RLS (spec §5.3).
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-slate-900">
      {children}
    </main>
  )
}

export function ProtectedRoute({
  requireAdmin = false,
  children,
}: {
  requireAdmin?: boolean
  children: ReactNode
}) {
  const { session, staff, loading } = useAuth()

  if (loading) {
    return (
      <Centered>
        <p className="text-sm text-slate-500">Loading...</p>
      </Centered>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (!staff) {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">Awaiting access</h1>
        <p className="max-w-sm text-center text-sm text-slate-500">
          Your account is not set up for staff access yet — ask an admin to add you.
        </p>
        <button
          onClick={() => void supabase.auth.signOut()}
          className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-white"
        >
          Sign out
        </button>
      </Centered>
    )
  }

  if (requireAdmin && staff.role !== 'admin') {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">Imports are admin-only</h1>
        <p className="max-w-sm text-center text-sm text-slate-500">
          Ask an admin to run the attendee import.
        </p>
      </Centered>
    )
  }

  return <>{children}</>
}
