import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, closeInspection, confirmRequest, dispatch, freshDb, isoDate, linesOf, pay, productId, receiveReturn, submit, user } from "./harness";

// Sofa: 1150 a night, 12 owned. Each test uses its own product row, so stock figures stay readable.
let db: PGlite;
let client: string, other: string, pro: string, manager: string, admin: string;
let sofa: string, lamp: string;
let day = 500;

beforeAll(async () => {
  db = await freshDb();
  client = await user(db, "c@example.com");
  other = await user(db, "o@example.com");
  pro = await user(db, "pro@example.com", "professional");
  manager = await user(db, "m@example.com", "manager");
  admin = await user(db, "a@example.com", "admin");
  sofa = await productId(db, "kasaya-curved-sofa");
  lamp = await productId(db, "radiant-alabaster-floor-lamp");
});

const line = (quantity = 1, product = sofa) => {
  day += 3;
  return { product_id: product, quantity, start_date: isoDate(day), end_date: isoDate(day + 1) };
};
const delivered = async (quantity = 4, uid = client, product = sofa) => {
  const r = await submit(db, uid, [line(quantity, product)]);
  await confirmRequest(db, manager, r.id);
  await dispatch(db, manager, r.id);
  return r;
};
const stock = async (p = sofa) => (await db.query<{ quantity_owned: number; quantity_maintenance: number }>("select quantity_owned, quantity_maintenance from public.product_stock where product_id = $1", [p])).rows[0];
const request = async (id: string) => (await db.query<Record<string, string>>("select * from public.rental_requests where id = $1", [id])).rows[0];
const movements = async (id: string) => (await db.query<{ reason: string; delta_owned: number; delta_maintenance: number }>("select reason, delta_owned, delta_maintenance from public.stock_movements where request_id = $1 order by id", [id])).rows;
const finalInvoice = async (id: string) => (await db.query<{ number: string; ttc: string; ht: string; tva: string; stamp: string; total_due: string; snapshot: Record<string, never> }>("select * from public.invoices where request_id = $1 and type = 'final'", [id])).rows[0];
const logistics = async (id: string) => (await db.query<{ logistics_status: string; received_qty: number | null }>("select logistics_status, received_qty from public.request_lines where request_id = $1", [id])).rows;
const repairStock = async () => {
  await db.query("update public.product_stock set quantity_owned = 12, quantity_maintenance = 0 where product_id = $1", [sofa]);
};

describe("logistics", () => {
  it("follows the line from reserved to delivered, inspected", async () => {
    const r = await submit(db, client, [line(1)]);
    expect(await logistics(r.id)).toEqual([{ logistics_status: "reserved", received_qty: null }]);
    await confirmRequest(db, manager, r.id);
    await dispatch(db, manager, r.id);
    expect((await logistics(r.id))[0].logistics_status).toBe("delivered");
    await receiveReturn(db, manager, r.id);
    expect(await logistics(r.id)).toEqual([{ logistics_status: "under_inspection", received_qty: 1 }]);
    await closeInspection(db, manager, r.id);
    expect((await logistics(r.id))[0].logistics_status).toBe("inspected");
  });

  it("is read-only for staff through the API", async () => {
    const r = await delivered(1);
    await expect(as(db, manager, (tx) => tx.query("update public.request_lines set logistics_status = 'inspected' where request_id = $1", [r.id]))).rejects.toThrow(/read-only/);
  });
});

describe("reception", () => {
  it("needs a delivered order and staff", async () => {
    const r = await submit(db, client, [line(1)]);
    await expect(receiveReturn(db, manager, r.id)).rejects.toThrow(/invalid status transition/);
    const d = await delivered(1);
    await expect(receiveReturn(db, client, d.id)).rejects.toThrow(/staff only/);
  });

  it("records what came back, and who took it", async () => {
    const r = await delivered(4);
    const [l] = await linesOf(db, r.id);
    await expect(receiveReturn(db, manager, r.id, [{ line_id: l.id, received: 5 }])).rejects.toThrow(/invalid_quantity/);
    await receiveReturn(db, manager, r.id, [{ line_id: l.id, received: 3 }]);
    expect(await request(r.id)).toMatchObject({ status: "returned", received_by: manager });
    expect((await logistics(r.id))[0].received_qty).toBe(3);
    await closeInspection(db, manager, r.id, [{ ok: 3, missing: 1 }]);
    await repairStock();
  });

  it("can't be refused because a booking elsewhere is short", async () => {
    const r = await delivered(2);
    await db.query("update public.product_stock set quantity_maintenance = 12 where product_id = $1", [sofa]);
    await receiveReturn(db, manager, r.id);
    expect((await request(r.id)).status).toBe("returned");
    await repairStock();
    await closeInspection(db, manager, r.id);
  });
});

describe("the sum rule", () => {
  it("wants every unit accounted for", async () => {
    const r = await delivered(4);
    await receiveReturn(db, manager, r.id);
    await expect(closeInspection(db, manager, r.id, [{ ok: 3 }])).rejects.toThrow(/inspection_sum_mismatch/);
    await expect(closeInspection(db, manager, r.id, [{ ok: 5 }])).rejects.toThrow(/inspection_sum_mismatch/);
    await expect(closeInspection(db, manager, r.id, [{ ok: 5, minor: -1 }])).rejects.toThrow(/inspection_sum_mismatch/);
    await closeInspection(db, manager, r.id);
  });

  it("carries units that never came back into missing", async () => {
    const r = await delivered(4);
    const [l] = await linesOf(db, r.id);
    await receiveReturn(db, manager, r.id, [{ line_id: l.id, received: 3 }]);
    await expect(closeInspection(db, manager, r.id)).rejects.toThrow(/inspection_sum_mismatch/); // 4 ok, 1 absent
    await closeInspection(db, manager, r.id, [{ ok: 3, missing: 1 }]);
    await repairStock();
  });

  it("needs every line, once", async () => {
    const r = await submit(db, client, [line(1), line(1, lamp)]);
    await confirmRequest(db, manager, r.id);
    await dispatch(db, manager, r.id);
    await receiveReturn(db, manager, r.id);
    const [a] = await linesOf(db, r.id);
    const close = (lines: unknown[]) => as(db, manager, (tx) => tx.query("select public.close_inspection($1, $2)", [r.id, JSON.stringify(lines)]));
    await expect(close([{ line_id: a.id, ok: 1 }])).rejects.toThrow(/inspection_sum_mismatch/);
    await expect(close([{ line_id: a.id, ok: 1 }, { line_id: a.id, ok: 1 }])).rejects.toThrow(/inspection_sum_mismatch/);
    await closeInspection(db, manager, r.id);
  });
});

describe("stock effects", () => {
  it("puts ok units straight back, and leaves minor ones a touch-up note", async () => {
    const r = await delivered(4);
    await receiveReturn(db, manager, r.id);
    await closeInspection(db, manager, r.id, [{ ok: 3, minor: 1 }]);
    expect(await stock()).toEqual({ quantity_owned: 12, quantity_maintenance: 0 });
    expect(await movements(r.id)).toEqual([{ reason: "touch_up", delta_owned: 0, delta_maintenance: 0 }]);
  });

  it("sends damaged and broken units to maintenance, flagged differently", async () => {
    const r = await delivered(4);
    await receiveReturn(db, manager, r.id);
    await closeInspection(db, manager, r.id, [{ ok: 1, damaged: 2, broken: 1 }]);
    expect(await stock()).toEqual({ quantity_owned: 12, quantity_maintenance: 3 });
    expect(await movements(r.id)).toEqual([
      { reason: "to_repair", delta_owned: 0, delta_maintenance: 2 },
      { reason: "to_write_off", delta_owned: 0, delta_maintenance: 1 },
    ]);
    await repairStock();
  });

  it("takes missing units out of the owned stock, even when that leaves a booking short", async () => {
    const r = await delivered(2);
    const later = (day += 3);
    const held = await submit(db, client, [{ product_id: sofa, quantity: 11, start_date: isoDate(later), end_date: isoDate(later + 1) }]);
    await confirmRequest(db, manager, held.id);
    await receiveReturn(db, manager, r.id);
    await closeInspection(db, manager, r.id, [{ ok: 0, missing: 2 }]);
    expect(await stock()).toEqual({ quantity_owned: 10, quantity_maintenance: 0 });
    expect(await movements(r.id)).toEqual([{ reason: "lost", delta_owned: -2, delta_maintenance: 0 }]);
    const conflicts = await as(db, manager, async (tx) => (await tx.query("select * from public.capacity_conflicts()")).rows);
    expect(conflicts.length).toBeGreaterThan(0);
    await as(db, manager, (tx) => tx.query("select public.cancel_order($1, 'nettoyage du test')", [held.id]));
    await repairStock();
  });

  it("lets staff resolve maintenance, and an admin record a found piece, all in the ledger", async () => {
    await db.query("update public.product_stock set quantity_maintenance = 3 where product_id = $1", [sofa]);
    const resolve = (uid: string, qty: number, outcome: string) => as(db, uid, (tx) => tx.query("select public.resolve_maintenance($1, $2, $3)", [sofa, qty, outcome]));
    await expect(resolve(client, 1, "repaired")).rejects.toThrow(/staff only/);
    await expect(resolve(manager, 4, "repaired")).rejects.toThrow(/invalid_quantity/);
    await resolve(manager, 2, "repaired");
    expect(await stock()).toEqual({ quantity_owned: 12, quantity_maintenance: 1 });
    await resolve(manager, 1, "written_off");
    expect(await stock()).toEqual({ quantity_owned: 11, quantity_maintenance: 0 });
    const found = (uid: string) => as(db, uid, (tx) => tx.query("select public.record_found($1, 1, null, 'Retrouvée au dépôt')", [sofa]));
    await expect(found(manager)).rejects.toThrow(/admin only/);
    await found(admin);
    expect(await stock()).toEqual({ quantity_owned: 12, quantity_maintenance: 0 });
    const { rows } = await db.query<{ reason: string; note: string }>("select reason, note from public.stock_movements where product_id = $1 order by id desc limit 3", [sofa]);
    expect(rows.map((x) => x.reason)).toEqual(["found", "written_off", "repaired"]);
  });

  it("keeps the ledger immutable", async () => {
    await expect(db.query("delete from public.stock_movements")).rejects.toThrow(/immutable/);
    await expect(as(db, admin, (tx) => tx.query("update public.stock_movements set delta_owned = 1"))).rejects.toThrow(/permission denied/);
  });
});

describe("capacity", () => {
  it("is released only when the inspection closes", async () => {
    const r = await delivered(12);
    const available = async () => (await db.query<{ available: number }>("select available from public.product_availability($1, 'TN', $2, $2)", [sofa, isoDate(0)])).rows[0].available;
    await db.exec("alter table public.request_lines disable trigger guard_line");
    await db.query("update public.request_lines set start_date = $2, end_date = $3 where request_id = $1", [r.id, isoDate(-3), isoDate(-1)]);
    await db.exec("alter table public.request_lines enable trigger guard_line");
    expect(await available()).toBe(0);
    await receiveReturn(db, manager, r.id);
    expect(await available()).toBe(0);
    await closeInspection(db, manager, r.id);
    expect(await available()).toBe(12);
  });
});

describe("the final invoice", () => {
  it("bills every line, adds fees, and takes off the deposit invoice", async () => {
    const r = await delivered(2); // 2300 TTC, 1150 deposit paid
    await receiveReturn(db, manager, r.id);
    const out = await closeInspection(db, manager, r.id, [{ ok: 1, damaged: 1, fee: 119, fee_reason: "Tissu taché" }]);
    expect(out).toMatchObject({ total_fees: 119, payment_status: "balance_due" });
    const i = await finalInvoice(r.id);
    expect(i.number).toMatch(/^F-\d{4}-\d{5}$/);
    const s = i.snapshot as unknown as {
      lines: { label_fr: string; ttc: number }[]; gross: { ttc: number }; deductions: { ttc: number }[]; totals: { ttc: number; stamp: number; total_due: number };
      paid: number; net_to_pay: number; own_by_rate: { rate: number; ttc: number }[];
    };
    expect(s.lines.map((l) => l.ttc)).toEqual([2300, 119]);
    expect(s.lines[1].label_fr).toContain("Remise en état");
    expect(s.gross.ttc).toBe(2419);
    expect(s.deductions).toEqual([expect.objectContaining({ ttc: 1150 })]);
    expect(s.totals).toMatchObject({ ttc: 1269, stamp: 1, total_due: 1270 }); // this document's own amounts
    expect(s.own_by_rate).toEqual([expect.objectContaining({ rate: 19, ttc: 1269 })]);
    // Owed in all: 1151 + 1270 = 2421. Received: 1150. The deposit invoice's stamp is still due.
    expect(s.paid).toBe(-1);
    expect(s.net_to_pay).toBe(1271);
    await repairStock();
    await pay(db, manager, r.id, "balance", 1271);
    expect(await request(r.id)).toMatchObject({ payment_status: "paid", paid_total: "2421.000" });
  });

  it("never counts VAT twice between the deposit and final invoices", async () => {
    const r = await delivered(1);
    await receiveReturn(db, manager, r.id);
    await closeInspection(db, manager, r.id);
    const { rows } = await db.query<{ ht: string; tva: string; ttc: string }>("select sum(ht) as ht, sum(tva) as tva, sum(ttc) as ttc from public.invoices where request_id = $1", [r.id]);
    expect(rows[0]).toEqual({ ht: "966.387", tva: "183.613", ttc: "1150.000" });
  });

  it("is refused while the company identity is missing, and nothing is half done", async () => {
    const r = await delivered(1);
    await receiveReturn(db, manager, r.id);
    await db.query("update public.company_settings set legal_name = ''");
    await expect(closeInspection(db, manager, r.id)).rejects.toThrow(/company_settings_incomplete/);
    await db.query("update public.company_settings set legal_name = 'Concorde Events'");
    expect((await request(r.id)).status).toBe("returned");
    expect((await db.query("select 1 from public.return_inspection_lines where request_id = $1", [r.id])).rows).toHaveLength(0);
    await closeInspection(db, manager, r.id);
  });

  it("wants a reason for every fee, and a real amount", async () => {
    const r = await delivered(1);
    await receiveReturn(db, manager, r.id);
    await expect(closeInspection(db, manager, r.id, [{ ok: 1, fee: 10 }])).rejects.toThrow(/invalid_amount/);
    await expect(closeInspection(db, manager, r.id, [{ ok: 1, fee: -10, fee_reason: "x" }])).rejects.toThrow(/invalid_amount/);
    await expect(closeInspection(db, manager, r.id, [{ ok: 1, fee: 1.0005, fee_reason: "x" }])).rejects.toThrow(/invalid_amount/);
    await closeInspection(db, manager, r.id);
  });
});

describe("the caution", () => {
  const withCaution = async (held = 500) => {
    const r = await delivered(1);
    await pay(db, manager, r.id, "caution_held", held, "cheque");
    await receiveReturn(db, manager, r.id);
    return r;
  };
  const caution = async (id: string) => (await db.query<{ kind: string; amount: string; method: string }>("select kind, amount, method from public.payments where request_id = $1 and kind like 'caution%' order by created_at, kind", [id])).rows;

  it("must be decided when one is held", async () => {
    const r = await withCaution();
    await expect(closeInspection(db, manager, r.id)).rejects.toThrow(/caution_unresolved/);
    await closeInspection(db, manager, r.id, [], { outcome: "refund" });
  });

  it("is refunded in full", async () => {
    const r = await withCaution();
    expect(await closeInspection(db, manager, r.id, [], { outcome: "refund" })).toMatchObject({ caution_refunded: 500, caution_retained: 0 });
    expect(await caution(r.id)).toEqual(expect.arrayContaining([{ kind: "caution_refund", amount: "500.000", method: "cheque" }]));
    expect((await request(r.id)).paid_total).toBe("575.000"); // never revenue
  });

  it("is retained up to the fees, settles them, and the rest goes back", async () => {
    const r = await withCaution();
    const retain = { outcome: "retain", amount: 200 };
    await expect(closeInspection(db, manager, r.id, [{ ok: 0, damaged: 1, fee: 100, fee_reason: "Tissu" }], retain)).rejects.toThrow(/invalid_amount/); // more than the fees
    await expect(closeInspection(db, manager, r.id, [{ ok: 0, damaged: 1, fee: 800, fee_reason: "Tissu" }], { outcome: "retain", amount: 501 })).rejects.toThrow(/invalid_amount/); // more than held
    const out = await closeInspection(db, manager, r.id, [{ ok: 0, damaged: 1, fee: 200, fee_reason: "Tissu" }], retain);
    expect(out).toMatchObject({ caution_retained: 200, caution_refunded: 300 });
    expect(await request(r.id)).toMatchObject({ paid_total: "775.000" });
    const s = (await finalInvoice(r.id)).snapshot as unknown as { caution_retained: number; net_to_pay: number };
    expect(s.caution_retained).toBe(200);
    expect(s.net_to_pay).toBe(577); // 1150 + 200 fees + 2 stamps - 575 paid - 200 retained
    await repairStock();
  });

  it("records none when there is nothing to refund", async () => {
    const r = await delivered(1);
    await receiveReturn(db, manager, r.id);
    await closeInspection(db, manager, r.id, [], { outcome: "refund" });
    expect((await db.query("select caution_outcome from public.return_inspections where request_id = $1", [r.id])).rows[0]).toEqual({ caution_outcome: "none" });
  });
});

describe("idempotency and immutability", () => {
  it("refuses to close twice", async () => {
    const r = await delivered(1);
    await receiveReturn(db, manager, r.id);
    await closeInspection(db, manager, r.id);
    await expect(closeInspection(db, manager, r.id)).rejects.toThrow(/invalid status transition/);
    expect((await db.query("select 1 from public.invoices where request_id = $1 and type = 'final'", [r.id])).rows).toHaveLength(1);
  });

  it("keeps inspections as they were closed", async () => {
    await expect(db.query("update public.return_inspections set total_fees = 0")).rejects.toThrow(/immutable/);
    await expect(db.query("delete from public.return_inspection_lines")).rejects.toThrow(/immutable/);
  });
});

describe("points", () => {
  const points = async () => (await db.query<{ points: number }>("select points from public.pro_accounts where profile_id = $1", [pro])).rows[0].points;

  it("wait for both, whichever comes last, and only come once", async () => {
    const r = await delivered(1, pro); // 920 at pro rate: 92 points
    await pay(db, manager, r.id, "balance", 462); // paid early: 460 + 2 stamps
    expect(await points()).toBe(0);
    await receiveReturn(db, manager, r.id);
    await closeInspection(db, manager, r.id);
    expect((await request(r.id)).payment_status).toBe("paid");
    expect(await points()).toBe(92);
    const id = (await db.query<{ id: string }>("select id from public.payments where request_id = $1 and kind = 'balance'", [r.id])).rows[0].id;
    await as(db, admin, (tx) => tx.query("select public.void_payment($1, 'erreur de saisie')", [id]));
    await pay(db, manager, r.id, "balance", 462);
    expect(await points()).toBe(92);
  });

  it("wait for the balance when it comes after the inspection", async () => {
    const before = await points();
    const r = await delivered(1, pro);
    await receiveReturn(db, manager, r.id);
    await closeInspection(db, manager, r.id);
    expect(await points()).toBe(before);
    await pay(db, manager, r.id, "balance", 462);
    expect(await points()).toBe(before + 92);
  });
});

describe("what clients read", () => {
  it("shows their inspection without notes, and photos only when staff ticked them", async () => {
    const r = await delivered(2);
    await receiveReturn(db, manager, r.id);
    await closeInspection(db, manager, r.id, [{ ok: 1, damaged: 1, fee: 50, fee_reason: "Pied rayé", note: "Client difficile, à surveiller", photos: ["a.jpg"], photos_visible: false }]);
    await repairStock();
    const view = async (uid: string) => (await as(db, uid, (tx) => tx.query<{ v: { inspection: { lines: Record<string, unknown>[] } } | null }>("select public.my_request_view($1) as v", [r.id]))).rows[0].v;
    const v = (await view(client))!;
    expect(v.inspection.lines[0]).toMatchObject({ sent: 2, ok: 1, damaged: 1, fee: 50, fee_reason: "Pied rayé", photos: [] });
    expect(JSON.stringify(v)).not.toContain("surveiller");
    expect(await view(other)).toBeNull();
  });

  it("shows ticked photos", async () => {
    const r = await delivered(1);
    await receiveReturn(db, manager, r.id);
    await closeInspection(db, manager, r.id, [{ photos: ["ok.jpg"], photos_visible: true }]);
    const v = (await as(db, client, (tx) => tx.query<{ v: { inspection: { lines: { photos: string[] }[] } } }>("select public.my_request_view($1) as v", [r.id]))).rows[0].v;
    expect(v.inspection.lines[0].photos).toEqual(["ok.jpg"]);
  });

  it("keeps the tables themselves to staff", async () => {
    for (const table of ["return_inspections", "return_inspection_lines", "stock_movements", "inspection_drafts"]) {
      expect((await as(db, client, (tx) => tx.query(`select * from public.${table}`))).rows, table).toHaveLength(0);
      await expect(as(db, null, (tx) => tx.query(`select * from public.${table}`)), table).rejects.toThrow(/permission denied/);
    }
    expect((await as(db, manager, (tx) => tx.query("select * from public.stock_movements"))).rows.length).toBeGreaterThan(0);
  });

  it("restricts inspection photos to operations staff", async () => {
    const ins = "insert into storage.objects (bucket_id, name) values ('inspection-photos', 'x.jpg')";
    await expect(as(db, client, (tx) => tx.query(ins))).rejects.toThrow(/row-level security/);
    await as(db, manager, (tx) => tx.query(ins));
    expect((await as(db, client, (tx) => tx.query("select * from storage.objects where bucket_id = 'inspection-photos'"))).rows).toHaveLength(0);
  });
});
