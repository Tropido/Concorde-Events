# Concorde Events: specification and status

This file describes the implemented system. It replaces the original prototype spec, which described mock data, a role simulator and a mock fallback. None of those exist any more.

## Structure

| Area | Routes | Notes |
|---|---|---|
| Public | `/`, `/catalogue`, `/catalogue/[slug]`, `/about`, `/contact` | FR/AR, stock-country and currency selectors (cookies, rendered on the server) |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/confirm` | One Supabase identity for clients and staff |
| Client | `/account`, `/account/favourites`, `/account/messages`, `/account/tools`, `/account/profile` | Pending, rejected and suspended accounts each get their own screen |
| Quote | `/quote/[id]` | Frozen snapshot; browser print / save as PDF. It is **not** an invoice. |
| Admin | `/admin/login`, `/admin`, `/admin/{requests,inbox,inventory,rentals,clients,analytics,cms,settings}` | Own layout. Each page and server action re-checks the role. |
| Legacy | `/dashboard` | Redirects to `/account` or `/admin` |

Authorization works in layers:

1. Postgres RLS and grants. The final grants migration is fail-closed.
2. Database guard triggers on profiles, requests, lines and quotes.
3. Server checks (`requireStaff` / `assertStaff`).

The middleware only refreshes sessions and redirects anonymous visitors.

## Permission matrix

| Capability | Visitor | Customer | Pending pro | Approved pro | Editor | Manager | Admin |
|---|---|---|---|---|---|---|---|
| Browse catalogue, retail prices | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pro prices, margin calculator | | | | ✓ | | ✓ (prices) | ✓ (prices) |
| Submit request / contact form | ✓ | ✓ | ✓ (retail tier) | ✓ (pro tier) | ✓ | ✓ | ✓ |
| Own requests, quotes, messages, favourites | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CMS (homepage content) | | | | | ✓ | ✓ | ✓ |
| Requests, quotes, rentals, inbox, stock, products | | | | | | ✓ | ✓ |
| Approve / reject / suspend clients | | | | | | ✓ (not staff accounts) | ✓ |
| Prices, roles, FX override | | | | | | | ✓ |

Staff notes (`client_notes`) are never readable by the client they describe. The last approved admin cannot be demoted.

## Business rules

### Confirmed by the owner

- France and Tunisia have **separate stock**. The stock country selects the stock and the base price; the currency only changes how that price is displayed.
- Rentals are billed in **nights**: calendar-date difference, so 15 → 18 is 3 nights.
- **No same-day rentals.** Stock is occupied from the start date **through the end date** (the return day is blocked).
- Base prices are fixed: **TND for Tunisia, EUR for France**. The other currency is derived from the EUR→TND rate: EUR→TND multiplies, TND→EUR divides. The source price is never overwritten.
- Issued quotes freeze the country, tier, source and converted prices, rate and provenance, dates, line totals and total.
- Stock is held from **quote validation** (`validated`, while the quote is valid), then while `confirmed` and `dispatched`.
- **Retail prices are public.** Pro prices are visible only to approved pros and staff, enforced by RLS on separate price rows.
- Customers are active once their email is confirmed. Professionals stay pending until staff approve them.
- WhatsApp: `wa.me/21623040424`. There is no Cloud API. The app records "client opened the link" separately from "staff confirmed contact".

### Provisional (to confirm with the client)

Each value is a constant in SQL or TypeScript.

| Rule | Current value | Where |
|---|---|---|
| Quote validity | 14 days (staff can choose 1–90) | `issue_quote` default |
| FX provider | open.er-api.com, daily, with attribution | `lib/fx.ts` |
| FX staleness | 72 h, measured from the provider's own timestamp | `private.current_rate()` |
| Manual FX override | Admin only, with an expiry, audited | `fx_rates` |
| FX safety | Refuse a jump of more than 10%; rate must be between 1 and 10 | `lib/fx.ts`, `fx_rates` check |
| Rounding | Convert the unit price, round it (EUR 2 dp, TND 3 dp), then multiply by quantity × nights; total = Σ lines | `private.convert()`, `issue_quote` |
| Guest requests | Allowed; 5 per email per hour, plus a honeypot | `submit_request` |
| Turnaround buffer | None beyond the blocked return day | capacity trigger |

### Not in scope or deferred

- **Invoices:** quotes are explicitly labelled as not invoices. Issuing invoices needs the legal identity, tax, numbering and deposit rules.
- Reward points, benefits and pro tiers. The prototype UI had them, but there is no business rule.
- WhatsApp Cloud API.
- URL-based locale (`/ar/...`) for SEO.
- Per-IP throttling or bot detection.

## Request status machine

`submitted → validated → confirmed → dispatched → completed`

Exits: `rejected`, and `cancelled` from submitted, validated or confirmed.

- `validated` is set only by `issue_quote`.
- `completed` is set only by `return_request`, which is idempotent and sends damaged units to maintenance.
- Rescheduling a validated request returns it to `submitted`; the quote must be re-issued.
- Confirming requires an unexpired quote.
- A client can cancel their own submitted or validated request.

The capacity invariant is one deferred constraint trigger with a per-country advisory lock. For every day, committed units ≤ owned − maintenance. Damage is always recorded, and resulting conflicts are listed on `/admin`.

## Progress checklist

- [x] Tooling: Next 15.5.27 (security backport), ESLint, Vitest, Playwright, Supabase CLI
- [x] Schema, RLS, grants, triggers and RPCs (5 migrations) and dev seed
- [x] DB logic tests (PGlite): permissions, capacity, status machine, returns, pricing/FX
- [x] Auth (signup / confirm / login / reset / logout), middleware, server guards
- [x] Public site on real data: availability, draft lines, persisted requests, contact
- [x] Client area, quote documents (escaped rendering test)
- [x] Admin back office, FX cron
- [x] Security review of the full branch; findings fixed with regression tests
- [x] FR/AR dictionaries with type-enforced parity, RTL logical classes, native dialogs, reduced motion, image optimization
- [ ] Apply migrations to the TEST project and run `test:integration` + `test:e2e` (needs `.env.local` / `.env.test.local`)
- [ ] Vercel Preview env → TEST project; Supabase Auth URLs and templates; verify Preview
- [ ] Production project, SMTP, first admin, approved catalogue → merge and verify production

## Known limitations

- The Arabic copy was written by the developer and should be reviewed by a native speaker. Product and CMS text in Arabic is entered by staff; when it is missing, French is shown.
- Locale is cookie-based, so search engines index the French version only.
- Browser print is the PDF mechanism. There is no server-side PDF generation.
- `npm audit --omit=dev` reports 0 vulnerabilities.
- The full audit reports 9 findings, all in build and lint tooling that only processes this repository's own files:
  - Tailwind 3, via chokidar/braces and postcss-selector-parser;
  - eslint-config-next, via micromatch.
