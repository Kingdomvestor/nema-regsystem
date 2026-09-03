import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../../components/AppLayout'
import { Card, StatCard } from '../../components/ui'
import { fetchTicketsForSession, registerTicket, toggleCollected, deleteTicket, type MealTicketRecord } from './mealTicketsApi'
import { fetchMealSessions, createMealSession, deleteMealSession, type MealSessionRecord } from './mealsApi'

const input = 'futuristic-input h-10 w-full'

export function MealsScreen() {
  const [sessions, setSessions] = useState<MealSessionRecord[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [tickets, setTickets] = useState<MealTicketRecord[]>([])
  const [newSession, setNewSession] = useState({ name: '', day: 1, meal_type: 'lunch', sort_order: 0 })
  const [attendeeRegId, setAttendeeRegId] = useState('')

  async function reloadSessions() {
    try {
      const s = await fetchMealSessions()
      setSessions(s)
    } catch (e) {
      console.error(e)
      alert('Failed to load sessions')
    }
  }

  useEffect(() => {
    void reloadSessions()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    try {
      await createMealSession(newSession)
      setNewSession({ name: '', day: 1, meal_type: 'lunch', sort_order: 0 })
      await reloadSessions()
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'Create failed')
    }
  }

  async function openSession(id: string) {
    setSelected(id)
    try {
      const t = await fetchTicketsForSession(id)
      setTickets(t)
    } catch (e) {
      console.error(e)
      alert('Failed to load tickets')
    }
  }

  async function handleRegister() {
    if (!selected || !attendeeRegId) return alert('Select session and enter regId')
    try {
      await registerTicket(selected, attendeeRegId)
      const t = await fetchTicketsForSession(selected)
      setTickets(t)
      setAttendeeRegId('')
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'Register failed')
    }
  }

  async function handleToggle(ticketId: string, current: boolean) {
    try {
      await toggleCollected(ticketId, !current)
      if (selected) {
        const t = await fetchTicketsForSession(selected)
        setTickets(t)
      }
    } catch (e: any) {
      console.error(e)
      alert('Update failed')
    }
  }

  async function handleDeleteTicket(ticketId: string) {
    if (!confirm('Remove ticket?')) return
    await deleteTicket(ticketId)
    if (selected) {
      const t = await fetchTicketsForSession(selected)
      setTickets(t)
    }
  }

  async function handleDeleteSession(id: string) {
    if (!confirm('Delete session?')) return
    await deleteMealSession(id)
    if (selected === id) {
      setSelected(null)
      setTickets([])
    }
    await reloadSessions()
  }

  const selectedSession = sessions.find((s) => s.id === selected) ?? null
  const stats = useMemo(
    () => ({
      sessions: sessions.length,
      tickets: tickets.length,
      collected: tickets.filter((t) => t.collected).length,
      pending: tickets.filter((t) => !t.collected).length,
    }),
    [sessions.length, tickets],
  )

  return (
    <AppLayout title="Meal Sessions" subtitle="Create meal sessions, register tickets, and track collection.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Sessions" value={stats.sessions} tone="brand" />
          <StatCard label="Tickets" value={stats.tickets} />
          <StatCard label="Collected" value={stats.collected} tone="blue" />
          <StatCard label="Pending" value={stats.pending} tone={stats.pending > 0 ? 'amber' : 'default'} />
        </div>

        <Card className="p-4">
          <form className="space-y-3" onSubmit={handleCreate}>
            <div>
              <h2 className="text-base font-semibold text-zinc-50">Create session</h2>
              <p className="mt-1 text-sm text-zinc-400">Set up breakfast, lunch, or dinner ticket windows.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem_11rem_auto]">
              <label>
                <span className="field-label">Name</span>
                <input
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  placeholder="Name"
                  className={input}
                  required
                />
              </label>
              <label>
                <span className="field-label">Day</span>
                <input
                  type="number"
                  value={newSession.day}
                  onChange={(e) => setNewSession({ ...newSession, day: Number(e.target.value) })}
                  className={input}
                />
              </label>
              <label>
                <span className="field-label">Meal</span>
                <select
                  value={newSession.meal_type}
                  onChange={(e) => setNewSession({ ...newSession, meal_type: e.target.value })}
                  className={input}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </label>
              <button className="success-action self-end">Create</button>
            </div>
          </form>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-zinc-50">Sessions</h2>
              <span className="chip">{sessions.length} total</span>
            </div>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={
                    'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3 transition ' +
                    (selected === s.id
                      ? 'border-white/40 bg-brand-300/12'
                      : 'border-white/10 bg-white/6 hover:bg-white/9')
                  }
                >
                  <div>
                    <div className="font-medium text-zinc-100">
                      {s.name} <span className="text-zinc-500">({s.meal_type})</span>
                    </div>
                    <div className="text-sm text-zinc-400">Day {s.day}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="secondary-action px-3 py-1.5" onClick={() => void openSession(s.id)}>
                      Open
                    </button>
                    <button className="danger-action px-3 py-1.5" onClick={() => void handleDeleteSession(s.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <div className="py-8 text-center text-sm text-zinc-400">No sessions yet.</div>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-zinc-50">Session tickets</h2>
              {selectedSession && <span className="chip text-brand-100">{selectedSession.name}</span>}
            </div>
            {!selected && <div className="py-8 text-center text-sm text-zinc-400">Open a session to view tickets.</div>}
            {selected && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    value={attendeeRegId}
                    onChange={(e) => setAttendeeRegId(e.target.value)}
                    placeholder="Attendee RegID"
                    className="futuristic-input h-10 min-w-0 flex-1"
                  />
                  <button className="success-action" onClick={() => void handleRegister()}>
                    Register
                  </button>
                </div>
                <div className="space-y-2">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/6 px-3 py-3"
                    >
                      <div className="font-mono text-xs text-zinc-200">{t.attendee_id}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={t.collected ? 'chip border-white/35 text-[#bffcff]' : 'chip text-zinc-300'}>
                          {t.collected ? 'Collected' : t.registered ? 'Registered' : 'Not registered'}
                        </span>
                        <button className="secondary-action px-2.5 py-1" onClick={() => void handleToggle(t.id, t.collected)}>
                          {t.collected ? 'Uncollect' : 'Collect'}
                        </button>
                        <button className="danger-action px-2.5 py-1" onClick={() => void handleDeleteTicket(t.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {tickets.length === 0 && <div className="py-8 text-center text-sm text-zinc-400">No tickets.</div>}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

export default MealsScreen
