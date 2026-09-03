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
