import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, freshDb, isoDate, issueQuote, productId, submit, user } from "./harness";

let db: PGlite;
let customerA: string, customerB: string, pro: string, pendingPro: string;
let editor: string, manager: string, admin: string;
let sofa: string;

beforeAll(async () => {
  db = await freshDb();
  customerA = await user(db, "a@example.com");
  customerB = await user(db, "b@example.com");
  pro = await user(db, "pro@example.com", "professional", "approved");
  pendingPro = await user(db, "pending@example.com", "professional", "pending");
  editor = await user(db, "editor@example.com", "editor");
  manager = await user(db, "manager@example.com", "manager");
  admin = await user(db, "admin@example.com", "admin");
  sofa = await productId(db, "kasaya-curved-sofa");
});

const count = async (uid: string | null, sql: string, params: unknown[] = []) =>
  as(db, uid, async (tx) => (await tx.query(sql, params)).rows.length);

describe("signup trigger", () => {
  it("never grants staff roles from user-editable metadata", async () => {
    const { rows } = await db.query<{ id: string }>(
      "insert into auth.users (email, raw_user_meta_data) values ('evil@example.com', $1) returning id",
      [JSON.stringify({ role: "admin", status: "approved", account_type: "admin" })],
    );
    const p = await db.query("select role, status from public.profiles where id = $1", [rows[0].id]);
    expect(p.rows[0]).toEqual({ role: "customer", status: "approved" });
  });

  it("creates professionals as pending", async () => {
    const { rows } = await db.query<{ id: string }>(
      "insert into auth.users (email, raw_user_meta_data) values ('newpro@example.com', $1) returning id",
      [JSON.stringify({ account_type: "professional", full_name: "  Pro  " })],
    );
    const p = await db.query("select role, status, full_name from public.profiles where id = $1", [rows[0].id]);
    expect(p.rows[0]).toEqual({ role: "professional", status: "pending", full_name: "Pro" });
  });
});

describe("prices", () => {
  const proRows = "select * from public.product_prices where tier = 'pro'";
  const proView = "select * from public.catalogue_prices where tier = 'pro'";

  it("hides pro prices from anon, customers and pending pros (table and view)", async () => {
    for (const uid of [null, customerA, pendingPro, editor]) {
      expect(await count(uid, proRows)).toBe(0);
      expect(await count(uid, proView)).toBe(0);
    }
    expect(await count(null, "select * from public.product_prices where tier = 'retail'")).toBeGreaterThan(0);
  });

  it("shows pro prices to approved pros and operations staff", async () => {
    for (const uid of [pro, manager, admin]) expect(await count(uid, proRows)).toBeGreaterThan(0);
  });

  it("lets only admins change prices", async () => {
    const vase = await productId(db, "vase");
    const upd = "update public.product_prices set amount = amount where product_id = $1 and tier = 'retail' returning 1";
    expect(await count(manager, upd, [vase])).toBe(0);
    expect(await count(admin, upd, [vase])).toBe(2);
  });
});

describe("profiles", () => {
  it("blocks self-promotion of role and status", async () => {
    await expect(as(db, customerA, (tx) => tx.query("update public.profiles set role = 'admin' where id = $1", [customerA])))
      .rejects.toThrow(/only an admin can change roles/);
    await expect(as(db, pendingPro, (tx) => tx.query("update public.profiles set status = 'approved' where id = $1", [pendingPro])))
      .rejects.toThrow(/only staff/);
  });

  it("allows editing own contact details", async () => {
    expect(await count(customerA, "update public.profiles set full_name = 'Alice' where id = $1 returning 1", [customerA])).toBe(1);
  });

  it("hides other profiles from customers", async () => {
    expect(await count(customerA, "select * from public.profiles where id = $1", [customerB])).toBe(0);
  });

  it("lets managers approve pros but not change roles or staff status", async () => {
    expect(await count(manager, "update public.profiles set status = 'approved' where id = $1 returning 1", [pendingPro])).toBe(1);
    await expect(as(db, manager, (tx) => tx.query("update public.profiles set role = 'admin' where id = $1", [customerB])))
      .rejects.toThrow(/only an admin/);
    await expect(as(db, manager, (tx) => tx.query("update public.profiles set status = 'suspended' where id = $1", [admin])))
      .rejects.toThrow(/staff account status/);
    await db.query("update public.profiles set status = 'pending' where id = $1", [pendingPro]);
  });

  it("refuses to demote the last approved admin", async () => {
    await expect(as(db, admin, (tx) => tx.query("update public.profiles set role = 'manager' where id = $1", [admin])))
      .rejects.toThrow(/last approved admin/);
  });

  it("applies suspension immediately", async () => {
    const m2 = await user(db, "m2@example.com", "manager");
    expect(await count(m2, "select * from public.client_notes")).toBe(0);
    expect(await count(m2, "select * from public.profiles")).toBeGreaterThan(1);
    await db.query("update public.profiles set status = 'suspended' where id = $1", [m2]);
    expect(await count(m2, "select * from public.profiles")).toBe(1);
  });

  it("keeps staff notes away from the client they describe", async () => {
    await as(db, manager, (tx) => tx.query("insert into public.client_notes (profile_id, notes) values ($1, 'late payer')", [customerA]));
    expect(await count(customerA, "select * from public.client_notes")).toBe(0);
    expect(await count(manager, "select * from public.client_notes")).toBe(1);
  });
});

describe("requests and quotes", () => {
  it("isolates customers from each other's requests, lines and quotes", async () => {
    const r = await submit(db, customerA, [{ product_id: sofa, quantity: 1, start_date: isoDate(10), end_date: isoDate(12) }]);
    await issueQuote(db, manager, r.id);
    expect(await count(customerA, "select * from public.rental_requests where id = $1", [r.id])).toBe(1);
    expect(await count(customerA, "select * from public.quotes where request_id = $1", [r.id])).toBe(1);
    expect(await count(customerB, "select * from public.rental_requests where id = $1", [r.id])).toBe(0);
    expect(await count(customerB, "select * from public.request_lines where request_id = $1", [r.id])).toBe(0);
    expect(await count(customerB, "select * from public.quotes where request_id = $1", [r.id])).toBe(0);
    expect(await count(null, "select 1 from public.rental_requests").catch(() => -1)).toBe(-1);
  });

  it("denies direct inserts; the RPC ignores forged owner, status and prices", async () => {
    await expect(as(db, customerA, (tx) => tx.query(
      "insert into public.rental_requests (customer_name, customer_email, customer_phone, country, tier, idempotency_key) values ('x','x@x.io','123456','FR','pro', gen_random_uuid())",
    ))).rejects.toThrow(/permission denied/);

    const r = await submit(db, customerA, [{ product_id: sofa, quantity: 1, start_date: isoDate(20), end_date: isoDate(21), unit_price: 0 } as never], {
      user_id: customerB, status: "confirmed", tier: "pro", estimated_subtotal: 1,
    });
    const { rows } = await db.query<{ user_id: string; status: string; tier: string; unit_price: string }>(
      "select r.user_id, r.status, r.tier, l.unit_price from public.rental_requests r join public.request_lines l on l.request_id = r.id where r.id = $1",
      [r.id],
    );
    expect(rows[0]).toMatchObject({ user_id: customerA, status: "submitted", tier: "retail", unit_price: "350.000" });
  });

  it("makes quotes immutable for everyone", async () => {
    const r = await submit(db, customerA, [{ product_id: sofa, quantity: 1, start_date: isoDate(30), end_date: isoDate(31) }]);
    const q = await issueQuote(db, manager, r.id);
    await expect(as(db, admin, (tx) => tx.query("update public.quotes set snapshot = '{}' where id = $1", [q])))
      .rejects.toThrow(/permission denied/);
    await expect(db.query("delete from public.quotes where id = $1", [q])).rejects.toThrow(/immutable/);
  });

  it("lets a client cancel their own pending request and nothing else", async () => {
    const r = await submit(db, customerA, [{ product_id: sofa, quantity: 1, start_date: isoDate(40), end_date: isoDate(41) }]);
    await expect(as(db, customerA, (tx) => tx.query("update public.rental_requests set status = 'confirmed' where id = $1", [r.id])))
      .rejects.toThrow(/invalid status transition/);
    await expect(as(db, customerA, (tx) => tx.query("update public.rental_requests set notes = 'x', status = 'cancelled' where id = $1", [r.id])))
      .rejects.toThrow(/only cancel/);
    expect(await count(customerB, "update public.rental_requests set status = 'cancelled' where id = $1 returning 1", [r.id])).toBe(0);
    expect(await count(customerA, "update public.rental_requests set status = 'cancelled' where id = $1 returning 1", [r.id])).toBe(1);
  });

  it("forbids clients from issuing quotes or editing lines", async () => {
    const r = await submit(db, customerA, [{ product_id: sofa, quantity: 1, start_date: isoDate(50), end_date: isoDate(51) }]);
    await expect(issueQuote(db, customerA, r.id)).rejects.toThrow(/staff only/);
    expect(await count(customerA, "update public.request_lines set quantity = 5 where request_id = $1 returning 1", [r.id])).toBe(0);
  });
});

describe("inbox, favourites, CMS, FX, storage", () => {
  it("keeps messages and internal notes private", async () => {
    const msg = await as(db, customerA, async (tx) =>
      (await tx.query<{ id: string }>("insert into public.messages (channel, profile_id, subject, body) values ('site', $1, 'Hi', 'Question') returning id", [customerA])).rows[0].id,
    );
    await as(db, manager, (tx) => tx.query("insert into public.message_replies (message_id, author_id, body, internal) values ($1, $2, 'note to self', true), ($1, $2, 'Hello!', false)", [msg, manager]));
    expect(await count(customerA, "select * from public.message_replies where message_id = $1", [msg])).toBe(1);
    expect(await count(customerB, "select * from public.messages where id = $1", [msg])).toBe(0);
    await expect(as(db, customerA, (tx) => tx.query("insert into public.messages (channel, profile_id, subject, body) values ('whatsapp', $1, 'x', 'y')", [customerA])))
      .rejects.toThrow(/row-level security/);
  });

  it("accepts validated contact enquiries from anon, visible only to staff", async () => {
    await as(db, null, (tx) => tx.query("select public.submit_contact($1)", [JSON.stringify({ name: "Guest", email: "g@example.com", subject: "Wedding", body: "Need 50 chairs" })]));
    expect(await count(manager, "select * from public.messages where channel = 'contact' and email = 'g@example.com'")).toBe(1);
    expect(await count(customerA, "select * from public.messages where channel = 'contact'")).toBe(0);
    await expect(as(db, null, (tx) => tx.query("select public.submit_contact($1)", [JSON.stringify({ name: "", email: "bad", subject: "x", body: "y" })])))
      .rejects.toThrow(/invalid_contact/);
    await expect(as(db, null, (tx) => tx.query("insert into public.messages (channel, subject, body) values ('contact','x','y')")))
      .rejects.toThrow(/permission denied/);
  });

  it("scopes favourites to their owner", async () => {
    await as(db, customerA, (tx) => tx.query("insert into public.favourites (product_id) values ($1)", [sofa]));
    expect(await count(customerA, "select * from public.favourites")).toBe(1);
    expect(await count(customerB, "select * from public.favourites")).toBe(0);
  });

  it("lets editors publish CMS but not touch the catalogue", async () => {
    expect(await count(editor, "insert into public.cms_content (locale, content) values ('fr', '{}') returning 1")).toBe(1);
    expect(await count(editor, "update public.products set title_fr = 'x' returning 1")).toBe(0);
    await expect(as(db, customerA, (tx) => tx.query("insert into public.cms_content (locale, content) values ('ar', '{}')")))
      .rejects.toThrow(/row-level security/);
    expect(await count(null, "select * from public.cms_content")).toBe(1);
  });

  it("allows only admins to set a manual exchange rate", async () => {
    const ins = "insert into public.fx_rates (rate_eur_tnd, source, provider_time, effective_until) values (3.4, 'manual', now(), now() + interval '1 day')";
    await expect(as(db, manager, (tx) => tx.query(ins))).rejects.toThrow(/row-level security/);
    await as(db, admin, (tx) => tx.query(ins));
    await db.query("delete from public.fx_rates where source = 'manual'");
  });

  it("restricts product image uploads to operations staff", async () => {
    const ins = "insert into storage.objects (bucket_id, name) values ('product-images', 'x.jpg')";
    await expect(as(db, customerA, (tx) => tx.query(ins))).rejects.toThrow(/row-level security/);
    await expect(as(db, editor, (tx) => tx.query(ins))).rejects.toThrow(/row-level security/);
    await as(db, manager, (tx) => tx.query(ins));
  });
});
