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
