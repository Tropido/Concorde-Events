# Rent for Events

Rent for Events is the event-rental brand of the company Concorde Events: the site, logo and messages use the brand, while quotes name Concorde Events as their legal issuer (`lib/brand.ts`).

Event-furniture rental platform for Tunisia. Every price, quote and total is in Tunisian dinars (TND). French is the default language and the source of truth, with English and Arabic (RTL). It has three parts:

- a public catalogue with per-date availability, quote requests and a private tracking link for guests;
- a client area (`/account`), with a pro space (`/account/pro`) for professionals;
- an operations back office (`/admin`): quotes, payments, invoices, returns and clients.

There are three customer types. A **Particulier** (and any visitor) sees no prices: the price arrives in the quote. A **Particulier+** sees the public prices once staff approve the account. A **Professionnel** gets pro prices and the loyalty programme. The site has a light and a dark theme (`ce_theme` cookie: light, dark or the device setting).

**Stack:** Next.js 15 App Router, TypeScript, Tailwind, and Supabase (Postgres, Auth, Storage, RLS). PDFs come from `@react-pdf/renderer`, emails from Resend with React Email. It is deployed on Vercel.

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
| `SUPABASE_SECRET_KEY` | server, tests | Server-only and **required in production**: emails, stored invoices, tracking links and password reset links. Also used by the integration and e2e suites. |
| `NEXT_PUBLIC_SITE_URL` | all | Public address of the site, used in email links |
| `RESEND_API_KEY` | server | Without it, emails are recorded as `skipped` and nothing is sent. |
| `EMAIL_FROM`, `EMAIL_REPLY_TO` | server | Sender and reply address. The domain must be verified in Resend. |
| `STAFF_NOTIFY_EMAIL` | server | Receives notices for new requests, accepted quotes, payments and returns |
| `CRON_SECRET` | server | Protects `/api/cron/emails`. Any long random string. |
| `TRACKING_TOKEN_SECRET` | server | Derives guest tracking links. Changing it invalidates the links already sent. |
| `SUPABASE_DB_URL` | `.env.test.local` | Connection string for `npm run db:push` |
| `TEST_PROJECT_REF` | `.env.test.local` | The integration and e2e suites refuse to run against any other project. |

If the Supabase variables are missing, the app shows a "service unavailable" page. There is no mock data and no demo mode.

## Database

The migrations live in `supabase/migrations`. Apply them with the bundled CLI; no Docker is needed:

```bash
npm run db:push                     # applies pending migrations to SUPABASE_DB_URL
npm run db:push -- --include-seed   # TEST project only: dev catalogue fixtures
npm run db:catalogue                # TEST project only: provisional luxury catalogue (supabase/data/catalogue-luxe.sql)
```

`db:catalogue` refuses any database other than `TEST_PROJECT_REF`. The file is idempotent by slug (run it again to update the same rows); its prices, stock and Unsplash photos are provisional and say so in each product's internal notes.

- **Never** seed production. `supabase/seed.sql` contains placeholder prices and stock.
- Production starts empty, and staff enter the approved catalogue in `/admin/inventory`.
- Back up production before migrating, and prefer additive migrations.
- `20261025120000_tnd_pro_programme_products.sql` makes the system TND-only (it cancels open France requests and removes France stock and prices), adds the pro programme and the detailed product fields.
- `20261025120100_catalogue_cleanup.sql` retires the English demo items and the screenshot items, and strips their images. A retired piece is hidden, not deleted: upload real photos in `/admin/inventory` and set it back online.
- 2026-10-26 migrations, applied in this order by `npm run db:push`:
  - `20261026090000_product_image_fit.sql`: `products.image_fit` (`contain` cut-out, default, or `cover` ambiance photo).
  - `20261026100000_customer_plus_role.sql`: the `customer_plus` role (alone, because a new enum value can't be used in the transaction that adds it).
  - `20261026100100_customer_types.sql`: who reads prices (`private.can_see_retail`), signup with three types and an optional event type, existing approved customers become Particulier+.
  - `20261026100200_anon_prices_empty.sql`: keeps the visitors' price query returning an empty list (RLS) instead of an error.
- 2026-11-01 migrations, applied in this order by `npm run db:push`:
  - `20261101100000_english.sql`: English text columns, and `en` as a language for clients and CMS.
  - `20261101110000_landing.sql`: category icons and tones, and the public `site-images` bucket for photos such as the hero banner.
  - `20261101120000_client_tags.sql`: custom client labels (existing `client_notes.flags` are carried over).
  - `20261101125900_function_privileges.sql`: new functions are no longer executable by everyone by default.
  - `20261101130000_request_status_values.sql`: the `accepted` and `returned` statuses (alone, for the same enum reason as above).
  - `20261101130100_company_settings.sql`: legal identity, VAT, stamp duty, deposit settings, request extras, staff audit.
  - `20261101130200_order_pipeline.sql`: quote acceptance, payments, tracking links.
  - `20261101130300_invoices.sql`: immutable invoices, gapless numbering, credit notes.
  - `20261101130400_email_events.sql`: the email log.
  - `20261101140000_returns_inspection.sql`: unit-by-unit inspection, stock ledger, final invoice. Removes `return_request`.
  - `20261101150000_password_reset.sql`: password help by phone number.
- Private buckets added on 2026-11-01: `payment-proofs`, `documents` (stored invoice PDFs), `inspection-photos`. `site-images` stays public. The migrations create them.
- Once the 2026-11-01 migrations are on a project, the app version running against it must include them: `return_request` is gone and confirming by hand is refused, so an older deployment can no longer confirm an order or record a return.
- After a migration, open the home page and `/catalogue` signed out: an error there means the storefront's queries broke.
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
- **Email OTP expiry:** 3600 seconds. Staff-sent reset links state one hour, and `RESET_LINK_MINUTES` in `lib/password-reset.ts` must match.
- **Email confirmation:** enabled.
- **SMTP:** set up custom SMTP before launch. The built-in sender is rate-limited and meant for testing.

### Company settings

Fill in `/admin/settings` before taking orders. A client can't accept a quote until the legal name and matricule fiscal are there, because accepting issues the deposit invoice.

### Emails

1. Verify the sending domain in Resend (SPF and DKIM records).
2. Set `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` and `STAFF_NOTIFY_EMAIL`.

Every step writes a row to `email_events` and sends after the database commit, so a provider outage never blocks an order. Without a key the rows are marked `skipped`.

### Cron

`vercel.json` calls `/api/cron/emails` once a day (07:00 UTC, the limit on the Hobby plan; Pro allows every 10 minutes). It retries failed emails with exponential backoff and sends quote and deposit reminders. Vercel sends `CRON_SECRET` as a bearer token, so without that variable the route answers 401 and nothing runs.

## Checks

```bash
npm run typecheck
npm run lint
npm test                    # unit + DB logic (in-process Postgres via PGlite, no credentials needed)
npm run test:integration    # hosted TEST project: Data API grants, Auth, Storage, real concurrency
npm run test:e2e            # Playwright against `next dev` + TEST project (npx playwright install chromium first)
npm run build
```

`tests/e2e/orders.spec.ts` runs real orders on the TEST project, on a throwaway product that it retires afterwards. Each run consumes invoice numbers and leaves invoices, payments and the users linked to them, because those rows are immutable. It also replaces the company settings for the length of the run.

## Deployment (Vercel)

- **Preview** environment variables point to the **test** Supabase project.
- **Production** points to the production project. It needs the two public variables, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `TRACKING_TOKEN_SECRET`, `CRON_SECRET` and the email variables.
- Pushing a branch creates a Preview deployment; merging to the production branch deploys Production.
