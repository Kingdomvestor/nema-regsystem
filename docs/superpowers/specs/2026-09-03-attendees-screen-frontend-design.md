# Attendees Screen — Frontend Design (Cycle 2)

**Date:** 2026-09-03
**Status:** Approved (design + lean process: spec → build inline, no separate plan doc).
**Product source of truth:** `docs/superpowers/specs/2026-09-02-conference-registration-system-design.md` §5 item 2.
**Builds on:** Cycle 1 (`2026-09-03-foundation-and-import-frontend-design.md`) — reuses the
Supabase client, `AuthProvider`, `ProtectedRoute`, `TopBar`.

## 1. Scope

The working attendee list: **search + filter**, **inline edit** of fields, and
**review-flag resolution** (location, accommodation, duplicate). This is where the
flags that Import only *surfaces* get resolved by a human.

### 1.1 Non-goals (deferred)

- **Record-merge** for duplicates — resolution here is per-row *dismiss* ("not a
  duplicate") or *delete* the redundant registration (admin). No field-combining.
- **Allocated / unallocated** filter — the allocations table isn't populated yet
  (Rooms/Allocation cycles). Added when that data exists.
- Realtime, bulk edit, CSV export, pagination/virtualization (~537 rows render fine).

## 2. Approach

**Thin & direct**, same as Cycle 1. No TanStack Query: load all rows once into
screen state; **search and filtering run client-side** over the in-memory set
(instant, no round-trips); after any write, refetch. A cache library is
introduced later only if the Dashboard needs a shared one — not now (YAGNI).

## 3. Data model

`AttendeeRecord` — a full snake_case row from `public.attendees` (the columns the
screen reads/shows). `review_flags` is the `ReviewFlags` domain type.

**Editable columns only** (`EditablePatch = Partial<Pick<…>>`): `full_name`,
`whatsapp`, `email`, `age_group`, `state`, `occupation`, `gender`,
`marital_status`, `first_time`, `heard_via`, `accommodation_choice`,
`private_room_type`, `notes`, `dupe_flag`, `review_flags`. The type **structurally
excludes** `id`, `location_raw`, `registered_at`, `import_batch`, `created_at`, and
every operational column (`arrived`, `arrived_at`, `checked_in_by`) — the Attendees
screen never writes check-in state (the Check-in screen owns it).

## 4. Modules

### 4.1 `attendeesApi.ts` (I/O)

- `fetchAttendees(): Promise<AttendeeRecord[]>` — `select * order by full_name`.
- `updateAttendee(id, patch: EditablePatch): Promise<void>` — `update … eq id`.
  RLS allows any staff to UPDATE.
- `deleteAttendee(id): Promise<void>` — `delete … eq id`. RLS: **admin only**; the
  UI also gates the button on `staff.role === 'admin'`.

All throw `Error(error.message)` on failure.

### 4.2 `resolve.ts` (pure, tested)

Patch builders that clear exactly one review flag and set its corrected value:

- `resolveLocation(flags, state)` → `{ state, review_flags: {…, location:false} }`
- `resolveAccommodation(flags, choice, roomType)` →
  `{ accommodation_choice, private_room_type: choice==='private_paid' ? roomType : null, review_flags: {…, accommodation:false} }`
- `dismissDuplicate(flags)` → `{ dupe_flag:false, review_flags:{…, duplicate:false} }`

Each keeps the other flags untouched. Resolution is always an explicit human
action — never automatic ("surface, never silently fix").

### 4.3 `attendeesFilter.ts` (pure, tested)

- `AttendeeFilter { search; state; gender; accommodation; needsReview; arrived }`
  with `emptyFilter`.
- `filterAttendees(rows, f)` — `search` is a case-insensitive substring over
  name/whatsapp/email/RegID; `state`/`gender`/`accommodation` exact (`'all'` = off,
  accommodation `'none'` = no choice set); `needsReview` = any review flag true;
  `arrived` = `'all' | 'yes' | 'no'`.

## 5. Components

- **`AttendeesScreen`** — route `/attendees` (protected, any staff). Loads rows,
  owns `filter` + `selectedId`, derives the filtered list, renders the shell.
  Save/Delete call the API then refetch and close the panel.
- **`Filters`** — search box + selects (state, gender, accommodation) + checkboxes
  (needs-review, arrived). Options for state come from the canonical list; gender
  from the distinct values present.
- **`AttendeesTable`** — rows with columns RegID · Name · State · Gender ·
  Accommodation · Arrived · Flags (badges). Click a row to edit.
- **`AttendeeEditPanel`** — side panel; local form seeded from the row; grouped
  fields (identity / classification / notes) + a **Review flags** section whose
  Resolve buttons apply the `resolve.ts` builders to the form. One **Save**;
  **Delete** shown only to admins, behind a confirm.
- **`TopBar`** — gains nav links (Import ↔ Attendees).

## 6. Routing & auth

Add `/attendees` to `App.tsx`, wrapped in `ProtectedRoute` (staff, **not**
admin-only — desk can view/edit). `/import` stays admin-only. Delete is gated in
the panel on admin role; RLS enforces it server-side regardless.

## 7. Testing

- **Unit (Vitest):** `resolve.test.ts` (each builder clears only its flag, sets
  the value, `free_hostel` nulls the room type) and `attendeesFilter.test.ts`
  (search fields, each filter, combinations).
- **Manual** (live project, like Cycle 1): load list, edit a field, resolve a
  location/accommodation flag, dismiss a duplicate, delete a row as admin, confirm
  a `desk` user has no Delete button and a delete attempt is refused by RLS.

## 8. File layout

```
src/features/attendees/
  AttendeesScreen.tsx      # fetch + filter state + orchestration
  Filters.tsx              # search + filter controls
  AttendeesTable.tsx       # row list + badges + select
  AttendeeEditPanel.tsx    # edit form + flag resolution + delete
  attendeesApi.ts          # supabase fetch/update/delete (I/O)
  resolve.ts               # pure flag-resolution patch builders
  resolve.test.ts
  attendeesFilter.ts       # pure search/filter
  attendeesFilter.test.ts
  types.ts                 # AttendeeRecord, EditablePatch, AttendeeFilter
src/components/TopBar.tsx   # + nav links (modified)
src/App.tsx                # + /attendees route (modified)
```

## 9. Traceability

| This design | Product spec |
|---|---|
| Searchable/filterable table, inline edit, flag resolution | §5 item 2 |
| Resolve location / accommodation / duplicate; never auto-fix | §2.5, project constraints |
| Delete redundant duplicate (admin), no merge | §5 item 2 (scoped) |
| Staff vs admin (view/edit vs delete/import) | §4 (RLS) |
| Thin reads, no cache library yet | Cycle 1 §3 |
