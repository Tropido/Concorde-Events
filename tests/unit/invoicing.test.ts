import { describe, expect, it } from "vitest";
import { renderInvoicePdf } from "@/lib/invoicing/pdf";
import { toTeif } from "@/lib/invoicing/teif";
import { invoicesCsv } from "@/app/admin/(panel)/invoices/csv";
import type { InvoiceListRow } from "@/app/admin/(panel)/invoices/ttn-table";
import type { InvoiceSnapshot } from "@/lib/invoicing/types";

const seller = { legal_name: "Concorde Events", legal_form: "SARL", address: "12 rue de la Mer", city: "Tunis", postal_code: "1000", tax_id: "1234567/A/M/000", rne: null, phone: null, email: null, bank_name: "BIAT", rib: "123", iban: null };
const invoice: InvoiceSnapshot = {
  type: "deposit", number: "F-2026-00001", language: "fr", issued_at: "2026-11-01T10:00:00Z", due_at: "2026-11-04T10:00:00Z", reference: "CE-2026-00001", seller,
  buyer: { name: "أميرة بن علي", company: null, email: "a@example.com", phone: "+216 23 000 000", address: "Tunis", tax_id: null },
  event: { type: "wedding", venue: null, guests: null },
  lines: [{ label_fr: "Acompte de 50 % sur devis CE-2026-00001 R1", quantity: 1, unit_price: 575, vat_rate: 19, ht: 483.193, tva: 91.807, ttc: 575 }],
  by_rate: [{ rate: 19, ht: 483.193, tva: 91.807, ttc: 575 }], own_by_rate: [{ rate: 19, ht: 483.193, tva: 91.807, ttc: 575 }],
  totals: { ht: 483.193, tva: 91.807, ttc: 575, stamp: 1, total_due: 576 }, amount_words: "cinq cent soixante-seize dinars", legal_mentions: null,
  payment_terms: { due_at: "2026-11-04T10:00:00Z", bank_name: "BIAT", rib: "123", iban: null },
};

describe("invoice PDF", () => {
  it("renders with the brand fonts, an Arabic client name included", async () => {
    const pdf = await renderInvoicePdf(invoice);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5000);
  });

  it("renders a final invoice with its deductions, and a credit note", async () => {
    const final: InvoiceSnapshot = { ...invoice, type: "final", gross: { ht: 966, tva: 184, ttc: 1150 }, deductions: [{ number: "F-2026-00001", ttc: 575 }], paid: 575, caution_retained: 50, net_to_pay: 1 };
    expect((await renderInvoicePdf(final)).subarray(0, 5).toString()).toBe("%PDF-");
    expect((await renderInvoicePdf({ ...invoice, type: "credit_note", cancels: "F-2026-00001", reason: "Annulation" })).subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("TTN", () => {
  it("is deliberately not implemented", () => {
    expect(() => toTeif(invoice)).toThrow("not_implemented");
  });
});

describe("accountant's CSV", () => {
  const row = (over: Partial<InvoiceListRow> = {}): InvoiceListRow => ({
    id: "1", type: "deposit", number: "F-2026-00001", issued_at: "2026-11-01T10:00:00Z", due_at: null, ht: 100, tva: 19, ttc: 119, stamp: 1, total_due: 120,
    ttn_status: "not_sent", ttn_reference: null, request_id: "r",
    rental_requests: { reference: "CE-1", customer_name: "Amira", company_name: null, billing_tax_id: "123/A", payment_status: "deposit_due" },
    invoice_rates: [{ rate: 19, ht: 100, tva: 19 }],
    ...over,
  });

  it("gives HT and TVA per rate", () => {
    const [head, line] = invoicesCsv([row()]).trim().split("\r\n");
    expect(head).toContain("HT 19%;TVA 19%");
    expect(line).toBe("F-2026-00001;2026-11-01;deposit;Amira;123/A;100.000;19.000;1.000;119.000;deposit_due;not_sent;");
  });

  it("makes credit notes negative", () => {
    expect(invoicesCsv([row({ type: "credit_note" })])).toContain("-100.000;-19.000;-1.000;-119.000");
  });

  it("opens in French Excel and cannot smuggle a formula through a client name", () => {
    const csv = invoicesCsv([row({ rental_requests: { reference: "CE-1", customer_name: "=HYPERLINK(\"evil\")", company_name: null, billing_tax_id: null, payment_status: "paid" } })]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(`"'=HYPERLINK(""evil"")"`);
  });
});
