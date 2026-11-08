# Slotted

Slotted is a calm, honest auto-scheduler for people who do not want to manually plan every hour.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- FastAPI + Python
- Supabase Auth and Postgres

## Developer setup

1. Install Node.js 20+ and Python 3.14.
2. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and anon key.
3. Create a Supabase project. In the SQL editor, run [`supabase/migrations/0001_initial.sql`](./supabase/migrations/0001_initial.sql), then [`supabase/migrations/0002_task_dump.sql`](./supabase/migrations/0002_task_dump.sql), and finally [`supabase/migrations/0003_default_availability.sql`](./supabase/migrations/0003_default_availability.sql). The third migration creates a 09:00–17:00 Monday–Friday starting profile for existing and new users; users can change it from Settings.
4. Configure Supabase Auth with email/password and Google OAuth:
   - In Google Cloud Console, create/select a project and open
     `APIs & Services` → `Credentials` → `Create credentials` → `OAuth client ID`.
   - Configure the OAuth consent screen first if Google asks you to do so. For local development,
     choose `External`, add your email under Test users, and use the app name `Slotted`.
   - Set the Google OAuth application type to `Web application`.
   - In Supabase Dashboard, open `Authentication` → `Providers` → `Google`, enable it, and copy
     the Google Client ID and Client Secret into the provider fields.
   - Copy Supabase's `Callback URL (for OAuth)` from that provider screen into Google Cloud's
     `Authorized redirect URIs`. It will look like
     `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
   - In Supabase `Authentication` → `URL Configuration`, set the Site URL to
     `http://localhost:3000` and add `http://localhost:3000/auth/callback` under Redirect URLs.
     Add the production site and its `/auth/callback` URL later.
   - Save the provider, then use the `Continue with Google` button on `/auth/sign-in` or
     `/auth/sign-up`.
5. Install frontend dependencies with `npm install`, then run `npm run dev`.
   Keep the service-role key server-side only. The FastAPI process also needs
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in its environment. In Command Prompt:
   ```cmd
   set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ```
   Do not add either value to `NEXT_PUBLIC_*` variables or browser code.
6. Install backend dependencies from an activated Python 3.14 virtual environment:
   ```cmd
   cd /d D:\Planning_App
   py -3.14 -m venv .venv
   call .venv\Scripts\activate
   python -m pip install --upgrade pip
   python -m pip install -r backend\requirements.txt
   ```
   Then run the API with:
   ```cmd
   python -m uvicorn app.main:app --reload --app-dir backend
   ```
   The API allows local frontend requests from `http://localhost:3000` and
   `http://localhost:3001`. Restart Uvicorn after backend code changes.
   Run the backend tests with:
   ```cmd
   set PYTHONPATH=backend
   python -m pytest backend\tests
   ```
7. Keep the service-role key server-side only. Never expose it in `NEXT_PUBLIC_*` variables.

## Build order

1. Schema and RLS migration.
2. Scheduler unit tests and deterministic placement engine.
3. Supabase auth middleware and API persistence.
4. Task and availability endpoints, then meeting endpoints.
5. Today and Dump flows.
6. Week, Backlog, and Habit flows.
7. Rebalancing cron every 15 minutes.
8. Production SEO, analytics consent, accessibility, and deployment checks.

## Supabase work you must do

- Create the project and apply the migration.
- Enable the chosen Auth provider.
- Add the local and production URLs under Auth URL Configuration.
- Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` to the appropriate environments.
- Verify RLS with two test users: each user must be unable to read or mutate the other user's rows.
- Configure a scheduled worker for the 15-minute rebalance. It should call a protected backend job endpoint; do not put the service-role key in browser code.

## SEO baseline

The public landing page uses server-rendered semantic HTML, title/description metadata, Open Graph metadata, an OG image, `robots.txt`, and `sitemap.xml`. Authenticated `/app/*` routes must remain disallowed from indexing. Future public pages should target one search intent each and include unique metadata, canonical URLs, FAQ/HowTo structured data only where the visible page supports it, fast mobile rendering, and descriptive alt text.