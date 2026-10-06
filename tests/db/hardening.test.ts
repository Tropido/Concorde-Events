import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb, isoDate, issueQuote, productId, submit, user } from "./harness";

// Regression tests for the security review findings.
let db: PGlite;
let client: string, suspended: string, manager: string;
let sofa: string;

beforeAll(async () => {
  db = await freshDb();
  client = await user(db, "c@example.com");
  suspended = await user(db, "s@example.com", "customer", "suspended");
  manager = await user(db, "m@example.com", "manager");
  sofa = await productId(db, "kasaya-curved-sofa");
});

describe("stock rows cannot be moved or deleted around the capacity check", () => {
  it("refuses changing a stock row's country or product", async () => {
    // A product stocked only in France, so nothing but the guard can stop the move.
    const { rows } = await db.query<{ id: string }>("insert into public.products (slug, title_fr) values ('fr-only', 'FR only') returning id");
    await db.query("insert into public.product_stock (product_id, country, quantity_owned) values ($1, 'FR', 3)", [rows[0].id]);
    await expect(as(db, manager, (tx) => tx.query("update public.product_stock set country = 'TN' where product_id = $1", [rows[0].id])))
      .rejects.toThrow(/cannot change product or country/);
  });

  it("has no delete privilege on stock rows", async () => {
    await expect(as(db, manager, (tx) => tx.query("delete from public.product_stock where product_id = $1", [sofa])))
      .rejects.toThrow(/permission denied/);
  });

  it("still lets staff set owned to zero only when nothing is committed", async () => {
    const r = await submit(db, client, [{ product_id: sofa, quantity: 1, start_date: isoDate(40), end_date: isoDate(41) }]);
    await issueQuote(db, manager, r.id);
    await expect(as(db, manager, (tx) => tx.query("update public.product_stock set quantity_owned = 0 where product_id = $1 and country = 'FR'", [sofa])))
      .rejects.toThrow(/capacity_exceeded/);
  });
});

describe("request lines keep their product and price", () => {
  it("refuses changing a line's product", async () => {
    const lamp = await productId(db, "radiant-alabaster-floor-lamp");
    const r = await submit(db, client, [{ product_id: sofa, quantity: 1, start_date: isoDate(50), end_date: isoDate(51) }]);
    await expect(as(db, manager, (tx) => tx.query("update public.request_lines set product_id = $2 where request_id = $1", [r.id, lamp])))
      .rejects.toThrow(/read-only/);
  });
});

describe("returns", () => {
  it("rejects the same line twice in one return", async () => {
    const r = await submit(db, client, [{ product_id: sofa, quantity: 2, start_date: isoDate(1), end_date: isoDate(2) }]);
    await issueQuote(db, manager, r.id);
    await as(db, manager, (tx) => tx.query("update public.rental_requests set status = 'confirmed' where id = $1", [r.id]));
    await as(db, manager, (tx) => tx.query("update public.rental_requests set status = 'dispatched' where id = $1", [r.id]));
    const line = (await db.query<{ id: string }>("select id from public.request_lines where request_id = $1", [r.id])).rows[0].id;
    const dup = JSON.stringify([{ line_id: line, quantity: 2 }, { line_id: line, quantity: 2 }]);
    await expect(as(db, manager, (tx) => tx.query("select public.return_request($1, $2)", [r.id, dup]))).rejects.toThrow(/duplicate_or_invalid_lines/);
  });
});

describe("suspended accounts cannot write through owner policies", () => {
  it("blocks messages and favourites", async () => {
    await expect(as(db, suspended, (tx) => tx.query("insert into public.messages (channel, profile_id, subject, body) values ('site', $1, 'x', 'y')", [suspended])))
      .rejects.toThrow(/row-level security/);
    await expect(as(db, suspended, (tx) => tx.query("insert into public.favourites (product_id) values ($1)", [sofa])))
      .rejects.toThrow(/row-level security/);
    await as(db, client, (tx) => tx.query("insert into public.favourites (product_id) values ($1)", [sofa]));
  });
});
