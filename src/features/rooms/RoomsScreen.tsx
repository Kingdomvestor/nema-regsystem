import React, { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../../components/AppLayout'
import { Card, StatCard } from '../../components/ui'
import { fetchRooms, createRoom, updateRoom, deleteRoom } from './roomsApi'

const input = 'futuristic-input h-10 w-full'

export function RoomsScreen() {
  const [rooms, setRooms] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState({
    block: '',
    room_number: '',
    capacity: 1,
    gender_designation: 'any',
    room_class: 'hostel',
    accessible: false,
    notes: '',
  })

  async function reload() {
    try {
      const r = await fetchRooms()
      setRooms(r as any)
    } catch (e) {
      console.error(e)
      alert('Failed to load rooms')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  function resetForm() {
    setEditing(null)
    setForm({
      block: '',
      room_number: '',
      capacity: 1,
      gender_designation: 'any',
      room_class: 'hostel',
      accessible: false,
      notes: '',
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (editing) {
        await updateRoom(editing.id, form)
      } else {
        await createRoom(form)
      }
      await reload()
      resetForm()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleEdit(r: any) {
    setEditing(r)
    setForm({
      block: r.block,
      room_number: r.room_number,
      capacity: r.capacity,
      gender_designation: r.gender_designation,
      room_class: r.room_class,
      accessible: r.accessible,
      notes: r.notes || '',
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this room?')) return
    setBusy(true)
    try {
      await deleteRoom(id)
      await reload()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const stats = useMemo(
    () => ({
      rooms: rooms.length,
      capacity: rooms.reduce((sum, r) => sum + Number(r.capacity || 0), 0),
      accessible: rooms.filter((r) => r.accessible).length,
      privateRooms: rooms.filter((r) => String(r.room_class || '').startsWith('private')).length,
    }),
    [rooms],
  )

  return (
    <AppLayout title="Rooms" subtitle="Create room inventory and tune accommodation capacity.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Rooms" value={stats.rooms} tone="brand" />
          <StatCard label="Capacity" value={stats.capacity} />
          <StatCard label="Accessible" value={stats.accessible} tone="blue" />
          <StatCard label="Private" value={stats.privateRooms} tone="amber" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,28rem)_1fr]">
          <Card className="p-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <h2 className="text-base font-semibold text-zinc-50">
                  {editing ? 'Edit room' : 'Create room'}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">Room details are used by allocation rules.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="field-label">Block</span>
                  <input
                    value={form.block}
                    onChange={(e) => setForm({ ...form, block: e.target.value })}
                    placeholder="Block"
                    className={input}
                    required
                  />
                </label>
                <label className="block">
                  <span className="field-label">Room number</span>
                  <input
                    value={form.room_number}
                    onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                    placeholder="Room number"
                    className={input}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block">
                  <span className="field-label">Capacity</span>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    className={input}
                  />
                </label>
                <label className="block">
                  <span className="field-label">Gender</span>
                  <select
                    value={form.gender_designation}
                    onChange={(e) => setForm({ ...form, gender_designation: e.target.value })}
                    className={input}
                  >
                    <option value="any">Any</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">Class</span>
                  <select
                    value={form.room_class}
                    onChange={(e) => setForm({ ...form, room_class: e.target.value })}
                    className={input}
                  >
                    <option value="hostel">Hostel</option>
                    <option value="private_fan">Private (Fan)</option>
                    <option value="private_ac">Private (AC)</option>
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.accessible}
                  onChange={(e) => setForm({ ...form, accessible: e.target.checked })}
                  className="accent-brand-300"
                />
                Accessible
              </label>

              <label className="block">
                <span className="field-label">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes"
                  className="futuristic-input min-h-24 w-full py-2"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button className="success-action" disabled={busy}>
                  {editing ? 'Save' : 'Create'}
                </button>
                <button type="button" className="secondary-action" onClick={resetForm} disabled={busy}>
                  Cancel
                </button>
                {editing && (
                  <button
                    type="button"
                    className="danger-action ml-auto"
                    onClick={() => void handleDelete(editing.id)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-zinc-50">Room inventory</h2>
              <span className="chip">{rooms.length} total</span>
            </div>
            <div className="space-y-2">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/6 px-3 py-3"
                >
                  <div>
                    <div className="font-medium text-zinc-100">
                      {r.block} {r.room_number}
                    </div>
                    <div className="text-sm text-zinc-400">
                      cap {r.capacity} - {r.room_class} - {r.gender_designation}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.accessible && <span className="chip border-white/35 text-[#bffcff]">Accessible</span>}
                    <button className="secondary-action px-3 py-1.5" onClick={() => void handleEdit(r)}>
                      Edit
                    </button>
                    <button className="danger-action px-3 py-1.5" onClick={() => void handleDelete(r.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {rooms.length === 0 && <div className="py-8 text-center text-sm text-zinc-400">No rooms defined yet.</div>}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

export default RoomsScreen
