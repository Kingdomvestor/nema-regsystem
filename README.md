# Conference Registration System

## About Me

I’m a software developer focused on building practical, user-friendly tools for real-world operations. This project reflects my interest in solving messy data problems, improving workflows, and creating systems that are clear, secure, and reliable under pressure.

I enjoy working at the intersection of product thinking, data quality, and clean software architecture. In this project, I designed a conference registration system that handles spreadsheet imports, data cleanup, attendance tracking, room allocation, and event operations with a strong emphasis on privacy and human review.

Conference registration and room allocation are difficult to manage when attendee data arrives in inconsistent spreadsheets and operations need to remain accurate under time pressure. This project builds a structured system for importing attendee records, cleaning and flagging bad data, normalizing locations and accommodation details, and balancing room assignments by state and gender. The app also supports meal tracking and mobile-friendly on-site check-in to keep event operations organized. It is built with React, TypeScript, Vite, Supabase, and SheetJS so the process remains fast, transparent, and easy to extend. I learned that strong data validation and clear separation between domain logic and UI are critical when working with messy imported records. I also learned that protecting privacy and designing for human review rather than silent fixes is essential in a real-world event environment.

## Overview

This is an internal web app for the NEMA South West Zonal Conference 2026. It is designed to support the full event workflow from spreadsheet import to room assignment and on-site check-in, while keeping attendee information secure and reviewable.

## Features

- Import attendee data from Excel workbooks
- Detect duplicates, noisy location values, and accommodation contradictions
- Normalize location and accommodation fields for consistent processing
- Flag records for human review instead of silently altering them
- Balance room allocations by state and gender requirements
- Track meal registration and attendee status
- Support mobile-friendly on-site check-in workflows

## How it works

1. Upload a conference attendee workbook.
2. Validate and clean imported records in the domain layer.
3. Review flagged entries before finalizing the import.
4. Allocate rooms using attendee and room constraints.
5. Manage meals and attendee status as the event proceeds.
6. Use the mobile check-in flow for faster on-site verification.

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

## Project status

This project is currently in active development as an internal operations tool for a live conference workflow. The core import, normalization, and allocation flows are being built first, with attendee, meals, and check-in screens to follow as the event operations become more mature.

## Architecture

The system is split into a React + TypeScript frontend and a Supabase-backed data layer, with domain logic kept separate from the UI to keep the business rules deterministic and testable.

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Domain logic: pure functions in `src/domain/` for parsing, normalization, duplication checks, and allocation rules
- Data layer: Supabase for persistence, authentication, and row-level security
- Import workflow: Excel ingestion through SheetJS with validation and review before commit
- Event workflows: attendees, rooms, allocations, meals, and on-site check-in

## Screenshots

The interfaces are designed around a dark operational dashboard with high-contrast status cards and compact review tables. The screens below reflect the current UI direction for attendees, meals, allocation preview, and room management.

![Attendee dashboard](docs/assets/attendees-dashboard.png)

![Meal sessions](docs/assets/meals-dashboard.png)

![Allocation preview](docs/assets/allocation-preview.png)

![Rooms management](docs/assets/rooms-dashboard.png)

> If the screenshots are not yet exported into the repo, add them to a `docs/assets/` folder and keep the filenames consistent with the paths above.

## Demo flow

1. Import attendee data from an Excel workbook.
2. Review duplicates, invalid records, and normalization issues.
3. Confirm cleaned data before final import.
4. Allocate rooms based on room capacity and attendee constraints.
5. Manage meals and attendance state during the event.
6. Check in attendees on-site using the mobile-friendly operational view.

## Known limitations

- Real attendee data and production secrets are intentionally excluded from the repo.
- The app is currently focused on internal conference operations rather than general-purpose event management.
- The workflow assumes human review for conflicting or low-confidence records before final acceptance.
- Some screens are still in active development and may evolve as the event requirements are finalized.

## Local development

Clone the repository and install dependencies:

```bash
npm install
```

Start the development server:

```bash
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

## Environment setup

Create a `.env` file in the project root using the format documented in `.env.example` and add your Supabase configuration values.

```bash
cp .env.example .env
```

Then add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Security and privacy

This project handles attendee information and should be treated as a sensitive operational system.

- Real Excel files are gitignored and must never be committed.
- Supabase keys live in `.env` and are not checked into version control.
- Synthetic fixtures are used for tests and local validation.
- Invalid or conflicting records are flagged for human review instead of silently corrected.

## Roadmap

- Complete import and data-cleaning core
- Add attendee review and edit flows
- Finalize room allocation rules and warnings
- Implement meal registration workflows
- Build real-time on-site check-in support
- Connect the app to production Supabase and deploy to Vercel

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
