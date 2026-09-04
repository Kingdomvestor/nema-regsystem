// Shared app shell for signed-in screens.
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

type DisplayMode = 'black' | 'glow'

function tabClass({ isActive }: { isActive: boolean }): string {
  return (
    'relative rounded-lg px-3 py-1.5 text-sm font-medium transition duration-200 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-brand-300/55 ' +
    (isActive
      ? 'border border-brand-300/45 bg-brand-300/[0.12] text-brand-100 shadow-[0_0_24px_rgba(0,229,255,0.12)] after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-brand-300'
      : 'border border-transparent text-zinc-400 hover:border-white/[0.12] hover:bg-white/[0.07] hover:text-zinc-100')
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
  const [displayMode, setDisplayMode] = useState<DisplayMode>('black')

  useEffect(() => {
    const saved = window.localStorage.getItem('conference-reg-display-mode')
    if (saved === 'black' || saved === 'glow') setDisplayMode(saved)
  }, [])

  useEffect(() => {
    document.body.dataset.displayMode = displayMode
    window.localStorage.setItem('conference-reg-display-mode', displayMode)
  }, [displayMode])

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-30 border-b border-[#304650]/70 bg-black/[0.86] backdrop-blur-2xl print:hidden">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-brand-300/45 bg-brand-300/20 text-xs font-bold text-brand-100 shadow-[0_0_24px_rgba(0,226,255,0.24)]">
                NE
              </span>
              <span className="hidden text-sm font-semibold text-zinc-100 sm:block">
                Conference Reg
              </span>
            </div>
            <nav className="flex max-w-full items-center gap-1 overflow-x-auto py-1">
              <NavLink to="/dashboard" className={tabClass}>
                Dashboard
              </NavLink>
              <NavLink to="/attendees" className={tabClass}>
                Attendees
              </NavLink>
              <NavLink to="/checkin" className={tabClass}>
                Check-in
              </NavLink>
              {isAdmin && (
                <>
                  <NavLink to="/import" className={tabClass}>
                    Import
                  </NavLink>
                  <NavLink to="/rooms" className={tabClass}>
                    Rooms
                  </NavLink>
                  <NavLink to="/allocations" className={tabClass}>
                    Allocations
                  </NavLink>
                  <NavLink to="/meals" className={tabClass}>
                    Meals
                  </NavLink>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.14] bg-white/[0.06] text-zinc-300 transition duration-200 hover:border-brand-300/45 hover:bg-brand-300/12 hover:text-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/50"
              aria-label={
                displayMode === 'black'
                  ? 'Switch to glow background mode'
                  : 'Switch to black background mode'
              }
              title={displayMode === 'black' ? 'Glow mode' : 'Black mode'}
              onClick={() => setDisplayMode((mode) => (mode === 'black' ? 'glow' : 'black'))}
            >
              {displayMode === 'black' ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M20 15.6A8.5 8.5 0 0 1 8.4 4 7.5 7.5 0 1 0 20 15.6Z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              )}
            </button>
            <span className="hidden max-w-[14rem] truncate text-sm text-zinc-400 md:block">
              {session?.user.email}
            </span>
            <button onClick={() => void supabase.auth.signOut()} className="secondary-action px-3 py-1.5">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-200/70">
              Live Operations
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#F3F7FA]">{title}</h1>
            {subtitle && <p className="mt-1 max-w-3xl text-sm text-[#A7B1BA]">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  )
}
