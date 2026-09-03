// Read-only preview of the cleaned rows. Surfaces review flags as badges; no
// editing this cycle (flag resolution belongs to the Attendees screen). ~537
// rows render directly, no virtualization (spec §6.2).
import { useMemo, useState } from 'react'
import type { CleanedAttendee } from '../../domain/types'

function needsReview(a: CleanedAttendee): boolean {
  return a.reviewFlags.location || a.reviewFlags.accommodation || a.reviewFlags.duplicate
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

      <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
            <tr className="border-b border-slate-200">
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
              <tr key={a.regId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{a.regId}</td>
                <td className="px-4 py-2.5 font-medium text-slate-800">{a.fullName}</td>
                <td className="px-4 py-2.5">
                  {a.state ?? <span className="text-amber-600">{a.locationRaw || '—'}</span>}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{a.gender}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {a.accommodationChoice
                    ? a.accommodationChoice === 'private_paid'
                      ? `Private · ${a.privateRoomType ?? '?'}`
                      : 'Free hostel'
                    : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {a.reviewFlags.location && <Badge label="location" color="bg-amber-100 text-amber-700" />}
                    {a.reviewFlags.accommodation && <Badge label="accom" color="bg-orange-100 text-orange-700" />}
                    {a.reviewFlags.duplicate && <Badge label="dupe" color="bg-red-100 text-red-700" />}
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
