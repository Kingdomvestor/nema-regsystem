import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../../components/AppLayout'
import { Card, StatCard } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { fetchDashboardData, type DashboardData } from './dashboardApi'

const emptyData: DashboardData = { attendees: [], rooms: [], allocations: [] }

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setData(await fetchDashboardData())
        if (active) setError(null)
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load dashboard.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()

    const channel = supabase
      .channel('dashboard-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'allocations' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => void load())
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [])

  const summary = useMemo(() => {
    const flagged = data.attendees.filter((attendee) =>
      Object.values(attendee.review_flags ?? {}).some(Boolean),
    ).length
    const capacity = data.rooms.reduce((total, room) => total + Number(room.capacity || 0), 0)
    const stateCounts = new Map<string, number>()
    for (const attendee of data.attendees) {
      const state = attendee.state ?? 'Needs mapping'
      stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1)
    }
    return {
      arrived: data.attendees.filter((attendee) => attendee.arrived).length,
      flagged,
      capacity,
      allocated: data.allocations.length,
      stateCounts: [...stateCounts.entries()].sort((a, b) => b[1] - a[1]),
    }
  }, [data])

  return (
    <AppLayout title="Operations dashboard" subtitle="A live read on attendance, rooms, and allocations.">
      {loading && <Card className="p-8 text-center text-sm text-zinc-400">Loading operational data...</Card>}
      {error && <div className="rounded-lg border border-red-300/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Registered" value={data.attendees.length} tone="brand" />
            <StatCard label="Arrived" value={`${summary.arrived}/${data.attendees.length}`} tone="blue" />
            <StatCard label="Allocated" value={`${summary.allocated}/${data.attendees.length}`} />
            <StatCard label="Needs review" value={summary.flagged} tone={summary.flagged ? 'amber' : 'default'} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-zinc-50">State distribution</h2>
                <span className="chip">{data.attendees.length} people</span>
              </div>
              <div className="space-y-3">
                {summary.stateCounts.map(([state, count]) => (
                  <div key={state}>
                    <div className="mb-1 flex justify-between text-sm"><span className="text-zinc-300">{state}</span><span className="tabular-nums text-zinc-400">{count}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-300" style={{ width: `${(count / Math.max(data.attendees.length, 1)) * 100}%` }} /></div>
                  </div>
                ))}
                {summary.stateCounts.length === 0 && <p className="text-sm text-zinc-400">No attendees imported yet.</p>}
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-zinc-50">Room supply</h2>
                <span className="chip">{data.rooms.length} rooms</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(['hostel', 'private_fan', 'private_ac'] as const).map((roomClass) => {
                  const rooms = data.rooms.filter((room) => room.room_class === roomClass)
                  return <div key={roomClass} className="rounded-lg border border-white/10 bg-white/[0.05] p-3"><p className="text-xs uppercase text-zinc-500">{roomClass.replace('_', ' ')}</p><p className="mt-2 text-2xl font-semibold text-zinc-100">{rooms.reduce((total, room) => total + Number(room.capacity || 0), 0)}</p><p className="text-xs text-zinc-400">beds across {rooms.length} rooms</p></div>
                })}
              </div>
              <p className="mt-4 text-sm text-zinc-400">Total capacity: <span className="font-semibold text-zinc-100">{summary.capacity}</span> beds</p>
            </Card>

          </div>
        </div>
      )}
    </AppLayout>
  )
}