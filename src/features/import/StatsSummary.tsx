import type { ImportStats } from '../../domain/types'

function Card({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <div
      className={
        'rounded-lg border p-3 ' +
        (tone === 'warn' && value > 0
          ? 'border-amber-300 bg-amber-50'
          : 'border-slate-200 bg-white')
      }
    >
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function Chips({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-500">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([k, v]) => (
          <span key={k} className="rounded bg-slate-100 px-2 py-0.5 text-xs">
            {k || '(blank)'}: <span className="font-medium">{v}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function StatsSummary({ stats }: { stats: ImportStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Total" value={stats.total} />
        <Card label="Needing review" value={stats.needingReview} tone="warn" />
        <Card label="Duplicates" value={stats.duplicates} tone="warn" />
        <Card label="Accommodation conflicts" value={stats.accommodationConflicts} tone="warn" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Chips title="By state" counts={stats.byState} />
        <Chips title="By gender" counts={stats.byGender} />
      </div>
    </div>
  )
}
