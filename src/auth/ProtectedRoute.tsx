// Route guard. Order: loading -> spinner; no session -> /login; staff checks.
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <div className="mirror-card max-w-md space-y-3 p-6">{children}</div>
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
        <p className="text-sm text-zinc-400">Loading...</p>
      </Centered>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (!staff) {
    return (
      <Centered>
        <h1 className="text-lg font-semibold text-zinc-50">Awaiting access</h1>
        <p className="text-sm text-zinc-400">
          Your account is not set up for staff access yet. Ask an admin to add you.
        </p>
        <button onClick={() => void supabase.auth.signOut()} className="secondary-action">
          Sign out
        </button>
      </Centered>
    )
  }

  if (requireAdmin && staff.role !== 'admin') {
    return (
      <Centered>
        <h1 className="text-lg font-semibold text-zinc-50">Admin access required</h1>
        <p className="text-sm text-zinc-400">Ask an admin to run this workflow.</p>
      </Centered>
    )
  }

  return <>{children}</>
}
