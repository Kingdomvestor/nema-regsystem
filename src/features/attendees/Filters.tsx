import { CANONICAL_STATES } from '../../domain/normalizeLocation'
import type { AttendeeFilter } from './attendeesFilter'

const control =
  'h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm ' +
  'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'

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
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a1 1 0 01-1.42 1.42l-3.08-3.08A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search name, phone, email, or RegID"
          className={'w-full pl-9 ' + control}
        />
      </div>

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

        <label
          className={
            'flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium shadow-sm transition-colors ' +
            (value.needsReview
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')
          }
        >
          <input
            type="checkbox"
            checked={value.needsReview}
            onChange={(e) => set({ needsReview: e.target.checked })}
            className="accent-amber-600"
          />
          Needs review
        </label>

        <span className="ml-auto text-sm text-slate-500">
          <span className="font-semibold text-slate-700 tabular-nums">{resultCount}</span> of {total}
        </span>
      </div>
    </div>
  )
}
