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

## Repository conventions

- Domain logic is kept in `src/domain/` and should remain deterministic.
- Feature screens live under `src/features/`.
- Supabase schema and RLS policies live under `supabase/`.

## License

This project is for internal conference operations and is not intended for public redistribution without approval.
