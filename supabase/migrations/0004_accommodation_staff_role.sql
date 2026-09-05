-- 0004_accommodation_staff_role.sql
-- Adds a role for staff who manage rooms and accommodation allocation.

alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff add constraint staff_role_check
  check (role in ('admin', 'desk', 'accommodation'));

create or replace function public.is_accommodation_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.staff s
    where s.id = auth.uid() and s.role in ('admin', 'accommodation')
  );
$$;

revoke all on function public.is_accommodation_staff() from public;
grant execute on function public.is_accommodation_staff() to authenticated;

drop policy if exists rooms_admin_write on public.rooms;
drop policy if exists rooms_accommodation_write on public.rooms;
create policy rooms_accommodation_write on public.rooms
  for all to authenticated
  using (public.is_accommodation_staff())
  with check (public.is_accommodation_staff());

drop policy if exists allocations_admin_write on public.allocations;
drop policy if exists allocations_accommodation_write on public.allocations;
create policy allocations_accommodation_write on public.allocations
  for all to authenticated
  using (public.is_accommodation_staff())
  with check (public.is_accommodation_staff());
