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
