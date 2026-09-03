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
