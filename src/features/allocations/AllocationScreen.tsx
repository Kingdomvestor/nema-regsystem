import React, { useEffect, useMemo, useState } from 'react'
import allocate from '../../domain/allocate'
import type { AttendeeForAllocation, Room } from '../../domain/types'
import { fetchRooms } from '../rooms/roomsApi'
import { fetchAttendees } from '../attendees/attendeesApi'
import { commitAllocations, fetchAllocations, pinAllocation, unpinAllocation } from './allocationsApi'

export function AllocationScreen() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [attendees, setAttendees] = useState<AttendeeForAllocation[]>([])
  const [preview, setPreview] = useState<{ attendeeId: string; roomId: string | null }[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'mix_states' | 'group_by_state'>('mix_states')
  const [stateFilter, setStateFilter] = useState<string | 'ALL'>('ALL')
  const [pinnedMap, setPinnedMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let mounted = true
    fetchRooms().then((r) => mounted && setRooms(r as any)).catch(console.error)
    Promise.all([fetchAttendees(), fetchAllocations()])
      .then(([a, allocs]) => {
        if (!mounted) return
        const pool = (a ?? []).map((rec) => ({
          regId: rec.id,
          state: rec.state,
          gender: rec.gender,
          accommodationChoice: rec.accommodation_choice,
          privateRoomType: rec.private_room_type,
        }))
        const pmap = new Map<string, string>()
        for (const al of allocs || []) pmap.set(al.attendee_id, al.room_id)
        setPinnedMap(pmap)
        setAttendees(pool as AttendeeForAllocation[])
      })
      .catch(console.error)
    
    return () => { mounted = false }
  }, [])

  const computed = useMemo(() => {
    if (attendees.length === 0 || rooms.length === 0) return null
    // inject pinnedRoomId into attendees when present
    const withPins = attendees.map((a) => ({ ...a, pinnedRoomId: pinnedMap.get(a.regId) ?? null }))
    return allocate(
      stateFilter === 'ALL' ? withPins : withPins.filter((x) => x.state === stateFilter),
      rooms,
      mode,
    )
  }, [attendees, rooms, mode, stateFilter, pinnedMap])

  useEffect(() => setPreview(computed as any ?? null), [computed])

  async function handleCommit() {
    if (!preview) return
    setBusy(true)
    try {
      const rows = preview.map((p) => ({ attendeeId: p.attendeeId, roomId: p.roomId }))
      await commitAllocations(rows)
      alert('Allocations committed')
    } catch (err: any) {
      console.error(err)
      alert('Commit failed: ' + err.message)
    } finally { setBusy(false) }
  }

  async function handlePin(attendeeId: string, roomId: string) {
    setBusy(true)
    try {
      await pinAllocation(attendeeId, roomId)
      setPinnedMap(new Map(pinnedMap).set(attendeeId, roomId))
      alert('Pinned')
    } catch (err: any) {
      console.error(err)
      alert('Pin failed: ' + err.message)
    } finally { setBusy(false) }
  }

  async function handleUnpin(attendeeId: string) {
    setBusy(true)
    try {
      await unpinAllocation(attendeeId)
      const m = new Map(pinnedMap)
      m.delete(attendeeId)
      setPinnedMap(m)
      alert('Unpinned')
    } catch (err: any) {
      console.error(err)
      alert('Unpin failed: ' + err.message)
    } finally { setBusy(false) }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Allocation Preview</h2>
      <div className="mb-4">Rooms: {rooms.length} · Attendees: {attendees.length}</div>
      <div className="flex gap-2 items-center mb-4">
        <label className="flex items-center gap-2">Mode:
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="border p-1 ml-2">
            <option value="mix_states">Mix states</option>
            <option value="group_by_state">Group by state</option>
          </select>
        </label>
        <label className="flex items-center gap-2">State:
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value as any)} className="border p-1 ml-2">
            <option value="ALL">All</option>
            <option value="Lagos">Lagos</option>
            <option value="Oyo">Oyo</option>
            <option value="Ogun">Ogun</option>
            <option value="Kwara">Kwara</option>
            <option value="Ekiti">Ekiti</option>
            <option value="Osun">Osun</option>
            <option value="Ondo">Ondo</option>
          </select>
        </label>
      </div>
      {!preview && <div>Loading preview…</div>}
      {preview && (
        <div className="space-y-2 max-w-2xl">
          <div className="grid grid-cols-3 font-medium">
            <div>Attendee</div>
            <div>State</div>
            <div>Assigned Room</div>
          </div>
          {preview.map((p) => {
            const a = attendees.find((x) => x.regId === p.attendeeId)
            const pinned = pinnedMap.get(p.attendeeId) ?? null
            return (
              <div key={p.attendeeId} className="grid grid-cols-3 py-1 border-b items-center">
                <div>{p.attendeeId}</div>
                <div>{a?.state ?? 'Unknown'}</div>
                <div className="flex items-center gap-2">
                  <div className="min-w-[80px]">{p.roomId ?? '—'}</div>
                  {p.roomId && !pinned && (
                    <button className="px-2 py-1 bg-yellow-500 text-black rounded" onClick={async () => {
                      // pin to assigned room
                      await handlePin(p.attendeeId, p.roomId!)
                    }}>Pin</button>
                  )}
                  {pinned && (
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-600">Pinned</div>
                      <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => handleUnpin(p.attendeeId)}>Unpin</button>
                    </div>
                  )}
                  {!p.roomId && (
                    <select onChange={(e) => handlePin(p.attendeeId, e.target.value)} defaultValue="" className="border p-1">
                      <option value="">Pin to room…</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>{r.block} {r.room_number} (cap {r.capacity})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )
          })}
          <div className="pt-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleCommit} disabled={busy}>
              {busy ? 'Committing…' : 'Commit allocations'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AllocationScreen
