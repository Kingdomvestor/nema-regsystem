# Supabase Schema & RLS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author the Postgres schema and Row-Level Security migrations for all six tables (attendees, rooms, allocations, meal_sessions, meal_tickets, staff) so the app has a secure, staff-only data layer to build the Import UI and later screens against.

**Architecture:** Two ordered SQL migration files under `supabase/migrations/` — `0001_core_schema.sql` (tables, constraints, indexes) then `0002_rls_policies.sql` (SECURITY DEFINER role helpers, RLS enablement, per-table policies, anon lockout). A committed `.env.example` documents the client connection-key shape; a `supabase/README.md` documents how to apply the migrations, seed the first admin, and verify the result. Categorical columns are `text` + `CHECK` (not Postgres enums) so values match the domain's string literals exactly and stay cheap to evolve.

**Tech Stack:** Supabase (Postgres 15, `auth.users`, RLS, PostgREST roles `anon`/`authenticated`/`service_role`), `pgcrypto` (`gen_random_uuid()`), plain SQL. No new npm dependencies. No local Postgres/Docker/CLI in this environment.

**Spec:** `docs/superpowers/specs/2026-09-02-conference-registration-system-design.md` (data model = §4; RLS intent = §4 "Row-Level Security"; source-data field meanings = §2).

## Global Constraints

- **Secrets never in git.** Supabase keys live in `.env` (already gitignored via `.gitignore` lines 12–15: `.env`, `.env.*`, `!.env.example`). Only `.env.example` (no real values) is committed. The `service_role` key bypasses RLS and must never enter `.env`, the browser bundle, or git.
- **No public (anon) access to any attendee data** (spec §4). RLS is enabled on every table; the `anon` role is explicitly revoked from every table.
- **Surface, never silently fix.** The schema stores review state (`review_flags jsonb`, `dupe_flag`, `location_raw`) so the human resolves duplicates / location noise / accommodation contradictions later — the DB never auto-corrects.
- **Categorical values must match the domain verbatim** (`src/domain/types.ts`): `accommodation_choice ∈ {free_hostel, private_paid}`, `private_room_type ∈ {fan, ac}` (nullable), `room_class ∈ {hostel, private_fan, private_ac}`, `gender_designation ∈ {male, female, any}`, `meal_type ∈ {breakfast, lunch, dinner}`, `role ∈ {admin, desk}`. `gender` and `state` are NOT CHECK-constrained (the domain stores raw gender strings and a 7-or-null normalized state; over-constraining them adds migration burden for no safety gain).
- **`attendees.id` is the domain-generated RegID** — `text` PK, not a uuid. It is the natural idempotency key for re-import (upsert logic itself is deferred to a later plan). All other tables use `uuid` PKs via `gen_random_uuid()`.

## Verification approach (read this — the TDD cycle is adapted)

This environment has **no local Postgres, no Docker, no Supabase CLI**, so migrations cannot be run red/green in Vitest the way `src/domain/` tasks were. Per the user's explicit choice, verification is **"SQL + checklist the user applies"**:

- Each SQL task's "test" is a **static self-review against an explicit checklist** printed in the task (column-by-column / policy-by-policy against spec §4 and the Global Constraints), followed by a commit. There is no local execution step to turn green.
- **Task 4 produces the user-run acceptance artifact**: a set of copy-paste verification queries (in `supabase/README.md`) the user runs in the Supabase SQL editor after applying `0001` then `0002`, plus the one-time first-admin bootstrap seed. Applying and confirming is the user's action; the plan's deliverable is the correct SQL + the checklist that proves it.
- Do **not** add pglite, a test DB, or any dependency to manufacture a green cycle — that was explicitly ruled out.

---

## File Structure

- `supabase/migrations/0001_core_schema.sql` — **Create.** All six tables, CHECK constraints, FKs, indexes, `pgcrypto` extension. Applied first.
- `supabase/migrations/0002_rls_policies.sql` — **Create.** `is_staff()` / `is_admin()` SECURITY DEFINER helpers, `enable row level security` on all six tables, per-table policies, `authenticated` grants, `anon` revoke. Applied second (depends on the tables existing).
- `supabase/seed_first_admin.example.sql` — **Create.** Copy-and-edit template that promotes the first staff auth user to `admin`. Not auto-applied; run once by the user in the SQL editor (service role bypasses RLS, resolving the empty-`staff` bootstrap).
- `supabase/README.md` — **Create.** How to apply the migrations (order + dashboard steps), the first-admin bootstrap procedure, and the verification-query checklist.
- `.env.example` — **Create.** Client connection-key shape (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) with a service_role warning.

**Interfaces produced for later plans (Plan 3+ data-access layer):**
- Table `public.attendees` with `text` PK `id` and columns mapping 1:1 (snake_case) to `CleanedAttendee` plus DB-only fields: `id, full_name, whatsapp, email, age_group, location_raw, state, occupation, gender, marital_status, first_time, heard_via, accommodation_choice, private_room_type, arrived, arrived_at, checked_in_by, dupe_flag, review_flags, notes, registered_at, import_batch, created_at`.
- Tables `public.rooms, public.allocations, public.meal_sessions, public.meal_tickets, public.staff` per spec §4.
- SQL helpers `public.is_staff() → boolean` and `public.is_admin() → boolean` (usable inside future policies/functions).

---

### Task 1: Scaffolding — `.env.example` and apply guide

Establishes the `supabase/` layout, documents the client key shape, and writes the "how to apply" guide the later SQL tasks reference. No schema yet — this is the setup task everything else needs.

**Files:**
- Create: `.env.example`
- Create: `supabase/README.md`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the documented apply workflow (migration order, dashboard SQL-editor steps) that Tasks 2–4 slot into; the committed env-shape contract for the future Supabase client.

- [ ] **Step 1: Write `.env.example`**

```
# ─────────────────────────────────────────────────────────────────────────────
# Supabase connection — copy this file to `.env` and fill in real values.
# `.env` is gitignored (.gitignore lines 12–15); NEVER commit real keys.
# Find these in: Supabase Dashboard → Project Settings → API.
# ─────────────────────────────────────────────────────────────────────────────

# Project REST URL, e.g. https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_URL=

# Public "anon" key (safe to ship to the browser — RLS is what protects data).
VITE_SUPABASE_ANON_KEY=

# NOTE: the service_role key bypasses RLS. It must NEVER appear in this file,
# in the browser bundle, or in git. Server-only actions (e.g. the one-time
# admin seed) use it directly in the Supabase SQL editor, not via the app.
```

- [ ] **Step 2: Write `supabase/README.md` (apply guide only — bootstrap + verification are appended in Task 4)**

````markdown
# Supabase — schema, RLS, and setup

This folder holds the database migrations for the Conference Reg & Room
Allocation app. There is no local Postgres in this project; migrations are
applied by pasting them into the **Supabase SQL editor** (Dashboard → SQL
Editor → New query → paste → Run).

## Apply order

Run these **once, in order**, against the project:

1. `migrations/0001_core_schema.sql` — tables, constraints, indexes.
2. `migrations/0002_rls_policies.sql` — role helpers + Row-Level Security.

Then do the one-time **first-admin bootstrap** (see below) so you can log in
with a staff role.

> If you later adopt the Supabase CLI, these files already live in
> `supabase/migrations/`; `supabase db push` applies them in lexical order.
> (You may rename them to timestamped versions if the CLI requires it.)

## Connection keys

Copy `../.env.example` to `../.env` and fill in `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` from Dashboard → Project Settings → API. `.env` is
gitignored. Never put the `service_role` key in `.env`.
````

- [ ] **Step 3: Commit**

```bash
git add .env.example supabase/README.md
git commit -m "Scaffold supabase/ layout: env shape + apply guide (Plan 2 Task 1)"
```

---

### Task 2: Core schema migration (`0001_core_schema.sql`)

All six tables with the exact spec §4 columns, CHECK constraints matching the domain literals, FKs, and query indexes for the upcoming attendees table / dashboard filters.

**Files:**
- Create: `supabase/migrations/0001_core_schema.sql`

**Interfaces:**
- Consumes: the apply guide from Task 1 (documents that this file runs first).
- Produces: tables `attendees, rooms, allocations, meal_sessions, meal_tickets, staff` (column list in the top-level "Interfaces produced" block). Task 3 enables RLS on exactly these tables.

- [ ] **Step 1: Write the full migration file**

```sql
-- 0001_core_schema.sql
-- Conference Reg & Room Allocation — core schema (design spec §4).
-- Apply FIRST, in the Supabase SQL editor. See supabase/README.md.

-- gen_random_uuid() lives in pgcrypto (preinstalled on Supabase; ensure it).
create extension if not exists pgcrypto;

-- ATTENDEES ─────────────────────────────────────────────────────────────────
-- id is the domain-generated RegID (deterministic string), NOT a uuid.
create table if not exists public.attendees (
  id                   text primary key,                 -- generateRegId() output
  full_name            text not null,
  whatsapp             text,
  email                text,
  age_group            text,
  location_raw         text,                             -- original F cell, verbatim
  state                text,                             -- normalized; null = unmapped/review
  occupation           text,
  gender               text,                             -- raw string (Male/Female/…)
  marital_status       text,
  first_time           boolean not null default false,
  heard_via            text,
  accommodation_choice text check (accommodation_choice in ('free_hostel','private_paid')),
  private_room_type    text check (private_room_type in ('fan','ac')),  -- null = none/unknown
  arrived              boolean not null default false,
  arrived_at           timestamptz,
  checked_in_by        uuid references auth.users(id) on delete set null,
  dupe_flag            boolean not null default false,
  review_flags         jsonb   not null default '{}'::jsonb,  -- {location,accommodation,duplicate}
  notes                text,
  registered_at        timestamptz,                      -- form submission timestamp (col A)
  import_batch         text,
  created_at           timestamptz not null default now()
);

-- Filters for the attendees table + dashboard (spec §5.2, §5.6).
create index if not exists attendees_state_idx         on public.attendees (state);
create index if not exists attendees_gender_idx        on public.attendees (gender);
create index if not exists attendees_accommodation_idx on public.attendees (accommodation_choice);
create index if not exists attendees_arrived_idx       on public.attendees (arrived);
create index if not exists attendees_import_batch_idx  on public.attendees (import_batch);

-- ROOMS ─────────────────────────────────────────────────────────────────────
create table if not exists public.rooms (
  id                 uuid primary key default gen_random_uuid(),
  block              text not null,
  room_number        text not null,
  capacity           int  not null check (capacity > 0),
  gender_designation text not null check (gender_designation in ('male','female','any')),
  room_class         text not null check (room_class in ('hostel','private_fan','private_ac')),
  accessible         boolean not null default false,
  notes              text,
  created_at         timestamptz not null default now(),
  unique (block, room_number)
);

-- ALLOCATIONS ───────────────────────────────────────────────────────────────
-- one bed per person => attendee_id is unique.
create table if not exists public.allocations (
  id          uuid primary key default gen_random_uuid(),
  attendee_id text not null unique references public.attendees(id) on delete cascade,
  room_id     uuid not null references public.rooms(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  pinned      boolean not null default false                -- protects manual assigns from re-runs
);
create index if not exists allocations_room_idx on public.allocations (room_id);

-- MEAL SESSIONS ─────────────────────────────────────────────────────────────
create table if not exists public.meal_sessions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  day          int  not null check (day >= 1),
  meal_type    text not null check (meal_type in ('breakfast','lunch','dinner')),
  session_date date,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);

-- MEAL TICKETS ──────────────────────────────────────────────────────────────
-- one ticket per attendee per session.
create table if not exists public.meal_tickets (
  id           uuid primary key default gen_random_uuid(),
  attendee_id  text not null references public.attendees(id) on delete cascade,
  session_id   uuid not null references public.meal_sessions(id) on delete cascade,
  registered   boolean not null default true,
  collected    boolean not null default false,
  collected_at timestamptz,
  collected_by uuid references auth.users(id) on delete set null,
  unique (attendee_id, session_id)
);
create index if not exists meal_tickets_session_idx on public.meal_tickets (session_id);

-- STAFF (role source for RLS) ───────────────────────────────────────────────
-- id references the Supabase Auth user; role drives every policy.
create table if not exists public.staff (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','desk')),
  full_name  text,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Self-review against this checklist (the task's "test")**

Verify each item against spec §4 and the Global Constraints; fix inline before committing:
- [ ] Every spec §4 `attendees` field is present with the right name/type: `id(text pk), full_name, whatsapp, email, age_group, location_raw, state, occupation, gender, marital_status, first_time(bool), heard_via, accommodation_choice, private_room_type, arrived(bool), arrived_at, checked_in_by, dupe_flag(bool), review_flags(jsonb), notes, registered_at, import_batch, created_at`.
- [ ] CHECK constraints exactly match the domain literals (`free_hostel`/`private_paid`; `fan`/`ac`; `hostel`/`private_fan`/`private_ac`; `male`/`female`/`any`; `breakfast`/`lunch`/`dinner`; `admin`/`desk`). No CHECK on `gender` or `state`.
- [ ] `rooms`, `meal_sessions` have no FKs and can be created before `allocations`/`meal_tickets` (they are, by file order).
- [ ] `allocations.attendee_id` is `text` (matches `attendees.id`) and `unique`; `room_id` is `uuid`. `meal_tickets.attendee_id` is `text`, `session_id` is `uuid`.
- [ ] All `*_by` columns and `staff.id` reference `auth.users(id)`; deletes don't orphan (`set null` on audit cols, `cascade` on `staff.id`).
- [ ] `gen_random_uuid()` is available (`create extension if not exists pgcrypto`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_core_schema.sql
git commit -m "Add core Postgres schema for six tables (Plan 2 Task 2)"
```

---

### Task 3: RLS policies migration (`0002_rls_policies.sql`)

Role helpers, RLS enablement, and pragmatic per-table policies: all authenticated staff read; staff update attendees + mark meal collection; admin does imports, room/allocation/session writes, and staff management. Anon is locked out of every table.

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

**Interfaces:**
- Consumes: the six tables from Task 2 (`0001` must be applied first).
- Produces: `public.is_staff()` and `public.is_admin()` (SECURITY DEFINER, callable from future policies/functions); a fully locked-down data layer for Plan 3+.

- [ ] **Step 1: Write the full migration file**

```sql
-- 0002_rls_policies.sql
-- Conference Reg & Room Allocation — Row-Level Security (design spec §4).
-- Apply SECOND, after 0001_core_schema.sql. See supabase/README.md.

-- ROLE HELPERS ──────────────────────────────────────────────────────────────
-- SECURITY DEFINER so they read public.staff bypassing RLS — this is what
-- prevents infinite recursion when staff's own policies call is_admin().
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.staff s where s.id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.staff s where s.id = auth.uid() and s.role = 'admin'
  );
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- COARSE GRANTS ─────────────────────────────────────────────────────────────
-- Table-level grants are the coarse gate; RLS policies below do the real row
-- gating. anon gets nothing (spec §4: no public access to attendee data).
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- ENABLE RLS ────────────────────────────────────────────────────────────────
alter table public.attendees     enable row level security;
alter table public.rooms         enable row level security;
alter table public.allocations   enable row level security;
alter table public.meal_sessions enable row level security;
alter table public.meal_tickets  enable row level security;
alter table public.staff         enable row level security;

-- ATTENDEES: staff read + update; admin insert + delete ──────────────────────
create policy attendees_select on public.attendees
  for select to authenticated using (public.is_staff());
create policy attendees_update on public.attendees
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy attendees_insert on public.attendees
  for insert to authenticated with check (public.is_admin());
create policy attendees_delete on public.attendees
  for delete to authenticated using (public.is_admin());

-- ROOMS: staff read; admin write ─────────────────────────────────────────────
create policy rooms_select on public.rooms
  for select to authenticated using (public.is_staff());
create policy rooms_admin_write on public.rooms
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ALLOCATIONS: staff read; admin write ───────────────────────────────────────
create policy allocations_select on public.allocations
  for select to authenticated using (public.is_staff());
create policy allocations_admin_write on public.allocations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- MEAL SESSIONS: staff read; admin write ─────────────────────────────────────
create policy meal_sessions_select on public.meal_sessions
  for select to authenticated using (public.is_staff());
create policy meal_sessions_admin_write on public.meal_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- MEAL TICKETS: staff read + update (desk marks collected); admin insert/delete
create policy meal_tickets_select on public.meal_tickets
  for select to authenticated using (public.is_staff());
create policy meal_tickets_update on public.meal_tickets
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy meal_tickets_insert on public.meal_tickets
  for insert to authenticated with check (public.is_admin());
create policy meal_tickets_delete on public.meal_tickets
  for delete to authenticated using (public.is_admin());

-- STAFF: a user reads their own row (to learn their role); admin manages team.
-- First-admin bootstrap runs in the SQL editor as service_role, which bypasses
-- RLS — so the empty-table chicken-and-egg is resolved there, not here.
create policy staff_select on public.staff
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy staff_insert on public.staff
  for insert to authenticated with check (public.is_admin());
create policy staff_update on public.staff
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy staff_delete on public.staff
  for delete to authenticated using (public.is_admin());
```

- [ ] **Step 2: Self-review against this checklist (the task's "test")**

- [ ] `is_staff()` and `is_admin()` are `security definer` with `set search_path = public` (both are required — definer avoids staff-policy recursion; the pinned search_path is the safety practice for definer functions).
- [ ] RLS is enabled on all six tables (none missed).
- [ ] `anon` is revoked from all tables; no policy grants `anon` or `public` any access.
- [ ] Every table has a staff SELECT path: attendees/rooms/allocations/meal_sessions/meal_tickets via `is_staff()`; staff via own-row-or-admin.
- [ ] Write matrix matches spec §4: admin-only INSERT/DELETE on attendees; admin-only writes to rooms/allocations/meal_sessions; staff UPDATE on attendees (flag resolution/edit) and meal_tickets (collection); admin-only INSERT/DELETE on meal_tickets; admin-only staff management.
- [ ] No policy queries `public.staff` directly (they go through `is_staff()`/`is_admin()`), so there is no RLS recursion.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_rls_policies.sql
git commit -m "Add RLS role helpers and per-table policies (Plan 2 Task 3)"
```

---

### Task 4: First-admin bootstrap + verification checklist (user-run acceptance)

The acceptance artifact: a copy-edit seed template that promotes the first staff user to `admin`, and the verification queries the user runs in the SQL editor after applying `0001` + `0002`.

**Files:**
- Create: `supabase/seed_first_admin.example.sql`
- Modify: `supabase/README.md` (append "First-admin bootstrap" and "Verify the migrations" sections)

**Interfaces:**
- Consumes: the applied schema (Task 2) and policies (Task 3); the `staff` table and `is_admin()`/`is_staff()` helpers.
- Produces: the user-facing verification/bootstrap procedure. No later plan depends on these files as code — they are operational docs.

- [ ] **Step 1: Write `supabase/seed_first_admin.example.sql`**

```sql
-- seed_first_admin.example.sql — RUN ONCE, BY HAND, in the Supabase SQL editor.
-- The SQL editor executes as an elevated role that BYPASSES RLS, so this
-- insert succeeds even though staff_insert normally requires an existing admin.
--
-- Prerequisite: create your own staff login first
--   (Dashboard → Authentication → Users → Add user, or via the app's sign-up),
-- then replace the email below with that account's email and run this.

insert into public.staff (id, role, full_name)
select u.id, 'admin', coalesce(u.raw_user_meta_data->>'full_name', u.email)
from auth.users u
where u.email = 'YOUR_ADMIN_EMAIL@example.com'
on conflict (id) do update set role = excluded.role;

-- Confirm it landed:
--   select s.role, u.email from public.staff s join auth.users u on u.id = s.id;
```

- [ ] **Step 2: Append the bootstrap + verification sections to `supabase/README.md`**

````markdown

## First-admin bootstrap (one time)

The `staff` table starts empty, and RLS only lets an existing **admin** add
staff — a chicken-and-egg. Break it in the SQL editor, which runs with a role
that bypasses RLS:

1. Create your staff login: Dashboard → Authentication → Users → Add user
   (or sign up through the app once it exists).
2. Open `seed_first_admin.example.sql`, replace `YOUR_ADMIN_EMAIL@example.com`
   with that account's email, and run it in the SQL editor.
3. Confirm: `select s.role, u.email from public.staff s join auth.users u on u.id = s.id;`
   — you should see your email with role `admin`.

Add further staff later either in the SQL editor or (once built) the app's
staff screen while logged in as an admin.

## Verify the migrations

After applying `0001` then `0002`, run each query in the SQL editor and check
the expected result.

```sql
-- 1) All six tables exist.
select table_name from information_schema.tables
where table_schema = 'public' order by 1;
-- Expect: allocations, attendees, meal_sessions, meal_tickets, rooms, staff
```

```sql
-- 2) RLS is enabled on all six.
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1;
-- Expect: relrowsecurity = true for every row.
```

```sql
-- 3) attendees has all spec §4 columns (expect 23 rows).
select column_name, data_type from information_schema.columns
where table_name = 'attendees' order by ordinal_position;
```

```sql
-- 4) CHECK constraints match the domain literals.
select conname, pg_get_constraintdef(oid) from pg_constraint
where contype = 'c' and connamespace = 'public'::regnamespace order by 1;
-- Expect checks for accommodation_choice, private_room_type, room_class,
-- gender_designation, meal_type, role, capacity>0, day>=1.
```

```sql
-- 5) Role helpers exist and are SECURITY DEFINER (prosecdef = true).
select proname, prosecdef from pg_proc
where proname in ('is_staff','is_admin') order by 1;
```

```sql
-- 6) Policies exist per table (expect the read/write matrix from 0002).
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' order by tablename, cmd, policyname;
```

```sql
-- 7) anon has no table privileges in public (expect zero rows).
select table_name, privilege_type from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';
```

Optional end-to-end check (needs two auth accounts — one seeded admin, one
non-staff): logged in as the non-staff user, `select * from attendees` must
return nothing / be denied; as the admin it must succeed. This proves RLS is
actually gating, not just enabled.
````

- [ ] **Step 3: Commit**

```bash
git add supabase/seed_first_admin.example.sql supabase/README.md
git commit -m "Add first-admin seed template + verification checklist (Plan 2 Task 4)"
```

---

## Self-Review (run after drafting — completed)

**1. Spec coverage (§4 + §2):**
- attendees table (§4) → Task 2, with every listed column; review/duplicate/location fields preserved (Global Constraints "surface, never fix"). ✓
- rooms, allocations, meal_sessions, meal_tickets, staff (§4) → Task 2. ✓
- RLS "readable/writable only by authenticated staff; admin imports/edits rooms/runs allocation; desk searches/marks arrived/marks meal collection; no anon" (§4) → Task 3 policy matrix + anon revoke. ✓ (Column-level desk-vs-admin restrictions on attendees are intentionally deferred as YAGNI — pragmatic RLS choice; noted so it isn't mistaken for a gap.)
- `import_batch` idempotency (§5.1) → schema-side support only: the RegID `text` PK + `import_batch`/`arrived`/allocation columns exist so a later upsert can avoid clobbering arrivals/allocations. Upsert logic itself is explicitly out of this plan. ✓
- §2 field meanings drive the column set and the "no CHECK on gender/state" decision. ✓
- Not in this plan (correct — later plans): Excel import UI, auth screens, allocation engine, any `src/` code. This plan is schema + RLS only, per the locked scope.

**2. Placeholder scan:** No "TBD"/"add validation"/"similar to Task N". `YOUR_ADMIN_EMAIL@example.com` is a deliberate user-edited seed value, documented as such — not a plan placeholder. All SQL is complete and runnable. ✓

**3. Type/name consistency:** `attendees.id text` ↔ `allocations.attendee_id text` ↔ `meal_tickets.attendee_id text` all agree; uuid FKs (`room_id`, `session_id`, `*_by`, `staff.id`) agree with their targets. CHECK literals match `src/domain/types.ts` exactly. `is_staff()`/`is_admin()` named identically in definition (Task 3) and verification (Task 4). Table names identical across Tasks 2–4. ✓
