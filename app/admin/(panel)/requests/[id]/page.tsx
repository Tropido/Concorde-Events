import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft, MessageCircle, Phone } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assignRequestToMe, markContacted, setRequestStatus } from "@/lib/actions/admin";
import { ActionButton, Panel, btnDanger, btnPrimary } from "@/components/admin/ui";
import { StatusPill, StatusTrack } from "@/components/ui/status";
import { formatDateTime, formatDay, formatTND } from "@/lib/utils/formatters";
import { IssueQuoteForm, RescheduleForm, ReturnForm } from "./forms";
import type { RequestStatus } from "@/lib/types";

type Line = { id: string; quantity: number; start_date: string; end_date: string; nights: number; unit_price: number; line_total: number; products: { slug: string; title_fr: string } | null };

export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [{ t, prefs }] = await Promise.all([getT(), requireStaff()]);
  const a = t.admin.requests;
  const db = await createClient();
  const { data: r, error } = await db.from("rental_requests")
    .select("*, assignee:profiles!rental_requests_assignee_id_fkey(full_name), contact_by:profiles!rental_requests_contact_confirmed_by_fkey(full_name), request_lines(id, quantity, start_date, end_date, nights, unit_price, line_total, products(slug, title_fr)), quotes(id, revision, issued_at, currency:snapshot->>currency, total:snapshot->total)")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  if (!r) notFound();

  const status = r.status as RequestStatus;
  const money = (v: number) => formatTND(v, prefs.lang);
  const lines = ((r.request_lines ?? []) as Line[]).sort((x, y) => x.start_date.localeCompare(y.start_date));
  const quotes = ((r.quotes ?? []) as { id: string; revision: number; issued_at: string; total: number }[]).sort((x, y) => y.revision - x.revision);
  const phoneDigits = String(r.customer_phone).replace(/\D/g, "");
  const total = lines.reduce((s, l) => s + Number(l.line_total), 0);
  const open = ["submitted", "validated", "confirmed"].includes(status);
  const waText = a.waGreeting(r.customer_name, r.reference);

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
            {status === "validated" && <ActionButton action={setRequestStatus.bind(null, r.id, "confirmed")} className={btnPrimary} confirm>{a.confirm}</ActionButton>}
            {status === "confirmed" && <ActionButton action={setRequestStatus.bind(null, r.id, "dispatched")} className={btnPrimary} confirm>{a.dispatch}</ActionButton>}
            {(status === "submitted" || status === "validated") && <ActionButton action={setRequestStatus.bind(null, r.id, "rejected")} className={btnDanger} confirm>{a.reject}</ActionButton>}
            {open && <ActionButton action={setRequestStatus.bind(null, r.id, "cancelled")} className={btnDanger} confirm>{a.cancel}</ActionButton>}
          </div>
        </div>
        <StatusTrack status={status} labels={t.requestStatus} />
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
                      <td className="py-3"><Link href={`/catalogue/${l.products?.slug}`} className="hover:underline">{l.products?.title_fr}</Link></td>
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
            {status === "dispatched" ? (
              <Panel title={a.returnTitle}><ReturnForm requestId={r.id} lines={lines.map((l) => ({ id: l.id, title: l.products?.title_fr ?? "", quantity: l.quantity }))} /></Panel>
            ) : (
              <Panel title={a.nextStep}><p className="text-sm text-ink/60">{a.nextStepText[status]}</p></Panel>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
