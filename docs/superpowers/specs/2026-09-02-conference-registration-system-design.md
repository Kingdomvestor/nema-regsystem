# Conference Registration & Room Allocation System — Design Spec

**Date:** 2026-09-02
**Event:** NEMA South West Zonal Conference 2026
**Deadline:** ~14 days (event mid-September 2026)
**Status:** Approved shape — pending spec review

---

## 1. Purpose

A team-only web app for the conference registration team to:

1. **Plan (before the event):** import attendee data from Excel, clean it, allocate
   accommodation (balancing state + gender within accommodation classes), and register
   attendees for per-session meals.
2. **Check in (on the day):** several staff, from their phones, search an attendee, mark
   them arrived, and hand out room + meal-ticket information — with changes visible live
   across all devices.

Attendees do **not** log in. This is an internal operations tool.

---

## 2. Source data (real, already inspected)

One Google-Forms export, `Conference 2026.xlsx`, **537 registrations**, single sheet
`Form responses 1`. Columns:

| Col | Header | Notes for the build |
|---|---|---|
| A | Timestamp | Registration time |
| B | Full Name | No unique ID; **36 duplicate name values** |
| C | WhatsApp number | **54 duplicate values** (families sharing a number) |
| D | Email | **81 duplicate values** |
| E | Age group | 6 values, incl. 5 blank |
| F | Location | **Messy**: 7 real states + noise (`Lagos, Ogun`, `Ilorin Kwara State`, `Ogbomoso`, `Ibadan`) |
| G | Occupation | 528 distinct — free text, ignored for allocation |
| H | Gender | Clean: Male 385 / Female 152 |
| I | Marital Status | Single 276 / Married 256 / Widow-Widower 5 |
| J | First time attending? | Yes 325 / No 212 |
| K | How did you hear? | Informational only |
| L | Accommodation Options | Free hostel 458 / Private paid 74 / stray `No` 3, `Yes` 2 |
| M | Private room type | Blank 426 / Fan-only 56 / A-C 55 |

### Known data-quality issues (the tool must surface, not silently fix)

- **No unique identifier.** We generate a stable `RegID` on import.
- **Duplicates** across name / phone / email — may be real double-registrations or families.
  Import flags likely duplicates for a human to resolve; never auto-deletes.
- **Location noise.** ~7 canonical states (Kwara, Lagos, Ogun, Oyo, Ekiti, Osun, Ondo). Import
  normalizes to a `state` field, leaving `location_raw` intact; unmapped values go to a review queue.
- **Accommodation contradiction.** 111 rows specify a private room type but only 74 chose
  "private paid" — ~37 self-contradictory rows. Import flags these for review.
- **No meal data exists in this file.** Meal sessions are defined in-app; attendees are
  registered against them after import.

---

## 3. Architecture

### Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS | Fast build; mobile-first check-in |
| Data / backend | Supabase (Postgres, Auth, Realtime, RLS) | Free tier fits 537 rows; realtime keeps multiple desk devices in sync; no server to maintain |
| Hosting | Vercel (frontend) + Supabase (DB) | Both free tier; single live URL |
| Auth | Supabase email/password, small set of staff accounts | Team-only; attendees never authenticate |
| Excel parsing | SheetJS (`xlsx`) in the browser at import time | No backend job needed |
| PDF export | Print-to-PDF via styled print CSS (browser print) | Zero-dependency; sufficient for rooming lists, meal manifests, badges. `@react-pdf/renderer` only if pixel-perfect badge layout later demands it |

**Rejected alternatives:** custom Node/Express backend (more to build/deploy/maintain in 14
days, no benefit); Firebase (NoSQL fits this relational data poorly).

### Deployment model

Cloud, multi-user, realtime. Confirmed: venue has reliable wifi and several staff work the
desk concurrently. (If venue connectivity turns out unreliable closer to the day, the
fallback is to pre-print rooming/meal manifests as PDFs — already a build deliverable — so
check-in can run on paper. Full offline-first sync is explicitly out of scope for v1.)

---

## 4. Data model

**attendees**
`id (RegID, generated)` · `full_name` · `whatsapp` · `email` · `age_group` ·
`location_raw` · `state (normalized)` · `occupation` · `gender` · `marital_status` ·
`first_time (bool)` · `heard_via` · `accommodation_choice (free_hostel | private_paid)` ·
`private_room_type (fan | ac | null)` · `arrived (bool)` · `arrived_at` · `checked_in_by` ·
`dupe_flag (bool)` · `review_flags (jsonb: {location, accommodation, duplicate})` ·
`notes` · `registered_at (form timestamp)` · `import_batch` · `created_at`

**rooms**
`id` · `block` · `room_number` · `capacity (int)` · `gender_designation (male|female|any)` ·
`room_class (hostel | private_fan | private_ac)` · `accessible (bool)` · `notes`

**allocations**  (many attendees per room, up to capacity)
`id` · `attendee_id (fk, unique — one bed per person)` · `room_id (fk)` ·
`assigned_at` · `assigned_by` · `pinned (bool — protects manual assignments from re-runs)`

**meal_sessions**
`id` · `name` · `day (int)` · `meal_type (breakfast|lunch|dinner)` · `session_date` · `sort_order`

**meal_tickets**  (attendee × session)
`id` · `attendee_id (fk)` · `session_id (fk)` · `registered (bool)` ·
`collected (bool)` · `collected_at` · `collected_by`

**staff** — via Supabase Auth (`auth.users`), with a `role` (admin | desk).

### Row-Level Security

All tables readable/writable only by authenticated staff. `admin` can import, edit rooms,
and run allocation; `desk` can search, mark arrived, and mark meal collection. No public
(anon) access to any attendee data.

---

## 5. Screens

### Phase 1 — Planning

1. **Import** — upload `.xlsx`; parse with SheetJS; preview a mapped table; normalize
   locations; generate RegIDs; flag duplicates and contradictory accommodation rows; commit
   to Supabase. Re-import is idempotent per `import_batch` (does not clobber allocations/arrivals).
2. **Attendees** — searchable, filterable table (state, gender, accommodation class,
   allocated/unallocated, arrived). Inline edit + review-flag resolution.
3. **Rooms setup** — CRUD the inventory (block, room, capacity, gender designation, class,
   accessible). Built collaboratively as organizers confirm rooms. Bulk-add helper for uniform blocks.
4. **Allocation** — the core:
   - Auto-allocate within each of the three pools (hostel / private-fan / private-ac).
   - Gender is a hard constraint in hostels.
   - **State-balancing toggle:** "keep a state together" vs "mix states evenly."
   - Respects accessibility needs and manual pins; never overwrites a pinned allocation.
   - Manual drag/assign + override. Live capacity bars and warning counters
     (unallocated, over-capacity, gender mismatch, accessibility unmet).
   - Married-couple support: surfaces married attendees; manual "room together" links
     (auto-pairing impossible — form doesn't link spouses).
5. **Meal sessions** — define sessions; bulk-register all attendees (default) with per-attendee
   opt-out.
6. **Dashboard** — bed demand vs supply per gender per class; per-state counts; allocation
   progress; meal headcount per session; outstanding review flags.

### Phase 2 — On-site

7. **Check-in** — mobile-first, large touch targets. Search by name/phone → attendee card
   (room, block, bed, meal tickets) → "Mark arrived." Realtime: arrivals appear on every
   device immediately.
8. **Meal collection** — per-session collection toggles (own station or folded into check-in).
9. **Printables (PDF)** — rooming list per block/room, meal manifest per session, individual
   badges/meal tickets. These double as the paper fallback if wifi fails on the day.

---

## 6. Allocation algorithm

```
Input: attendees needing a bed, rooms, mode ∈ {group_by_state, mix_states}
Partition attendees by accommodation_choice → {hostel, private_fan, private_ac}
For each pool:
  If hostel: split further by gender (hard wall)
  Skip attendees whose allocation is pinned (leave as-is)
  Order rooms by (accessible-first for attendees with needs), then capacity
  If group_by_state: fill rooms with one state at a time, opening a new room at state boundaries
  If mix_states:     round-robin attendees across open rooms to spread states evenly
  Respect capacity; honor "room together" links (place linked pair/family in same room)
  Leftover (no bed): report as unallocated, never force over capacity
Output: proposed allocations (preview) → admin confirms → write to `allocations`
```

Deterministic and **re-runnable**: re-running only touches unpinned, unallocated attendees
unless the admin explicitly chooses "reset unpinned."

---

## 7. Out of scope (v1 / YAGNI)

- Attendee self-service portal / attendee logins
- Payment processing or tracking (no payment data in source)
- Offline-first sync engine (PDF fallback instead)
- Email/SMS blasts to attendees
- Multi-event support (this is one conference)

---

## 8. 14-day plan

| Days | Milestone |
|---|---|
| 1–2 | Repo + Supabase project + schema + RLS; Excel import working end-to-end on the real file |
| 3–4 | Attendees table + dashboard |
| 5–6 | Rooms setup screen *(organizers confirm the real room list in parallel)* |
| 7–9 | Allocation engine (auto + manual) |
| 10 | Meal sessions + tickets |
| 11–12 | Mobile check-in flow + PDF printables |
| 13 | Dry run with the team on real data; fix |
| 14 | Buffer / deploy / train team |

---

## 9. Open inputs (needed during build, not blocking start)

1. **Conference day/meal schedule** — to seed `meal_sessions` (how many days, which meals).
   Default assumption until provided: 3 days, arrive Day 1 evening → depart Day 3 afternoon,
   6 sessions.
2. **Real room inventory** — blocks, room numbers, bed capacities, which are gender-designated,
   which are accessible, private fan vs A/C counts. **Critical path — confirm with organizers by Day 5.**
3. **Staff accounts** — who needs a login and at what role (admin vs desk).

---

## 10. Assumptions

- Currency/payment is irrelevant to this tool (no payment field in the data).
- States are the 7 South-West-adjacent Nigerian states seen in the data; the normalizer maps
  known noise and queues anything unrecognized.
- "Balance by state" is genuinely ambiguous, so it is exposed as a runtime toggle rather than
  hard-coded.
- Private paid attendees get rooms by their stated type (fan/AC); the ~37 contradictory rows
  are resolved by a human before allocation runs.
