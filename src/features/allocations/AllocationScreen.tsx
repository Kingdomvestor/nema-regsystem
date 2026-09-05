import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../../components/AppLayout'
import { Card, StatCard } from '../../components/ui'
import allocate from '../../domain/allocate'
import { allocationWarnings } from '../../domain/allocationWarnings'
import type { AllocationResult, AttendeeForAllocation, Room } from '../../domain/types'
import { fetchAttendees } from '../attendees/attendeesApi'
import { fetchRooms, type RoomRecord } from '../rooms/roomsApi'
import { commitAllocations, fetchAllocations, pinAllocation, removeAllocation, unpinAllocation } from './allocationsApi'

type Mode = 'mix_states' | 'group_by_state'

const input = 'futuristic-input h-10'

function roomForAllocation(room: RoomRecord): Room {
  return {
    id: room.id,
    capacity: room.capacity,
    genderDesignation: room.gender_designation as Room['genderDesignation'],
    roomClass: room.room_class as Room['roomClass'],
    accessible: room.accessible,
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
  const [allocationMap, setAllocationMap] = useState<Map<string, string>>(new Map())
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

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
          fullName: rec.full_name,
          arrived: rec.arrived,
          whatsapp: rec.whatsapp,
          email: rec.email,
          togetherGroup: rec.together_group,
          accessibilityRequired: rec.accessibility_required,
          state: rec.state,
          gender: rec.gender,
          accommodationChoice: rec.accommodation_choice,
          privateRoomType: rec.private_room_type,
        }))
        const pmap = new Map<string, string>()
        for (const al of allocs || []) {
          if (al.pinned) pmap.set(al.attendee_id, al.room_id)
        }
        setPinnedMap(pmap)
        setAllocationMap(new Map((allocs || []).map((allocation) => [allocation.attendee_id, allocation.room_id])))
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
    const availableRooms = allocationRooms.map((room) => ({
      ...room,
      capacity: Math.max(0, room.capacity - [...allocationMap.values()].filter((roomId) => roomId === room.id).length),
    }))
    const candidates = attendees
      .filter((attendee) => attendee.arrived && !allocationMap.has(attendee.regId))
      .filter((attendee) => stateFilter === 'ALL' || attendee.state === stateFilter)
    const results = allocate(
      candidates,
      availableRooms,
      mode,
    )
    const existing = attendees
      .filter((attendee) => allocationMap.has(attendee.regId))
      .filter((attendee) => stateFilter === 'ALL' || attendee.state === stateFilter)
      .map((attendee) => ({ attendeeId: attendee.regId, roomId: allocationMap.get(attendee.regId)! }))
    return [...existing, ...results.map((result) => removedIds.has(result.attendeeId) ? { ...result, roomId: null } : result)]
  }, [allocationMap, allocationRooms, attendees, mode, removedIds, stateFilter])

  useEffect(() => setPreview(computed ?? null), [computed])

  async function handleCommit() {
    if (!preview) return
    setBusy(true)
    try {
      const rows = preview
        .filter((p): p is { attendeeId: string; roomId: string } => p.roomId !== null && !allocationMap.has(p.attendeeId))
        .map((p) => ({ attendeeId: p.attendeeId, roomId: p.roomId }))
      await commitAllocations(rows)
      setAllocationMap((current) => {
        const next = new Map(current)
        for (const row of rows) next.set(row.attendeeId, row.roomId)
        return next
      })
      alert(`${rows.length} allocation${rows.length === 1 ? '' : 's'} committed`)
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
      setAllocationMap((current) => new Map(current).set(attendeeId, roomId))
      setRemovedIds((current) => {
        const next = new Set(current)
        next.delete(attendeeId)
        return next
      })
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
      setAllocationMap((current) => {
        const next = new Map(current)
        next.delete(attendeeId)
        return next
      })
      alert('Unpinned')
    } catch (err: any) {
      console.error(err)
      alert('Unpin failed: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(attendeeId: string) {
    const attendee = attendeeById.get(attendeeId)
    if (!window.confirm(`Remove ${attendee?.fullName ?? attendeeId} from this room? They will remain unassigned.`)) return
    setBusy(true)
    try {
      await removeAllocation(attendeeId)
      setPinnedMap((current) => {
        const next = new Map(current)
        next.delete(attendeeId)
        return next
      })
      setAllocationMap((current) => {
        const next = new Map(current)
        next.delete(attendeeId)
        return next
      })
      setRemovedIds((current) => new Set(current).add(attendeeId))
    } catch (err: any) {
      console.error(err)
      alert('Remove failed: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const assignedCount = preview?.filter((p) => p.roomId).length ?? 0
  const unassignedCount = preview ? preview.length - assignedCount : 0
  const warnings = preview ? allocationWarnings(attendees, allocationRooms, preview) : []
  const warningCountByAttendee = new Map<string, number>()
  for (const warning of warnings) {
    if (warning.attendeeId) warningCountByAttendee.set(warning.attendeeId, (warningCountByAttendee.get(warning.attendeeId) ?? 0) + 1)
  }
  const occupancyByRoom = new Map<string, number>()
  for (const result of preview ?? []) {
    if (result.roomId) occupancyByRoom.set(result.roomId, (occupancyByRoom.get(result.roomId) ?? 0) + 1)
  }
  const visiblePreview = (preview ?? []).filter((result) => {
    const attendee = attendeeById.get(result.attendeeId)
    const needle = search.trim().toLowerCase()
    if (!attendee || !needle) return true
    return [attendee.fullName, attendee.regId, attendee.whatsapp, attendee.email]
      .some((value) => value?.toLowerCase().includes(needle))
  })

  return (
    <AppLayout title="Allocation Preview" subtitle="Preview room assignments, pin exceptions, then commit." actions={<button className="secondary-action" onClick={() => window.print()}>Print rooming list</button>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Rooms" value={rooms.length} tone="brand" />
          <StatCard label="Attendees" value={attendees.length} />
          <StatCard label="Assigned" value={assignedCount} tone="blue" />
          <StatCard label="Unassigned" value={unassignedCount} tone={unassignedCount > 0 ? 'amber' : 'default'} />
        </div>

        <Card className="flex flex-wrap items-end gap-3 p-4">
          <label className="block min-w-64 flex-1">
            <span className="field-label">Find attendee</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email, or RegID" className="futuristic-input h-10 w-full" />
          </label>
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

        {preview && warnings.length > 0 && (
          <Card className="border-amber-300/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-amber-100">Allocation warnings</h2>
              <span className="chip border-amber-300/35 text-amber-100">{warnings.length} flags</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {warnings.slice(0, 12).map((warning, index) => (
                <p key={`${warning.code}-${warning.attendeeId ?? warning.roomId}-${index}`} className="text-sm text-amber-100/80">{warning.message}</p>
              ))}
            </div>
            {warnings.length > 12 && <p className="mt-2 text-xs text-amber-100/60">Showing the first 12 warnings. Review attendee rows for additional flags.</p>}
          </Card>
        )}

        {preview && allocationRooms.length > 0 && (
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-zinc-50">Room capacity</h2>
              <span className="text-xs text-zinc-500">Preview occupancy</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const occupied = occupancyByRoom.get(room.id) ?? 0
                const percentage = Math.min(100, (occupied / Math.max(room.capacity, 1)) * 100)
                const over = occupied > room.capacity
                return <div key={room.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3"><div className="flex justify-between gap-3 text-sm"><span className="text-zinc-200">{roomLabel(room)}</span><span className={over ? 'text-red-200' : 'text-zinc-400'}>{occupied}/{room.capacity}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className={over ? 'h-full bg-red-400' : percentage === 100 ? 'h-full bg-amber-300' : 'h-full bg-brand-300'} style={{ width: `${percentage}%` }} /></div><p className="mt-2 text-[11px] text-zinc-500">{room.accessible ? 'Accessible' : 'Standard'} · {room.gender_designation}</p></div>
              })}
            </div>
          </Card>
        )}

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
                  {visiblePreview.map((p) => {
                    const a = attendeeById.get(p.attendeeId)
                    const pinned = pinnedMap.get(p.attendeeId) ?? null
                    const assignedRoom = roomById.get(p.roomId ?? '')
                    const attendeeWarnings = warningCountByAttendee.get(p.attendeeId) ?? 0
                    return (
                      <tr key={p.attendeeId} className="border-b border-white/8 transition-colors hover:bg-white/8">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-zinc-100">{a?.fullName || p.attendeeId}</div>
                          <div className="mt-1 font-mono text-xs text-zinc-500">{p.attendeeId}</div>
                          {(a?.whatsapp || a?.email) && <div className="mt-1 text-xs text-zinc-500">{a.whatsapp || a.email}</div>}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-300">{a?.state ?? 'Unknown'}</td>
                        <td className="px-4 py-2.5 text-zinc-100">
                          {roomLabel(assignedRoom)}
                          {attendeeWarnings > 0 && <span className="ml-2 chip border-amber-300/35 text-amber-100">{attendeeWarnings} warning{attendeeWarnings === 1 ? '' : 's'}</span>}
                        </td>
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
                            {p.roomId && (
                              <button className="danger-action px-2.5 py-1" onClick={() => void handleRemove(p.attendeeId)} disabled={busy}>
                                Remove
                              </button>
                            )}
                            {!pinned && (
                              <select
                                onChange={(e) => void handlePin(p.attendeeId, e.target.value)}
                                value={p.roomId ?? ''}
                                className="futuristic-input h-9"
                              >
                                <option value="">Assign or pin room...</option>
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
