// Import screen: idle -> parsing -> preview -> committing -> done / error.
// Upload runs the existing pure domain pipeline entirely in the browser (the
// xlsx never leaves the machine); only cleaned rows are sent on commit.
import { type ChangeEvent, useState } from 'react'
import { parseWorkbook } from '../../domain/parseWorkbook'
import { runImport } from '../../domain/runImport'
import type { ImportResult } from '../../domain/types'
import { TopBar } from '../../components/TopBar'
import { commitImport } from './commitImport'
import { PreviewTable } from './PreviewTable'
import { StatsSummary } from './StatsSummary'

type Phase = 'idle' | 'parsing' | 'preview' | 'committing' | 'done' | 'error'

export function ImportScreen() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [committed, setCommitted] = useState(0)

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setPhase('parsing')
    setError(null)
    try {
      const buf = await file.arrayBuffer()
      setResult(runImport(parseWorkbook(buf)))
      setPhase('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.')
      setPhase('error')
    }
  }

  async function onCommit() {
    if (!result) return
    setPhase('committing')
    setError(null)
    setProgress(0)
    try {
      const { written } = await commitImport(result.attendees, {
        onProgress: (w, total) => setProgress(Math.round((w / total) * 100)),
      })
      setCommitted(written)
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed.')
      setPhase('error')
    }
  }

  const busy = phase === 'parsing' || phase === 'committing'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar />
      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Import attendees</h1>
            <p className="text-sm text-slate-500">
              Upload the registration spreadsheet, review the cleaned result, then commit.
            </p>
          </div>
          <label className="cursor-pointer rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {phase === 'idle' || phase === 'error' ? 'Choose .xlsx file' : 'Choose a different file'}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={onFile}
              disabled={busy}
              className="hidden"
            />
          </label>
        </div>

        {phase === 'parsing' && <p className="text-sm text-slate-500">Reading and cleaning...</p>}

        {error && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && phase !== 'idle' && (
          <>
            <StatsSummary stats={result.stats} />

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onCommit}
                disabled={busy || phase === 'done'}
                className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {phase === 'committing'
                  ? `Committing... ${progress}%`
                  : `Commit ${result.stats.total} attendees`}
              </button>
              {phase === 'done' && (
                <span className="text-sm text-emerald-700">
                  Committed {committed} rows. Re-importing is safe — check-in state is preserved.
                </span>
              )}
            </div>

            <PreviewTable attendees={result.attendees} />
          </>
        )}
      </main>
    </div>
  )
}
