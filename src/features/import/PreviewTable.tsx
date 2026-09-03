// Read-only preview of the cleaned rows. Surfaces review flags as badges; no
// editing this cycle (flag resolution belongs to the Attendees screen). ~537
// rows render directly, no virtualization (spec §6.2).
import { useMemo, useState } from 'react'
import type { CleanedAttendee } from '../../domain/types'

function needsReview(a: CleanedAttendee): boolean {
  return a.reviewFlags.location || a.reviewFlags.accommodation || a.reviewFlags.duplicate
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={'rounded px-1.5 py-0.5 text-[11px] font-medium ' + color}>{label}</span>
}

export function PreviewTable({ attendees }: { attendees: CleanedAttendee[] }) {
  const [onlyReview, setOnlyReview] = useState(false)
  const rows = useMemo(
    () => (onlyReview ? attendees.filter(needsReview) : attendees),
    [attendees, onlyReview],
  )

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={onlyReview}
          onChange={(e) => setOnlyReview(e.target.checked)}
        />
        Show only rows needing review
        <span className="text-slate-400">
          ({rows.length} of {attendees.length})
        </span>
      </label>

      <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">RegID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Gender</th>
              <th className="px-3 py-2">Accommodation</th>
              <th className="px-3 py-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.regId} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/50">
                <td className="px-3 py-1.5 font-mono text-xs">{a.regId}</td>
                <td className="px-3 py-1.5">{a.fullName}</td>
                <td className="px-3 py-1.5">
                  {a.state ?? <span className="text-amber-600">{a.locationRaw || '—'}</span>}
                </td>
                <td className="px-3 py-1.5">{a.gender}</td>
                <td className="px-3 py-1.5">
                  {a.accommodationChoice
                    ? a.accommodationChoice === 'private_paid'
                      ? `private (${a.privateRoomType ?? '?'})`
                      : 'free hostel'
                    : '—'}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {a.reviewFlags.location && <Badge label="location" color="bg-amber-100 text-amber-800" />}
                    {a.reviewFlags.accommodation && <Badge label="accommodation" color="bg-orange-100 text-orange-800" />}
                    {a.reviewFlags.duplicate && <Badge label="duplicate" color="bg-red-100 text-red-800" />}
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
