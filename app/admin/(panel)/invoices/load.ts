import "server-only";
import type { Db } from "@/lib/actions/run";
import type { InvoiceListRow } from "./ttn-table";

export type InvoiceFilters = { type?: string; month?: string; ttn?: string; unpaid?: string };

const COLUMNS = "id, type, number, issued_at, due_at, ht, tva, ttc, stamp, total_due, ttn_status, ttn_reference, request_id, rental_requests(reference, customer_name, company_name, billing_tax_id, payment_status), invoice_rates(rate, ht, tva)";

/** Shared by the page and the accountant's CSV, so both always show the same invoices. */
export async function loadInvoices(db: Db, f: InvoiceFilters) {
  let q = db.from("invoices").select(COLUMNS).order("issued_at", { ascending: false }).limit(1000);
  if (f.type && ["deposit", "final", "credit_note"].includes(f.type)) q = q.eq("type", f.type);
  if (f.ttn && ["not_sent", "sent", "accepted", "rejected"].includes(f.ttn)) q = q.eq("ttn_status", f.ttn);
  if (f.month && /^\d{4}-\d{2}$/.test(f.month)) {
    const [y, m] = f.month.split("-").map(Number);
    q = q.gte("issued_at", `${f.month}-01T00:00:00+01:00`).lt("issued_at", `${new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7)}-01T00:00:00+01:00`);
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as InvoiceListRow[];
  return f.unpaid ? rows.filter((r) => r.type !== "credit_note" && !["paid", "refunded"].includes(r.rental_requests?.payment_status ?? "")) : rows;
}
