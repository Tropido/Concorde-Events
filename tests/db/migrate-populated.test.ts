import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, closeInspection, dispatch, freshDb, isoDate, issueQuote, linesOf, migrateFrom, pay, receiveReturn, setupCompany, submit, user } from "./harness";

// The hosted databases already hold requests in every status. This runs the 2026-11-01 migrations
// over such data, then checks old orders can still finish under the new rules.
const FIRST = "20261101100000";
let db: PGlite;
let manager: string, client: string;
const ids: Record<string, string> = {};
const status = async (id: string) => (await db.query<Record<string, string>>("select status, payment_status, paid_total from public.rental_requests where id = $1", [id])).rows[0];

beforeAll(async () => {
  db = await freshDb({ before: FIRST });
  await db.exec(`
    insert into public.products (id, slug, title_fr) values ('11111111-1111-4111-8111-111111111111', 'chaise-test', 'Chaise');
    insert into public.product_stock (product_id, country, quantity_owned) values ('11111111-1111-4111-8111-111111111111', 'TN', 100);
    insert into public.product_prices (product_id, country, tier, amount) values ('11111111-1111-4111-8111-111111111111', 'TN', 'retail', 100);
  `);
  manager = await user(db, "m@example.com", "manager");
  client = await user(db, "c@example.com", "customer_plus");
  const chair = "11111111-1111-4111-8111-111111111111";
  const line = (d: number) => ({ product_id: chair, quantity: 2, start_date: isoDate(d), end_date: isoDate(d + 2) });
  const set = (id: string, s: string) => as(db, manager, (tx) => tx.query("update public.rental_requests set status = $2 where id = $1", [id, s]));
  ids.submitted = (await submit(db, client, [line(10)])).id;
  ids.validated = (await submit(db, client, [line(20)])).id;
  await issueQuote(db, manager, ids.validated);
  ids.confirmed = (await submit(db, client, [line(30)])).id;
  await issueQuote(db, manager, ids.confirmed);
  await set(ids.confirmed, "confirmed");
  ids.dispatched = (await submit(db, client, [line(40)])).id;
  await issueQuote(db, manager, ids.dispatched);
  await set(ids.dispatched, "confirmed");
  await set(ids.dispatched, "dispatched");
  ids.completed = (await submit(db, client, [line(50)])).id;
  await issueQuote(db, manager, ids.completed);
  await set(ids.completed, "confirmed");
  await set(ids.completed, "dispatched");
  await as(db, manager, (tx) => tx.query("select public.return_request($1)", [ids.completed]));
  await db.query("insert into public.client_notes (profile_id, flags) values ($1, '{vip}')", [client]);

  await migrateFrom(db, FIRST);
  await setupCompany(db);
});

describe("orders from before the update", () => {
  it("keep their status and read as unpaid", async () => {
    for (const s of ["submitted", "validated", "confirmed", "dispatched", "completed"]) {
      expect(await status(ids[s]), s).toMatchObject({ status: s, payment_status: "unpaid", paid_total: "0.000" });
    }
  });

  it("get the logistics status they had in practice", async () => {
    const of = async (id: string) => (await db.query<{ logistics_status: string }>("select logistics_status from public.request_lines where request_id = $1", [id])).rows[0].logistics_status;
    expect(await of(ids.confirmed)).toBe("reserved");
    expect(await of(ids.dispatched)).toBe("delivered");
    expect(await of(ids.completed)).toBe("inspected");
  });

  it("keep their label", async () => {
    expect((await db.query("select t.slug from public.client_tag_links l join public.client_tags t on t.id = l.tag_id where l.profile_id = $1", [client])).rows).toEqual([{ slug: "vip" }]);
  });

  it("can still accept a quote issued before VAT existed", async () => {
    const quote = (await db.query<{ id: string }>("select id from public.quotes where request_id = $1", [ids.validated])).rows[0].id;
    const out = (await as(db, manager, (tx) => tx.query<{ r: { deposit_required: number } }>("select public.accept_quote($1, $2, 'Client', true, 'phone') as r", [ids.validated, quote]))).rows[0].r;
    expect(out.deposit_required).toBe(200); // 400 at 50 %
    const { snapshot } = (await db.query<{ snapshot: { by_rate: { rate: number; ttc: number }[] } }>("select snapshot from public.invoices where request_id = $1", [ids.validated])).rows[0];
    expect(snapshot.by_rate).toEqual([expect.objectContaining({ rate: 19, ttc: 200 })]);
  });

  it("can still go out and be inspected, confirmed without any deposit", async () => {
    await dispatch(db, manager, ids.confirmed);
    await receiveReturn(db, manager, ids.confirmed);
    await closeInspection(db, manager, ids.confirmed);
    expect((await status(ids.confirmed)).status).toBe("completed");
  });

  it("finish with a final invoice, VAT worked out from the old quote", async () => {
    await receiveReturn(db, manager, ids.dispatched);
    await closeInspection(db, manager, ids.dispatched, [{ ok: 1, damaged: 1, fee: 119, fee_reason: "Pied cassé" }]);
    const i = (await db.query<{ snapshot: { lines: { vat_rate: number; ttc: number }[]; totals: { ht: number; tva: number; ttc: number; total_due: number } } }>("select snapshot from public.invoices where request_id = $1 and type = 'final'", [ids.dispatched])).rows[0];
    expect(i.snapshot.lines.map((l) => [l.vat_rate, l.ttc])).toEqual([[19, 400], [19, 119]]);
    expect(i.snapshot.totals).toMatchObject({ ttc: 519, total_due: 520 });
    await pay(db, manager, ids.dispatched, "balance", 520);
    expect((await status(ids.dispatched)).payment_status).toBe("paid");
  });

  it("still have their lines", async () => {
    expect(await linesOf(db, ids.submitted)).toHaveLength(1);
  });
});

describe("the rules after the update", () => {
  it("no longer allow confirming by hand", async () => {
    const r = await submit(db, client, [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 1, start_date: isoDate(60), end_date: isoDate(61) }]);
    await issueQuote(db, manager, r.id);
    await expect(as(db, manager, (tx) => tx.query("update public.rental_requests set status = 'confirmed' where id = $1", [r.id]))).rejects.toThrow(/invalid status transition/);
  });
});
