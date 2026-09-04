# Conference Registration System

Internal web app for the NEMA South West Zonal Conference 2026. The app supports importing attendee spreadsheets, cleaning and flagging records, balancing room allocation by state and gender, tracking meals, and preparing for on-site mobile check-in.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase
- Vitest
- SheetJS for Excel import

## Project goals

- Import attendee Excel data
- Detect duplicates and data issues for human review
- Normalize locations and accommodation values
- Allocate rooms with balanced constraints
- Track meal registration and attendee status
- Support a mobile-friendly on-site check-in workflow

## Local development

```bash
npm install
npm run dev
```

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

## Security note

This project stores real attendee data and Supabase credentials locally only.

- Real Excel files are gitignored and must never be committed.
- Environment variables live in `.env` and are not checked into Git.
- Use synthetic test fixtures only in automated tests.

## Release checklist

1. Apply `supabase/migrations/0001_core_schema.sql`, then `0002_rls_policies.sql`, then `0003_allocation_preferences.sql`.
2. Create `.env` from `.env.example` and add the Supabase URL and anon key.
3. Create the first admin with `supabase/seed_first_admin.example.sql`.
4. Run `npm test` and `npm run build`.
5. Deploy the Vite output to Vercel and set the same `VITE_SUPABASE_*` variables there.

The app is ready for a GitHub/Vercel connection, but the repository and deployment
URLs are intentionally environment-specific and are not stored in this project.

### Vercel deployment

Import the repository into Vercel as a Vite project. Use the default build settings:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Vercel Project Settings →
Environment Variables for Preview and Production. The included `vercel.json` keeps
direct navigation to routes such as `/dashboard`, `/checkin`, and `/allocations` working.

## Repository conventions

- Domain logic is kept in `src/domain/` and should remain deterministic.
- Feature screens live under `src/features/`.
- Supabase schema and RLS policies live under `supabase/`.

## License

This project is for internal conference operations and is not intended for public redistribution without approval.
