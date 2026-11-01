# Rent for Events: specification and status

Rent for Events is a niche brand of the company Concorde Events. The public site carries the brand; quotes are issued by Concorde Events under it, and request references keep the `CE-YYYY-NNNNN` format.

This file describes the implemented system. It replaces the original prototype spec, which described mock data, a role simulator and a mock fallback. None of those exist any more.

## Structure

| Area | Routes | Notes |
|---|---|---|
| Public | `/`, `/catalogue`, `/catalogue/[slug]`, `/demande`, `/professionnels`, `/about`, `/contact`, `/conditions` | FR (default), EN and AR (RTL), language cookie rendered on the server. TND only. |
| Guest tracking | `/suivi/[token]`, `/suivi/[token]/devis` | Private link from the emails: status, quote acceptance, invoices, return report. An unknown token gets a neutral "link not found" page. |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/confirm` | One Supabase identity for clients and staff |
| Client | `/account`, `/account/requests/[id]`, `/account/pro`, `/account/favourites`, `/account/messages`, `/account/profile` | Pending, rejected and suspended accounts each get their own screen. `/account/tools` redirects to `/account/pro`. |
| Quote | `/quote/[id]` | Frozen snapshot; browser print / save as PDF. It is **not** an invoice. |
| Invoice | `/api/invoices/[id]/pdf` | Rendered once to the `documents` bucket, then served from there. Owner, staff, or the tracking token. Anything else gets the same 404. |
| Admin | `/admin/login`, `/admin`, `/admin/{requests,invoices,inbox,inventory,rentals,clients,analytics,cms,settings}` | Own layout. Each page and server action re-checks the role. |
| Legacy | `/dashboard` | Redirects to `/account` or `/admin` |

Authorization works in layers:

1. Postgres RLS and grants. The final grants migration is fail-closed.
2. Database guard triggers on profiles, requests, lines and quotes.
3. Server checks (`requireStaff` / `assertStaff`).

The middleware only refreshes sessions and redirects anonymous visitors.

## Permission matrix

Particulier = role `customer`, Particulier+ = role `customer_plus`. A pending Particulier+ gets the Particulier experience.

| Capability | Visitor | Particulier | Particulier+ | Pending pro | Approved pro | Editor | Manager | Admin |
|---|---|---|---|---|---|---|---|---|
| Browse catalogue, availability | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Retail (public) prices and estimates | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pro prices, programme discount, points, margin calculator | | | | | ✓ | | ✓ (prices) | ✓ (prices) |
| Submit request / contact form (priced on the server) | ✓ (retail) | ✓ (retail) | ✓ (retail) | ✓ (retail) | ✓ (pro tier) | ✓ | ✓ | ✓ |
| Issued quote with its amounts | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Own requests, quotes, messages, favourites | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ask for Particulier+ (inbox ticket) | | ✓ | | | | | | |
| CMS (homepage content) | | | | | | ✓ | ✓ | ✓ |
| Requests, quotes, rentals, inbox, stock, products | | | | | | | ✓ | ✓ |
| Approve / reject / suspend clients | | | | | | | ✓ (not staff accounts) | ✓ |
| Manage a pro's programme (tier lock, negotiated discount, benefits, points) | | | | | | | ✓ | ✓ |
| Product internal data (purchase cost, supplier, storage) | | | | | | | ✓ | ✓ |
| Prices, roles (Particulier → Particulier+ included), programme tiers | | | | | | | | ✓ |
| Accept an issued quote | ✓ (token link) | ✓ | ✓ | ✓ | ✓ | | ✓ (records it for the client) | ✓ (records it for the client) |
| Own invoices and return report | ✓ (token link) | ✓ | ✓ | ✓ | ✓ | | ✓ (all) | ✓ (all) |
| Record a payment, read payments and proofs | | | | | | | ✓ | ✓ |
| Record a refund, void a payment, confirm without deposit | | | | | | | | ✓ |
| Cancel an order, with or without a credit note | | | | | | | ✓ | ✓ |
| Invoice list, CSV export, TTN status | | | | | | | ✓ | ✓ |
| Company settings | | | | | | | read | ✓ |
| Reception and inspection, close an inspection | | | | | | | ✓ | ✓ |
| Resolve maintenance, write off units | | | | | | | ✓ | ✓ |
| Record units found again | | | | | | | | ✓ |
| Read, create and assign client labels | | | | | | | ✓ | ✓ |
| Rename a label | | | | | | | ✓ (their own) | ✓ |
| Archive a label | | | | | | | | ✓ |
| Send a reset link to a client's stored contact | | | | | | | ✓ | ✓ |
| Send a reset link to a staff account, or to another destination (with a reason) | | | | | | | | ✓ |
| Read the staff audit and email log | | | | | | | ✓ | ✓ |

Nobody can edit or delete an audit row, an email row, an issued invoice or a payment, and that includes admins: corrections are new rows. Staff can't send a reset link to themselves.

Staff notes (`client_notes`) are never readable by the client they describe. The last approved admin cannot be demoted.

## Business rules

### Confirmed by the owner

- The business is **Tunisia only, 100% TND**. Stock, prices and requests are TN rows only (enforced by check constraints). Historical France rows were cancelled or removed by the 2026-10-25 migration; quotes issued before it keep their frozen EUR snapshot and show the rate they used.
- Rentals are billed in **nights**: calendar-date difference, so 15 → 18 is 3 nights.
- **No same-day rentals.** Stock is occupied from the start date **through the end date** (the return day is blocked).
- Prices are nightly rates in TND. Amounts show as whole dinars ("1 250 DT") or with three millime digits ("7 064,850 DT"), with Latin digits in every language.
- Issued quotes freeze the tier, programme discount, event details, unit prices, dates, line totals and total.
- Stock is held from **quote validation** (`validated`, while the quote is valid), then while `accepted`, `confirmed`, `dispatched` and `returned`.
- **No confirmation without a deposit** (2026-11-01). Only a recorded deposit confirms an order; an admin can waive it with a reason, and that goes to the audit.
- **Three customer types** (2026-10-26): **Particulier** sees no price anywhere; **Particulier+** sees the public (retail) prices; **Professionnel** is unchanged. Visitors are treated like a Particulier. RLS enforces it (`private.can_see_retail`): visitors and Particuliers read zero price rows. Pro prices are visible only to approved pros and staff.
- A Particulier is active once the email is confirmed. Particulier+ and Professionnel stay pending until staff approve them; while pending they get the Particulier experience (a pending pro still sees retail, as before). Existing approved customers became Particulier+ (they already saw prices).
- Requests are priced on the server for every type: Particuliers, Particulier+ and pending pros pay retail; approved pros pay the pro rate minus their programme discount. The issued quote always shows its amounts: it is how a Particulier learns the price.
- A Particulier asks for Particulier+ from `/account` (an inbox ticket); an admin changes the role.
- Approved professionals pay the pro rate minus their programme discount (the tier's, or a negotiated one set by staff). A piece without a pro rate falls back to retail, still with the discount. The discount is frozen on the request at submission.
- WhatsApp: `wa.me/21623040424`. There is no Cloud API. The app records "client opened the link" separately from "staff confirmed contact".

### Provisional (to confirm with the client)

Each value is a constant in SQL or TypeScript.

| Rule | Current value | Where |
|---|---|---|
| Quote validity | 14 days (staff can choose 1–90) | `issue_quote` default |
| Pro tiers | Bronze 0 pts 0% · Argent 500 pts 3% · Or 1 500 pts 5% · Platine 4 000 pts 8% · Diamant 8 000 pts 10% · Royal Elite 15 000 pts 12%, each with cumulative benefits. Admins edit them in `/admin/settings`. | `pro_tiers` seed |
| Points | 1 point per 10 DT of a professional rental, credited once it is both completed and paid. Manual adjustments are logged with a reason the client sees. | `award_completion_points` trigger, `reward_events` |
| Tier changes | Automatic from points unless staff lock the tier | `private.apply_reward` |
| Rounding | Discounted unit price rounded to 3 dp (millimes), then × quantity × nights; total = Σ lines | `submit_request`, `issue_quote` |
| Caution (product deposit) | Shown on the product page. Staff record it as received, refunded or retained; only an inspection can retain it, up to the fees. | `products.deposit_amount`, `payments` |
| Guest requests | Allowed; 5 per email per hour, plus a honeypot | `submit_request` |
| Turnaround buffer | None beyond the blocked return day | capacity trigger |
| Particulier → Particulier+ | The client asks from `/account` (inbox ticket); an admin changes the role. Managers approve pending Particulier+ accounts but cannot change roles. | `requestPlusUpgrade`, `guard_profile` |
| Caution visibility | Hidden with the prices (visitors, Particuliers) | product page |
| Luxury catalogue (TEST data) | 31 pieces: prices, pro prices (15–20 % under retail), stock, deposits and featured pieces are placeholders for Fatma to validate. Photos are temporary Unsplash images, to be replaced. | `supabase/data/catalogue-luxe.sql`, `product_internal.internal_notes` |
| Theme | Follows the device by default; a visitor's choice is kept for a year | `ce_theme` cookie |

### Money and orders: every value below is **provisional**

To validate with the accountant (VAT, stamp, numbering, TTN) and with Fatma (deposit, deadlines, conditions). The values in the first group can be changed in `/admin/settings`.

| Rule | Current value | Where |
|---|---|---|
| Prices | **Provisional:** catalogue prices include VAT (TTC) | `company_settings.prices_include_vat` |
| VAT | **Provisional:** 19 % by default, can be set per line on extras | `company_settings.default_vat_rate` |
| Stamp duty (timbre) | **Provisional:** 1.000 DT on each invoice, so twice for an order with a deposit | `company_settings.stamp_duty` |
| Deposit | **Provisional:** 50 % of the TTC total, rounded up to the millime. A client can have their own rate. | `company_settings.deposit_rate`, `private.deposit_amount` |
| Deposit deadline | **Provisional:** 72 hours after acceptance, which is also the deposit invoice's due date | `company_settings.deposit_deadline_hours` |
| Balance due | **Provisional:** 7 days after the final invoice | `company_settings.invoice_due_days_balance` |
| Invoice numbers | **Provisional:** gapless per calendar year, Africa/Tunis: `F-YYYY-NNNNN`, credit notes `AV-YYYY-NNNNN` | `private.next_number` |
| Overdue deposit | **Provisional:** a reminder 24 hours before, then an overdue email and a staff notice. The stock stays held and nothing is cancelled automatically: staff decide. | `/api/cron/emails` |
| Cancelling after a deposit | **Provisional:** the deposit is kept unless staff issue a credit note, up to what was paid | `cancel_order` |
| Over-payment | **Provisional:** accepted, reported to staff and kept as client credit | `record_payment` |
| Damage fees | **Provisional:** entered TTC at the default VAT rate. The repair fee and replacement value on the product only suggest an amount. | `close_inspection`, `product_internal` |
| Quote reminder | **Provisional:** 48 hours before the quote expires | `/api/cron/emails` |
| Changes after acceptance | **Provisional:** a new quote revision or changed lines set `reacceptance_required`, which blocks dispatch until the client accepts again | `guard_request` |
| Reset links | **Provisional:** valid 60 minutes, 3 per account per hour | `lib/password-reset.ts` |
| Password help by phone | **Provisional:** a ticket for staff, same neutral answer whether or not an account exists | `request_password_help` |

Amounts are stored as `numeric(12,3)` or `numeric(14,3)` and rounded half-up to 3 decimals, except the deposit, which rounds up so it never falls short of the rate. Anything stored is computed in SQL; TypeScript only formats it.

Issued quotes, invoices, payments, emails sent and audit rows are never edited or deleted. A voided payment stays with its reason. An invoice is corrected by a credit note, which takes its own number.

### Not in scope or deferred

- e-invoicing: to configure with the accountant and TTN. `lib/invoicing/teif.ts` only prepares the data, and `/admin/invoices` tracks a status that staff set by hand: nothing is sent to TTN.
- Online card or bank payments: staff record what they receive.
- WhatsApp Cloud API.
- URL-based locale (`/en/...`, `/ar/...`). The language is a cookie on a single URL, so there are no hreflang alternates.
- Per-IP throttling or bot detection.

## Request status machine

`submitted → validated → accepted → confirmed → dispatched → returned → completed`

Exits: `rejected` from submitted or validated, and `cancelled` from submitted, validated, accepted or confirmed. Each step has one way in:

| Status | Set by | Means |
|---|---|---|
| `validated` | `issue_quote` | A quote exists; stock is held while it is valid. |
| `accepted` | `accept_quote`, `accept_quote_by_token` | The client signed, or staff recorded their agreement. Issues the deposit invoice. |
| `confirmed` | `record_payment`, `confirm_without_deposit` | The deposit is in, or an admin waived it with a reason that goes to the audit. **Nothing else confirms an order.** |
| `dispatched` | `setRequestStatus` | The goods left. Refused while `reacceptance_required` is set. |
| `returned` | `receive_return` | What came back is counted. Anything short carries into the inspection as missing. |
| `completed` | `close_inspection` | Every unit sorted, stock ledger written, caution settled, final invoice issued. |

- API callers can't set money or acceptance fields; `guard_request` refuses them.
- Rescheduling a validated request returns it to `submitted`; the quote must be re-issued.
- Accepting requires an unexpired quote, the conditions ticked, a typed name, and the legal name and matricule fiscal in the company settings.
- A client can cancel their own submitted or validated request.

`payment_status` runs alongside: `unpaid → deposit_due → deposit_paid → balance_due → paid`, or `refunded`. A single function writes it, from the payments themselves.

Stock is held from `validated` (while the quote is valid) through `accepted`, `confirmed`, `dispatched` and `returned`; equipment that is out or under inspection keeps blocking past its end date. `stock_movements` records every unit that leaves or re-enters stock after an inspection, and is immutable.

The capacity invariant is one deferred constraint trigger with a per-country advisory lock (only TN is used now). For every day, committed units ≤ owned − maintenance. Damage is always recorded, and resulting conflicts are listed on `/admin`.

## Progress checklist

- [x] Tooling: Next 15.5.28 (security backport), ESLint, Vitest, Playwright, Supabase CLI
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
- [x] 2026-10-26 (Rent for Events update): rebrand; light and dark mode; date range picker; staged product photos with `image_fit`; Particulier / Particulier+ / Professionnel; provisional luxury catalogue on TEST. `test` 154/154, `test:integration` 6/6, `test:e2e` 46/46, build OK
- [x] Vercel Preview env → TEST project; verify Preview
- [x] 2026-11-01 (v3, branch `feat/kvist-redesign-tnd`, in code): English; landing hero with search; tier emblems; client labels; order pipeline with acceptance, deposit, invoices with TVA, emails and guest tracking; unit-by-unit return inspection with stock ledger; staff password resets
- [ ] 2026-11-01 migrations applied to the TEST project; `test:integration` and `test:e2e` run against them
- [ ] Accountant's validation of TVA, stamp duty, numbering and TTN; Fatma's conditions text and company settings
- [ ] Resend domain verified; production secrets set
- [ ] Supabase Auth URLs, OTP expiry and email templates (rename to Rent for Events; checked in the dashboard, not from code)
- [ ] Production project, SMTP, first admin, approved catalogue → merge and verify production

## Known limitations

- Vercel Production currently runs on the TEST Supabase project (owner decision 2026-10-25): test runs, demo accounts and the provisional catalogue are visible on the live site until Production gets its own project.
- The Arabic copy was written by the developer and should be reviewed by a native speaker. Product and CMS text in Arabic is entered by staff; when it is missing, French is shown.
- The English copy was written by the developer too. Product and CMS text in English falls back to French when it is missing.
- Locale is cookie-based, so search engines index the French version only, and there are no hreflang alternates.
- Clients can't accept a quote until the legal name and matricule fiscal are filled in `/admin/settings`.
- A user linked to payments, invoices or audit rows can't be deleted, because the immutable rows block the link being cleared. Suspend the account instead.
- e2e runs on the TEST project leave immutable invoices and consume invoice numbers. The live site reads the same project.
- `client_notes.flags` is deprecated and kept readable; labels now live in `client_tags`.
- `invoice_due_days_deposit` is stored but unused: a deposit invoice is due at the deposit deadline.
- Emails and reminders run once a day on the Vercel Hobby plan, so a retry or a reminder can be up to a day late.
- Invoices are in French or English; Arabic is not an invoice language.
- The unused `fx_rates` table and EUR enum value stay in the schema so pre-2026-10-25 quotes remain readable; nothing writes to them.
- Quotes use browser print; invoices are real PDFs. The bundled fonts are under the SIL Open Font License (`lib/invoicing/fonts/README.md`).
- `npm audit --omit=dev` reports 5 findings:
  - `zod` (high, GHSA-mrhx-c7xc-m3w5): memory exhaustion on oversized collections. The fix is a major upgrade, left for a separate change.
  - four low findings through `@react-email/components` → `html-to-text` → `deepmerge`. They only process the templates in this repository.
