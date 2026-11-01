import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderInvoicePdf, renderQuotePdf, renderReceiptPdf, type Receipt } from "./pdf";
import type { InvoiceSnapshot } from "./types";
import type { QuoteSnapshot } from "@/lib/types";

const BUCKET = "documents";
const asDocLang = (lang: string) => (lang === "en" ? "en" : "fr");

async function seller(db: SupabaseClient) {
  const { data } = await db.from("company_settings").select("*").single();
  return data as InvoiceSnapshot["seller"] & { logo_url: string | null };
}

/** The issued document: rendered once, then always read back. An issued number is never
 *  rendered a second time, so what the client holds and what is stored stay the same file. */
export async function invoicePdf(db: SupabaseClient, invoiceId: string) {
  const { data: i, error } = await db.from("invoices").select("id, number, snapshot, pdf_path").eq("id", invoiceId).single();
  if (error) throw error;
  const filename = `${i.number}.pdf`;
  if (i.pdf_path) {
    const stored = await db.storage.from(BUCKET).download(i.pdf_path);
    if (stored.error) throw stored.error;
    return { filename, content: Buffer.from(await stored.data.arrayBuffer()) };
  }
  const content = await renderInvoicePdf(i.snapshot as InvoiceSnapshot, (await seller(db)).logo_url);
  const path = `invoices/${i.number.split("-")[1]}/${filename}`;
  const up = await db.storage.from(BUCKET).upload(path, content, { contentType: "application/pdf", upsert: false });
  if (up.error) {
    // Two requests raced: the other one stored it first, and that file is the document.
    const stored = await db.storage.from(BUCKET).download(path);
    if (stored.error) throw up.error;
    return { filename, content: Buffer.from(await stored.data.arrayBuffer()) };
  }
  const { error: saved } = await db.from("invoices").update({ pdf_path: path, pdf_sha256: createHash("sha256").update(content).digest("hex") }).eq("id", i.id);
  if (saved) throw saved;
  return { filename, content };
}

export async function quotePdf(db: SupabaseClient, quoteId: string, lang: string) {
  const { data: q, error } = await db.from("quotes").select("snapshot").eq("id", quoteId).single();
  if (error) throw error;
  const s = q.snapshot as QuoteSnapshot;
  return { filename: `${s.reference}-R${s.revision}.pdf`, content: await renderQuotePdf(s, await seller(db), asDocLang(lang)) };
}

export async function receiptPdf(db: SupabaseClient, paymentId: string, lang: string, method: string, remaining: number) {
  const { data: p, error } = await db.from("payments").select("amount, kind, received_at, reference, rental_requests(reference, customer_name)").eq("id", paymentId).single();
  if (error) throw error;
  const r = p.rental_requests as unknown as { reference: string; customer_name: string };
  const receipt: Receipt = { reference: r.reference, customer: r.customer_name, amount: Number(p.amount), kind: p.kind, method, receivedAt: p.received_at, paymentRef: p.reference, remaining, seller: await seller(db) };
  return { filename: `${r.reference}-recu.pdf`, content: await renderReceiptPdf(receipt, asDocLang(lang)) };
}
