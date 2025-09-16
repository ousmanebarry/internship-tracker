# Internship Tracker

A full-stack project to discover, scrape, and browse internship opportunities, with a resume-based matcher and a standalone browse mode. The repository contains:

- `web/`: Next.js app (TypeScript) for the user interface and API routes
- `scraper/`: Python-based scrapers and utilities for collecting internship data

## Features

- Resume analysis and keyword extraction to compute internship match scores
- Match filtering to hide internships with match score ≤ 50%
- Sorting and pagination of matched internships
- Browse All Internships mode (no resume required) with:
  - Search by company, role/title, and location
  - Sort by date (newest/oldest)
  - Pagination (50 per page)
- Live internship stats surfaced in the UI
- Next.js API route for fetching internships from Postgres

## Project Structure

```
internship-tracker/
  README.md                ← You are here
  scraper/                 ← Python scrapers, DB, logs, utilities
    requirements.txt
    run_scraper.py
    fast_scraper.py
    super_fast_batch.py
    internships.db         ← (If using SQLite locally)
    ...
  web/                     ← Next.js 15 app (TypeScript)
    src/app/               ← App Router pages and API routes
      api/
        analyze-pdf/route.ts      ← Resume analysis endpoint
        internships/route.ts      ← Internships API backed by Postgres
        scraper/run/route.ts      ← (Optional) Scraper trigger endpoint
    ...
    migrate-to-postgres.js  ← Data migration helper
    package.json
```

## Prerequisites

- Node.js 18+ (or the version supported by Next.js 15)
- npm (or pnpm/yarn)
- Python 3.9+
- Postgres database (managed or local)

## Environment Variables (web)

Create `web/.env` with:

```
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME
```

- SSL is enabled in the API route; for local Postgres without SSL, you may remove/adjust the SSL config in `web/src/app/api/internships/route.ts`.

## Quickstart

1. Clone and install

```
git clone https://github.com/your-user/internship-tracker.git
cd internship-tracker/web
npm install
```

2. Configure environment

```
# web/.env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/internships
# Examples:
# - Local with passwordless auth: DATABASE_URL=postgres://localhost:5432/internships
# - Cloud (Render, Supabase, Neon): use the full connection string they provide
```

3. Run the app

```
npm run dev
# open http://localhost:3000
```

## Getting Started (Web)

1. Install dependencies

```
cd web
npm install
```

2. Run the dev server

```
npm run dev
```

3. Build for production

```
npm run build
npm run start
```

## Key Web App Flows

- Resume Analysis Flow

  - Upload a PDF resume
  - The app extracts keywords and computes a match score for each internship
  - Results are filtered to only show items with match score > 50%
  - Supports sorting (date/match), pagination, and keyword chips display

- Browse All Internships Flow
  - No resume required
  - Search by company, role/title, and location (case-insensitive, combined with AND logic)
  - Sort by date (newest/oldest)
  - Paginated list (50 per page)
  - One-click navigation back to Resume Analysis

## API Endpoints (Web)

- `GET /api/internships`

  - Query params:
    - `page` (default: 1)
    - `limit` (default: 50)
    - `active` (true/false)
    - `season`, `sponsorship` (optional filters)
  - Returns `{ internships: ProcessedInternship[], pagination: {...} }`

- `POST /api/analyze-pdf`
  - Accepts a PDF file (`multipart/form-data`)
  - Returns `{ text, keywords }`

## Data & Database

- The internships API reads from Postgres. Each record is transformed in `web/src/app/api/internships/route.ts` to a uniform shape expected by the UI.
- The `scraper/` folder also contains an `internships.db` (SQLite) used by some workflows. You can migrate data to Postgres using `web/migrate-to-postgres.js` as needed.

## Scraper (Python)

The `scraper/` directory includes multiple scripts and utilities for collecting internship data.

1. Set up a Python virtual environment and install dependencies:

```
cd scraper
python -m venv .venv
. .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. Run a scraper (examples):

```
python run_scraper.py
# or
python fast_scraper.py
```

3. Inspect data:

```
python view_data.py
```

Depending on your pipeline, you can export or migrate this data into Postgres for the web app to consume.

## Development Notes

- The UI is built with modern, accessible components and supports responsive layouts
- Search is performed client-side with debounced, case-insensitive includes matches
- Match threshold is enforced in resume-based results (> 50%)
- Pagination is 50 items/page across the app
- Browse mode and resume mode are separate views with appropriate UI elements in each

## Deployment

- The `web/` app can be deployed to platforms that support Next.js 15 (e.g., Vercel)
- Ensure `DATABASE_URL` is configured in the environment
- If deploying with Vercel, check `web/vercel.json` for any headers or configuration

## Scripts (web)

```
npm run dev     # Start Next.js dev server
npm run build   # Production build (Turbopack)
npm run start   # Start production server
```

## Screenshots

![Resume Analysis](web/public/screenshots/home-analysis-1.png)
![Resume Analysis](web/public/screenshots/home-analysis-2.png)
**Home (Resume Analysis)**

![Browse All](web/public/screenshots/browse-all.png)
**Browse All Internships**

## Demo

![Demo](web/public/demo/internship-tracker-demo.gif)
