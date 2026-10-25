# Concorde Events: specification and status

This file describes the implemented system. It replaces the original prototype spec, which described mock data, a role simulator and a mock fallback. None of those exist any more.

## Structure

| Area | Routes | Notes |
|---|---|---|
| Public | `/`, `/catalogue`, `/catalogue/[slug]`, `/demande`, `/professionnels`, `/about`, `/contact` | FR (default) / AR (RTL), language cookie rendered on the server. TND only. |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/confirm` | One Supabase identity for clients and staff |
| Client | `/account`, `/account/pro`, `/account/favourites`, `/account/messages`, `/account/profile` | Pending, rejected and suspended accounts each get their own screen. `/account/tools` redirects to `/account/pro`. |
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
| Pro prices, programme discount, points, margin calculator | | | | ✓ | | ✓ (prices) | ✓ (prices) |
| Submit request / contact form | ✓ | ✓ | ✓ (retail tier) | ✓ (pro tier) | ✓ | ✓ | ✓ |
| Own requests, quotes, messages, favourites | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CMS (homepage content) | | | | | ✓ | ✓ | ✓ |
| Requests, quotes, rentals, inbox, stock, products | | | | | | ✓ | ✓ |
| Approve / reject / suspend clients | | | | | | ✓ (not staff accounts) | ✓ |
| Manage a pro's programme (tier lock, negotiated discount, benefits, points) | | | | | | ✓ | ✓ |
| Product internal data (purchase cost, supplier, storage) | | | | | | ✓ | ✓ |
| Prices, roles, programme tiers | | | | | | | ✓ |

Staff notes (`client_notes`) are never readable by the client they describe. The last approved admin cannot be demoted.

## Business rules

### Confirmed by the owner

- The business is **Tunisia only, 100% TND**. Stock, prices and requests are TN rows only (enforced by check constraints). Historical France rows were cancelled or removed by the 2026-10-25 migration; quotes issued before it keep their frozen EUR snapshot and show the rate they used.
- Rentals are billed in **nights**: calendar-date difference, so 15 → 18 is 3 nights.
- **No same-day rentals.** Stock is occupied from the start date **through the end date** (the return day is blocked).
- Prices are nightly rates in TND. Amounts show as whole dinars ("1 250 DT") or with three millime digits ("7 064,850 DT"), with Latin digits in both languages.
- Issued quotes freeze the tier, programme discount, event details, unit prices, dates, line totals and total.
- Stock is held from **quote validation** (`validated`, while the quote is valid), then while `confirmed` and `dispatched`.
- **Retail prices are public.** Pro prices are visible only to approved pros and staff, enforced by RLS on separate price rows.
- Customers (particuliers) are active once their email is confirmed and pay the retail rate. Professionals stay pending until staff approve them; while pending they pay retail.
- Approved professionals pay the pro rate minus their programme discount (the tier's, or a negotiated one set by staff). A piece without a pro rate falls back to retail, still with the discount. The discount is frozen on the request at submission.
- WhatsApp: `wa.me/21623040424`. There is no Cloud API. The app records "client opened the link" separately from "staff confirmed contact".

### Provisional (to confirm with the client)

Each value is a constant in SQL or TypeScript.

| Rule | Current value | Where |
|---|---|---|
| Quote validity | 14 days (staff can choose 1–90) | `issue_quote` default |
| Pro tiers | Bronze 0 pts 0% · Argent 500 pts 3% · Or 1 500 pts 5% · Platine 4 000 pts 8% · Diamant 8 000 pts 10% · Royal Elite 15 000 pts 12%, each with cumulative benefits. Admins edit them in `/admin/settings`. | `pro_tiers` seed |
| Points | 1 point per 10 DT of a completed professional rental, credited when the return is recorded. Manual adjustments are logged with a reason the client sees. | `award_completion_points` trigger, `reward_events` |
| Tier changes | Automatic from points unless staff lock the tier | `private.apply_reward` |
| Rounding | Discounted unit price rounded to 3 dp (millimes), then × quantity × nights; total = Σ lines | `submit_request`, `issue_quote` |
| Deposit | Shown on the product page, settled off-site | `products.deposit_amount` |
| Guest requests | Allowed; 5 per email per hour, plus a honeypot | `submit_request` |
| Turnaround buffer | None beyond the blocked return day | capacity trigger |

### Not in scope or deferred

- **Invoices:** quotes are explicitly labelled as not invoices. Issuing invoices needs the legal identity, tax, numbering and deposit rules.
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

The capacity invariant is one deferred constraint trigger with a per-country advisory lock (only TN is used now). For every day, committed units ≤ owned − maintenance. Damage is always recorded, and resulting conflicts are listed on `/admin`.

## Progress checklist

- [x] Tooling: Next 15.5.27 (security backport), ESLint, Vitest, Playwright, Supabase CLI
- [x] Schema, RLS, grants, triggers and RPCs (5 migrations) and dev seed
- [x] DB logic tests (PGlite): permissions, capacity, status machine, returns, TND pricing, pro programme
- [x] Auth (signup / confirm / login / reset / logout), middleware, server guards
- [x] Public site on real data: availability, draft lines, persisted requests, contact
- [x] Client area, quote documents (escaped rendering test)
- [x] Admin back office
- [x] Security review of the full branch; findings fixed with regression tests
- [x] FR/AR dictionaries with type-enforced parity, RTL logical classes, native dialogs, reduced motion, image optimization
- [x] Migrations applied to the TEST project; `test:integration` 5/5, `test:e2e` 34/34, Supabase advisors clean (2026-10-06)
- [x] 2026-10-25: TND-only system, pro programme (tiers, points, discounts, benefits), detailed products with staff-only internal data, richer client approval (labels, rank, notes, programme), WhatsApp tickets, redesigned storefront and back office
- [x] 2026-10-25 migrations applied to the TEST project; `test:integration` 5/5, `test:e2e` 42/42
- [ ] Vercel Preview env → TEST project; Supabase Auth URLs and templates; verify Preview
- [ ] Production project, SMTP, first admin, approved catalogue → merge and verify production

## Known limitations

- The Arabic copy was written by the developer and should be reviewed by a native speaker. Product and CMS text in Arabic is entered by staff; when it is missing, French is shown.
- Locale is cookie-based, so search engines index the French version only.
- The unused `fx_rates` table and EUR enum value stay in the schema so pre-2026-10-25 quotes remain readable; nothing writes to them.
- Browser print is the PDF mechanism. There is no server-side PDF generation.
- `npm audit --omit=dev` reports 0 vulnerabilities.
- The full audit reports 9 findings, all in build and lint tooling that only processes this repository's own files:
  - Tailwind 3, via chokidar/braces and postcss-selector-parser;
  - eslint-config-next, via micromatch.
