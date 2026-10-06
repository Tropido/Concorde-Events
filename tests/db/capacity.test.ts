import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb, isoDate, issueQuote, productId, submit, user } from "./harness";

let db: PGlite;
let client: string, manager: string;
let sofa: string; // FR owned 12, TN owned 6 in the seed

beforeAll(async () => {
  db = await freshDb();
  client = await user(db, "client@example.com");
  manager = await user(db, "manager@example.com", "manager");
  sofa = await productId(db, "kasaya-curved-sofa");
});

const line = (quantity: number | string, start: number, end: number, product = sofa) => ({
  product_id: product, quantity, start_date: isoDate(start), end_date: isoDate(end),
});
const setStatus = (id: string, status: string) =>
  as(db, manager, (tx) => tx.query("update public.rental_requests set status = $2 where id = $1", [id, status]));
const available = async (product: string, country: string, day: number) =>
  (await db.query<{ available: number }>("select available from public.product_availability($1, $2, $3, $3)",
    [product, country, isoDate(day)])).rows[0].available;

describe("submission validation", () => {
  it.each([
    ["same-day", () => line(1, 5, 5), /invalid_range/],
    ["reversed", () => line(1, 6, 5), /invalid_range/],
    ["past", () => line(1, -2, 3), /date_in_past/],
    ["fractional quantity", () => line("1.5", 5, 6), /invalid_quantity/],
    ["negative quantity", () => line(-1, 5, 6), /invalid_quantity/],
    ["zero quantity", () => line(0, 5, 6), /invalid_quantity/],
    ["more than owned", () => line(13, 5, 6), /invalid_quantity/],
    ["over a year", () => line(1, 5, 400), /range_too_long/],
    ["missing date", () => ({ ...line(1, 5, 6), start_date: "", end_date: "" }), /invalid_date/],
  ] as const)("rejects %s", async (_name, l, err) => {
    await expect(submit(db, client, [l() as never])).rejects.toThrow(err);
  });

  it("enforces the product's minimum nights", async () => {
    await db.query("update public.products set minimum_nights = 3 where id = $1", [sofa]);
    await expect(submit(db, client, [line(1, 5, 7)])).rejects.toThrow(/below_minimum_nights/);
    await submit(db, client, [line(1, 5, 8)]);
    await db.query("update public.products set minimum_nights = 1 where id = $1", [sofa]);
  });

  it("bills by nights (calendar-date difference)", async () => {
    const r = await submit(db, client, [line(2, 15, 18)]);
    const { rows } = await db.query("select nights, line_total from public.request_lines where request_id = $1", [r.id]);
    expect(rows[0]).toEqual({ nights: 3, line_total: "2100.000" }); // 350 x 2 x 3
  });

  it("keeps separate periods for the same product as separate lines", async () => {
    const r = await submit(db, client, [line(1, 20, 22), line(3, 25, 26)]);
    const { rows } = await db.query("select quantity, nights from public.request_lines where request_id = $1 order by start_date", [r.id]);
    expect(rows).toEqual([{ quantity: 1, nights: 2 }, { quantity: 3, nights: 1 }]);
  });

  it("is idempotent per submission key and throttles per email", async () => {
    const key = crypto.randomUUID();
    const payload = JSON.stringify({ country: "FR", customer_name: "X", customer_email: "spam@example.com", customer_phone: "123456", lines: [line(1, 30, 31)] });
    const call = () => as(db, null, async (tx) => (await tx.query<{ r: string }>("select public.submit_request($1, $2) as r", [payload, key])).rows[0].r);
    expect(await call()).toBe(await call());
    for (let i = 0; i < 4; i++) {
      await as(db, null, (tx) => tx.query("select public.submit_request($1, $2)", [payload, crypto.randomUUID()]));
    }
    await expect(as(db, null, (tx) => tx.query("select public.submit_request($1, $2)", [payload, crypto.randomUUID()])))
      .rejects.toThrow(/rate_limited/);
  });

  it("refuses suspended accounts", async () => {
    const s = await user(db, "suspended@example.com", "customer", "suspended");
    await expect(submit(db, s, [line(1, 5, 6)])).rejects.toThrow(/account_inactive/);
  });
});

describe("capacity", () => {
  it("never quotes more units than exist for overlapping days", async () => {
    const all = await submit(db, client, [line(12, 60, 63)]);
    const one = await submit(db, client, [line(1, 62, 64)]);
    await issueQuote(db, manager, all.id);
    await expect(issueQuote(db, manager, one.id)).rejects.toThrow(/capacity_exceeded/);
    // The failed quote left nothing behind.
    expect((await db.query("select status from public.rental_requests where id = $1", [one.id])).rows[0]).toEqual({ status: "submitted" });
    expect((await db.query("select count(*)::int as n from public.quotes where request_id = $1", [one.id])).rows[0]).toEqual({ n: 0 });
    // Return day is blocked; the day after is free.
    expect(await available(sofa, "FR", 63)).toBe(0);
    expect(await available(sofa, "FR", 64)).toBe(12);
    // Cancelling releases the stock.
    await setStatus(all.id, "cancelled");
    await issueQuote(db, manager, one.id);
    await setStatus(one.id, "cancelled");
  });

  it("keeps France and Tunisia stock independent", async () => {
    const fr = await submit(db, client, [line(12, 70, 72)], {}, "FR");
    const tn = await submit(db, client, [line(6, 70, 72)], {}, "TN");
    await issueQuote(db, manager, fr.id);
    await issueQuote(db, manager, tn.id, "TND");
    expect(await available(sofa, "FR", 71)).toBe(0);
    expect(await available(sofa, "TN", 71)).toBe(0);
    const tn2 = await submit(db, client, [line(1, 70, 72)], {}, "TN");
    await expect(issueQuote(db, manager, tn2.id, "TND")).rejects.toThrow(/capacity_exceeded/);
    await setStatus(fr.id, "cancelled");
    await setStatus(tn.id, "cancelled");
  });

  it("releases stock when a quote expires, and refuses to confirm an expired quote", async () => {
    const a = await submit(db, client, [line(12, 80, 82)]);
    await issueQuote(db, manager, a.id);
    await db.query("update public.rental_requests set quote_valid_until = current_date - 1 where id = $1", [a.id]);
    expect(await available(sofa, "FR", 81)).toBe(12);
    await expect(setStatus(a.id, "confirmed")).rejects.toThrow(/quote expired/);
    await setStatus(a.id, "cancelled");
  });

  it("enforces the status machine", async () => {
    const r = await submit(db, client, [line(1, 90, 91)]);
    await expect(setStatus(r.id, "confirmed")).rejects.toThrow(/invalid status transition/);
    await expect(setStatus(r.id, "validated")).rejects.toThrow(/use issue_quote/);
    await issueQuote(db, manager, r.id);
    await setStatus(r.id, "confirmed");
    await expect(setStatus(r.id, "completed")).rejects.toThrow(/invalid status transition/);
    await setStatus(r.id, "dispatched");
    await expect(setStatus(r.id, "completed")).rejects.toThrow(/use issue_quote \/ return_request/);
    await expect(setStatus(r.id, "cancelled")).rejects.toThrow(/invalid status transition/);
  });

  it("rechecks capacity when rescheduling and drops a stale quote back to submitted", async () => {
    const blocker = await submit(db, client, [line(12, 100, 102)]);
    await issueQuote(db, manager, blocker.id);
    const r = await submit(db, client, [line(2, 110, 112)]);
    await issueQuote(db, manager, r.id);
    const lineId = (await db.query<{ id: string }>("select id from public.request_lines where request_id = $1", [r.id])).rows[0].id;
    const move = (s: number, e: number) => as(db, manager, (tx) => tx.query("select public.reschedule_request($1, $2)",
      [r.id, JSON.stringify([{ id: lineId, start_date: isoDate(s), end_date: isoDate(e) }])]));

    // Moving a validated request makes its quote stale; it stops holding stock until re-quoted.
    await move(101, 103);
    expect((await db.query("select status, quote_valid_until from public.rental_requests where id = $1", [r.id])).rows[0])
      .toEqual({ status: "submitted", quote_valid_until: null });
    const moved = (await db.query("select start_date::text, nights, line_total from public.request_lines where id = $1", [lineId])).rows[0];
    expect(moved).toEqual({ start_date: isoDate(101), nights: 2, line_total: "1400.000" });
    await expect(issueQuote(db, manager, r.id)).rejects.toThrow(/capacity_exceeded/);

    // A confirmed booking keeps its stock while moving, and cannot move into a conflict.
    await move(120, 122);
    await issueQuote(db, manager, r.id);
    await setStatus(r.id, "confirmed");
    await expect(move(100, 102)).rejects.toThrow(/capacity_exceeded/);
    expect((await db.query<{ start_date: string }>("select start_date::text from public.request_lines where id = $1", [lineId])).rows[0].start_date).toBe(isoDate(120));
    // The earlier quote stays as an immutable revision.
    expect((await db.query("select revision from public.quotes where request_id = $1 order by revision", [r.id])).rows)
      .toEqual([{ revision: 1 }, { revision: 2 }]);
    await setStatus(blocker.id, "cancelled");
    await setStatus(r.id, "cancelled");
  });

  it("handles returns idempotently and keeps damaged units out until repaired", async () => {
    const r = await submit(db, client, [line(4, 1, 3)]);
    await issueQuote(db, manager, r.id);
    await setStatus(r.id, "confirmed");
    await setStatus(r.id, "dispatched");
    const lineId = (await db.query<{ id: string }>("select id from public.request_lines where request_id = $1", [r.id])).rows[0].id;
    const ret = () => as(db, manager, (tx) => tx.query("select public.return_request($1, $2)", [r.id, JSON.stringify([{ line_id: lineId, quantity: 1 }])]));
    const stock = async () => (await db.query("select quantity_owned, quantity_maintenance from public.product_stock where product_id = $1 and country = 'FR'", [sofa])).rows[0];

    await ret();
    await ret(); // second click: no effect
    expect(await stock()).toEqual({ quantity_owned: 12, quantity_maintenance: 1 });
    expect(await available(sofa, "FR", 5)).toBe(11);

    // Repaired: maintenance goes down, owned unchanged. Written off: both go down.
    await as(db, manager, (tx) => tx.query("update public.product_stock set quantity_maintenance = 0 where product_id = $1 and country = 'FR'", [sofa]));
    expect(await stock()).toEqual({ quantity_owned: 12, quantity_maintenance: 0 });
  });

  it("keeps dispatched items blocked past their end date until returned", async () => {
    const r = await submit(db, client, [line(12, 1, 2)]);
    await issueQuote(db, manager, r.id);
    await setStatus(r.id, "confirmed");
    await setStatus(r.id, "dispatched");
    // Simulate a rental whose end date has passed without a return (superuser bypasses the line guard).
    await db.exec("alter table public.request_lines disable trigger guard_line");
    await db.query("update public.request_lines set start_date = $2, end_date = $3 where request_id = $1", [r.id, isoDate(-3), isoDate(-1)]);
    await db.exec("alter table public.request_lines enable trigger guard_line");
    expect(await available(sofa, "FR", 0)).toBe(0); // still out today
    expect(await available(sofa, "FR", 1)).toBe(12); // expected back by tomorrow
    await as(db, manager, (tx) => tx.query("select public.return_request($1)", [r.id]));
    expect(await available(sofa, "FR", 0)).toBe(12);
  });

  it("refuses to reduce owned stock below commitments, but always records damage", async () => {
    const r = await submit(db, client, [line(10, 130, 131)]);
    await issueQuote(db, manager, r.id);
    await expect(as(db, manager, (tx) => tx.query("update public.product_stock set quantity_owned = 9 where product_id = $1 and country = 'FR'", [sofa])))
      .rejects.toThrow(/capacity_exceeded/);
    await as(db, manager, (tx) => tx.query("update public.product_stock set quantity_maintenance = 3 where product_id = $1 and country = 'FR'", [sofa]));
    const conflicts = await as(db, manager, async (tx) => (await tx.query("select * from public.capacity_conflicts()")).rows);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(await as(db, client, async (tx) => (await tx.query("select * from public.capacity_conflicts()")).rows)).toEqual([]);
    await as(db, manager, (tx) => tx.query("update public.product_stock set quantity_maintenance = 0 where product_id = $1 and country = 'FR'", [sofa]));
    await setStatus(r.id, "cancelled");
  });
});
