import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { acceptQuote, as, confirmRequest, freshDb, isoDate, issueQuote, pay, productId, submit, user } from "./harness";

// Sofa: 1150 per night, 12 units. One night of one sofa: 1150 TTC, so 575 deposit.
let db: PGlite;
let client: string, other: string, manager: string, admin: string;
let sofa: string;
let day = 200;

beforeAll(async () => {
  db = await freshDb();
  client = await user(db, "c@example.com");
  other = await user(db, "o@example.com");
  manager = await user(db, "m@example.com", "manager");
  admin = await user(db, "a@example.com", "admin");
  sofa = await productId(db, "kasaya-curved-sofa");
});

const line = (quantity = 1, nights = 1) => {
  day += nights + 2;
  return { product_id: sofa, quantity, start_date: isoDate(day), end_date: isoDate(day + nights) };
};
const request = async (id: string) => (await db.query<Record<string, string | boolean | null>>("select * from public.rental_requests where id = $1", [id])).rows[0];
const invoices = async (id: string) => (await db.query<Record<string, string>>("select * from public.invoices where request_id = $1 order by issued_at", [id])).rows;
const quoted = async (uid = client) => {
  const r = await submit(db, uid, [line()]);
  await issueQuote(db, manager, r.id);
  return r;
};

describe("accepting a quote", () => {
  it("records who, how and which terms, sets the deadline and issues the deposit invoice", async () => {
    const r = await quoted();
    const before = Date.now();
    const out = await acceptQuote(db, manager, r.id);
    expect(out).toMatchObject({ status: "accepted", confirmed: false, deposit_required: 575 });
    const row = await request(r.id);
    expect(row).toMatchObject({ status: "accepted", payment_status: "deposit_due", total_ttc: "1150.000", deposit_rate: "50.00", deposit_required: "575.000" });
    const hours = (new Date(row.deposit_due_at as string).getTime() - before) / 3_600_000;
    expect(hours).toBeGreaterThan(71.9);
    expect(hours).toBeLessThan(72.1);
    const a = (await db.query<Record<string, string>>("select * from public.quote_acceptances where request_id = $1", [r.id])).rows[0];
    expect(a).toMatchObject({ signer_name: "Test Client", channel: "phone", accepted_by: manager, revision: 1 });
    expect(a.terms_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await invoices(r.id)).toHaveLength(1);
  });

  it("needs the latest revision, the terms and a name", async () => {
    const r = await quoted();
    const old = (await db.query<{ id: string }>("select id from public.quotes where request_id = $1", [r.id])).rows[0].id;
    await issueQuote(db, manager, r.id);
    const accept = (quote: string, name: string, terms: boolean) => as(db, manager, (tx) => tx.query("select public.accept_quote($1, $2, $3, $4, 'phone')", [r.id, quote, name, terms]));
    await expect(accept(old, "Test", true)).rejects.toThrow(/quote_superseded/);
    const latest = (await db.query<{ id: string }>("select id from public.quotes where request_id = $1 order by revision desc limit 1", [r.id])).rows[0].id;
    await expect(accept(latest, "Test", false)).rejects.toThrow(/terms_required/);
    await expect(accept(latest, " ", true)).rejects.toThrow(/terms_required/);
  });

  it("lets the owner accept online, nobody else, and staff only by another channel", async () => {
    const r = await quoted();
    const q = (await db.query<{ id: string }>("select id from public.quotes where request_id = $1", [r.id])).rows[0].id;
    const accept = (uid: string | null, channel: string) => as(db, uid, (tx) => tx.query("select public.accept_quote($1, $2, 'Test Client', true, $3)", [r.id, q, channel]));
    await expect(accept(other, "online")).rejects.toThrow(/forbidden/);
    await expect(accept(manager, "online")).rejects.toThrow(/forbidden/);
    await expect(accept(client, "phone")).rejects.toThrow(/staff only/);
    await expect(accept(null, "online")).rejects.toThrow(/permission denied/);
    await accept(client, "online");
    expect((await request(r.id)).status).toBe("accepted");
    await expect(accept(client, "online")).rejects.toThrow(/cannot accept/);
  });

  it("refuses to issue anything while the company identity is missing", async () => {
    await db.query("update public.company_settings set tax_id = ''");
    const r = await quoted();
    await expect(acceptQuote(db, manager, r.id)).rejects.toThrow(/company_settings_incomplete/);
    expect((await request(r.id)).status).toBe("validated");
    expect(await invoices(r.id)).toHaveLength(0);
    await db.query("update public.company_settings set tax_id = '1234567/A/M/000'");
  });

  it("uses a negotiated client rate, frozen on the order", async () => {
    await as(db, manager, (tx) => tx.query("insert into public.client_notes (profile_id, deposit_rate_override) values ($1, 30)", [other]));
    const r = await quoted(other);
    expect(await acceptQuote(db, manager, r.id)).toMatchObject({ deposit_required: 345 });
    await as(db, manager, (tx) => tx.query("update public.client_notes set deposit_rate_override = 10 where profile_id = $1", [other]));
    expect((await request(r.id)).deposit_rate).toBe("30.00");
  });

  it("confirms at once when the agreed deposit is zero, with no invoice", async () => {
    const free = await user(db, "free@example.com");
    await as(db, manager, (tx) => tx.query("insert into public.client_notes (profile_id, deposit_rate_override) values ($1, 0)", [free]));
    const r = await quoted(free);
    expect(await acceptQuote(db, manager, r.id)).toMatchObject({ status: "confirmed", invoice_id: null });
    expect(await invoices(r.id)).toHaveLength(0);
  });
});

describe("payments", () => {
  it("confirms exactly when deposit payments reach the threshold, in two instalments", async () => {
    const r = await quoted();
    await acceptQuote(db, manager, r.id);
    expect(await pay(db, manager, r.id, "deposit", 574.999)).toMatchObject({ confirmed: false, payment_status: "deposit_due" });
    expect((await request(r.id)).status).toBe("accepted");
    expect(await pay(db, manager, r.id, "deposit", 0.001)).toMatchObject({ confirmed: true });
    expect(await request(r.id)).toMatchObject({ status: "confirmed", payment_status: "deposit_paid", deposit_paid: "575.000", paid_total: "575.000" });
  });

  it("rounds the threshold up to the millime", async () => {
    await db.query("update public.company_settings set deposit_rate = 33.33");
    const r = await submit(db, client, [{ ...line(), product_id: await productId(db, "kasaya-curved-sofa") }]);
    await issueQuote(db, manager, r.id);
    expect((await acceptQuote(db, manager, r.id)).deposit_required).toBe(383.295); // 1150 x 33.33 % = 383.2950
    await db.query("update public.company_settings set deposit_rate = 50");
  });

  it("does not count balance or caution towards the deposit", async () => {
    const r = await quoted();
    await acceptQuote(db, manager, r.id);
    await pay(db, manager, r.id, "balance", 600);
    await pay(db, manager, r.id, "caution_held", 1000);
    expect(await request(r.id)).toMatchObject({ status: "accepted", paid_total: "600.000", deposit_paid: "0.000" });
  });

  it("allows an over-payment and reports it as a credit", async () => {
    const r = await quoted();
    await acceptQuote(db, manager, r.id);
    expect(await pay(db, manager, r.id, "deposit", 2000)).toMatchObject({ confirmed: true, remaining: 0, overpaid: 849 }); // 1150 + 1 stamp
  });

  it("refuses bad amounts, unknown methods, unaccepted requests and non-staff", async () => {
    const r = await quoted();
    await expect(pay(db, manager, r.id, "deposit", 100)).rejects.toThrow(/quote_not_accepted/);
    await acceptQuote(db, manager, r.id);
    await expect(pay(db, manager, r.id, "deposit", 0)).rejects.toThrow(/invalid_amount/);
    await expect(pay(db, manager, r.id, "deposit", 1.0005)).rejects.toThrow(/invalid_amount/);
    await expect(pay(db, manager, r.id, "deposit", 10, "bitcoin")).rejects.toThrow(/check constraint/);
    await expect(pay(db, client, r.id, "deposit", 575)).rejects.toThrow(/staff only/);
    await expect(pay(db, manager, r.id, "caution_retained", 10)).rejects.toThrow(/invalid_kind/);
  });

  it("keeps payment rows immutable for everyone", async () => {
    const r = await quoted();
    await acceptQuote(db, manager, r.id);
    await pay(db, manager, r.id, "deposit", 575);
    await expect(as(db, admin, (tx) => tx.query("update public.payments set amount = 1 where request_id = $1", [r.id]))).rejects.toThrow(/permission denied/);
    await expect(as(db, admin, (tx) => tx.query("delete from public.payments where request_id = $1", [r.id]))).rejects.toThrow(/permission denied/);
    await expect(db.query("update public.payments set amount = 1 where request_id = $1", [r.id])).rejects.toThrow(/immutable/);
    await expect(db.query("delete from public.payments where request_id = $1", [r.id])).rejects.toThrow(/immutable/);
  });

  it("lets only admins void, with a reason, and sends the order back to waiting for its deposit", async () => {
    const r = await quoted();
    await acceptQuote(db, manager, r.id);
    await pay(db, manager, r.id, "deposit", 575);
    const id = (await db.query<{ id: string }>("select id from public.payments where request_id = $1", [r.id])).rows[0].id;
    const voidIt = (uid: string, reason: string) => as(db, uid, (tx) => tx.query("select public.void_payment($1, $2)", [id, reason]));
    await expect(voidIt(manager, "wrong amount")).rejects.toThrow(/admin only/);
    await expect(voidIt(admin, "x")).rejects.toThrow(/reason_required/);
    await voidIt(admin, "cheque returned");
    expect(await request(r.id)).toMatchObject({ status: "accepted", paid_total: "0.000", deposit_paid: "0.000", payment_status: "deposit_due" });
    await expect(voidIt(admin, "again")).rejects.toThrow(/already voided/);
  });

  it("only lets a caution be refunded up to what is held", async () => {
    const r = await quoted();
    await acceptQuote(db, manager, r.id);
    await pay(db, manager, r.id, "caution_held", 300);
    await expect(pay(db, manager, r.id, "caution_refund", 301)).rejects.toThrow(/invalid_amount/);
    await pay(db, manager, r.id, "caution_refund", 300);
    expect((await request(r.id)).paid_total).toBe("0.000"); // a caution is never revenue
  });
});

describe("confirming without a deposit", () => {
  it("is for admins, needs a reason and leaves an audit row", async () => {
    const r = await quoted();
    await acceptQuote(db, manager, r.id);
    const confirm = (uid: string, reason: string) => as(db, uid, (tx) => tx.query("select public.confirm_without_deposit($1, $2)", [r.id, reason]));
    await expect(confirm(manager, "good client")).rejects.toThrow(/admin only/);
    await expect(confirm(admin, " ")).rejects.toThrow(/reason_required/);
    await confirm(admin, "Client historique");
    expect(await request(r.id)).toMatchObject({ status: "confirmed", deposit_waived_by: admin, deposit_waived_reason: "Client historique" });
    expect((await db.query("select actor, action, reason from public.admin_audit where request_id = $1", [r.id])).rows)
      .toEqual([{ actor: admin, action: "confirm_without_deposit", reason: "Client historique" }]);
  });
});

describe("changes after acceptance", () => {
  const move = (r: { id: string }, lineId: string, from: number) => as(db, manager, (tx) => tx.query("select public.reschedule_request($1, $2)",
    [r.id, JSON.stringify([{ id: lineId, start_date: isoDate(from), end_date: isoDate(from + 2) }])]));
  const lineOf = async (id: string) => (await db.query<{ id: string }>("select id from public.request_lines where request_id = $1", [id])).rows[0].id;

  it("blocks delivery until the new revision is accepted, and carries payments over", async () => {
    const r = await submit(db, client, [line()]);
    await confirmRequest(db, manager, r.id);
    day += 5;
    await move(r, await lineOf(r.id), day);
    expect(await request(r.id)).toMatchObject({ status: "confirmed", reacceptance_required: true });
    await expect(as(db, manager, (tx) => tx.query("update public.rental_requests set status = 'dispatched' where id = $1", [r.id]))).rejects.toThrow(/reacceptance_required/);

    // Two nights now: 2300, so 1150 is required and 575 is still to pay. The order waits for it.
    await issueQuote(db, manager, r.id);
    expect((await request(r.id)).status).toBe("confirmed");
    expect(await acceptQuote(db, manager, r.id)).toMatchObject({ status: "accepted", confirmed: false, deposit_required: 1150 });
    expect(await request(r.id)).toMatchObject({ reacceptance_required: false, deposit_paid: "575.000", total_ttc: "2300.000", payment_status: "deposit_due" });
    expect((await invoices(r.id)).map((i) => i.ttc)).toEqual(["575.000", "575.000"]); // only the top-up
    expect(await pay(db, manager, r.id, "deposit", 575)).toMatchObject({ confirmed: true });
  });

  it("stays confirmed when the paid deposit still covers the new total", async () => {
    const r = await submit(db, client, [line(1, 3)]);
    await confirmRequest(db, manager, r.id); // 3450: 1725 paid
    day += 8;
    const l = await lineOf(r.id);
    await as(db, manager, (tx) => tx.query("select public.reschedule_request($1, $2)", [r.id, JSON.stringify([{ id: l, start_date: isoDate(day), end_date: isoDate(day + 1) }])]));
    await issueQuote(db, manager, r.id);
    expect(await acceptQuote(db, manager, r.id)).toMatchObject({ status: "confirmed", invoice_id: null, deposit_required: 575 });
  });
});

describe("cancelling an order", () => {
  it("credits what staff choose and needs a reason; the refund is a separate admin payment", async () => {
    const r = await quoted();
    await acceptQuote(db, manager, r.id);
    await pay(db, manager, r.id, "deposit", 575);
    const cancel = (reason: string, credit: number) => as(db, manager, async (tx) => (await tx.query<{ r: { credit_note_id: string } }>("select public.cancel_order($1, $2, $3) as r", [r.id, reason, credit])).rows[0].r);
    await expect(cancel("", 100)).rejects.toThrow(/reason_required/);
    await expect(cancel("Client annule", 575.001)).rejects.toThrow(/invalid_amount/);
    const { credit_note_id } = await cancel("Client annule", 287.5);
    expect((await request(r.id)).status).toBe("cancelled");
    const note = (await db.query<Record<string, string>>("select * from public.invoices where id = $1", [credit_note_id])).rows[0];
    expect(note).toMatchObject({ type: "credit_note", ttc: "287.500", stamp: "0.000" });
    expect(note.number).toMatch(/^AV-\d{4}-\d{5}$/);
    await expect(pay(db, manager, r.id, "refund", 100)).rejects.toThrow(/refunds are for admins/);
    await expect(pay(db, admin, r.id, "refund", 575.001)).rejects.toThrow(/invalid_amount/);
    await pay(db, admin, r.id, "refund", 575);
    expect(await request(r.id)).toMatchObject({ paid_total: "0.000", payment_status: "refunded" });
  });
});

describe("capacity by status", () => {
  const available = async (d: number) => (await db.query<{ available: number }>("select available from public.product_availability($1, 'TN', $2, $2)", [sofa, isoDate(d)])).rows[0].available;

  it("holds stock from acceptance and keeps holding when the quote's validity ends", async () => {
    const start = (day += 5);
    const r = await submit(db, client, [{ product_id: sofa, quantity: 12, start_date: isoDate(start), end_date: isoDate(start + 1) }]);
    await issueQuote(db, manager, r.id);
    await acceptQuote(db, manager, r.id);
    expect(await available(start)).toBe(0);
    await db.query("update public.rental_requests set quote_valid_until = current_date - 1 where id = $1", [r.id]);
    expect(await available(start)).toBe(0);
    await expect(submit(db, client, [{ product_id: sofa, quantity: 1, start_date: isoDate(start), end_date: isoDate(start + 1) }]).then((x) => issueQuote(db, manager, x.id))).rejects.toThrow(/capacity_exceeded/);
    await as(db, manager, (tx) => tx.query("select public.cancel_order($1, 'libère le stock')", [r.id]));
    expect(await available(start)).toBe(12);
  });
});

describe("the fields behind all this", () => {
  it("are read-only for clients and staff alike", async () => {
    const r = await quoted();
    for (const set of ["paid_total = 1", "payment_status = 'paid'", "deposit_required = 0", "reacceptance_required = true", "access_token_hash = 'x'"]) {
      await expect(as(db, manager, (tx) => tx.query(`update public.rental_requests set ${set} where id = $1`, [r.id]))).rejects.toThrow(/read-only/);
    }
  });
});

describe("what clients read", () => {
  it("gives owners their payments without the internal note or proof, and nobody else anything", async () => {
    const r = await quoted();
    await acceptQuote(db, manager, r.id);
    await as(db, manager, (tx) => tx.query("select public.record_payment($1, 'deposit', 'cheque', 575, null, 'CHQ-1', 'proofs/x.pdf', 'à vérifier')", [r.id]));
    expect((await as(db, client, (tx) => tx.query("select * from public.payments"))).rows).toHaveLength(0);
    const view = (await as(db, client, (tx) => tx.query<{ v: { payments: Record<string, unknown>[]; invoices: unknown[]; company: Record<string, string> } }>("select public.my_request_view($1) as v", [r.id]))).rows[0].v;
    expect(view.payments).toEqual([expect.objectContaining({ kind: "deposit", amount: 575, reference: "CHQ-1" })]);
    expect(JSON.stringify(view.payments)).not.toMatch(/à vérifier|proofs/);
    expect(view.invoices).toHaveLength(1);
    expect(view.company.rib).toBe("12345678901234567890");
    expect((await as(db, other, (tx) => tx.query<{ v: unknown }>("select public.my_request_view($1) as v", [r.id]))).rows[0].v).toBeNull();
  });
});

describe("guest tracking", () => {
  const token = "a".repeat(43);
  const hash = async (t: string) => (await db.query<{ h: string }>("select encode(sha256(convert_to($1, 'UTF8')), 'hex') as h", [t])).rows[0].h;
  let id: string;

  beforeEach(async () => {
    await db.query("delete from private.rate_limits");
  });

  it("opens a request with its token and accepts its quote without an account", async () => {
    const r = await submit(db, null, [line()], { customer_email: "guest@example.com" });
    id = r.id;
    await db.query("update public.rental_requests set access_token_hash = $2 where id = $1", [id, await hash(token)]);
    await issueQuote(db, manager, id);
    const view = (await as(db, null, (tx) => tx.query<{ v: { reference: string; can_accept: boolean; quote: { id: string } } }>("select public.track_request($1) as v", [token]))).rows[0].v;
    expect(view).toMatchObject({ reference: r.reference, can_accept: true });
    await as(db, null, (tx) => tx.query("select public.accept_quote_by_token($1, $2, 'Invité Test', true)", [token, view.quote.id]));
    expect((await request(id)).status).toBe("accepted");
    expect((await db.query("select accepted_by, channel from public.quote_acceptances where request_id = $1", [id])).rows[0]).toEqual({ accepted_by: null, channel: "online" });
  });

  it("answers the same for a wrong token, a malformed one and a rate-limited one", async () => {
    const track = async (t: string) => (await as(db, null, (tx) => tx.query<{ v: unknown }>("select public.track_request($1) as v", [t]))).rows[0].v;
    expect(await track("b".repeat(43))).toBeNull();
    expect(await track("short")).toBeNull();
    for (let i = 0; i < 60; i++) await track(token);
    expect(await track(token)).toBeNull();
  });

  it("has no anonymous table access", async () => {
    await expect(as(db, null, (tx) => tx.query("select * from public.invoices"))).rejects.toThrow(/permission denied/);
    await expect(as(db, null, (tx) => tx.query("select * from public.payments"))).rejects.toThrow(/permission denied/);
    await expect(as(db, null, (tx) => tx.query("select public.my_request_view($1)", [id]))).rejects.toThrow(/permission denied/);
  });
});
