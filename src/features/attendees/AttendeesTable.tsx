import { rowNeedsReview } from './attendeesFilter'
import type { AttendeeRecord } from './types'

function accommodationLabel(r: AttendeeRecord): string {
  if (!r.accommodation_choice) return '—'
  return r.accommodation_choice === 'private_paid'
    ? `private (${r.private_room_type ?? '?'})`
    : 'free hostel'
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={'rounded px-1.5 py-0.5 text-[11px] font-medium ' + color}>{label}</span>
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
    <div className="max-h-[32rem] overflow-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">RegID</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">State</th>
            <th className="px-3 py-2">Gender</th>
            <th className="px-3 py-2">Accommodation</th>
            <th className="px-3 py-2">Arrived</th>
            <th className="px-3 py-2">Flags</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={
                'cursor-pointer border-t border-slate-100 ' +
                (r.id === selectedId ? 'bg-sky-50' : 'odd:bg-white even:bg-slate-50/50 hover:bg-slate-100')
              }
            >
              <td className="px-3 py-1.5 font-mono text-xs">{r.id}</td>
              <td className="px-3 py-1.5">{r.full_name}</td>
              <td className="px-3 py-1.5">
                {r.state ?? <span className="text-amber-600">{r.location_raw || '—'}</span>}
              </td>
              <td className="px-3 py-1.5">{r.gender}</td>
              <td className="px-3 py-1.5">{accommodationLabel(r)}</td>
              <td className="px-3 py-1.5">
                {r.arrived ? <span className="text-green-700">✓</span> : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-3 py-1.5">
                <div className="flex flex-wrap gap-1">
                  {r.review_flags.location && <Badge label="location" color="bg-amber-100 text-amber-800" />}
                  {r.review_flags.accommodation && (
                    <Badge label="accommodation" color="bg-orange-100 text-orange-800" />
                  )}
                  {r.review_flags.duplicate && <Badge label="duplicate" color="bg-red-100 text-red-800" />}
                  {!rowNeedsReview(r) && <span className="text-slate-300">—</span>}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                No attendees match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
