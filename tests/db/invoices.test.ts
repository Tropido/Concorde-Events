import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { acceptQuote, as, freshDb, isoDate, issueQuote, productId, submit, user } from "./harness";

let db: PGlite;
let client: string, manager: string, admin: string;
let sofa: string;
let day = 400;

beforeAll(async () => {
  db = await freshDb();
  client = await user(db, "c@example.com");
  manager = await user(db, "m@example.com", "manager");
  admin = await user(db, "a@example.com", "admin");
  sofa = await productId(db, "kasaya-curved-sofa");
});

const line = (quantity = 1, nights = 1) => {
  day += nights + 2;
  return { product_id: sofa, quantity, start_date: isoDate(day), end_date: isoDate(day + nights) };
};
const scalar = async <T,>(sql: string, ...params: unknown[]) => Object.values((await db.query<Record<string, T>>(sql, params)).rows[0])[0];
type Snapshot = {
  number: string; seller: { legal_name: string; tax_id: string }; buyer: { name: string }; lines: { label_fr: string; ttc: number }[];
  by_rate: { rate: number; ht: number; tva: number; ttc: number }[]; totals: { ht: number; tva: number; ttc: number; stamp: number; total_due: number }; amount_words: string;
};
const invoiceOf = async (requestId: string) => (await db.query<{ id: string; number: string; ttc: string; snapshot: Snapshot; due_at: string }>("select * from public.invoices where request_id = $1 order by issued_at desc limit 1", [requestId])).rows[0];
const extra = (id: string, kind: string, label: string, price: number, rate = 19, quantity = 1) => as(db, manager, (tx) =>
  tx.query("insert into public.request_extras (request_id, kind, label, quantity, unit_price, vat_rate) values ($1, $2, $3, $4, $5, $6)", [id, kind, label, quantity, price, rate]));

describe("VAT arithmetic", () => {
  const split = (amount: number, rate: number, incl = true) => db.query<{ r: { ht: number; tva: number; ttc: number } }>("select private.vat_line($1, $2, $3) as r", [amount, rate, incl]).then((x) => x.rows[0].r);

  it.each([
    [1190, 19, 1000, 190],
    [1, 19, 0.84, 0.16],
    [0.001, 19, 0.001, 0],
    [7064.85, 19, 5936.849, 1128.001],
    [107, 7, 100, 7],
    [0, 19, 0, 0],
  ])("splits %s TTC at %s%% into %s HT + %s TVA", async (ttc, rate, ht, tva) => {
    expect(await split(ttc, rate)).toMatchObject({ ttc, ht, tva });
  });

  it("works from HT too, and HT + TVA is always exactly TTC", async () => {
    expect(await split(1000, 19, false)).toMatchObject({ ht: 1000, tva: 190, ttc: 1190 });
    for (const amount of [0.001, 0.333, 19.999, 7064.85, 123456.789]) {
      const r = await split(amount, 19);
      expect(Math.round((r.ht + r.tva) * 1000)).toBe(Math.round(r.ttc * 1000));
    }
  });

  it("rounds half up", async () => {
    expect(await scalar("select round(1.0005::numeric, 3)")).toBe("1.001");
    expect(await split(1.0005, 0)).toMatchObject({ ttc: 1.001 });
  });

  it("groups totals by rate", async () => {
    const lines = JSON.stringify([{ vat_rate: 19, ht: 100, tva: 19, ttc: 119 }, { vat_rate: 7, ht: 100, tva: 7, ttc: 107 }, { vat_rate: 19, ht: 50, tva: 9.5, ttc: 59.5 }]);
    expect(await scalar("select private.vat_totals($1::jsonb)", lines)).toEqual({
      ht: 250, tva: 35.5, ttc: 285.5,
      by_rate: [{ rate: 7, ht: 100, tva: 7, ttc: 107 }, { rate: 19, ht: 150, tva: 28.5, ttc: 178.5 }],
    });
  });

  it("rounds a deposit up to the millime", async () => {
    expect(await scalar("select private.deposit_amount(1000.001, 50)")).toBe("500.001");
    expect(await scalar("select private.deposit_amount(100, 33.33)")).toBe("33.330");
  });
});

describe("amounts in words", () => {
  const words = (n: number, lang = "fr") => scalar<string>("select private.amount_words($1, $2)", n, lang);

  it.each([
    [1250.85, "mille deux cent cinquante dinars et huit cent cinquante millimes"],
    [0, "zéro dinar"],
    [1, "un dinar"],
    [0.001, "zéro dinar et un millime"],
    [21, "vingt et un dinars"],
    [71, "soixante et onze dinars"],
    [80, "quatre-vingts dinars"],
    [81, "quatre-vingt-un dinars"],
    [91, "quatre-vingt-onze dinars"],
    [99, "quatre-vingt-dix-neuf dinars"],
    [100, "cent dinars"],
    [200, "deux cents dinars"],
    [205, "deux cent cinq dinars"],
    [1000, "mille dinars"],
    [2000, "deux mille dinars"],
    [80000, "quatre-vingt mille dinars"],
    [200000, "deux cent mille dinars"],
    [1000000, "un million dinars"],
    [2500001, "deux millions cinq cent mille un dinars"],
    [7064.85, "sept mille soixante-quatre dinars et huit cent cinquante millimes"],
  ])("writes %s in French", async (n, text) => expect(await words(n)).toBe(text));

  it.each([
    [1250.85, "one thousand two hundred and fifty dinars and eight hundred and fifty millimes"],
    [1, "one dinar"],
    [0, "zero dinars"],
    [1001, "one thousand and one dinars"],
    [42, "forty-two dinars"],
  ])("writes %s in English", async (n, text) => expect(await words(n, "en")).toBe(text));
});

describe("extra quote lines", () => {
  it("are frozen in the quote with their own VAT, and change the total", async () => {
    const r = await submit(db, client, [line()]); // 1150
    await extra(r.id, "delivery", "Livraison Hammamet", 214, 7);
    await extra(r.id, "installation", "Installation", 100, 19, 2);
    await extra(r.id, "discount", "Remise fidélité", -50);
    const q = await issueQuote(db, manager, r.id);
    const s = await scalar<{ total: number; extras: { label: string; ttc: number }[]; totals: { ht: number; tva: number; ttc: number; by_rate: { rate: number; ttc: number }[] } }>("select snapshot from public.quotes where id = $1", q);
    expect(s.total).toBe(1514);
    expect(s.extras.map((e) => e.ttc)).toEqual([214, 200, -50]);
    expect(s.totals.by_rate.map((x) => [x.rate, x.ttc])).toEqual([[7, 214], [19, 1300]]);
    await as(db, manager, (tx) => tx.query("delete from public.request_extras where request_id = $1", [r.id]));
    expect((await scalar<{ total: number }>("select snapshot from public.quotes where id = $1", q)).total).toBe(1514);
  });

  it("keeps discounts negative and everything else positive", async () => {
    const r = await submit(db, client, [line()]);
    await expect(extra(r.id, "discount", "x", 10)).rejects.toThrow(/check constraint/);
    await expect(extra(r.id, "delivery", "x", -10)).rejects.toThrow(/check constraint/);
  });

  it("are for staff only", async () => {
    const r = await submit(db, client, [line()]);
    await extra(r.id, "delivery", "Livraison", 50);
    expect((await as(db, client, (tx) => tx.query("select * from public.request_extras"))).rows).toHaveLength(0);
    await expect(as(db, client, (tx) => tx.query("insert into public.request_extras (request_id, kind, label, unit_price) values ($1, 'other', 'x', 1)", [r.id]))).rejects.toThrow(/row-level security/);
  });

  it("support HT catalogue prices", async () => {
    await db.query("update public.company_settings set prices_include_vat = false");
    const r = await submit(db, client, [line()]);
    const s = await scalar<{ total: number; totals: { ht: number; tva: number } }>("select snapshot from public.quotes where id = $1", await issueQuote(db, manager, r.id));
    expect(s.total).toBe(1368.5);
    expect(s.totals).toMatchObject({ ht: 1150, tva: 218.5 });
    await db.query("update public.company_settings set prices_include_vat = true");
  });
});

describe("deposit invoice", () => {
  it("snapshots the seller, the buyer and a single line, and adds the stamp duty", async () => {
    const r = await submit(db, client, [line(2, 1)]); // 2300
    await issueQuote(db, manager, r.id);
    await acceptQuote(db, manager, r.id);
    const i = await invoiceOf(r.id);
    expect(i.number).toMatch(/^F-\d{4}-\d{5}$/);
    expect(i.snapshot.seller).toMatchObject({ legal_name: "Concorde Events", tax_id: "1234567/A/M/000" });
    expect(i.snapshot.buyer.name).toBe("Test Client");
    expect(i.snapshot.lines).toHaveLength(1);
    expect(i.snapshot.lines[0].label_fr).toBe(`Acompte de 50 % sur devis ${r.reference} R1`);
    expect(i.snapshot.totals).toEqual({ ht: 966.387, tva: 183.613, ttc: 1150, stamp: 1, total_due: 1151 });
    expect(i.snapshot.amount_words).toBe("mille cent cinquante et un dinars");
    expect(i.due_at).toEqual((await scalar("select deposit_due_at from public.rental_requests where id = $1", r.id)));
  });

  it("splits the VAT in proportion to the quote's rates, adding up exactly", async () => {
    const r = await submit(db, client, [line()]); // 1150 at 19 %
    await extra(r.id, "delivery", "Livraison", 333.333, 7);
    await issueQuote(db, manager, r.id);
    await acceptQuote(db, manager, r.id);
    const { snapshot: s } = await invoiceOf(r.id);
    expect(s.by_rate.map((x) => x.rate).sort()).toEqual([19, 7]);
    const sum = (k: "ht" | "tva" | "ttc") => Math.round(s.by_rate.reduce((n, x) => n + x[k], 0) * 1000) / 1000;
    expect(sum("ttc")).toBe(s.totals.ttc);
    expect(sum("ht")).toBe(s.totals.ht);
    expect(sum("tva")).toBe(s.totals.tva);
    expect(s.totals.ttc).toBe(741.667); // 1483.333 x 50 %, rounded up
  });

  it("writes one invoice line, in French or English", async () => {
    const en = await user(db, "en@example.com");
    await db.query("update public.profiles set language = 'en' where id = $1", [en]);
    const r = await submit(db, en, [line()]);
    await issueQuote(db, manager, r.id);
    await acceptQuote(db, manager, r.id);
    const i = await invoiceOf(r.id);
    expect((await db.query("select label, ttc from public.invoice_lines where invoice_id = $1", [i.id])).rows).toEqual([{ label: `50% deposit on quote ${r.reference} R1`, ttc: "575.000" }]);
    expect(i.snapshot.amount_words).toBe("five hundred and seventy-six dinars");
  });

  it("gives Arabic clients French", async () => {
    const ar = await user(db, "ar@example.com");
    await db.query("update public.profiles set language = 'ar' where id = $1", [ar]);
    const r = await submit(db, ar, [line()]);
    await issueQuote(db, manager, r.id);
    await acceptQuote(db, manager, r.id);
    expect(await scalar("select language from public.invoices where request_id = $1", r.id)).toBe("fr");
  });

  it("drops the stamp duty when the admin sets it to zero", async () => {
    await db.query("update public.company_settings set stamp_duty = 0");
    const r = await submit(db, client, [line()]);
    await issueQuote(db, manager, r.id);
    await acceptQuote(db, manager, r.id);
    expect((await invoiceOf(r.id)).snapshot.totals).toMatchObject({ stamp: 0, total_due: 575 });
    await db.query("update public.company_settings set stamp_duty = 1");
  });
});

describe("numbering", () => {
  it("runs without a gap, and a rolled-back issue gives its number back", async () => {
    const number = async () => {
      const r = await submit(db, client, [line()]);
      await issueQuote(db, manager, r.id);
      await acceptQuote(db, manager, r.id);
      return Number((await invoiceOf(r.id)).number.slice(-5));
    };
    const first = await number();
    await db.transaction(async (tx) => {
      await tx.query("select private.next_number('invoice')");
      await tx.rollback();
    }).catch(() => {});
    expect(await number()).toBe(first + 1);
  });

  it("keeps a separate series per kind and per year", async () => {
    await db.query("insert into public.document_counters (kind, year, last) values ('invoice', 2099, 41)");
    expect((await db.query<{ n: number }>("select last as n from public.document_counters where kind = 'invoice' and year = 2099")).rows[0].n).toBe(41);
    expect(await scalar("select private.next_number('credit_note')")).toMatch(/^AV-\d{4}-00001$/);
  });

  it("has a table nobody reaches through the API", async () => {
    await expect(as(db, admin, (tx) => tx.query("select * from public.document_counters"))).rejects.toThrow(/permission denied/);
  });
});

describe("immutability", () => {
  let r: { id: string };
  beforeAll(async () => {
    r = await submit(db, client, [line()]);
    await issueQuote(db, manager, r.id);
    await acceptQuote(db, manager, r.id);
  });

  it("refuses any change to an issued invoice, even from SQL", async () => {
    await expect(db.query("update public.invoices set ttc = 1 where request_id = $1", [r.id])).rejects.toThrow(/immutable/);
    await expect(db.query("update public.invoices set snapshot = '{}' where request_id = $1", [r.id])).rejects.toThrow(/immutable/);
    await expect(db.query("delete from public.invoices where request_id = $1", [r.id])).rejects.toThrow(/immutable/);
    await expect(db.query("delete from public.invoice_lines where invoice_id = (select id from public.invoices where request_id = $1)", [r.id])).rejects.toThrow(/immutable/);
  });

  it("sets the PDF once", async () => {
    await db.query("update public.invoices set pdf_path = 'a.pdf', pdf_sha256 = 'x' where request_id = $1", [r.id]);
    await expect(db.query("update public.invoices set pdf_path = 'b.pdf' where request_id = $1", [r.id])).rejects.toThrow(/never changes/);
  });

  it("lets staff follow the TTN status, nothing else, and clients nothing", async () => {
    await as(db, manager, (tx) => tx.query("update public.invoices set ttn_status = 'sent', ttn_reference = 'TTN-1' where request_id = $1", [r.id]));
    await expect(as(db, manager, (tx) => tx.query("update public.invoices set ttc = 1 where request_id = $1", [r.id]))).rejects.toThrow(/permission denied/);
    await as(db, client, (tx) => tx.query("update public.invoices set ttn_status = 'rejected' where request_id = $1", [r.id]));
    expect(await scalar("select ttn_status from public.invoices where request_id = $1", r.id)).toBe("sent");
  });
});

describe("company settings", () => {
  it("are read by staff and changed by admins only", async () => {
    expect((await as(db, client, (tx) => tx.query("select * from public.company_settings"))).rows).toHaveLength(0);
    expect((await as(db, manager, (tx) => tx.query("select * from public.company_settings"))).rows).toHaveLength(1);
    await as(db, manager, (tx) => tx.query("update public.company_settings set stamp_duty = 9"));
    expect(await scalar("select stamp_duty from public.company_settings")).toBe("1.000");
    await as(db, admin, (tx) => tx.query("update public.company_settings set rne = 'B123'"));
    expect(await scalar("select rne from public.company_settings")).toBe("B123");
  });

  it("stay a single row", async () => {
    await expect(db.query("insert into public.company_settings (id) values (false)")).rejects.toThrow(/check constraint/);
    await expect(db.query("insert into public.company_settings (id) values (true)")).rejects.toThrow(/duplicate key/);
  });
});
