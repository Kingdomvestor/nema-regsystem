import { rowNeedsReview } from './attendeesFilter'
import type { AttendeeRecord } from './types'

function accommodationLabel(r: AttendeeRecord): string {
  if (!r.accommodation_choice) return '—'
  return r.accommodation_choice === 'private_paid'
    ? `Private · ${r.private_room_type ?? '?'}`
    : 'Free hostel'
}

function initial(name: string): string {
  const c = name.trim()[0]
  return c ? c.toUpperCase() : '?'
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={
        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' + color
      }
    >
      {label}
    </span>
  )
}

export function AttendeesTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: AttendeeRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[calc(100vh-20rem)] overflow-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-28" />
            <col />
            <col className="w-28" />
            <col className="w-20" />
            <col className="w-36" />
            <col className="w-20" />
            <col className="w-40" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-50/95 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-2.5">RegID</th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">State</th>
              <th className="px-4 py-2.5">Gender</th>
              <th className="px-4 py-2.5">Accommodation</th>
              <th className="px-4 py-2.5 text-center">Arrived</th>
              <th className="px-4 py-2.5">Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const selected = r.id === selectedId
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  className={
                    'cursor-pointer border-b border-slate-100 transition-colors ' +
                    (selected ? 'bg-brand-50' : 'hover:bg-slate-50')
                  }
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.id}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                        {initial(r.full_name)}
                      </span>
                      <span className="truncate font-medium text-slate-800">{r.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.state ? (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {r.state}
                      </span>
                    ) : (
                      <span className="truncate text-xs text-amber-600">{r.location_raw || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{r.gender || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{accommodationLabel(r)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {r.arrived ? (
                      <span className="text-emerald-600">✓</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r.review_flags.location && <Badge label="location" color="bg-amber-100 text-amber-700" />}
                      {r.review_flags.accommodation && (
                        <Badge label="accom" color="bg-orange-100 text-orange-700" />
                      )}
                      {r.review_flags.duplicate && <Badge label="dupe" color="bg-red-100 text-red-700" />}
                      {!rowNeedsReview(r) && <span className="text-slate-300">—</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  No attendees match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
