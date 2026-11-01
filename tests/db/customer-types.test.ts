import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb, isoDate, migrateFrom, productId, submit, user } from "./harness";

// Particulier (customer), Particulier+ (customer_plus) and Professionnel: who reads which
// price rows, what signup may ask for, and the move of existing customers.

let db: PGlite;
const ids: Record<string, string> = {};

beforeAll(async () => {
  db = await freshDb();
  ids.particulier = await user(db, "part@example.com", "customer", "approved");
  ids.plusPending = await user(db, "plus-pending@example.com", "customer_plus", "pending");
  ids.plus = await user(db, "plus@example.com", "customer_plus", "approved");
  ids.plusSuspended = await user(db, "plus-suspended@example.com", "customer_plus", "suspended");
  ids.proPending = await user(db, "pro-pending@example.com", "professional", "pending");
  ids.pro = await user(db, "pro@example.com", "professional", "approved");
  ids.editor = await user(db, "editor@example.com", "editor");
  ids.manager = await user(db, "manager@example.com", "manager");
  ids.admin = await user(db, "admin@example.com", "admin");
});

const rows = (uid: string | null, sql: string) => as(db, uid, async (tx) => (await tx.query(sql)).rows.length);
const retail = "select * from public.product_prices where tier = 'retail'";
const pro = "select * from public.product_prices where tier = 'pro'";
const retailView = "select * from public.catalogue_prices where tier = 'retail'";

describe("price visibility", () => {
  it("gives visitors no price row (table and view), as an empty list rather than an error", async () => {
    // An error here took the storefront down (500) for visitors: queries must still succeed.
    expect(await rows(null, retail)).toBe(0);
    expect(await rows(null, retailView)).toBe(0);
    expect(await rows(null, pro)).toBe(0);
  });

  it("hides every price from a Particulier and from pending or suspended Particulier+", async () => {
    for (const who of ["particulier", "plusPending", "plusSuspended"]) {
      expect(await rows(ids[who], retail), who).toBe(0);
      expect(await rows(ids[who], retailView), who).toBe(0);
      expect(await rows(ids[who], pro), who).toBe(0);
    }
  });

  it("shows retail, not pro, to approved Particulier+, pending pros and editors", async () => {
    for (const who of ["plus", "proPending", "editor"]) {
      expect(await rows(ids[who], retail), who).toBeGreaterThan(0);
      expect(await rows(ids[who], retailView), who).toBeGreaterThan(0);
      expect(await rows(ids[who], pro), who).toBe(0);
    }
  });

  it("shows both tiers to approved pros, managers and admins", async () => {
    for (const who of ["pro", "manager", "admin"]) {
      expect(await rows(ids[who], retail), who).toBeGreaterThan(0);
      expect(await rows(ids[who], pro), who).toBeGreaterThan(0);
    }
  });

  it("still prices requests on the server for a Particulier and a visitor (retail)", async () => {
    const sofa = await productId(db, "kasaya-curved-sofa");
    const line = { product_id: sofa, quantity: 1, start_date: isoDate(60), end_date: isoDate(62) };
    for (const uid of [ids.particulier, null]) {
      const { id } = await submit(db, uid, [line], uid ? {} : { customer_email: "guest@example.com" });
      const { rows: l } = await db.query<{ tier: string; unit_price: string }>(
        "select r.tier, l.unit_price from public.request_lines l join public.rental_requests r on r.id = l.request_id where r.id = $1", [id]);
      expect(l[0].tier).toBe("retail");
      expect(Number(l[0].unit_price)).toBeGreaterThan(0);
    }
  });
});

describe("signup", () => {
  const signUp = async (email: string, meta: Record<string, unknown>) => {
    const { rows: r } = await db.query<{ id: string }>("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [email, JSON.stringify(meta)]);
    return (await db.query("select role, status, city, event_type from public.profiles where id = $1", [r[0].id])).rows[0];
  };

  it("offers the three customer types; Particulier+ and pros wait for staff", async () => {
    expect(await signUp("s1@example.com", { account_type: "customer" })).toMatchObject({ role: "customer", status: "approved" });
    expect(await signUp("s2@example.com", { account_type: "customer_plus", city: "Sousse", event_type: "wedding" }))
      .toEqual({ role: "customer_plus", status: "pending", city: "Sousse", event_type: "wedding" });
    expect(await signUp("s3@example.com", { account_type: "professional" })).toMatchObject({ role: "professional", status: "pending" });
  });

  it("refuses forged roles and unknown event types", async () => {
    for (const forged of ["admin", "manager", "editor", "superuser"]) {
      expect(await signUp(`f-${forged}@example.com`, { account_type: forged, role: "admin", status: "approved" }))
        .toMatchObject({ role: "customer", status: "approved" });
    }
    expect(await signUp("ev@example.com", { account_type: "customer_plus", event_type: "<script>" })).toMatchObject({ event_type: null });
  });

  it("does not let a Particulier promote themselves to Particulier+", async () => {
    await expect(as(db, ids.particulier, (tx) => tx.query("update public.profiles set role = 'customer_plus' where id = $1", [ids.particulier])))
      .rejects.toThrow(/only an admin can change roles/);
  });

  it("lets managers approve a pending Particulier+", async () => {
    const id = await user(db, "approve-me@example.com", "customer_plus", "pending");
    await as(db, ids.manager, (tx) => tx.query("update public.profiles set status = 'approved' where id = $1", [id]));
    expect((await db.query("select status from public.profiles where id = $1", [id])).rows[0]).toEqual({ status: "approved" });
  });
});

describe("existing accounts", () => {
  it("moves approved customers to Particulier+ and leaves everyone else alone", async () => {
    const old = await freshDb({ before: "20261026100000" });
    const make = async (email: string, meta: Record<string, unknown>, status?: string) => {
      const { rows: r } = await old.query<{ id: string }>("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [email, JSON.stringify(meta)]);
      if (status) await old.query("update public.profiles set status = $2 where id = $1", [r[0].id, status]);
      return r[0].id;
    };
    const approved = await make("c1@example.com", { account_type: "customer" });
    const suspended = await make("c2@example.com", { account_type: "customer" }, "suspended");
    const pendingPro = await make("p1@example.com", { account_type: "professional" });
    await migrateFrom(old, "20261026100000");
    const role = async (id: string) => (await old.query<{ role: string; status: string }>("select role, status from public.profiles where id = $1", [id])).rows[0];
    expect(await role(approved)).toEqual({ role: "customer_plus", status: "approved" });
    expect(await role(suspended)).toEqual({ role: "customer", status: "suspended" });
    expect(await role(pendingPro)).toEqual({ role: "professional", status: "pending" });
  });
});
