// Attendees screen: loads every row once, filters client-side, and edits through a
// drawer. Writes go straight to Supabase (attendeesApi) then refetch — no cache
// library this cycle (spec §2). Delete is admin-only, both here and via RLS.
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { TopBar } from '../../components/TopBar'
import { AttendeeEditPanel } from './AttendeeEditPanel'
import { deleteAttendee, fetchAttendees, updateAttendee } from './attendeesApi'
import { type AttendeeFilter, emptyFilter, filterAttendees } from './attendeesFilter'
import { AttendeesTable } from './AttendeesTable'
import { Filters } from './Filters'
import type { AttendeeRecord, EditablePatch } from './types'

export function AttendeesScreen() {
  const { staff } = useAuth()
  const isAdmin = staff?.role === 'admin'

  const [records, setRecords] = useState<AttendeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AttendeeFilter>(emptyFilter)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setRecords(await fetchAttendees())
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const genders = useMemo(
    () => [...new Set(records.map((r) => r.gender).filter((g) => g !== ''))].sort(),
    [records],
  )
  const filtered = useMemo(() => filterAttendees(records, filter), [records, filter])
  const selected = records.find((r) => r.id === selectedId) ?? null

  async function onSave(patch: EditablePatch) {
    if (!selectedId) return
    setSaving(true)
    setPanelError(null)
    try {
      await updateAttendee(selectedId, patch)
      await load()
      setSelectedId(null)
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    setSaving(true)
    setPanelError(null)
    try {
      await deleteAttendee(id)
      await load()
      setSelectedId(null)
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar />
      <main className="mx-auto max-w-6xl space-y-4 p-4">
        <h1 className="text-lg font-semibold">Attendees</h1>

        {loadError && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}{' '}
            <button onClick={() => void load()} className="underline">
              Retry
            </button>
          </div>
        )}

        <Filters
          value={filter}
          onChange={setFilter}
          genders={genders}
          resultCount={filtered.length}
          total={records.length}
        />

        {loading ? (
          <p className="py-8 text-center text-slate-400">Loading…</p>
        ) : (
          <AttendeesTable rows={filtered} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </main>

      {selected && (
        <AttendeeEditPanel
          key={selected.id}
          record={selected}
          canDelete={isAdmin}
          saving={saving}
          error={panelError}
          onClose={() => {
            setSelectedId(null)
            setPanelError(null)
          }}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}
