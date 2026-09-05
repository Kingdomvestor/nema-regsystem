// Attendees screen: loads every row once, filters client-side, and edits through a
// drawer. Writes go straight to Supabase (attendeesApi) then refetch — no cache
// library this cycle (spec §2). Delete is admin-only, both here and via RLS.
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { AppLayout } from '../../components/AppLayout'
import { Card, StatCard } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { AttendeeEditPanel } from './AttendeeEditPanel'
import { deleteAttendee, deleteAttendees, fetchAttendees, setAttendeeArrived, updateAttendee } from './attendeesApi'
import { type AttendeeFilter, emptyFilter, filterAttendees, rowNeedsReview } from './attendeesFilter'
import { AttendeesTable } from './AttendeesTable'
import { Filters } from './Filters'
import type { AttendeeRecord, EditablePatch } from './types'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

function PeopleIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19" />
      <path d="M9.5 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M21 19v-1.2a3.5 3.5 0 0 0-3-3.45" />
      <path d="M15.5 3.75a3 3 0 0 1 0 5.8" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m12 3 9 16H3L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M21 11.1V12a9 9 0 1 1-5.35-8.23" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  )
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

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function PaginationIcon({ type }: { type: 'first' | 'previous' | 'next' | 'last' }) {
  const path =
    type === 'first'
      ? 'M11 17 6 12l5-5M18 17l-5-5 5-5'
      : type === 'previous'
        ? 'm15 18-6-6 6-6'
        : type === 'next'
          ? 'm9 18 6-6-6-6'
          : 'm13 17 5-5-5-5M6 17l5-5-5-5'
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function exportRows(rows: AttendeeRecord[]) {
  const header = ['RegID', 'Name', 'State', 'Gender', 'Accommodation', 'Arrived', 'Flags']
  const lines = rows.map((row) => {
    const flags = [
      row.review_flags.location ? 'location' : '',
      row.review_flags.accommodation ? 'accommodation' : '',
      row.review_flags.duplicate || row.dupe_flag ? 'duplicate' : '',
    ]
      .filter(Boolean)
      .join('; ')

    return [
      row.id,
      row.full_name,
      row.state ?? row.location_raw,
      row.gender,
      row.accommodation_choice ?? '',
      row.arrived ? 'yes' : 'no',
      flags,
    ]
      .map(csvCell)
      .join(',')
  })

  const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'attendees.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function pageItems(currentPage: number, pageCount: number) {
  const pages: Array<number | 'ellipsis'> = []
  for (let page = 1; page <= pageCount; page += 1) {
    if (page === 1 || page === pageCount || Math.abs(page - currentPage) <= 1) {
      pages.push(page)
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis')
    }
  }
  return pages
}

function PaginationControls({
  currentPage,
  pageCount,
  rowsPerPage,
  totalRows,
  pageStart,
  pageEnd,
  onPageChange,
  onRowsPerPageChange,
}: {
  currentPage: number
  pageCount: number
  rowsPerPage: number
  totalRows: number
  pageStart: number
  pageEnd: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rows: number) => void
}) {
  const disabledClass = 'disabled:cursor-not-allowed disabled:opacity-40'
  const pageButtonClass =
    'grid h-9 min-w-9 place-items-center rounded-lg border border-white/12 bg-white/[0.06] px-2 text-sm font-medium text-zinc-300 transition hover:border-brand-300/35 hover:bg-brand-300/10 hover:text-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/50 '

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#26343C]/80 px-4 py-3">
      <p className="text-sm text-zinc-400">
        Showing <span className="font-semibold text-zinc-100 tabular-nums">{pageStart}</span> to{' '}
        <span className="font-semibold text-zinc-100 tabular-nums">{pageEnd}</span> of{' '}
        <span className="font-semibold text-zinc-100 tabular-nums">{totalRows}</span> attendees
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={pageButtonClass + disabledClass}
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
            aria-label="First page"
          >
            <PaginationIcon type="first" />
          </button>
          <button
            type="button"
            className={pageButtonClass + disabledClass}
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            <PaginationIcon type="previous" />
          </button>
          {pageItems(currentPage, pageCount).map((item, index) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="grid h-9 min-w-8 place-items-center text-zinc-500">
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={
                  item === currentPage
                    ? 'grid h-9 min-w-9 place-items-center rounded-lg border border-brand-300/50 bg-brand-300/18 px-2 text-sm font-semibold text-brand-100 shadow-[0_0_22px_rgba(0,229,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/55'
                    : pageButtonClass
                }
                onClick={() => onPageChange(item)}
                aria-current={item === currentPage ? 'page' : undefined}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className={pageButtonClass + disabledClass}
            disabled={currentPage === pageCount}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
          >
            <PaginationIcon type="next" />
          </button>
          <button
            type="button"
            className={pageButtonClass + disabledClass}
            disabled={currentPage === pageCount}
            onClick={() => onPageChange(pageCount)}
            aria-label="Last page"
          >
            <PaginationIcon type="last" />
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-400">
          Rows per page
          <select
            className="futuristic-input h-9"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

export function AttendeesScreen() {
  const { staff } = useAuth()
  const isAdmin = staff?.role === 'admin'

  const [records, setRecords] = useState<AttendeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AttendeeFilter>(emptyFilter)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<Set<string>>(new Set())
  const [arrivalBusyId, setArrivalBusyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0])

  async function load() {
    setLoading(true)
    try {
      setRecords(await fetchAttendees())
      setLoadError(null)
      setSelectedDuplicateIds(new Set())
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()

    const channel = supabase
      .channel('attendees-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees' }, () => {
        void load()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const genders = useMemo(
    () => [...new Set(records.map((r) => r.gender).filter((g) => g !== ''))].sort(),
    [records],
  )
  const filtered = useMemo(() => filterAttendees(records, filter), [records, filter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, pageCount)
  const pageStartIndex = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * rowsPerPage
  const pageRows = filtered.slice(pageStartIndex, pageStartIndex + rowsPerPage)
  const pageStart = filtered.length === 0 ? 0 : pageStartIndex + 1
  const pageEnd = Math.min(pageStartIndex + rowsPerPage, filtered.length)
  const selected = records.find((r) => r.id === selectedId) ?? null
  const visibleDuplicateIds = useMemo(
    () => filtered.filter((r) => r.review_flags.duplicate || r.dupe_flag).map((r) => r.id),
    [filtered],
  )
  const selectedDuplicateCount = selectedDuplicateIds.size

  const stats = useMemo(
    () => ({
      total: records.length,
      review: records.filter(rowNeedsReview).length,
      duplicates: records.filter((r) => r.review_flags.duplicate || r.dupe_flag).length,
      arrived: records.filter((r) => r.arrived).length,
    }),
    [records],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [filter, rowsPerPage])

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount)
  }, [currentPage, pageCount])

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

  function toggleDuplicateSelection(id: string, checked: boolean) {
    setSelectedDuplicateIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function setVisibleDuplicateSelection(checked: boolean) {
    setSelectedDuplicateIds((current) => {
      const next = new Set(current)
      for (const id of visibleDuplicateIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  async function onDeleteSelectedDuplicates() {
    if (selectedDuplicateCount === 0) return
    const noun = selectedDuplicateCount === 1 ? 'duplicate registration' : 'duplicate registrations'
    if (!window.confirm(`Delete ${selectedDuplicateCount} selected ${noun}? This cannot be undone.`)) return
    setSaving(true)
    setLoadError(null)
    try {
      await deleteAttendees([...selectedDuplicateIds])
      await load()
      setSelectedId(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function onToggleArrived(row: AttendeeRecord) {
    const arrived = !row.arrived
    setArrivalBusyId(row.id)
    setLoadError(null)
    try {
      await setAttendeeArrived(row.id, arrived)
      setRecords((current) =>
        current.map((record) => (record.id === row.id ? { ...record, arrived } : record)),
      )
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setArrivalBusyId(null)
    }
  }

  return (
    <AppLayout
      title="Attendees"
      subtitle="Search, review, and edit registrations."
      actions={
        <button
          type="button"
          className="secondary-action inline-flex items-center gap-2"
          onClick={() => exportRows(filtered)}
          aria-label="Export filtered attendees"
        >
          <DownloadIcon />
          Export
          <ChevronDownIcon />
        </button>
      }
    >
      <div className="space-y-5">
        {loadError && (
          <div className="rounded-lg border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {loadError}{' '}
            <button onClick={() => void load()} className="font-medium underline">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total"
            value={stats.total}
            tone="brand"
            description="All registered attendees"
            icon={<PeopleIcon />}
          />
          <StatCard
            label="Needs review"
            value={stats.review}
            tone={stats.review > 0 ? 'amber' : 'default'}
            description="Require attention"
            icon={<WarningIcon />}
          />
          <StatCard
            label="Duplicates"
            value={stats.duplicates}
            tone={stats.duplicates > 0 ? 'red' : 'default'}
            description="Possible duplicates"
            icon={<CopyIcon />}
          />
          <StatCard
            label="Arrived"
            value={stats.arrived}
            tone={stats.arrived > 0 ? 'success' : 'default'}
            description="Checked in attendees"
            icon={<CheckCircleIcon />}
          />
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

        {isAdmin && visibleDuplicateIds.length > 0 && (
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <input
                type="checkbox"
                checked={
                  visibleDuplicateIds.length > 0 && visibleDuplicateIds.every((id) => selectedDuplicateIds.has(id))
                }
                className="h-4 w-4 rounded border-white/40 bg-black accent-brand-300"
                onChange={(e) => setVisibleDuplicateSelection(e.target.checked)}
              />
              Select visible duplicates
              <span className="text-zinc-500">({visibleDuplicateIds.length})</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select className="futuristic-input h-10" defaultValue="bulk" aria-label="Bulk actions">
                <option value="bulk">Bulk actions</option>
                <option value="duplicates">Selected duplicates</option>
              </select>
              <button
                type="button"
                className="danger-action"
                disabled={saving || selectedDuplicateCount === 0}
                onClick={() => void onDeleteSelectedDuplicates()}
              >
                {saving ? 'Deleting...' : `Delete selected (${selectedDuplicateCount})`}
              </button>
            </div>
          </Card>
        )}

        {loading ? (
          <Card className="p-12 text-center text-zinc-400">Loading...</Card>
        ) : (
          <div className="table-surface">
            <AttendeesTable
              rows={pageRows}
              selectedId={selectedId}
              selectedIds={selectedDuplicateIds}
              canSelectRow={(row) => isAdmin && (row.review_flags.duplicate || row.dupe_flag)}
              arrivalBusyId={arrivalBusyId}
              onSelect={setSelectedId}
              onToggleSelect={toggleDuplicateSelection}
              onToggleArrived={onToggleArrived}
            />
            <PaginationControls
              currentPage={safeCurrentPage}
              pageCount={pageCount}
              rowsPerPage={rowsPerPage}
              totalRows={filtered.length}
              pageStart={pageStart}
              pageEnd={pageEnd}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </div>
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
