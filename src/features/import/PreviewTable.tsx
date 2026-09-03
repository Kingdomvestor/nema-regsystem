// Read-only preview of the cleaned rows.
import { useMemo, useState } from 'react'
import type { CleanedAttendee } from '../../domain/types'

function needsReview(a: CleanedAttendee): boolean {
  return a.reviewFlags.location || a.reviewFlags.accommodation || a.reviewFlags.duplicate
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' + color}>
      {label}
    </span>
  )
}

export function PreviewTable({ attendees }: { attendees: CleanedAttendee[] }) {
  const [onlyReview, setOnlyReview] = useState(false)
  const rows = useMemo(
    () => (onlyReview ? attendees.filter(needsReview) : attendees),
    [attendees, onlyReview],
  )

  return (
    <div className="space-y-2">
      <label className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={onlyReview}
          onChange={(e) => setOnlyReview(e.target.checked)}
          className="accent-brand-300"
        />
        Show only rows needing review
        <span className="text-zinc-500">
          ({rows.length} of {attendees.length})
        </span>
      </label>

      <div className="table-surface max-h-[28rem] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-950/82 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 backdrop-blur-xl">
            <tr className="border-b border-white/10">
              <th className="px-4 py-2.5">RegID</th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">State</th>
              <th className="px-4 py-2.5">Gender</th>
              <th className="px-4 py-2.5">Accommodation</th>
              <th className="px-4 py-2.5">Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.regId} className="border-b border-white/8 transition-colors hover:bg-white/8">
                <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{a.regId}</td>
                <td className="px-4 py-2.5 font-medium text-zinc-100">{a.fullName}</td>
                <td className="px-4 py-2.5 text-zinc-300">
                  {a.state ?? <span className="text-amber-200">{a.locationRaw || '-'}</span>}
                </td>
                <td className="px-4 py-2.5 text-zinc-300">{a.gender}</td>
                <td className="px-4 py-2.5 text-zinc-300">
                  {a.accommodationChoice
                    ? a.accommodationChoice === 'private_paid'
                      ? `Private - ${a.privateRoomType ?? '?'}`
                      : 'Free hostel'
                    : '-'}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {a.reviewFlags.location && (
                      <Badge label="location" color="border-amber-300/35 bg-amber-300/12 text-amber-100" />
                    )}
                    {a.reviewFlags.accommodation && (
                      <Badge label="accom" color="border-orange-300/35 bg-orange-300/12 text-orange-100" />
                    )}
                    {a.reviewFlags.duplicate && (
                      <Badge label="dupe" color="border-red-300/35 bg-red-400/12 text-red-100" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
