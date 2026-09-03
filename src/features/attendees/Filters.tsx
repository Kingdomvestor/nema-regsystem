import { CANONICAL_STATES } from '../../domain/normalizeLocation'
import type { AttendeeFilter } from './attendeesFilter'

const control = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm'

export function Filters({
  value,
  onChange,
  genders,
  resultCount,
  total,
}: {
  value: AttendeeFilter
  onChange: (f: AttendeeFilter) => void
  genders: string[]
  resultCount: number
  total: number
}) {
  const set = (patch: Partial<AttendeeFilter>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={value.search}
        onChange={(e) => set({ search: e.target.value })}
        placeholder="Search name, phone, email, or RegID"
        className={'w-full ' + control}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select value={value.state} onChange={(e) => set({ state: e.target.value })} className={control}>
          <option value="all">All states</option>
          {CANONICAL_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select value={value.gender} onChange={(e) => set({ gender: e.target.value })} className={control}>
          <option value="all">All genders</option>
          {genders.map((g) => (
            <option key={g} value={g}>
              {g || '(blank)'}
            </option>
          ))}
        </select>

        <select
          value={value.accommodation}
          onChange={(e) => set({ accommodation: e.target.value as AttendeeFilter['accommodation'] })}
          className={control}
        >
          <option value="all">All accommodation</option>
          <option value="free_hostel">Free hostel</option>
          <option value="private_paid">Private (paid)</option>
          <option value="none">No choice</option>
        </select>

        <select
          value={value.arrived}
          onChange={(e) => set({ arrived: e.target.value as AttendeeFilter['arrived'] })}
          className={control}
        >
          <option value="all">Any arrival</option>
          <option value="yes">Arrived</option>
          <option value="no">Not arrived</option>
        </select>

        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={value.needsReview}
            onChange={(e) => set({ needsReview: e.target.checked })}
          />
          Needs review
        </label>

        <span className="ml-auto text-sm text-slate-400">
          {resultCount} of {total}
        </span>
      </div>
    </div>
  )
}
