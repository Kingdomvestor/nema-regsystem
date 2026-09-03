import React, { useEffect, useState } from 'react'
import { fetchMealSessions, createMealSession, deleteMealSession } from './mealsApi'
import { fetchTicketsForSession, registerTicket, toggleCollected, deleteTicket } from './mealTicketsApi'

export function MealsScreen() {
  const [sessions, setSessions] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [newSession, setNewSession] = useState({ name: '', day: 1, meal_type: 'lunch', sort_order: 0 })
  const [attendeeRegId, setAttendeeRegId] = useState('')

  async function reloadSessions() {
    try {
      const s = await fetchMealSessions()
      setSessions(s as any)
    } catch (e) { console.error(e); alert('Failed to load sessions') }
  }

  useEffect(() => { reloadSessions() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createMealSession(newSession)
      setNewSession({ name: '', day: 1, meal_type: 'lunch', sort_order: 0 })
      await reloadSessions()
    } catch (e: any) { console.error(e); alert(e.message || 'Create failed') }
  }

  async function openSession(id: string) {
    setSelected(id)
    try {
      const t = await fetchTicketsForSession(id)
      setTickets(t as any)
    } catch (e) { console.error(e); alert('Failed to load tickets') }
  }

  async function handleRegister() {
    if (!selected || !attendeeRegId) return alert('Select session and enter regId')
    try {
      await registerTicket(selected, attendeeRegId)
      const t = await fetchTicketsForSession(selected)
      setTickets(t as any)
      setAttendeeRegId('')
    } catch (e: any) { console.error(e); alert(e.message || 'Register failed') }
  }

  async function handleToggle(ticketId: string, current: boolean) {
    try {
      await toggleCollected(ticketId, !current)
      if (selected) {
        const t = await fetchTicketsForSession(selected)
        setTickets(t as any)
      }
    } catch (e: any) { console.error(e); alert('Update failed') }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Meal Sessions</h2>

      <form className="mb-6" onSubmit={handleCreate}>
        <div className="grid grid-cols-3 gap-2">
          <input value={newSession.name} onChange={(e) => setNewSession({ ...newSession, name: e.target.value })} placeholder="Name" className="border p-2" required />
          <input type="number" value={newSession.day} onChange={(e) => setNewSession({ ...newSession, day: Number(e.target.value) })} className="border p-2" />
          <select value={newSession.meal_type} onChange={(e) => setNewSession({ ...newSession, meal_type: e.target.value })} className="border p-2">
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>
        <div className="mt-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded">Create session</button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-2">Sessions</h3>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex justify-between border-b py-2">
                <div>
                  <div className="font-medium">{s.name} ({s.meal_type})</div>
                  <div className="text-sm text-gray-600">Day {s.day}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => openSession(s.id)}>Open</button>
                  <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={async () => { if (confirm('Delete session?')) { await deleteMealSession(s.id); await reloadSessions(); } }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Session Tickets</h3>
          {!selected && <div className="text-gray-500">Open a session to view tickets</div>}
          {selected && (
            <div>
              <div className="mb-2 flex gap-2">
                <input value={attendeeRegId} onChange={(e) => setAttendeeRegId(e.target.value)} placeholder="Attendee regId" className="border p-2" />
                <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={handleRegister}>Register</button>
              </div>
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="flex justify-between border-b py-2">
                    <div>{t.attendee_id}</div>
                    <div className="flex gap-2 items-center">
                      <div className="text-sm text-gray-600">{t.registered ? 'Registered' : 'Not registered'}</div>
                      <button className="px-2 py-1 bg-blue-500 text-white rounded" onClick={() => handleToggle(t.id, t.collected)}>{t.collected ? 'Uncollect' : 'Collect'}</button>
                      <button className="px-2 py-1 bg-red-500 text-white rounded" onClick={async () => { if (confirm('Remove ticket?')) { await deleteTicket(t.id); if (selected) { const t2 = await fetchTicketsForSession(selected); setTickets(t2 as any) } } }}>Delete</button>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && <div className="text-gray-500">No tickets</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MealsScreen
