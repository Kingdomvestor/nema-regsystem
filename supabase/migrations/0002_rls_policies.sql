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
