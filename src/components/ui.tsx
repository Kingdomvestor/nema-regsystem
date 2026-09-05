import type { ReactNode } from 'react'

/** Standard glass surface for card views. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={'mirror-card ' + className}>{children}</div>
}

type StatTone = 'default' | 'brand' | 'amber' | 'red' | 'blue' | 'success'

const statToneClass: Record<StatTone, string> = {
  default: 'text-zinc-100',
  brand: 'text-[#7ff7ff]',
  amber: 'text-[#ffbd3f]',
  red: 'text-[#ff6f7d]',
  blue: 'text-[#9ff6ff]',
  success: 'text-[#80f2b2]',
}

const statIconClass: Record<StatTone, string> = {
  default: 'border-zinc-300/25 bg-zinc-300/10 text-zinc-100',
  brand: 'border-brand-300/50 bg-brand-300/20 text-brand-50 shadow-[0_0_30px_rgba(0,226,255,0.2)]',
  amber: 'border-amber-300/50 bg-amber-400/20 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.22)]',
  red: 'border-rose-300/50 bg-rose-500/20 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.22)]',
  blue: 'border-brand-300/50 bg-brand-300/20 text-brand-50 shadow-[0_0_30px_rgba(0,226,255,0.2)]',
  success: 'border-emerald-300/50 bg-emerald-400/20 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.22)]',
}

const statBorderClass: Record<StatTone, string> = {
  default: 'border-l-zinc-400/50',
  brand: 'border-l-brand-300',
  amber: 'border-l-amber-400',
  red: 'border-l-rose-500',
  blue: 'border-l-brand-300',
  success: 'border-l-emerald-400',
}

/** Compact metric tile for a screen's summary row. */
export function StatCard({
  label,
  value,
  tone = 'default',
  description,
  icon,
}: {
  label: string
  value: number | string
  tone?: StatTone
  description?: string
  icon?: ReactNode
}) {
  return (
    <div className={'mirror-card-quiet group flex min-h-20 flex-col border-l-4 p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(0,229,255,0.08)] hover:ring-1 hover:ring-brand-300/20 sm:p-4 ' + statBorderClass[tone]}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ' + statIconClass[tone]}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className={'text-2xl font-semibold tabular-nums ' + statToneClass[tone]}>{value}</div>
          <div className={'mt-1 text-[10px] font-bold uppercase leading-tight ' + statToneClass[tone]}>{label}</div>
          {description && <p className="mt-1 text-xs leading-tight text-zinc-400">{description}</p>}
        </div>
      </div>
    </div>
  )
}
