import { CANONICAL_STATES } from '../../domain/normalizeLocation'
import type { AttendeeFilter } from './attendeesFilter'

const control = 'futuristic-input h-10 w-full'

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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1fr)_8.75rem_8.75rem_11.75rem_9.5rem_9.75rem_6.75rem] lg:items-center">
      <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-200/75"
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
          className="futuristic-input h-10 w-full pl-11"
          aria-label="Search attendees by name, phone, email, or registration ID"
        />
      </div>

      <select
        value={value.state}
        onChange={(e) => set({ state: e.target.value })}
        className={control}
        aria-label="Filter by state"
      >
        <option value="all">All states</option>
        {CANONICAL_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={value.gender}
        onChange={(e) => set({ gender: e.target.value })}
        className={control}
        aria-label="Filter by gender"
      >
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
        aria-label="Filter by accommodation"
      >
        <option value="all">All accommodation</option>
        <option value="free_hostel">Free hostel</option>
        <option value="private_paid">Private (paid)</option>
        <option value="none">No choice</option>
      </select>

      <label
        className={
          'flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold shadow-sm transition duration-200 focus-within:ring-2 focus-within:ring-amber-300/45 ' +
          (value.needsReview
            ? 'border-amber-300/50 bg-amber-300/14 text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.08)]'
            : 'border-[#26343C] bg-white/[0.055] text-zinc-300 hover:border-amber-300/35 hover:bg-amber-300/8 hover:text-amber-100')
        }
      >
        <input
          type="checkbox"
          checked={value.needsReview}
          onChange={(e) => set({ needsReview: e.target.checked })}
          className="accent-amber-300"
        />
        <span className="whitespace-nowrap">Needs review</span>
      </label>

      <span className="flex h-10 items-center justify-center rounded-lg border border-[#26343C] bg-[#111D24]/72 px-3 text-sm text-zinc-400">
        <span className="font-semibold text-brand-100 tabular-nums">{resultCount}</span>
        <span className="mx-1">of</span>
        <span className="tabular-nums">{total}</span>
      </span>
    </div>
  )
}
