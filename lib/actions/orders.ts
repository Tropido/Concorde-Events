"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { notifyRequest } from "@/lib/email/notify";
import { deliver, type EmailRow } from "@/lib/email/send";
import { serviceClient } from "@/lib/supabase/service";
import { run, type AdminResult } from "./run";
import type { InspectionView, OrderView, PaymentMethod } from "@/lib/types";

const uuid = z.string().uuid();
const METHODS = ["virement", "especes", "cheque", "d17", "flouci", "konnect", "carte", "autre"] as const;

type Accepted = { status: string; confirmed: boolean; quote_id: string; invoice_id: string | null; deposit_required: number };

async function afterAcceptance(requestId: string, out: Accepted) {
  await notifyRequest("quote_accepted", requestId, {
    dedupe: out.quote_id, withBank: true, staff: "Devis accepté",
    attachments: out.invoice_id ? [{ type: "invoice", id: out.invoice_id }] : [],
  });
  if (out.confirmed) await notifyRequest("booking_confirmed", requestId, { dedupe: out.quote_id });
}

const Acceptance = z.object({ quoteId: uuid, signer: z.string().trim().min(2).max(120), terms: z.literal(true) });
export type AcceptResult = { ok: true } | { ok: false; error: "quote_superseded" | "quote_expired" | "terms_required" | "company_incomplete" | "not_found" | "generic" };

function acceptError(e: { message: string }): AcceptResult {
  const m = e.message;
  if (m.startsWith("quote_superseded")) return { ok: false, error: "quote_superseded" };
  if (m.startsWith("quote expired")) return { ok: false, error: "quote_expired" };
  if (m.startsWith("terms_required")) return { ok: false, error: "terms_required" };
  if (m.startsWith("company_settings_incomplete")) return { ok: false, error: "company_incomplete" };
  if (m.startsWith("not_found")) return { ok: false, error: "not_found" };
  console.error("accept_quote failed", e);
  return { ok: false, error: "generic" };
}
const userAgent = async () => (await headers()).get("user-agent")?.slice(0, 300) ?? null;

/** The signed-in owner accepts online. */
export async function acceptQuoteOnline(requestId: string, input: z.input<typeof Acceptance>): Promise<AcceptResult> {
  const p = Acceptance.safeParse(input);
  if (!uuid.safeParse(requestId).success || !p.success) return { ok: false, error: "terms_required" };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "not_found" };
  const db = await createClient();
  const { data, error } = await db.rpc("accept_quote", {
    p_request: requestId, p_quote_id: p.data.quoteId, p_signer_name: p.data.signer, p_accepted_terms: true, p_channel: "online", p_user_agent: await userAgent(),
  });
  if (error) return acceptError(error);
  await afterAcceptance(requestId, data as Accepted);
  revalidatePath("/account", "layout");
  return { ok: true };
}

/** A guest accepts through their tracking link: the token is the only credential. */
export async function acceptQuoteByToken(token: string, input: z.input<typeof Acceptance>): Promise<AcceptResult> {
  const p = Acceptance.safeParse(input);
  if (!z.string().min(32).max(128).safeParse(token).success || !p.success) return { ok: false, error: "terms_required" };
  const db = await createClient();
  const { data, error } = await db.rpc("accept_quote_by_token", {
    p_token: token, p_quote_id: p.data.quoteId, p_signer_name: p.data.signer, p_accepted_terms: true, p_user_agent: await userAgent(),
  });
  if (error) return acceptError(error);
  const view = await db.rpc("track_request", { p_token: token });
  if (view.data) await afterAcceptance((view.data as { id: string }).id, data as Accepted);
  revalidatePath(`/suivi/${token}`);
  return { ok: true };
}

/** Staff record an agreement given by WhatsApp, phone or in person. */
export async function markQuoteAccepted(requestId: string, quoteId: string, signer: string, channel: "whatsapp" | "phone" | "in_person"): Promise<AdminResult> {
  const p = z.object({ requestId: uuid, quoteId: uuid, signer: z.string().trim().min(2).max(120), channel: z.enum(["whatsapp", "phone", "in_person"]) })
    .safeParse({ requestId, quoteId, signer, channel });
  if (!p.success) return { ok: false, error: "invalid" };
  let out: Accepted | null = null;
  const result = await run(undefined, async (db) => {
    const r = await db.rpc("accept_quote", { p_request: requestId, p_quote_id: quoteId, p_signer_name: p.data.signer, p_accepted_terms: true, p_channel: channel });
    out = r.data as Accepted;
    return r;
  });
  if (result.ok && out) await afterAcceptance(requestId, out);
  return result;
}

const PaymentInput = z.object({
  requestId: uuid,
  kind: z.enum(["deposit", "balance", "caution_held", "caution_refund", "refund"]),
  method: z.enum(METHODS),
  amount: z.number().positive().max(10_000_000),
  receivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  reference: z.string().trim().max(80).nullable(),
  proofPath: z.string().max(300).nullable(),
  note: z.string().trim().max(1000).nullable(),
});
export type PaymentInput = z.infer<typeof PaymentInput>;
export type PaymentResult = AdminResult & { overpaid?: number };

type Recorded = { payment_id: string; confirmed: boolean; paid_in_full: boolean; remaining: number; overpaid: number };

export async function recordPayment(input: PaymentInput): Promise<PaymentResult> {
  const p = PaymentInput.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const d = p.data;
  let out: Recorded | null = null;
  const result = await run(undefined, async (db) => {
    const r = await db.rpc("record_payment", {
      p_request: d.requestId, p_kind: d.kind, p_method: d.method, p_amount: d.amount, p_received_at: d.receivedAt,
      p_reference: d.reference, p_proof_path: d.proofPath, p_note: d.note,
    });
    out = r.data as Recorded;
    return r;
  });
  if (!result.ok || !out) return result;
  const done = out as Recorded;
  if (d.kind === "deposit" || d.kind === "balance") {
    await notifyRequest("payment_received", d.requestId, {
      dedupe: done.payment_id, extra: { amount: d.amount, remaining: done.remaining }, staff: "Paiement reçu",
      receipt: { id: done.payment_id, method: d.method as PaymentMethod, remaining: done.remaining },
    });
  }
  if (done.confirmed) await notifyRequest("booking_confirmed", d.requestId, { extra: { remaining: done.remaining } });
  if (done.paid_in_full) await settled(d.requestId);
  return { ok: true, overpaid: done.overpaid };
}

/** The last email of a hire, with the points it earned a professional. */
async function settled(requestId: string) {
  const db = serviceClient();
  const { data } = db ? await db.from("reward_events").select("points").eq("request_id", requestId).eq("reason", "request_completed").maybeSingle() : { data: null };
  await notifyRequest("rental_settled", requestId, { extra: { points: data?.points } });
}

export async function voidPayment(paymentId: string, reason: string): Promise<AdminResult> {
  if (!uuid.safeParse(paymentId).success) return { ok: false, error: "invalid" };
  return run(["admin"], (db) => db.rpc("void_payment", { p_payment: paymentId, p_reason: reason }));
}

export async function confirmWithoutDeposit(requestId: string, reason: string): Promise<AdminResult> {
  if (!uuid.safeParse(requestId).success) return { ok: false, error: "invalid" };
  const result = await run(["admin"], (db) => db.rpc("confirm_without_deposit", { p_request: requestId, p_reason: reason }));
  if (result.ok) await notifyRequest("booking_confirmed", requestId);
  return result;
}

export async function cancelOrder(requestId: string, reason: string, credit: number): Promise<AdminResult> {
  const p = z.object({ requestId: uuid, reason: z.string().trim().min(3).max(500), credit: z.number().min(0).max(10_000_000) }).safeParse({ requestId, reason, credit });
  if (!p.success) return { ok: false, error: "reason_required" };
  let note: string | null = null;
  const result = await run(undefined, async (db) => {
    const r = await db.rpc("cancel_order", { p_request: requestId, p_reason: p.data.reason, p_credit: p.data.credit });
    note = (r.data as { credit_note_id: string | null } | null)?.credit_note_id ?? null;
    return r;
  });
  if (result.ok) await notifyRequest("cancelled", requestId, { extra: { reason: p.data.reason }, attachments: note ? [{ type: "invoice", id: note }] : [] });
  return result;
}

const Received = z.array(z.object({ line_id: uuid, received: z.number().int().min(0).max(10000) })).min(1).max(50);

export async function receiveReturn(requestId: string, lines: z.input<typeof Received>): Promise<AdminResult> {
  const p = Received.safeParse(lines);
  if (!uuid.safeParse(requestId).success || !p.success) return { ok: false, error: "invalid" };
  const result = await run(undefined, (db) => db.rpc("receive_return", { p_request: requestId, p_lines: p.data }));
  if (result.ok) await notifyRequest("return_received", requestId, { staff: "Retour reçu" });
  return result;
}

/** Work in progress: any shape the panel keeps, up to a sensible size. */
export async function saveInspectionDraft(requestId: string, draft: unknown): Promise<AdminResult> {
  if (!uuid.safeParse(requestId).success || JSON.stringify(draft).length > 50_000) return { ok: false, error: "invalid" };
  return run(undefined, (db, me) => db.from("inspection_drafts").upsert({ request_id: requestId, draft, updated_by: me }));
}

const InspectionInput = z.array(z.object({
  line_id: uuid,
  ok: z.number().int().min(0), minor: z.number().int().min(0), damaged: z.number().int().min(0), broken: z.number().int().min(0), missing: z.number().int().min(0),
  fee: z.number().min(0).max(10_000_000),
  fee_reason: z.string().trim().max(300),
  note: z.string().trim().max(1000),
  photos: z.array(z.string().max(300)).max(6),
  photos_visible: z.boolean(),
})).min(1).max(50);

type Closed = { invoice_id: string; total_fees: number; payment_status: string; net_to_pay: number };

export async function closeInspection(requestId: string, lines: z.input<typeof InspectionInput>, caution: { outcome: "refund" | "retain" | "none"; amount: number }): Promise<AdminResult> {
  const p = InspectionInput.safeParse(lines);
  if (!uuid.safeParse(requestId).success || !p.success) return { ok: false, error: "invalid" };
  let out: Closed | null = null;
  let report: InspectionView | null = null;
  let invoice: string | undefined;
  const result = await run(undefined, async (db) => {
    const r = await db.rpc("close_inspection", { p_request: requestId, p_lines: p.data, p_caution: caution });
    out = r.data as Closed;
    if (!r.error) {
      const view = (await db.rpc("my_request_view", { p_request: requestId })).data as OrderView | null;
      report = view?.inspection ?? null;
      invoice = view?.invoices.find((i) => i.type === "final")?.number;
    }
    return r;
  });
  if (!result.ok || !out) return result;
  const done = out as Closed;
  await notifyRequest("inspection_closed", requestId, {
    withBank: done.net_to_pay > 0, inspection: report ?? undefined,
    extra: { fees: done.total_fees, netToPay: Math.max(0, done.net_to_pay), invoice }, attachments: [{ type: "invoice", id: done.invoice_id }],
  });
  if (done.payment_status === "paid") await settled(requestId);
  return result;
}

export async function recordFound(productId: string, qty: number): Promise<AdminResult> {
  if (!uuid.safeParse(productId).success || !Number.isInteger(qty) || qty < 1) return { ok: false, error: "invalid" };
  return run(["admin"], (db) => db.rpc("record_found", { p_product: productId, p_qty: qty }));
}

const ExtraInput = z.object({
  requestId: uuid,
  kind: z.enum(["delivery", "installation", "collection", "discount", "other"]),
  label: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(10000),
  unitPrice: z.number().min(-10_000_000).max(10_000_000).refine((v) => v !== 0),
  vatRate: z.number().min(0).max(100),
});

/** A discount is entered as a positive amount and stored negative. */
export async function addExtra(input: z.input<typeof ExtraInput>): Promise<AdminResult> {
  const p = ExtraInput.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const { requestId, unitPrice, vatRate, ...rest } = p.data;
  const unit_price = rest.kind === "discount" ? -Math.abs(unitPrice) : Math.abs(unitPrice);
  return run(undefined, (db, me) => db.from("request_extras").insert({ request_id: requestId, ...rest, unit_price, vat_rate: vatRate, created_by: me }));
}

export async function removeExtra(id: string): Promise<AdminResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  return run(undefined, (db) => db.from("request_extras").delete().eq("id", id));
}

export async function saveBilling(requestId: string, address: string, taxId: string): Promise<AdminResult> {
  const p = z.object({ requestId: uuid, address: z.string().trim().max(240), taxId: z.string().trim().max(40) }).safeParse({ requestId, address, taxId });
  if (!p.success) return { ok: false, error: "invalid" };
  return run(undefined, (db) => db.from("rental_requests").update({ billing_address: p.data.address || null, billing_tax_id: p.data.taxId || null }).eq("id", requestId));
}

export async function saveDepositOverride(profileId: string, rate: number | null): Promise<AdminResult> {
  const p = z.object({ profileId: uuid, rate: z.number().min(0).max(100).nullable() }).safeParse({ profileId, rate });
  if (!p.success) return { ok: false, error: "invalid" };
  return run(undefined, (db, me) => db.from("client_notes").upsert({ profile_id: profileId, deposit_rate_override: p.data.rate, updated_by: me }));
}

/** Staff re-send an email. It goes out as the same row: the timeline keeps one line per email. */
export async function resendEmail(id: string): Promise<AdminResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" };
  return run(undefined, async (db) => {
    const { data, error } = await db.from("email_events").select("id, request_id, kind, to_address, lang, attempts, payload").eq("id", id).single();
    if (error) return { error };
    const service = serviceClient();
    if (!service || data.kind === "password_reset") return { error: { message: "forbidden", code: "42501" } };
    await deliver(service, data as unknown as EmailRow);
    return { error: null };
  });
}

const CompanyInput = z.object({
  legal_name: z.string().trim().max(160), legal_form: z.string().trim().max(80).nullable(), address: z.string().trim().max(240).nullable(),
  city: z.string().trim().max(80).nullable(), postal_code: z.string().trim().max(12).nullable(), tax_id: z.string().trim().max(40),
  rne: z.string().trim().max(40).nullable(), phone: z.string().trim().max(40).nullable(), email: z.string().trim().max(254).nullable(),
  bank_name: z.string().trim().max(120).nullable(), rib: z.string().trim().max(40).nullable(), iban: z.string().trim().max(40).nullable(),
  logo_url: z.string().url().max(1000).nullable(),
  prices_include_vat: z.boolean(), default_vat_rate: z.number().min(0).max(100), stamp_duty: z.number().min(0).max(1000),
  deposit_rate: z.number().min(0).max(100), deposit_deadline_hours: z.number().int().min(1).max(2160),
  invoice_due_days_deposit: z.number().int().min(0).max(365), invoice_due_days_balance: z.number().int().min(0).max(365),
  legal_mentions_fr: z.string().trim().max(1000).nullable(), legal_mentions_en: z.string().trim().max(1000).nullable(),
});
export type CompanyInput = z.infer<typeof CompanyInput>;

export async function saveCompany(input: CompanyInput): Promise<AdminResult> {
  const p = CompanyInput.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  return run(["admin"], (db, me) => db.from("company_settings").update({ ...p.data, updated_by: me }).eq("id", true));
}

/** The accountant's follow-up after submitting through their TTN access. */
export async function markTtn(ids: string[], status: "sent" | "accepted" | "rejected", reference: string): Promise<AdminResult> {
  const p = z.object({ ids: z.array(uuid).min(1).max(200), reference: z.string().trim().max(120) }).safeParse({ ids, reference });
  if (!p.success || !["sent", "accepted", "rejected"].includes(status)) return { ok: false, error: "invalid" };
  return run(undefined, (db) => db.from("invoices").update({ ttn_status: status, ttn_reference: p.data.reference || null }).in("id", ids));
}

