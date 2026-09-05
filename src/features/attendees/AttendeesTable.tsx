import { rowNeedsReview } from './attendeesFilter'
import type { AttendeeRecord } from './types'

function accommodationLabel(r: AttendeeRecord): string {
  if (!r.accommodation_choice) return '-'
  return r.accommodation_choice === 'private_paid'
    ? `Private - ${r.private_room_type ?? '?'}`
    : 'Free hostel'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ' + color}>
      {label}
    </span>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 11.1V12a9 9 0 1 1-5.35-8.23" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function AttendeesTable({
  rows,
  selectedId,
  selectedIds = new Set<string>(),
  canSelectRow = () => false,
  arrivalBusyId = null,
  onSelect,
  onToggleSelect,
  onToggleArrived,
}: {
  rows: AttendeeRecord[]
  selectedId: string | null
  selectedIds?: Set<string>
  canSelectRow?: (row: AttendeeRecord) => boolean
  arrivalBusyId?: string | null
  onSelect: (id: string) => void
  onToggleSelect?: (id: string, checked: boolean) => void
  onToggleArrived?: (row: AttendeeRecord) => void
}) {
  return (
    <div id="attendees-table" className="max-h-[calc(100vh-22rem)] overflow-auto">
      <table className="w-full min-w-[52rem] table-fixed border-collapse text-sm sm:min-w-[70rem]">
        <colgroup>
          <col className="w-10 sm:w-12" />
          <col className="w-26 sm:w-32" />
          <col className="w-[15rem] sm:w-[20rem]" />
          <col className="w-28 sm:w-36" />
          <col className="w-22 sm:w-24" />
          <col className="w-32 sm:w-44" />
          <col className="w-30 sm:w-40" />
          <col className="w-28 sm:w-40" />
          <col className="w-10 sm:w-12" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[#0D151B]/92 text-left text-[11px] font-semibold uppercase text-[#A7B1BA] backdrop-blur-xl">
          <tr className="border-b border-[#26343C]/90">
            <th className="px-3 py-3 sm:px-4" aria-label="Select duplicates">
              <span className="block h-4 w-4 rounded border border-white/30 bg-white/[0.04]" aria-hidden="true" />
            </th>
            <th className="px-3 py-3 text-center sm:px-4">Arrived</th>
            <th className="px-3 py-3 sm:px-4">Name</th>
            <th className="px-3 py-3 sm:px-4">State</th>
            <th className="px-3 py-3 sm:px-4">Gender</th>
            <th className="px-3 py-3 sm:px-4">Accommodation</th>
            <th className="px-3 py-3 sm:px-4">Flags</th>
            <th className="px-3 py-3 sm:px-4">RegID</th>
            <th className="px-3 py-3 sm:px-4" aria-label="Open attendee details" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const selected = r.id === selectedId
            const selectable = canSelectRow(r)
            return (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(r.id)
                  }
                }}
                tabIndex={0}
                className={
                  'group cursor-pointer border-b border-[#26343C]/55 transition duration-200 outline-none focus-visible:bg-brand-300/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300/45 ' +
                  (selected ? 'bg-brand-300/12 text-zinc-50' : 'hover:bg-white/[0.055]')
                }
              >
                  <td className="px-3 py-3 sm:px-4">
                    {selectable ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        aria-label={`Select duplicate ${r.full_name}`}
                        className="h-4 w-4 rounded border-white/40 bg-black accent-brand-300"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onToggleSelect?.(r.id, e.target.checked)}
                      />
                    ) : (
                      <span className="block h-4 w-4" />
                    )}
                  </td>
                  <td className="px-3 py-3 text-center sm:px-4">
                    <button
                      type="button"
                      disabled={arrivalBusyId === r.id}
                      className={
                        'inline-flex min-w-20 items-center justify-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/45 disabled:cursor-wait disabled:opacity-60 sm:min-w-24 sm:gap-1.5 sm:px-2.5 sm:text-xs ' +
                        (r.arrived
                          ? 'border-emerald-300/35 bg-emerald-300/12 text-emerald-100 hover:bg-emerald-300/18'
                          : 'border-brand-300/28 bg-brand-300/6 text-brand-100 hover:border-brand-300/45 hover:bg-brand-300/12')
                      }
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleArrived?.(r)
                      }}
                      aria-label={r.arrived ? `Mark ${r.full_name} not arrived` : `Mark ${r.full_name} arrived`}
                    >
                      <CheckCircleIcon />
                      {arrivalBusyId === r.id ? 'Saving' : r.arrived ? 'Arrived' : 'Mark'}
                    </button>
                  </td>
                  <td className="min-w-0 px-3 py-3 sm:px-4">
                    <div className="flex min-w-0 max-w-full items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-brand-300/28 bg-gradient-to-br from-brand-300/18 to-white/5 text-[10px] font-semibold text-brand-100 sm:h-9 sm:w-9 sm:text-xs">
                        {initials(r.full_name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-[#F3F7FA]" title={r.full_name}>
                        {r.full_name}
                      </span>
                    </div>
                  </td>
                  <td className="min-w-0 px-3 py-3 sm:px-4">
                    {r.state ? (
                      <span className="inline-block max-w-full truncate rounded-full border border-[#26343C] bg-white/[0.055] px-2 py-1 align-middle text-[10px] font-medium text-zinc-300 sm:text-xs" title={r.state}>
                        {r.state}
                      </span>
                    ) : (
                      <span className="block max-w-full truncate text-[10px] text-amber-200 sm:text-xs" title={r.location_raw || '-'}>
                        {r.location_raw || '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-zinc-300 sm:px-4 sm:text-sm">{r.gender || '-'}</td>
                  <td className="px-3 py-3 text-[11px] text-zinc-300 sm:px-4 sm:text-sm">{accommodationLabel(r)}</td>
                  <td className="px-3 py-3 sm:px-4">
                    <div className="flex flex-wrap gap-1">
                      {r.review_flags.location && (
                        <Badge label="location" color="border-amber-300/35 bg-amber-300/12 text-amber-100" />
                      )}
                      {r.review_flags.accommodation && (
                        <Badge label="accom" color="border-orange-300/35 bg-orange-300/12 text-orange-100" />
                      )}
                      {(r.review_flags.duplicate || r.dupe_flag) && (
                        <Badge label="dupe" color="border-red-300/35 bg-red-400/12 text-red-100" />
                      )}
                      {!rowNeedsReview(r) && <span className="text-zinc-600">-</span>}
                    </div>
                  </td>
                  <td className="truncate px-3 py-3 font-mono text-[10px] text-zinc-500 sm:px-4 sm:text-xs" title={r.id}>
                    {r.id}
                  </td>
                  <td className="px-3 py-3 text-zinc-500 transition group-hover:text-brand-100 sm:px-4">
                    <ChevronRightIcon />
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">
                  No attendees match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
  )
}
