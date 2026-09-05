// Email + password sign-in. Staff are provisioned in the Supabase dashboard.
import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { supabase } from '../../lib/supabase'

export function LoginScreen() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) return <Navigate to="/attendees" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message)
    setSubmitting(false)
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <form onSubmit={onSubmit} className="mirror-card w-full max-w-sm space-y-5 p-5 sm:p-6">
        <div className="space-y-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/40 bg-brand-300/15 text-base font-bold text-brand-100 shadow-[0_0_28px_rgba(0,229,255,0.38)]">
            NE
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-xl">Nema Conference</h1>
            <p className="mt-1 text-sm text-zinc-400">Staff sign-in</p>
          </div>
        </div>

        <label className="block text-sm">
          <span className="field-label">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="futuristic-input mt-1 h-11 w-full"
          />
        </label>

        <label className="block text-sm">
          <span className="field-label">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="futuristic-input mt-1 h-11 w-full"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="primary-action w-full h-11">
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
