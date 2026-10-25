import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb, isoDate, issueQuote, productId, submit, user } from "./harness";

// Seed (TND only): sofa retail 1150 / pro 920; lamp retail 280 / pro 215.
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
  country: string; currency: string; source_currency: string; tier: string; total: number; discount_percent: number;
  fx: unknown; event: { type: string | null; guests: number | null };
  lines: { quantity: number; nights: number; source_unit_price: number; unit_price: number; line_total: number }[];
};
const snapshot = async (quoteId: string) =>
  (await db.query<{ snapshot: Snapshot }>("select snapshot from public.quotes where id = $1", [quoteId])).rows[0].snapshot;
const unitPrice = async (requestId: string) =>
  (await db.query<{ unit_price: string }>("select unit_price from public.request_lines where request_id = $1", [requestId])).rows[0].unit_price;
const sofaLine = (q = 1, s = 10, e = 12) => ({ product_id: sofa, quantity: q, start_date: isoDate(s), end_date: isoDate(e) });
const account = async (id: string) =>
  (await db.query<{ tier_code: string; points: number; tier_locked: boolean }>("select tier_code, points, tier_locked from public.pro_accounts where profile_id = $1", [id])).rows[0];

describe("tiers", () => {
  it("prices customers and pending pros at retail, approved pros at pro (bronze = no discount)", async () => {
    expect(await unitPrice((await submit(db, customer, [sofaLine()])).id)).toBe("1150.000");
    expect(await unitPrice((await submit(db, pendingPro, [sofaLine()])).id)).toBe("1150.000");
    expect(await unitPrice((await submit(db, pro, [sofaLine()])).id)).toBe("920.000");
    expect(await unitPrice((await submit(db, null, [sofaLine()])).id)).toBe("1150.000");
  });

  it("gives every professional a programme row, starting at bronze", async () => {
    expect(await account(pro)).toEqual({ tier_code: "bronze", points: 0, tier_locked: false });
    expect(await account(pendingPro)).toMatchObject({ tier_code: "bronze" });
    expect((await db.query("select count(*)::int as n from public.pro_accounts where profile_id = $1", [customer])).rows[0]).toEqual({ n: 0 });
  });

  it("applies the tier discount, then a negotiated rate, to the pro price", async () => {
    await as(db, manager, (tx) => tx.query("update public.pro_accounts set tier_code = 'or', tier_locked = true where profile_id = $1", [pro]));
    expect(await unitPrice((await submit(db, pro, [sofaLine()])).id)).toBe("874.000"); // 920 - 5 %
    await as(db, manager, (tx) => tx.query("update public.pro_accounts set custom_discount_percent = 12.5 where profile_id = $1", [pro]));
    expect(await unitPrice((await submit(db, pro, [sofaLine()])).id)).toBe("805.000"); // 920 - 12.5 %
    await as(db, manager, (tx) => tx.query("update public.pro_accounts set custom_discount_percent = null, tier_code = 'bronze', tier_locked = false where profile_id = $1", [pro]));
  });
});

describe("quotes", () => {
  it("are TND only and reconcile every line with the total", async () => {
    const r = await submit(db, pro, [sofaLine(2, 10, 13), { product_id: lamp, quantity: 5, start_date: isoDate(11), end_date: isoDate(12) }],
      { event_type: "wedding", guest_count: "180", event_venue: "Hammamet", delivery_mode: "delivery" });
    const s = await snapshot(await issueQuote(db, manager, r.id));
    expect(s).toMatchObject({ country: "TN", source_currency: "TND", currency: "TND", tier: "pro", fx: null });
    expect(s.event).toMatchObject({ type: "wedding", guests: 180 });
    for (const l of s.lines) expect(l.line_total).toBeCloseTo(l.unit_price * l.quantity * l.nights, 6);
    expect(s.total).toBe(920 * 2 * 3 + 215 * 5 * 1);
    await expect(issueQuote(db, manager, r.id, "EUR")).rejects.toThrow(/tnd_only/);
  });

  it("rejects unknown event types and bad guest counts", async () => {
    await expect(submit(db, customer, [sofaLine(1, 20, 21)], { event_type: "rave" })).rejects.toThrow(/invalid_contact/);
    await expect(submit(db, customer, [sofaLine(1, 20, 21)], { guest_count: "-3" })).rejects.toThrow(/invalid_contact/);
  });

  it("freezes issued quotes against later price changes", async () => {
    const r = await submit(db, customer, [sofaLine(1, 40, 42)]);
    const q1 = await issueQuote(db, manager, r.id);
    const before = await snapshot(q1);
    await db.query("update public.product_prices set amount = 999 where product_id = $1 and tier = 'retail'", [sofa]);
    expect(await snapshot(q1)).toEqual(before);
    // A new revision keeps the price captured at submission.
    const after = await snapshot(await issueQuote(db, manager, r.id));
    expect(after.lines[0].unit_price).toBe(1150);
    await db.query("update public.product_prices set amount = 1150 where product_id = $1 and tier = 'retail'", [sofa]);
  });
});

describe("loyalty points", () => {
  it("awards 1 point per 10 TND when a pro rental completes, once, and promotes the tier", async () => {
    const r = await submit(db, pro, [sofaLine(1, 2, 4)]); // 920 x 2 nights = 1840 -> 184 pts
    await issueQuote(db, manager, r.id);
    await as(db, manager, (tx) => tx.query("update public.rental_requests set status = 'confirmed' where id = $1", [r.id]));
    await as(db, manager, (tx) => tx.query("update public.rental_requests set status = 'dispatched' where id = $1", [r.id]));
    await as(db, manager, (tx) => tx.query("select public.return_request($1)", [r.id]));
    await as(db, manager, (tx) => tx.query("select public.return_request($1)", [r.id])); // idempotent
    expect((await account(pro)).points).toBe(184);

    await as(db, manager, (tx) => tx.query("insert into public.reward_events (profile_id, points, reason) values ($1, 400, 'Gala Carthage bonus')", [pro]));
    expect(await account(pro)).toMatchObject({ points: 584, tier_code: "argent" });
  });

  it("keeps a locked tier, never lets API callers edit points, and keeps the ledger immutable", async () => {
    await as(db, manager, (tx) => tx.query("update public.pro_accounts set tier_code = 'diamant', tier_locked = true where profile_id = $1", [pro]));
    await as(db, manager, (tx) => tx.query("insert into public.reward_events (profile_id, points, reason) values ($1, 10, 'x')", [pro]));
    expect(await account(pro)).toMatchObject({ tier_code: "diamant" });
    await expect(as(db, admin, (tx) => tx.query("update public.pro_accounts set points = 99999 where profile_id = $1", [pro])))
      .rejects.toThrow(/reward events/);
    await expect(as(db, admin, (tx) => tx.query("delete from public.reward_events where profile_id = $1", [pro])))
      .rejects.toThrow(/permission denied|immutable/);
  });

  it("lets a pro read their own programme but not edit it; others see nothing", async () => {
    const own = await as(db, pro, (tx) => tx.query("select tier_code from public.pro_accounts"));
    expect(own.rows).toHaveLength(1);
    const ownEvents = await as(db, pro, (tx) => tx.query("select points from public.reward_events"));
    expect(ownEvents.rows.length).toBeGreaterThan(0);
    await as(db, pro, (tx) => tx.query("update public.pro_accounts set tier_code = 'royal_elite' where profile_id = $1", [pro]));
    expect(await account(pro)).toMatchObject({ tier_code: "diamant" }); // RLS: 0 rows updated
    await expect(as(db, pro, (tx) => tx.query("insert into public.reward_events (profile_id, points, reason) values ($1, 1000, 'self')", [pro])))
      .rejects.toThrow(/row-level security/);
    expect((await as(db, customer, (tx) => tx.query("select * from public.pro_accounts"))).rows).toHaveLength(0);
    expect((await as(db, null, (tx) => tx.query("select code from public.pro_tiers"))).rows).toHaveLength(6);
  });

  it("keeps product internals (cost, supplier) away from everyone but operations staff", async () => {
    await as(db, manager, (tx) => tx.query("insert into public.product_internal (product_id, purchase_cost, supplier) values ($1, 2400, 'Atelier Sfax')", [sofa]));
    expect((await as(db, pro, (tx) => tx.query("select * from public.product_internal"))).rows).toHaveLength(0);
    expect((await as(db, manager, (tx) => tx.query("select supplier from public.product_internal"))).rows).toEqual([{ supplier: "Atelier Sfax" }]);
  });
});
