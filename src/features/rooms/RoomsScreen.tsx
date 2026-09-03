import React, { useEffect, useState } from 'react'
import { fetchRooms, createRoom, updateRoom, deleteRoom } from './roomsApi'

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

  useEffect(() => { reload() }, [])

  function resetForm() {
    setEditing(null)
    setForm({ block: '', room_number: '', capacity: 1, gender_designation: 'any', room_class: 'hostel', accessible: false, notes: '' })
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
    } finally { setBusy(false) }
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
    } finally { setBusy(false) }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Rooms</h2>

      <form className="mb-6 space-y-2 max-w-lg" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} placeholder="Block" className="border p-2" required />
          <input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} placeholder="Room number" className="border p-2" required />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="border p-2" />
          <select value={form.gender_designation} onChange={(e) => setForm({ ...form, gender_designation: e.target.value })} className="border p-2">
            <option value="any">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select value={form.room_class} onChange={(e) => setForm({ ...form, room_class: e.target.value })} className="border p-2">
            <option value="hostel">Hostel</option>
            <option value="private_fan">Private (Fan)</option>
            <option value="private_ac">Private (AC)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.accessible} onChange={(e) => setForm({ ...form, accessible: e.target.checked })} /> Accessible</label>
        </div>
        <div>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="border w-full p-2" />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded" disabled={busy}>{editing ? 'Save' : 'Create'}</button>
          <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={resetForm} disabled={busy}>Cancel</button>
          {editing && <button type="button" className="px-4 py-2 bg-red-600 text-white rounded ml-auto" onClick={() => handleDelete(editing.id)} disabled={busy}>Delete</button>}
        </div>
      </form>

      <div className="space-y-2">
        {rooms.map((r) => (
          <div key={r.id} className="flex justify-between border-b py-2">
            <div>
              <div className="font-medium">{r.block} {r.room_number}</div>
              <div className="text-sm text-gray-600">cap {r.capacity} · {r.room_class} · {r.gender_designation}</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => handleEdit(r)}>Edit</button>
              <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => handleDelete(r.id)}>Delete</button>
            </div>
          </div>
        ))}
        {rooms.length === 0 && <div className="text-gray-500">No rooms defined yet.</div>}
      </div>
    </div>
  )
}

export default RoomsScreen
