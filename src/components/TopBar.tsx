import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

function navClass({ isActive }: { isActive: boolean }): string {
  return (
    'rounded px-2 py-1 ' +
    (isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')
  )
}

export function TopBar() {
  const { session, staff } = useAuth()
  const isAdmin = staff?.role === 'admin'
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex items-center gap-3">
        <span className="font-semibold">Conference Reg</span>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink to="/attendees" className={navClass}>
            Attendees
          </NavLink>
          {isAdmin && (
            <NavLink to="/import" className={navClass}>
              Import
            </NavLink>
          )}
        </nav>
      </div>
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
