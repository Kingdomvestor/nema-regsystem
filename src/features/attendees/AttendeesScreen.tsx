// Attendees screen: loads every row once, filters client-side, and edits through a
// drawer. Writes go straight to Supabase (attendeesApi) then refetch — no cache
// library this cycle (spec §2). Delete is admin-only, both here and via RLS.
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { AppLayout } from '../../components/AppLayout'
import { Card, StatCard } from '../../components/ui'
import { AttendeeEditPanel } from './AttendeeEditPanel'
import { deleteAttendee, fetchAttendees, updateAttendee } from './attendeesApi'
import { type AttendeeFilter, emptyFilter, filterAttendees, rowNeedsReview } from './attendeesFilter'
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

  const stats = useMemo(
    () => ({
      total: records.length,
      review: records.filter(rowNeedsReview).length,
      duplicates: records.filter((r) => r.review_flags.duplicate).length,
      arrived: records.filter((r) => r.arrived).length,
    }),
    [records],
  )

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
    <AppLayout title="Attendees" subtitle="Search, review, and edit registrations.">
      <div className="space-y-4">
        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}{' '}
            <button onClick={() => void load()} className="font-medium underline">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={stats.total} tone="brand" />
          <StatCard label="Needs review" value={stats.review} tone={stats.review > 0 ? 'amber' : 'default'} />
          <StatCard label="Duplicates" value={stats.duplicates} tone={stats.duplicates > 0 ? 'red' : 'default'} />
          <StatCard label="Arrived" value={stats.arrived} tone={stats.arrived > 0 ? 'green' : 'default'} />
        </div>

        <Card className="p-4">
          <Filters
            value={filter}
            onChange={setFilter}
            genders={genders}
            resultCount={filtered.length}
            total={records.length}
          />
        </Card>

        {loading ? (
          <Card className="p-12 text-center text-slate-400">Loading…</Card>
        ) : (
          <AttendeesTable rows={filtered} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </div>

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
    </AppLayout>
  )
}
