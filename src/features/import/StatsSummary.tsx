import type { ImportStats } from '../../domain/types'
import { StatCard } from '../../components/ui'

function Chips({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return (
    <div className="mirror-card-quiet p-4">
      <div className="mb-2 text-xs font-medium text-zinc-400">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([k, v]) => (
          <span key={k} className="chip">
            {k || '(blank)'}: <span className="font-semibold text-brand-100">{v}</span>
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
        <StatCard label="Total" value={stats.total} tone="brand" />
        <StatCard label="Needing review" value={stats.needingReview} tone={stats.needingReview > 0 ? 'amber' : 'default'} />
        <StatCard label="Duplicates" value={stats.duplicates} tone={stats.duplicates > 0 ? 'red' : 'default'} />
        <StatCard
          label="Accommodation conflicts"
          value={stats.accommodationConflicts}
          tone={stats.accommodationConflicts > 0 ? 'amber' : 'default'}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Chips title="By state" counts={stats.byState} />
        <Chips title="By gender" counts={stats.byGender} />
      </div>
    </div>
  )
}
