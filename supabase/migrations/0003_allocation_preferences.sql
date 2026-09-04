-- 0003_allocation_preferences.sql
-- Adds explicit attendee preferences used by the allocation workflow.
-- Apply after 0002_rls_policies.sql.

alter table public.attendees
  add column if not exists together_group text,
  add column if not exists accessibility_required boolean not null default false;

create index if not exists attendees_together_group_idx
  on public.attendees (together_group)
  where together_group is not null;