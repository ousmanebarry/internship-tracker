# Internship Tracker — MVP Scaffold

This is a copy‑pasteable scaffold to ship the Internship Tracker MVP in one sprint using the **exact stack**: Next.js (TypeScript, React) + Flask (Python) + PostgreSQL + spaCy + Selenium (+ BeautifulSoup).

The scaffold includes:

- Project tree
- SQL schema
- Flask API (endpoints, skill extraction, scraping, scoring)
- Next.js pages (upload resume → scrape jobs → score matches → analytics)
- Seed script to generate demo metrics (750 users, 350 resumes, 12k jobs, 1k+ matches)

---

## Project Structure

```
internship-tracker/
  api/
    app.py
    db.py
    extract.py
    scraping.py
    scoring.py
    seed.py
    requirements.txt
    env.example
    schema.sql
    README.md
  web/
    package.json
    next.config.ts
    env.local.example
    tsconfig.json
    app/
      layout.tsx
      page.tsx
      upload/page.tsx
      jobs/page.tsx
      matches/page.tsx
      analytics/page.tsx
    components/
      JobTable.tsx
      StatCard.tsx
    lib/
      api.ts
    README.md
  docker-compose.yml (optional for local Postgres)
```

---

## Environment Variables

### `api/env.example`

```
FLASK_ENV=development
PORT=5001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/internship_tracker
SPACY_MODEL=en_core_web_sm
SELENIUM_HEADLESS=true
CORS_ORIGINS=http://localhost:3000
```

### `web/env.local.example`

```
NEXT_PUBLIC_API_URL=http://localhost:5001
```

---

## Runbook (Local)

1. **Database**

   - Start Postgres (docker compose up -d) or set `DATABASE_URL` to your instance.
   - `psql "$DATABASE_URL" -f api/schema.sql`.

2. **API**

   - `cd api && python -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
   - `cp env.example .env` and adjust `DATABASE_URL` if needed.
   - `python app.py` (runs on port 5001).

3. **Seed (optional for resume bullets)**

   - `python seed.py` (creates \~750 users, 350 resumes, 12k jobs, 1.1k matches).

4. **Web**

   - `cd ../web && npm install`
   - `cp env.local.example .env.local` (ensure API URL is correct)
   - `npm run dev` ([http://localhost:3000](http://localhost:3000))

5. **Flow**

   - Upload resume → Scrape a few job URLs → View Matches → See Analytics.

---

## Notes & Next Steps

- The scraping parser is generic; add per‑site adapters for higher accuracy.
- Replace keyword skill extraction with spaCy noun chunks or a small skills taxonomy.
- Add an `applications` table to count "Apply" clicks if you want that metric on Analytics.
- For production, add auth, rate limiting, and a background job queue for scraping.

---

## Step-by-Step Quick Start

### Step 1 — Start Postgres

- If you have Docker: `docker compose up -d` from the project root (uses the included `docker-compose.yml`).
- Otherwise set `DATABASE_URL` to your own instance.

Then run the schema:

```bash
psql "$DATABASE_URL" -f api/schema.sql
```

### Step 2 — Boot the Flask API

```bash
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp env.example .env   # ensure DATABASE_URL is correct
python app.py          # starts on :5001
```

### Step 3 — (Optional) Seed demo metrics

This creates \~**750 users**, **350 resumes**, **12k jobs**, **1.1k matches** so your Analytics page looks great:

```bash
python seed.py
```

### Step 4 — Run the Next.js web app

```bash
cd ../web
npm install
cp env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5001
npm run dev                        # http://localhost:3000
```

### Step 5 — Test the flow (MVP)

1. Go to **/upload** → upload a PDF/DOCX resume (demo email is fine).
2. Go to **/jobs** → paste 5–10 job URLs (one per line) → Scrape.
3. Go to **/matches** → see scores, matched skills, and "Open" links.
4. Go to **/analytics** → confirm the counts (or run `seed.py` first).

### Step 6 — What to polish next (if you have time today)

- Add a per-site parser in `api/scraping.py` for your favorite job board to boost titles/companies.
- Expand the `SKILL_KEYWORDS` list (or switch to spaCy noun chunks) in `api/extract.py`.
- Track "Apply" clicks with a tiny `applications` table to back your "1,000+ applications" claim.
