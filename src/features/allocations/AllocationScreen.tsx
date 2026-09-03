import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../../components/AppLayout'
import { Card, StatCard } from '../../components/ui'
import allocate from '../../domain/allocate'
import type { AllocationResult, AttendeeForAllocation, Room } from '../../domain/types'
import { fetchAttendees } from '../attendees/attendeesApi'
import { fetchRooms, type RoomRecord } from '../rooms/roomsApi'
import { commitAllocations, fetchAllocations, pinAllocation, unpinAllocation } from './allocationsApi'

type Mode = 'mix_states' | 'group_by_state'

const input = 'futuristic-input h-10'

function roomForAllocation(room: RoomRecord): Room {
  return {
    id: room.id,
    capacity: room.capacity,
    genderDesignation: room.gender_designation as Room['genderDesignation'],
    roomClass: room.room_class as Room['roomClass'],
  }
}

function roomLabel(room: RoomRecord | undefined): string {
  if (!room) return '-'
  return `${room.block} ${room.room_number}`
}

export function AllocationScreen() {
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [attendees, setAttendees] = useState<AttendeeForAllocation[]>([])
  const [preview, setPreview] = useState<AllocationResult[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<Mode>('mix_states')
  const [stateFilter, setStateFilter] = useState<string | 'ALL'>('ALL')
  const [pinnedMap, setPinnedMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let mounted = true

    fetchRooms()
      .then((r) => mounted && setRooms(r))
      .catch(console.error)

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
        setAttendees(pool)
      })
      .catch(console.error)

    return () => {
      mounted = false
    }
  }, [])

  const allocationRooms = useMemo(() => rooms.map(roomForAllocation), [rooms])
  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])
  const attendeeById = useMemo(() => new Map(attendees.map((a) => [a.regId, a])), [attendees])
  const stateOptions = useMemo(
    () => [
      ...new Set(
        attendees
          .map((a) => a.state)
          .filter((s): s is NonNullable<AttendeeForAllocation['state']> => s !== null),
      ),
    ].sort(),
    [attendees],
  )

  const computed = useMemo(() => {
    if (attendees.length === 0 || allocationRooms.length === 0) return null
    const withPins = attendees.map((a) => ({ ...a, pinnedRoomId: pinnedMap.get(a.regId) ?? null }))
    return allocate(
      stateFilter === 'ALL' ? withPins : withPins.filter((x) => x.state === stateFilter),
      allocationRooms,
      mode,
    )
  }, [allocationRooms, attendees, mode, pinnedMap, stateFilter])

  useEffect(() => setPreview(computed ?? null), [computed])

  async function handleCommit() {
    if (!preview) return
    setBusy(true)
    try {
      const rows = preview
        .filter((p): p is { attendeeId: string; roomId: string } => p.roomId !== null)
        .map((p) => ({ attendeeId: p.attendeeId, roomId: p.roomId }))
      await commitAllocations(rows)
      alert('Allocations committed')
    } catch (err: any) {
      console.error(err)
      alert('Commit failed: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handlePin(attendeeId: string, roomId: string) {
    if (!roomId) return
    setBusy(true)
    try {
      await pinAllocation(attendeeId, roomId)
      setPinnedMap(new Map(pinnedMap).set(attendeeId, roomId))
      alert('Pinned')
    } catch (err: any) {
      console.error(err)
      alert('Pin failed: ' + err.message)
    } finally {
      setBusy(false)
    }
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
    } finally {
      setBusy(false)
    }
  }

  const assignedCount = preview?.filter((p) => p.roomId).length ?? 0
  const unassignedCount = preview ? preview.length - assignedCount : 0

  return (
    <AppLayout title="Allocation Preview" subtitle="Preview room assignments, pin exceptions, then commit.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Rooms" value={rooms.length} tone="brand" />
          <StatCard label="Attendees" value={attendees.length} />
          <StatCard label="Assigned" value={assignedCount} tone="blue" />
          <StatCard label="Unassigned" value={unassignedCount} tone={unassignedCount > 0 ? 'amber' : 'default'} />
        </div>

        <Card className="flex flex-wrap items-end gap-3 p-4">
          <label className="block">
            <span className="field-label">Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className={input}>
              <option value="mix_states">Mix states</option>
              <option value="group_by_state">Group by state</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">State</span>
            <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value as string | 'ALL')} className={input}>
              <option value="ALL">All</option>
              {stateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-action ml-auto" onClick={() => void handleCommit()} disabled={busy || !preview}>
            {busy ? 'Working...' : 'Commit allocations'}
          </button>
        </Card>

        {!preview && <Card className="p-12 text-center text-zinc-400">Loading preview...</Card>}

        {preview && (
          <div className="table-surface">
            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full min-w-[46rem] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-950/82 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 backdrop-blur-xl">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2.5">Attendee</th>
                    <th className="px-4 py-2.5">State</th>
                    <th className="px-4 py-2.5">Assigned Room</th>
                    <th className="px-4 py-2.5">Control</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p) => {
                    const a = attendeeById.get(p.attendeeId)
                    const pinned = pinnedMap.get(p.attendeeId) ?? null
                    const assignedRoom = roomById.get(p.roomId ?? '')
                    return (
                      <tr key={p.attendeeId} className="border-b border-white/8 transition-colors hover:bg-white/8">
                        <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">{p.attendeeId}</td>
                        <td className="px-4 py-2.5 text-zinc-300">{a?.state ?? 'Unknown'}</td>
                        <td className="px-4 py-2.5 text-zinc-100">{roomLabel(assignedRoom)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {p.roomId && !pinned && (
                              <button className="secondary-action px-2.5 py-1" onClick={() => void handlePin(p.attendeeId, p.roomId!)}>
                                Pin
                              </button>
                            )}
                            {pinned && (
                              <>
                                <span className="chip text-brand-100">Pinned</span>
                                <button className="secondary-action px-2.5 py-1" onClick={() => void handleUnpin(p.attendeeId)}>
                                  Unpin
                                </button>
                              </>
                            )}
                            {!p.roomId && (
                              <select
                                onChange={(e) => void handlePin(p.attendeeId, e.target.value)}
                                defaultValue=""
                                className="futuristic-input h-9"
                              >
                                <option value="">Pin to room...</option>
                                {rooms.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.block} {r.room_number} (cap {r.capacity})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default AllocationScreen
