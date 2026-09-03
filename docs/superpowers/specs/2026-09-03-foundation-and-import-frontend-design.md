# Foundation + Import — Frontend Design (Cycle 1)

**Date:** 2026-09-03
**Status:** Approved (design); pending spec review before writing the implementation plan.
**Product source of truth:** `docs/superpowers/specs/2026-09-02-conference-registration-system-design.md`
(hereafter "the design spec"). This document does **not** restate product
requirements — it records the *frontend architecture* for the first build cycle
and points back at the design spec for the what/why.

## 1. Scope

The app is nine screens (design spec §5). We build them one screen per
spec → plan → build cycle, in dependency order. **This is cycle 1: Foundation +
Import**, which proves auth → RLS → database → domain end to end and matches the
design spec's Day 1–2 milestone.

It has two halves:

1. **Foundation** — app shell, routing, the Supabase client, and staff login
   with protected routes.
2. **Import screen** (design spec §5.1) — upload the attendee `.xlsx`, run it
   through the existing domain cleaning pipeline, preview the mapped/flagged
   result, and commit the cleaned rows to Supabase.

### 1.1 Non-goals (deferred on purpose)

- **Flag *resolution* / inline editing** of flagged rows — belongs to the
  Attendees screen (design spec §5.2). Import only *surfaces* flags.
- The other seven screens and their routes — added as each is built.
- Realtime, password reset, in-app staff management (staff are provisioned in
  the Supabase dashboard).
- A server-state / caching library (TanStack Query). See §3.

## 2. Prerequisites

Build-time needs nothing beyond the repo. **End-to-end commit** additionally
needs the live Supabase project prepared (see `supabase/README.md`):

- Migrations `0001_core_schema.sql` then `0002_rls_policies.sql` applied.
- One admin seeded via `seed_first_admin` (an `auth.users` row + a `staff` row
  with `role = 'admin'`).
- `.env` populated with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Until the project is prepared, the UI still builds and the **upload → preview**
path works fully offline (it is pure, in-browser domain code). Only the final
**commit** touches the network.

## 3. Approach

**Thin & direct.** React Router for routing, a small `AuthProvider` React
context for session + staff role, and per-feature functions that call
`@supabase/supabase-js` directly. Screen state lives in component state.

**No Redux, no TanStack Query, no state library this cycle.** The Import screen
is a one-shot upload → preview → commit; server-state caching/refetch
infrastructure earns nothing here. TanStack Query is the likely later addition
when the Attendees/Dashboard screens need cached, refetching reads — introduced
then, against real need, not now.

## 4. Dependencies, environment

- **Add:** `react-router-dom`, `@supabase/supabase-js`.
- **Already present:** `xlsx` (SheetJS), React 19, Vite, Vitest.
- **Env vars** (Vite, browser-exposed): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. The anon key is safe in the browser bundle; RLS is
  what protects data. The `service_role` key never appears in the app.

## 5. Foundation architecture

### 5.1 Supabase client — `src/lib/supabase.ts`

A single module exporting one `createClient(url, anonKey)` instance, read from
`import.meta.env`. Imported wherever the app talks to Supabase.

### 5.2 Auth context — `src/auth/AuthProvider.tsx`, `useAuth.ts`

On mount: `supabase.auth.getSession()`, then subscribe to
`supabase.auth.onAuthStateChange` (unsubscribe on unmount). Whenever a session
is present, load the caller's **staff row**:
`supabase.from('staff').select('*').eq('id', session.user.id).maybeSingle()`
(RLS policy `staff_select` lets a user read their own row).

Exposes `{ session, staff, loading }` where `staff` is the row
(`{ id, role, full_name, … }`) or `null`.

**Why the staff row matters:** RLS gates every table on `is_staff()` /
`is_admin()`, which read `public.staff`. A valid Supabase Auth user with **no**
staff row can authenticate but every data query returns empty. The app detects
"authenticated but not staff" explicitly (§5.3) instead of rendering a
mysteriously blank screen.

### 5.3 Routing & guards — `src/App.tsx`, `src/auth/ProtectedRoute.tsx`

Routes this cycle:

- `/login` — the login screen (§5.4).
- `/import` — the Import screen (§6), protected.
- `/` — redirect to `/import`.

The other seven screens are **not** routed yet; routes are added as they are
built.

`ProtectedRoute` behavior, in order:

1. `loading` → a spinner/placeholder.
2. no `session` → redirect to `/login`.
3. `session` but `staff === null` → an **"Awaiting access"** screen
   ("Your account isn't set up for staff access yet — ask an admin to add
   you.") with a sign-out button.
4. `session` + `staff` → render the child.

**Admin gate on Import.** RLS makes `attendees` INSERT admin-only
(`attendees_insert with check (is_admin())`). Import is inherently an admin
setup task, so the `/import` route additionally requires `staff.role ===
'admin'`. A `desk` user reaching it sees "Imports are admin-only." This surfaces
the permission boundary in the UI rather than letting a commit fail later with a
raw RLS/PostgREST error.

### 5.4 Shell & login

- **Shell** (`src/components/TopBar.tsx`): a thin top bar — app name · the
  signed-in user's email · a sign-out button (`supabase.auth.signOut()`).
- **Login** (`src/features/auth/LoginScreen.tsx`): email + password form →
  `supabase.auth.signInWithPassword`. On success `AuthProvider` picks up the
  session via its listener and the guard admits the user. Auth errors render
  inline. **No public sign-up** — staff are provisioned in the Supabase
  dashboard.

## 6. Import screen — `src/features/import/`

A state machine: **idle → parsing → preview → committing → done / error**.

### 6.1 Upload → parse (pure, in-browser)

File input accepting `.xlsx,.xls`. On selection, read the file to bytes and run
the **existing domain pipeline** — no new domain logic:

```ts
const buf = await file.arrayBuffer();
const result: ImportResult = runImport(parseWorkbook(buf));
// parseWorkbook(data: ArrayBuffer | Uint8Array): RawRow[]   — does the SheetJS read internally
// runImport(rows: RawRow[]): ImportResult                    — { attendees: CleanedAttendee[], stats: ImportStats }
```

The spreadsheet is read entirely in the browser; **it never leaves the browser
and never touches git** — only cleaned rows are sent onward, satisfying the PII
constraint. Parse failures (unreadable/wrong file) transition to `error` with a
readable message.

### 6.2 Preview (read-only) — `StatsSummary.tsx`, `PreviewTable.tsx`

- **`StatsSummary`** renders `ImportStats`: total, by state, by gender, needing
  review, duplicates, accommodation conflicts.
- **`PreviewTable`** renders the `CleanedAttendee[]` in a scrollable table with
  badges on flagged rows — **location**, **accommodation**, **duplicate**
  (from `reviewFlags`) — plus a "show only rows needing review" toggle. ~537
  rows renders directly; no virtualization. **No editing.**

### 6.3 Commit — `commitImport.ts`, `toAttendeeRow.ts`

"Commit N attendees" button (admins only, per §5.3). Maps each
`CleanedAttendee` to a snake_case `attendees` row and **upserts on the `id`
(RegID) primary key** in chunks (~200 rows per request), reporting progress and
a final count, then transitions to `done`. Commit failures (network / RLS /
constraint) transition to `error` while keeping the preview so the user can
retry.

### 6.4 Commit semantics (load-bearing)

- **Idempotent re-import (design spec §5.1).** Upsert on the RegID PK. The
  payload carries only *import-owned* columns: `id`, `full_name`, `whatsapp`,
  `email`, `age_group`, `location_raw`, `state`, `occupation`, `gender`,
  `marital_status`, `first_time`, `heard_via`, `accommodation_choice`,
  `private_room_type`, `dupe_flag`, `review_flags`, `registered_at`,
  `import_batch`. It **omits operational columns**: `arrived`, `arrived_at`,
  `checked_in_by`, `notes`, `created_at`. Postgres `ON CONFLICT DO UPDATE`
  updates only supplied columns, so re-importing refreshes the cleaning fields
  **without clobbering check-in state**; `created_at` keeps its original value
  and takes its default only on first insert. Allocations and meal tickets live
  in other tables and are untouched.
- **Never auto-delete.** Rows present in a previous import but absent from a new
  file are left alone. The commit only upserts. (Design spec "surface, never
  silently fix.")
- **`import_batch`** = an ISO-8601 timestamp generated once per commit run,
  written on every row of that run for traceability (indexed in `0001`).
- **Duplicate-PK safeguard.** If two cleaned rows share a RegID (an exact
  duplicate submission), sending both in one upsert makes Postgres error
  ("ON CONFLICT DO UPDATE command cannot affect row a second time"). The commit
  layer therefore **de-duplicates the payload by `id` (last write wins)** before
  sending. This is not silent correction: the duplicate is still surfaced via
  `review_flags.duplicate` on the stored row and in the preview; a single PK
  simply cannot hold two physical rows. (Whether `runImport` already collapses
  identical-RegID rows is confirmed at plan-writing time; the safeguard is
  correct regardless.)

## 7. Data mapping & testing

### 7.1 The one new pure unit — `toAttendeeRow`

`toAttendeeRow(cleaned: CleanedAttendee): AttendeeRow` maps the camelCase domain
type to the snake_case DB row: `regId → id`, `registeredAt → registered_at`,
etc.; it serializes `reviewFlags` to the `review_flags` jsonb column, mirrors
`reviewFlags.duplicate` into the indexed `dupe_flag` boolean, and omits
operational columns. The batch de-dup-by-`id` helper lives alongside it. Both are **pure, no I/O**, so they live in
`src/features/import/` (DB-shape mapping, not `src/domain/`) and are
**unit-tested with Vitest**:

- field mapping is correct (camelCase → snake_case, `state`/`private_room_type`
  nullable),
- `reviewFlags` serializes into `review_flags`,
- operational columns are absent from the row,
- a payload containing a repeated `id` collapses to one row (last wins).

### 7.2 What is not unit-tested this cycle

Auth, routing, and the Supabase I/O in `commitImport.ts` are **not** unit-tested
this cycle: that needs jsdom + React Testing Library + Supabase mocking, which
the project does not yet have. Given the deadline, these are **verified manually**
against the live project (login as admin; upload a synthetic fixture; commit;
confirm rows via the SQL checklist in `supabase/README.md`; re-import and
confirm arrivals are preserved). React component tests can be added in a later
cycle. This is a deliberate, stated gap — not assumed coverage.

## 8. File layout

```
src/
  lib/
    supabase.ts                         # createClient instance
  auth/
    AuthProvider.tsx                    # session + staff-row context
    useAuth.ts                          # hook over the context
    ProtectedRoute.tsx                  # loading / unauth / non-staff / admin-gate
  features/
    auth/
      LoginScreen.tsx                   # email+password sign-in
    import/
      ImportScreen.tsx                  # state machine + orchestration
      StatsSummary.tsx                  # ImportStats cards
      PreviewTable.tsx                  # flagged, scrollable preview (read-only)
      toAttendeeRow.ts                  # CleanedAttendee -> AttendeeRow (pure)
      toAttendeeRow.test.ts             # Vitest unit tests
      commitImport.ts                   # chunked upsert to Supabase (I/O)
  components/
    TopBar.tsx                          # shell: app name / email / sign-out
  App.tsx                               # router + guards
  main.tsx                              # wraps <BrowserRouter> + <AuthProvider>
```

## 9. Traceability to the design spec

| This design | Design spec |
|---|---|
| Foundation, staff login, RLS gating | §3 (stack/auth), §4 (schema/RLS) |
| Import upload → clean → preview → commit | §5.1 (Import screen) |
| Idempotent re-import, preserve arrivals | §5.1 |
| Surface flags, never auto-fix/delete | project constraints, §5.1/§5.2 |
| Domain pipeline consumed unchanged | Plan 1 (`parseWorkbook`, `runImport`, `ImportResult`) |
| Attendees-screen flag resolution (deferred) | §5.2 |
