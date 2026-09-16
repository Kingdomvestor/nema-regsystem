import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '../../components/AppLayout'
import { Card } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { fetchAttendees, flushQueuedArrivals, queueAttendeeArrival, setAttendeeArrived } from '../attendees/attendeesApi'
import type { AttendeeRecord } from '../attendees/types'
import { fetchAllocations } from '../allocations/allocationsApi'
import { fetchRooms, type RoomRecord } from '../rooms/roomsApi'

type Allocation = { attendee_id: string; room_id: string }
const STATE_OPTIONS = ['Kwara', 'Lagos', 'Ogun', 'Oyo', 'Ekiti', 'Osun', 'Ondo'] as const
type StateFilter = (typeof STATE_OPTIONS)[number] | 'Unknown'

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

function matches(attendee: AttendeeRecord, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [attendee.id, attendee.full_name, attendee.whatsapp, attendee.email]
    .some((value) => value?.toLowerCase().includes(needle))
}

export default function CheckinScreen() {
  const [searchParams] = useSearchParams()
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [rooms, setRooms] = useState<RoomRecord[]>([])
  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<StateFilter | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const arrivedOnly = searchParams.get('arrived') === 'only'

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
  const stateOptions = useMemo<StateFilter[]>(
    () => [...STATE_OPTIONS, ...(attendees.some((attendee) => attendee.state === null) ? ['Unknown' as const] : [])],
    [attendees],
  )
  const stateAttendees = useMemo(
    () => attendees.filter((attendee) =>
      (!arrivedOnly || attendee.arrived) && (stateFilter === 'all' || (attendee.state ?? 'Unknown') === stateFilter),
    ),
    [arrivedOnly, attendees, stateFilter],
  )
  const results = useMemo(() => stateAttendees.filter((attendee) => matches(attendee, query)).slice(0, 30), [stateAttendees, query])
  const arrivedCount = stateAttendees.filter((attendee) => attendee.arrived).length

  function exportArrived() {
    const header = ['RegID', 'Name', 'WhatsApp', 'Email', 'State', 'Gender', 'Accommodation', 'Room', 'ArrivedAt']
    const lines = stateAttendees
      .filter((attendee) => attendee.arrived)
      .map((attendee) => {
        const room = roomById.get(allocationByAttendee.get(attendee.id) ?? '')
        return [
          attendee.id,
          attendee.full_name,
          attendee.whatsapp,
          attendee.email,
          attendee.state ?? attendee.location_raw,
          attendee.gender,
          attendee.accommodation_choice ?? '',
          room ? `${room.block} ${room.room_number}` : '',
          attendee.arrived_at ?? '',
        ].map(csvCell).join(',')
      })
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${stateFilter === 'all' ? 'all' : stateFilter.toLowerCase()}-arrived-attendees.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

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
    <AppLayout
      title="Check-in desk"
      subtitle={arrivedOnly ? 'Viewing checked-in attendees. Filter by state or search by name, phone, email, or registration ID.' : 'Search by name, phone, email, or registration ID and mark arrival.'}
      actionsAtTop
      actions={
        <button
          type="button"
          className="secondary-action inline-flex items-center gap-2"
          onClick={exportArrived}
          disabled={arrivedCount === 0}
          aria-label={`Export ${arrivedCount} arrived attendees`}
        >
          <DownloadIcon />
          Export arrived ({arrivedCount})
        </button>
      }
    >
      <div className="mx-auto max-w-7xl space-y-4">
        <Card className="p-3 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-end">
            <label className="block">
              <span className="field-label">Find attendee</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, phone, email, or RegID"
                className="futuristic-input mt-1 h-12 w-full text-base sm:h-14 sm:text-lg"
              />
            </label>
            <label className="block">
              <span className="field-label">Check by state</span>
              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value as StateFilter | 'all')}
                className="futuristic-input mt-1 h-12 w-full sm:h-14"
              >
                <option value="all">All states</option>
                {stateOptions.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-300">
          <span>{arrivedOnly ? 'Checked in' : stateFilter === 'all' ? 'All states' : stateFilter}: {arrivedOnly ? stateAttendees.length : `${arrivedCount} arrived of ${stateAttendees.length}`}</span>
          <span className="text-zinc-500">Showing {Math.min(results.length, 30)} of {stateAttendees.length}</span>
        </div>

        {offline && (
          <div className="rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
            Offline mode: check-ins are queued and will sync automatically when the connection returns.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300/30 bg-red-400/10 p-3 text-sm text-red-200">
            {error}{' '}
            <button className="ml-2 underline" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}

        {loading && <Card className="p-8 text-center text-zinc-400">Loading attendees...</Card>}
        {!loading && results.length === 0 && <Card className="p-8 text-center text-zinc-400">No matching attendee.</Card>}

        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((attendee) => {
            const room = roomById.get(allocationByAttendee.get(attendee.id) ?? '')
            return (
              <Card key={attendee.id} className="flex flex-col justify-between gap-4 rounded-md p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-wrap sm:flex-row sm:items-center sm:gap-x-5 sm:gap-y-2">
                  <p className="truncate text-lg font-semibold text-zinc-50">{attendee.full_name}</p>
                  <p className="font-mono text-[10px] text-zinc-400 sm:text-xs">{attendee.id}</p>
                  <p className="text-sm text-zinc-300">{attendee.whatsapp || attendee.email || 'No contact listed'}</p>
                  <p className="text-sm text-zinc-400">{room ? `Room ${room.block} ${room.room_number}` : 'No room allocated'}</p>
                </div>

                <button
                  type="button"
                  disabled={busyId === attendee.id}
                  onClick={() => void toggleArrival(attendee)}
                  className={
                    attendee.arrived
                      ? 'secondary-action min-h-12 w-full sm:w-auto sm:min-w-32'
                      : 'success-action min-h-12 w-full sm:w-auto sm:min-w-32'
                  }
                >
                  {busyId === attendee.id ? 'Saving...' : attendee.arrived ? 'Mark not arrived' : 'Mark arrived'}
                </button>
              </Card>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}