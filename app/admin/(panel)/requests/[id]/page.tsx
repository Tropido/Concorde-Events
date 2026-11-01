import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft, MessageCircle, Phone } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assignRequestToMe, markContacted, setRequestStatus } from "@/lib/actions/admin";
import { ActionButton, Panel, btnDanger, btnPrimary } from "@/components/admin/ui";
import { BillingForm, CancelOrder, ConfirmWithoutDeposit, EmailsPanel, ExtrasPanel, InvoicesPanel, MarkAccepted, PaymentsPanel, type EmailEvent, type ExtraRow, type InvoiceRow, type PaymentRow } from "./order-panels";
import { StatusPill, StatusTrack } from "@/components/ui/status";
import { formatDateTime, formatDay, formatTND } from "@/lib/utils/formatters";
import { IssueQuoteForm, RescheduleForm } from "./forms";
import { InspectionPanel, ReceiveReturn, type InspectionDraft, type ReturnLine } from "./return-panels";
import { ReturnReport } from "@/components/order/return-report";
import { withSignedPhotos } from "@/lib/order-photos";
import type { ImageFit, LogisticsStatus, OrderView, RequestStatus, Tone } from "@/lib/types";

type Line = {
  id: string; quantity: number; start_date: string; end_date: string; nights: number; unit_price: number; line_total: number; logistics_status: LogisticsStatus; received_qty: number | null;
  products: { slug: string; title_fr: string; images: string[]; image_fit: ImageFit | null; tone: Tone; product_internal: { repair_fee: number | null; replacement_value: number | null; purchase_cost: number | null } | null } | null;
};

export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [{ t, prefs }, viewer] = await Promise.all([getT(), requireStaff()]);
  const a = t.admin.requests;
  const p = t.order.panel;
  const isAdmin = viewer.role === "admin";
  const db = await createClient();
  const { data: r, error } = await db.from("rental_requests")
    .select("*, assignee:profiles!rental_requests_assignee_id_fkey(full_name), contact_by:profiles!rental_requests_contact_confirmed_by_fkey(full_name), request_lines(id, quantity, start_date, end_date, nights, unit_price, line_total, logistics_status, received_qty, products(slug, title_fr, images, image_fit, tone, product_internal(repair_fee, replacement_value, purchase_cost))), inspection_drafts(draft), return_inspection_lines(line_id, note, photo_paths), quotes(id, revision, issued_at, currency:snapshot->>currency, total:snapshot->total), payments(id, kind, method, amount, received_at, reference, proof_path, note, voided_at, void_reason, recorder:profiles!payments_recorded_by_fkey(full_name)), invoices(id, type, number, issued_at, total_due, ttc, ttn_status), request_extras(id, kind, label, quantity, unit_price, vat_rate), email_events(id, kind, subject, status, created_at, attempts, error, to_address)")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  if (!r) notFound();

  const status = r.status as RequestStatus;
  const money = (v: number) => formatTND(v, prefs.lang);
  const lines = ((r.request_lines ?? []) as Line[]).sort((x, y) => x.start_date.localeCompare(y.start_date));
  const quotes = ((r.quotes ?? []) as { id: string; revision: number; issued_at: string; total: number }[]).sort((x, y) => y.revision - x.revision);
  const phoneDigits = String(r.customer_phone).replace(/\D/g, "");
  const total = lines.reduce((s, l) => s + Number(l.line_total), 0);
  const open = ["submitted", "validated", "accepted", "confirmed"].includes(status);
  const waText = a.waGreeting(r.customer_name, r.reference);
  const invoices = ((r.invoices ?? []) as (InvoiceRow & { ttc: number })[]).sort((x, y) => x.issued_at.localeCompare(y.issued_at));
  const emails = ((r.email_events ?? []) as EmailEvent[]).sort((x, y) => y.created_at.localeCompare(x.created_at));
  const rawPayments = ((r.payments ?? []) as (Omit<PaymentRow, "proofUrl"> & { proof_path: string | null })[]).sort((x, y) => x.received_at.localeCompare(y.received_at));
  const signed = await Promise.all(rawPayments.map((x) => (x.proof_path ? db.storage.from("payment-proofs").createSignedUrl(x.proof_path, 600) : null)));
  const payments: PaymentRow[] = rawPayments.map((x, i) => ({ ...x, proofUrl: signed[i]?.data?.signedUrl ?? null }));
  const live = payments.filter((x) => !x.voided_at);
  const sum = (...kinds: string[]) => live.filter((x) => kinds.includes(x.kind)).reduce((s, x) => s + Number(x.amount), 0);
  const cautionHeld = sum("caution_held") - sum("caution_refund", "caution_retained");
  const invoiced = invoices.reduce((s, i) => s + (i.type === "deposit" ? Number(i.ttc) : i.type === "credit_note" ? -Number(i.ttc) : 0), 0);
  const stamps = invoices.reduce((s, i) => s + (i.type === "credit_note" ? 0 : Number(i.total_due) - Number(i.ttc)), 0);
  const final = invoices.some((i) => i.type === "final");
  const owed = final ? invoices.reduce((s, i) => s + (i.type === "credit_note" ? -1 : 1) * Number(i.total_due), 0) : Number(r.total_ttc ?? 0) + stamps;
  const latestQuote = quotes[0];
  const { data: company } = await db.from("company_settings").select("default_vat_rate, rib, legal_name, tax_id").single();
  const companyReady = !!company?.legal_name.trim() && !!company?.tax_id.trim();
  const returnLines: ReturnLine[] = lines.map((l) => ({
    id: l.id, title: l.products?.title_fr ?? "", quantity: l.quantity, received: l.received_qty ?? l.quantity, image: l.products?.images[0] ?? null, imageFit: l.products?.image_fit ?? "contain", tone: l.products?.tone ?? "almond",
    repairFee: l.products?.product_internal?.repair_fee == null ? null : Number(l.products.product_internal.repair_fee),
    replacementValue: Number(l.products?.product_internal?.replacement_value ?? l.products?.product_internal?.purchase_cost ?? 0) || null,
  }));
  const stored = (r.return_inspection_lines ?? []) as { line_id: string; note: string | null; photo_paths: string[] }[];
  const order = status === "completed" ? ((await db.rpc("my_request_view", { p_request: r.id })).data as OrderView | null) : null;
  // Staff see every photo, ticked or not.
  const report = order?.inspection ? (await withSignedPhotos({ ...order, inspection: { ...order.inspection, lines: order.inspection.lines.map((l) => ({ ...l, photos: stored.find((s) => s.line_id === l.line_id)?.photo_paths ?? [] })) } })).inspection : null;
  const finalInvoice = invoices.find((i) => i.type === "final");
  // Server render: the countdown only needs the time of this request.
  const now = Date.now();

  return (
    <>
      <header className="card space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <Link href="/admin/requests" className="inline-flex items-center gap-1 text-xs text-ink/55 hover:text-ink"><ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />{t.admin.nav.requests}</Link>
            <h1 className="display font-mono text-3xl sm:text-4xl"><bdi>{r.reference}</bdi></h1>
            <p className="text-sm text-ink/55">{a.created} {formatDateTime(r.created_at, prefs.lang)} · {r.tier === "pro" ? t.quote.tierPro : t.quote.tierRetail}{Number(r.discount_percent) > 0 && ` · −${Number(r.discount_percent)}%`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={status} label={t.requestStatus[status]} className="text-xs" />
            {(status === "validated" || r.reacceptance_required) && latestQuote && <MarkAccepted requestId={r.id} quoteId={latestQuote.id} name={r.customer_name} />}
            {status === "accepted" && isAdmin && !r.reacceptance_required && <ConfirmWithoutDeposit requestId={r.id} />}
            {status === "confirmed" && !r.reacceptance_required && <ActionButton action={setRequestStatus.bind(null, r.id, "dispatched")} className={btnPrimary} confirm>{a.dispatch}</ActionButton>}
            {status === "dispatched" && <ReceiveReturn requestId={r.id} lines={returnLines} />}
            {(status === "submitted" || status === "validated") && <ActionButton action={setRequestStatus.bind(null, r.id, "rejected")} className={btnDanger} confirm>{a.reject}</ActionButton>}
            {(status === "submitted" || status === "validated") && <ActionButton action={setRequestStatus.bind(null, r.id, "cancelled")} className={btnDanger} confirm>{a.cancel}</ActionButton>}
            {(status === "accepted" || status === "confirmed") && <CancelOrder requestId={r.id} invoiced={invoiced} />}
          </div>
        </div>
        <StatusTrack status={status} labels={t.requestStatus} />
        {r.reacceptance_required && <p role="status" className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{p.reacceptNotice}</p>}
        {r.deposit_waived_reason && <p className="rounded-2xl bg-paper p-3 text-sm text-ink/70">{p.waived(r.deposit_waived_reason)}</p>}
        {r.cancelled_reason && <p className="rounded-2xl bg-paper p-3 text-sm text-ink/70">{p.reason} : {r.cancelled_reason}</p>}
        {!companyReady && open && <Link href="/admin/settings" className="block rounded-2xl bg-warn-soft p-3 text-sm text-warn underline-offset-2 hover:underline">{t.order.company.incomplete}</Link>}
      </header>

      <div className="grid gap-2.5 xl:grid-cols-[1fr_2fr]">
        <div className="space-y-2.5">
          <Panel title={a.client}>
            <div className="space-y-1 text-sm">
              <p className="text-lg font-semibold tracking-tight">{r.customer_name}</p>
              {r.company_name && <p>{r.company_name}</p>}
              <p><bdi dir="ltr">{r.customer_email}</bdi></p>
              <p><bdi dir="ltr">{r.customer_phone}</bdi></p>
              <p className="pt-1 text-xs text-ink/55">{a.prefers}: {t.checkout.contactOptions[r.preferred_contact as "whatsapp" | "phone" | "email"]}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {phoneDigits.length >= 8 && (
                <>
                  <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-ok text-card hover:opacity-90"><MessageCircle className="h-4 w-4" aria-hidden />WhatsApp</a>
                  <a href={`tel:+${phoneDigits}`} className="btn-light btn-sm"><Phone className="h-4 w-4" aria-hidden />{a.call}</a>
                </>
              )}
              <Link href={`/admin/inbox?new=1&ref=${encodeURIComponent(r.reference)}`} className="btn-light btn-sm">{a.createTicket}</Link>
            </div>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-ink/55">{a.whatsappOpened}</dt><dd>{r.whatsapp_opened_at ? formatDateTime(r.whatsapp_opened_at, prefs.lang) : "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink/55">{a.contactConfirmed}</dt><dd>{r.contact_confirmed_at ? `${formatDateTime(r.contact_confirmed_at, prefs.lang)} · ${r.contact_by?.full_name ?? ""}` : !open ? "—" : <ActionButton action={markContacted.bind(null, r.id)} className="btn-light btn-sm">{a.markContacted}</ActionButton>}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-ink/55">{a.assignedTo}</dt><dd className="flex items-center gap-2">{r.assignee?.full_name ?? a.unassigned}<ActionButton action={assignRequestToMe.bind(null, r.id)} className="text-xs underline">{a.assignMe}</ActionButton></dd></div>
            </dl>
            <BillingForm requestId={r.id} address={r.billing_address ?? ""} taxId={r.billing_tax_id ?? ""} />
          </Panel>
          <Panel title={a.event}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink/55">{a.eventType}</dt><dd>{r.event_type ? t.eventTypes[r.event_type as keyof typeof t.eventTypes] : "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink/55">{t.checkout.venue}</dt><dd className="text-end">{r.event_venue ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink/55">{t.checkout.guests}</dt><dd>{r.guest_count ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink/55">{t.checkout.deliveryTitle}</dt><dd>{r.delivery_mode ? t.checkout.delivery[r.delivery_mode as "delivery" | "pickup"].title : "—"}</dd></div>
            </dl>
            {r.notes && <p className="mt-4 whitespace-pre-line rounded-2xl bg-paper p-3 text-sm">{r.notes}</p>}
          </Panel>
        </div>

        <div className="space-y-2.5">
          <Panel title={a.lines}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="label py-2 text-start">{a.product}</th>
                    <th scope="col" className="label py-2 text-end">{a.qty}</th>
                    <th scope="col" className="label py-2 text-start ps-4">{a.period}</th>
                    <th scope="col" className="label py-2 text-end">{a.unit}</th>
                    <th scope="col" className="label py-2 text-end">{a.lineTotal}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b border-line last:border-0">
                      <td className="py-3"><Link href={`/catalogue/${l.products?.slug}`} className="hover:underline">{l.products?.title_fr}</Link><span className="ms-2 rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink/70">{t.order.inspection.logistics[l.logistics_status]}</span></td>
                      <td className="py-3 text-end tabular-nums">{l.quantity}</td>
                      <td className="whitespace-nowrap py-3 ps-4 text-xs"><bdi>{formatDay(l.start_date, prefs.lang)}</bdi> – <bdi>{formatDay(l.end_date, prefs.lang)}</bdi> · {t.common.nights(l.nights)}</td>
                      <td className="py-3 text-end tabular-nums">{money(Number(l.unit_price))}</td>
                      <td className="py-3 text-end font-medium tabular-nums">{money(Number(l.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><th scope="row" colSpan={4} className="pt-4 text-end font-medium">{t.common.total}</th><td className="pt-4 text-end text-xl font-semibold tabular-nums">{money(total)}</td></tr></tfoot>
              </table>
            </div>
            {open && <RescheduleForm requestId={r.id} lines={lines.map((l) => ({ id: l.id, title: l.products?.title_fr ?? "", start: l.start_date, end: l.end_date }))} />}
          </Panel>

          {status === "returned" && <InspectionPanel requestId={r.id} lines={returnLines} cautionHeld={cautionHeld} initial={(r.inspection_drafts as { draft: InspectionDraft } | null)?.draft ?? null} />}
          {report && <ReturnReport report={report} notes={Object.fromEntries(stored.map((s) => [s.line_id, s.note]))} invoiceHref={finalInvoice && `/api/invoices/${finalInvoice.id}/pdf`} />}
          {status !== "submitted" && status !== "rejected" && (
            <PaymentsPanel isAdmin={isAdmin} payments={payments} r={{
              id: r.id, reference: r.reference, name: r.customer_name, phone: r.customer_phone, status, now, total: Number(r.total_ttc ?? 0), owed,
              paidTotal: Number(r.paid_total), depositPaid: Number(r.deposit_paid), depositRequired: Number(r.deposit_required ?? 0), dueAt: r.deposit_due_at, cautionHeld, rib: company?.rib ?? null,
            }} />
          )}
          {open && <ExtrasPanel requestId={r.id} extras={(r.request_extras ?? []) as ExtraRow[]} defaultVat={Number(company?.default_vat_rate ?? 19)} editable={open} />}

          <div className="grid gap-2.5 md:grid-cols-2">
            <Panel title={a.quotes}>
              {quotes.length === 0 ? <p className="text-sm text-ink/55">{a.noQuotes}</p> : (
                <ul className="space-y-1">
                  {quotes.map((q) => (
                    <li key={q.id}><Link href={`/quote/${q.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2 text-sm hover:ring-1 hover:ring-line">
                      <span className="font-mono text-xs">R{q.revision}</span><span className="tabular-nums">{money(Number(q.total))}</span><span className="text-xs text-ink/50">{formatDateTime(q.issued_at, prefs.lang)}</span>
                    </Link></li>
                  ))}
                </ul>
              )}
              {r.quote_valid_until && status === "validated" && <p className="mt-3 text-xs text-ink/55">{a.quoteValidUntil} {formatDay(r.quote_valid_until, prefs.lang)}</p>}
              {open && <IssueQuoteForm requestId={r.id} />}
            </Panel>
            <Panel title={a.nextStep}><p className="text-sm text-ink/60">{a.nextStepText[status]}</p></Panel>
            <InvoicesPanel invoices={invoices} />
            <EmailsPanel emails={emails} />
          </div>
        </div>
      </div>
    </>
  );
}
