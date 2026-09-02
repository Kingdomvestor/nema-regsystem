# Plan 1 — Import & Cleaning Core

**Spec:** `docs/superpowers/specs/2026-09-02-conference-registration-system-design.md`
**Scope:** Project scaffold + pure-TypeScript Excel import & data-cleaning pipeline, unit-tested
with Vitest. **No Supabase, no credentials, no network.** All tests use synthetic in-memory
fixtures — the real `Conference 2026.xlsx` is validated manually only, never committed.

TDD throughout: write the failing test first, then the implementation.

---

## Task 1 — Scaffold
- `package.json` scripts: `dev`=vite, `build`=`tsc -b && vite build`, `preview`, `test`=`vitest run`, `test:watch`=vitest.
- deps: `react react-dom xlsx`; dev: `vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss @tailwindcss/vite vitest`.
- `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts` (react + tailwindcss plugins; `test: { environment: 'node' }`).
- `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css` (`@import "tailwindcss";`), `src/vite-env.d.ts`.
- Tailwind v4 — no `tailwind.config` / no PostCSS needed.
- `src/domain/smoke.test.ts` — trivial passing test to prove Vitest runs.

## Task 2 — Location normalization
`src/domain/types.ts` (all shared types) + `src/domain/normalizeLocation.ts`.
```ts
export type CanonicalState = 'Kwara'|'Lagos'|'Ogun'|'Oyo'|'Ekiti'|'Osun'|'Ondo'
export interface LocationResult { state: CanonicalState | null; raw: string; needsReview: boolean }
```
- Exact / substring state match → that state. Multi-state hit (e.g. "Lagos, Ogun") → `null` + `needsReview`.
- `CITY_TO_STATE = { ibadan:'Oyo', ogbomoso:'Oyo', ilorin:'Kwara' }`.
- Empty / unknown → `null` + `needsReview`. `raw` always preserved.

## Task 3 — Accommodation normalization
`normalizeAccommodation(accommodationOptions, privateRoomType): AccommodationResult`.
```ts
type AccommodationChoice = 'free_hostel' | 'private_paid'
type PrivateRoomType = 'fan' | 'ac' | null
interface AccommodationResult { choice: AccommodationChoice | null; roomType: PrivateRoomType; conflict: boolean; needsReview: boolean }
```
- `'hostel'`→`free_hostel`; `'private'`→`private_paid`. `'fan'`→`fan`; else `'ac'` or (has 'a' & 'c')→`ac`.
- `conflict = roomType !== null && choice !== 'private_paid'`.
- `needsReview = conflict || choice === null`.

## Task 4 — Stable RegID
`generateRegId(seed:{timestamp;fullName;email;whatsapp}): string` → `REG-XXXXXXXX` (8 uppercase hex).
- FNV-1a 32-bit over lowercased `timestamp|fullName|email|whatsapp`, `Math.imul(hash,0x01000193)>>>0`. Deterministic.

## Task 5 — Duplicate detection
`detectDuplicates(rows:{regId;fullName;whatsapp;email}[]): Map<string, DuplicateFlag>` where
`DuplicateFlag { byName; byPhone; byEmail }`.
- Count normalized (trim+lowercase) values; blank values never flag; keyed by `regId`.

## Task 6 — Workbook parsing
`parseWorkbook(data: ArrayBuffer | Uint8Array): RawRow[]` via SheetJS.
- `XLSX.read(data,{type:'array'})` + `sheet_to_json(sheet,{header:1,blankrows:false,defval:''})`.
- Drop header row; map columns 0–12 positionally → `RawRow` (13 string fields); skip fully-blank rows.
- Tests build in-memory workbooks with `aoa_to_sheet` (positional parse is robust to long Google-Form headers).

## Task 7 — Compose the import
`runImport(rows: RawRow[]): ImportResult` composing Tasks 2–6.
- Produces `CleanedAttendee[]` with `reviewFlags {location, accommodation, duplicate}` and `firstTime` via `/^y/i`.
- `ImportStats { total; byState; byGender; needingReview; duplicates; accommodationConflicts }`.

---

## Manual validation (local only, never commit)
Run the pipeline once against the real 537-row file on your machine; confirm counts match spec §2
(Male 385/Female 152, ~37 accommodation conflicts, 7 states). Do not add the file to git or tests.

## What comes next (later plans)
Supabase foundation (schema + RLS) · UI screens (import → attendees → rooms → allocation → meals) ·
allocation engine · meal tickets · mobile check-in · PDF printables.
