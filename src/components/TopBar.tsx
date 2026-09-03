import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/useAuth'

export function TopBar() {
  const { session } = useAuth()
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
      <span className="font-semibold">Conference Reg</span>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-500">{session?.user.email}</span>
        <button
          onClick={() => void supabase.auth.signOut()}
          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
