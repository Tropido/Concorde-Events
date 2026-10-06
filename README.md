# Concorde Events

Event-furniture rental platform for France and Tunisia. It has three parts:

- a public catalogue with per-date availability and quote requests;
- a client area (`/account`);
- an operations back office (`/admin`).

**Stack:** Next.js 15 App Router, TypeScript, Tailwind, and Supabase (Postgres, Auth, Storage, RLS). It is deployed on Vercel.

`PROJECT_SPEC.md` covers the business rules, permissions and progress.

## Setup

```bash
npm install
cp .env.example .env.local        # app: URL + publishable key of the TEST project
cp .env.example .env.test.local   # tests/migrations: secret key, DB URL, TEST_PROJECT_REF
npm run dev
```

All `.env*` files except `.env.example` are git-ignored. Never commit keys.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | all | Public key. RLS protects the data. |
| `SUPABASE_SECRET_KEY` | Production (cron), tests | Server-only. Used only by `/api/cron/fx` and the test suites. |
| `CRON_SECRET` | Production | Vercel sends it as a bearer token to the FX cron. |
| `SUPABASE_DB_URL` | `.env.test.local` | Connection string for `npm run db:push` |
| `TEST_PROJECT_REF` | `.env.test.local` | The integration and e2e suites refuse to run against any other project. |

If the Supabase variables are missing, the app shows a "service unavailable" page. There is no mock data and no demo mode.

## Database

The migrations live in `supabase/migrations`. Apply them with the bundled CLI; no Docker is needed:

```bash
npm run db:push                     # applies pending migrations to SUPABASE_DB_URL
npm run db:push -- --include-seed   # TEST project only: dev catalogue fixtures
```

- **Never** seed production. `supabase/seed.sql` contains placeholder prices and stock.
- Production starts empty, and staff enter the approved catalogue in `/admin/inventory`.
- Back up production before migrating, and prefer additive migrations.
- Rolling back the app on Vercel does not undo database changes.

### First administrator

There is deliberately no promotion endpoint. Run this once in the Supabase SQL editor, after the person has signed up and confirmed their email:

```sql
update public.profiles set role = 'admin', status = 'approved' where email = 'client@example.com';
```

Admins then grant roles from `/admin/clients`.

### Supabase Auth settings

Set these per project in the Dashboard, under Authentication:

- **Site URL:** the deployment URL (for example `https://concorde-events.vercel.app`).
- **Redirect URLs:**
  - `http://localhost:3000/**`;
  - the Vercel preview pattern for the team (for example `https://*-<team-slug>.vercel.app/**`);
  - the production domain.
- **Email templates.** Use token-hash links so confirmation works on any device. `/auth/confirm` also accepts the default PKCE code links.
  - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account`
  - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
- **Email confirmation:** enabled.
- **SMTP:** set up custom SMTP before launch. The built-in sender is rate-limited and meant for testing.

## Checks

```bash
npm run typecheck
npm run lint
npm test                    # unit + DB logic (in-process Postgres via PGlite, no credentials needed)
npm run test:integration    # hosted TEST project: Data API grants, Auth, Storage, real concurrency
npm run test:e2e            # Playwright against `next dev` + TEST project (npx playwright install chromium first)
npm run build
```

## Deployment (Vercel)

- **Preview** environment variables point to the **test** Supabase project.
- **Production** points to the production project, and also needs `SUPABASE_SECRET_KEY` and `CRON_SECRET`.
- `vercel.json` schedules the daily exchange-rate refresh at `/api/cron/fx`.
- Pushing a branch creates a Preview deployment; merging to the production branch deploys Production.
