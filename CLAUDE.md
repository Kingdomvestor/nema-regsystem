# CLAUDE.md — Conference Reg & Room Allocation

Internal, team-only web app for **NEMA South West Zonal Conference 2026**: import attendee
Excel → clean & flag → allocate rooms (balance state + gender) → on-site
mobile check-in (realtime). Attendees never log in.

**Status:** Pre-scaffold. Design approved. Next = build Plan 1 (import & cleaning core, pure
TS + Vitest). ~14-day deadline; event mid-Sept 2026.

## Stack
React + Vite + TypeScript + Tailwind v4 · Supabase (Postgres / Auth / Realtime / RLS) ·
Vercel · SheetJS (`xlsx`) for browser import · print-CSS PDFs · Vitest.

## Hard constraints (non-negotiable)
- **PII never in git.** `*.xlsx/*.xls/*.csv` are gitignored. Never read the real
  `Conference 2026.xlsx` into context and never commit it. Tests use tiny synthetic fixtures only.
- **Secrets never in git.** Supabase keys live in `.env` (gitignored); `.env.example` documents shape.
- **Surface, never silently fix.** Duplicates, location noise, and accommodation contradictions
  are flagged for human review — never auto-deleted or auto-corrected.
- `src/domain/` is pure & deterministic — no I/O, no side effects.

## Where things live — read on demand, do NOT re-read in full each turn
- Design spec (source of truth): `docs/superpowers/specs/2026-09-02-conference-registration-system-design.md`
- Plans: `docs/superpowers/plans/`
- Data facts (columns A–M, counts, quirks): spec §2 — enough to build without opening the xlsx.

## Intended source layout (navigate by convention, don't explore)
- `src/domain/` — pure logic + `*.test.ts`: types, normalizeLocation, normalizeAccommodation,
  generateRegId, detectDuplicates, parseWorkbook, runImport
- `src/lib/` — Supabase client, shared utils
- `src/features/<screen>/` — import · attendees · rooms · allocation · checkin · dashboard
- `src/components/` — shared UI
- `supabase/` — schema + RLS migrations

## Commands
```bash
npm run dev      # vite dev server
npm test         # vitest run (CI)
npm run build    # production build
```

## Token discipline (keep sessions cheap)
- Prefer Grep/Glob + targeted Reads over whole-file reads; never load the xlsx.
- Use subagents for exploration & heavy reads — their context is discarded, only summaries return.
- Keep this file lean — it is loaded on every turn.
- New/unrelated task ⇒ new session (`/clear`). One task per session; don't let a session sprawl.
