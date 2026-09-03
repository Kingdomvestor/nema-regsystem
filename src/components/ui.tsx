import type { ReactNode } from 'react'

/** Standard surface: white card on the slate background. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={'rounded-xl border border-slate-200 bg-white shadow-sm ' + className}>
      {children}
    </div>
  )
}

type StatTone = 'default' | 'brand' | 'amber' | 'red' | 'green'

const statToneClass: Record<StatTone, string> = {
  default: 'text-slate-900',
  brand: 'text-brand-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  green: 'text-emerald-600',
}

/** Compact metric tile for a screen's summary row. */
export function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number | string
  tone?: StatTone
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={'text-2xl font-semibold tabular-nums ' + statToneClass[tone]}>{value}</div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}
