import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb, isoDate, issueQuote, productId, submit, user } from "./harness";

// Seed: sofa FR retail 350 EUR / pro 280 EUR; TN retail 1150 TND / pro 920 TND.
//       lamp FR retail 85 EUR. Provider rate 1 EUR = 3.364214 TND.
let db: PGlite;
let customer: string, pro: string, pendingPro: string, manager: string, admin: string;
let sofa: string, lamp: string;

beforeAll(async () => {
  db = await freshDb();
  customer = await user(db, "c@example.com");
  pro = await user(db, "pro@example.com", "professional", "approved");
  pendingPro = await user(db, "pp@example.com", "professional", "pending");
  manager = await user(db, "m@example.com", "manager");
  admin = await user(db, "a@example.com", "admin");
  sofa = await productId(db, "kasaya-curved-sofa");
  lamp = await productId(db, "radiant-alabaster-floor-lamp");
});

type Snapshot = {
  country: string; currency: string; source_currency: string; tier: string; total: number;
  fx: { rate_eur_tnd: number; source: string } | null;
  lines: { quantity: number; nights: number; source_unit_price: number; unit_price: number; line_total: number }[];
};
const snapshot = async (quoteId: string) =>
  (await db.query<{ snapshot: Snapshot }>("select snapshot from public.quotes where id = $1", [quoteId])).rows[0].snapshot;
const unitPrice = async (requestId: string) =>
  (await db.query<{ unit_price: string }>("select unit_price from public.request_lines where request_id = $1", [requestId])).rows[0].unit_price;
const sofaLine = (q = 1, s = 10, e = 12) => ({ product_id: sofa, quantity: q, start_date: isoDate(s), end_date: isoDate(e) });

describe("tiers", () => {
  it("prices customers and pending pros at retail, approved pros at pro", async () => {
    expect(await unitPrice((await submit(db, customer, [sofaLine()])).id)).toBe("350.000");
    expect(await unitPrice((await submit(db, pendingPro, [sofaLine()])).id)).toBe("350.000");
    expect(await unitPrice((await submit(db, pro, [sofaLine()])).id)).toBe("280.000");
    expect(await unitPrice((await submit(db, null, [sofaLine()])).id)).toBe("350.000");
  });
});

describe("quotes", () => {
  it("reconciles every line with the total in the source currency", async () => {
    const r = await submit(db, pro, [sofaLine(2, 10, 13), { product_id: lamp, quantity: 5, start_date: isoDate(11), end_date: isoDate(12) }]);
    const s = await snapshot(await issueQuote(db, manager, r.id, "EUR"));
    expect(s).toMatchObject({ country: "FR", source_currency: "EUR", currency: "EUR", tier: "pro", fx: null });
    for (const l of s.lines) expect(l.line_total).toBeCloseTo(l.unit_price * l.quantity * l.nights, 6);
    expect(s.total).toBeCloseTo(s.lines.reduce((a, l) => a + l.line_total, 0), 6);
    expect(s.total).toBe(280 * 2 * 3 + 65 * 5 * 1);
  });

  it("converts EUR to TND by multiplying, rounded to millimes", async () => {
    const r = await submit(db, customer, [sofaLine(1, 20, 21)]);
    const s = await snapshot(await issueQuote(db, manager, r.id, "TND"));
    expect(s.lines[0].source_unit_price).toBe(350);
    expect(s.lines[0].unit_price).toBe(1177.475); // 350 x 3.364214 = 1177.4749
    expect(s.fx).toMatchObject({ rate_eur_tnd: 3.364214, source: "provider" });
    expect(s.country).toBe("FR"); // currency choice never moves the stock pool
  });

  it("converts TND to EUR by dividing, rounded to cents", async () => {
    const r = await submit(db, customer, [sofaLine(1, 20, 22)], {}, "TN");
    const s = await snapshot(await issueQuote(db, manager, r.id, "EUR"));
    expect(s).toMatchObject({ country: "TN", source_currency: "TND", currency: "EUR" });
    expect(s.lines[0].unit_price).toBe(341.83); // 1150 / 3.364214 = 341.8329
    expect(s.total).toBe(683.66);
  });

  it("refuses converted quotes without a fresh rate, but still quotes in the source currency", async () => {
    await db.query("update public.fx_rates set provider_time = now() - interval '73 hours'");
    const r = await submit(db, customer, [sofaLine(1, 30, 31)]);
    await expect(issueQuote(db, manager, r.id, "TND")).rejects.toThrow(/fx_unavailable/);
    await issueQuote(db, manager, r.id, "EUR");
    expect((await db.query("select amount_tnd from public.catalogue_prices where product_id = $1 and country = 'FR' and tier = 'retail'", [sofa])).rows[0])
      .toEqual({ amount_tnd: null });

    // An admin override (with expiry) unblocks conversion and is recorded as such.
    await as(db, admin, (tx) => tx.query(
      "insert into public.fx_rates (rate_eur_tnd, source, provider_time, effective_until, note) values (3.5, 'manual', now(), now() + interval '1 day', 'provider outage')",
    ));
    const s = await snapshot(await issueQuote(db, manager, r.id, "TND"));
    expect(s.lines[0].unit_price).toBe(1225);
    expect(s.fx).toMatchObject({ rate_eur_tnd: 3.5, source: "manual" });
    await db.query("delete from public.fx_rates where source = 'manual'");
    await db.query("update public.fx_rates set provider_time = now()");
  });

  it("freezes issued quotes against later price and rate changes", async () => {
    const r = await submit(db, customer, [sofaLine(1, 40, 42)]);
    const q1 = await issueQuote(db, manager, r.id, "TND");
    const before = await snapshot(q1);
    await db.query("update public.product_prices set amount = 999 where product_id = $1", [sofa]);
    await db.query("insert into public.fx_rates (rate_eur_tnd, source, provider_time) values (3.9, 'provider', now() + interval '1 minute')");
    expect(await snapshot(q1)).toEqual(before);
    // A new revision uses the new rate, but the price captured at submission.
    const after = await snapshot(await issueQuote(db, manager, r.id, "TND"));
    expect(after.lines[0].source_unit_price).toBe(350);
    expect(after.lines[0].unit_price).toBe(1365);
  });
});
