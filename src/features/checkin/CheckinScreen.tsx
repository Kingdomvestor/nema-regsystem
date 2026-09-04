import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../../components/AppLayout'
import { Card } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { fetchAttendees, flushQueuedArrivals, queueAttendeeArrival, setAttendeeArrived } from '../attendees/attendeesApi'
import type { AttendeeRecord } from '../attendees/types'
import { fetchAllocations } from '../allocations/allocationsApi'
import { fetchRooms, type RoomRecord } from '../rooms/roomsApi'

type Allocation = { attendee_id: string; room_id: string }

function matches(attendee: AttendeeRecord, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [attendee.id, attendee.full_name, attendee.whatsapp, attendee.email]
    .some((value) => value?.toLowerCase().includes(needle))
}

export default function CheckinScreen() {
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(() => !navigator.onLine)

  async function load() {
    setLoading(true)
    try {
      const [people, assigned, inventory] = await Promise.all([fetchAttendees(), fetchAllocations(), fetchRooms()])
      setAttendees(people)
      setAllocations(assigned)
      setRooms(inventory)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load check-in data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const goOnline = () => {
      setOffline(false)
      void flushQueuedArrivals().then(() => load()).catch(() => setError('Could not sync queued check-ins yet.'))
    }
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    const channel = supabase
      .channel('checkin-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'allocations' }, () => void load())
      .subscribe()
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      void supabase.removeChannel(channel)
    }
  }, [])

  const roomById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms])
  const allocationByAttendee = useMemo(() => new Map(allocations.map((allocation) => [allocation.attendee_id, allocation.room_id])), [allocations])
  const results = useMemo(() => attendees.filter((attendee) => matches(attendee, query)).slice(0, 30), [attendees, query])

  async function toggleArrival(attendee: AttendeeRecord) {
    setBusyId(attendee.id)
    try {
      const arrived = !attendee.arrived
      if (offline) queueAttendeeArrival(attendee.id, arrived)
      else await setAttendeeArrived(attendee.id, arrived)
      setAttendees((current) => current.map((item) => item.id === attendee.id ? { ...item, arrived: !item.arrived, arrived_at: !item.arrived ? new Date().toISOString() : null } : item))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update arrival status.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppLayout title="Check-in desk" subtitle="Search by name, phone, email, or registration ID and mark arrival.">
      <div className="mx-auto max-w-7xl space-y-4">
        <Card className="p-4 sm:p-6">
          <label className="block">
            <span className="field-label">Find attendee</span>
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, phone, email, or RegID" className="futuristic-input h-14 w-full text-lg" />
          </label>
        </Card>
        {offline && <div className="rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">Offline mode: check-ins are queued and will sync automatically when the connection returns.</div>}
        {error && <div className="rounded-lg border border-red-300/30 bg-red-400/10 p-3 text-sm text-red-200">{error} <button className="ml-2 underline" onClick={() => void load()}>Retry</button></div>}
        {loading && <Card className="p-8 text-center text-zinc-400">Loading attendees...</Card>}
        {!loading && results.length === 0 && <Card className="p-8 text-center text-zinc-400">No matching attendee.</Card>}
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((attendee) => {
            const room = roomById.get(allocationByAttendee.get(attendee.id) ?? '')
            return <Card key={attendee.id} className="flex flex-col justify-between gap-4 rounded-md p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2">
                <p className="truncate text-lg font-semibold text-zinc-50">{attendee.full_name}</p>
                <p className="font-mono text-xs text-zinc-400">{attendee.id}</p>
                <p className="text-sm text-zinc-300">{attendee.whatsapp || attendee.email || 'No contact listed'}</p>
                <p className="text-sm text-zinc-400">{room ? `Room ${room.block} ${room.room_number}` : 'No room allocated'}</p>
              </div>
              <button type="button" disabled={busyId === attendee.id} onClick={() => void toggleArrival(attendee)} className={attendee.arrived ? 'secondary-action min-h-12 w-full sm:w-auto sm:min-w-32' : 'success-action min-h-12 w-full sm:w-auto sm:min-w-32'}>
                {busyId === attendee.id ? 'Saving...' : attendee.arrived ? 'Arrived' : 'Mark arrived'}
              </button>
            </Card>
          })}
        </div>
      </div>
    </AppLayout>
  )
}