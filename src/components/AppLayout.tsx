// App shell for signed-in screens: sticky branded header with tabbed nav, then a
// centered page container with a title/subtitle row and optional right-side actions.
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

function tabClass({ isActive }: { isActive: boolean }): string {
  return (
    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' +
    (isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')
  )
}

export function AppLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  const { session, staff } = useAuth()
  const isAdmin = staff?.role === 'admin'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                NE
              </span>
              <span className="hidden text-sm font-semibold tracking-tight sm:block">Conference Reg</span>
            </div>
            <nav className="flex items-center gap-1">
              <NavLink to="/attendees" className={tabClass}>
                Attendees
              </NavLink>
              {isAdmin && (
                <NavLink to="/import" className={tabClass}>
                  Import
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[14rem] truncate text-sm text-slate-500 md:block">
              {session?.user.email}
            </span>
            <button
              onClick={() => void supabase.auth.signOut()}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  )
}
