import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assignRequestToMe, markContacted, setRequestStatus } from "@/lib/actions/admin";
import { ActionButton, btnDanger, btnPrimary } from "@/components/admin/ui";
import { formatDateTime, formatDay, formatMoney } from "@/lib/utils/formatters";
import { currencyOf } from "@/lib/prefs";
import { IssueQuoteForm, RescheduleForm, ReturnForm } from "./forms";
import type { Country, Currency, RequestStatus } from "@/lib/types";

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
  const country = r.country as Country;
  const source = currencyOf(country);
  const lines = ((r.request_lines ?? []) as Line[]).sort((x, y) => x.start_date.localeCompare(y.start_date));
  const quotes = ((r.quotes ?? []) as { id: string; revision: number; issued_at: string; currency: Currency; total: number }[]).sort((x, y) => y.revision - x.revision);
  const phoneDigits = String(r.customer_phone).replace(/\D/g, "");
  const total = lines.reduce((s, l) => s + Number(l.line_total), 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/requests" className="text-xs underline">{t.admin.nav.requests}</Link>
          <h1 className="text-2xl font-serif font-bold"><bdi>{r.reference}</bdi></h1>
          <p className="text-xs opacity-70">{a.created} {formatDateTime(r.created_at, prefs.lang)} · {country} · {a.tier}: {r.tier}</p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-tan/20 border border-tan/40 text-sm font-bold">{t.requestStatus[status]}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-2 text-sm">
          <h2 className="font-serif font-bold">{a.client}</h2>
          <p className="font-bold">{r.customer_name}</p>
          {r.company_name && <p>{r.company_name}</p>}
          <p><bdi dir="ltr">{r.customer_email}</bdi></p>
          <p><bdi dir="ltr">{r.customer_phone}</bdi></p>
          {r.notes && <p className="pt-2 border-t border-tan/20 whitespace-pre-line"><strong>{a.notes}:</strong> {r.notes}</p>}
          <div className="pt-2 border-t border-tan/20 space-y-2">
            <p className="text-xs">{a.whatsappOpened}: {r.whatsapp_opened_at ? formatDateTime(r.whatsapp_opened_at, prefs.lang) : "—"}</p>
            <p className="text-xs">{a.contactConfirmed}: {r.contact_confirmed_at ? `${formatDateTime(r.contact_confirmed_at, prefs.lang)} (${r.contact_by?.full_name ?? ""})` : "—"}</p>
            <div className="flex flex-wrap gap-2">
              {phoneDigits.length >= 8 && (
                <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full bg-emerald-700 text-white text-xs font-bold">WhatsApp</a>
              )}
              {!r.contact_confirmed_at && <ActionButton action={markContacted.bind(null, r.id)}>{a.markContacted}</ActionButton>}
              <Link href={`/admin/inbox?new=1&ref=${encodeURIComponent(r.reference)}`} className="px-3 py-1.5 rounded-full border border-tan/50 text-xs font-bold">{a.createTicket}</Link>
            </div>
            <p className="text-xs">{a.assignedTo}: {r.assignee?.full_name ?? a.unassigned} <ActionButton action={assignRequestToMe.bind(null, r.id)} className="underline text-xs ms-2">{a.assignMe}</ActionButton></p>
          </div>
        </section>

        <section className="xl:col-span-2 apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
          <h2 className="font-serif font-bold">{a.lines}</h2>
          <p className="text-[11px] opacity-70">{a.sourceNote}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-toffeeBrown dark:text-tan">
                <tr className="border-b border-tan/30">
                  <th scope="col" className="p-2 text-start">{a.product}</th>
                  <th scope="col" className="p-2 text-end">{a.qty}</th>
                  <th scope="col" className="p-2 text-start">{a.period}</th>
                  <th scope="col" className="p-2 text-end">{a.unitSource}</th>
                  <th scope="col" className="p-2 text-end">{a.lineTotal}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-tan/15">
                    <td className="p-2">{l.products?.title_fr}</td>
                    <td className="p-2 text-end">{l.quantity}</td>
                    <td className="p-2 whitespace-nowrap"><bdi>{formatDay(l.start_date, prefs.lang)}</bdi> → <bdi>{formatDay(l.end_date, prefs.lang)}</bdi> ({t.common.nights(l.nights)})</td>
                    <td className="p-2 text-end">{formatMoney(Number(l.unit_price), source, prefs.lang)}</td>
                    <td className="p-2 text-end font-bold">{formatMoney(Number(l.line_total), source, prefs.lang)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th scope="row" colSpan={4} className="p-2 text-end">{t.common.total}</th><td className="p-2 text-end font-black">{formatMoney(total, source, prefs.lang)}</td></tr>
              </tfoot>
            </table>
          </div>
          {["submitted", "validated", "confirmed"].includes(status) && (
            <RescheduleForm requestId={r.id} lines={lines.map((l) => ({ id: l.id, title: l.products?.title_fr ?? "", start: l.start_date, end: l.end_date }))} />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
          <h2 className="font-serif font-bold">{a.quotes}</h2>
          {quotes.length === 0 ? <p className="text-sm">—</p> : (
            <ul className="text-sm space-y-1">
              {quotes.map((q) => (
                <li key={q.id} className="flex flex-wrap justify-between gap-2">
                  <Link href={`/quote/${q.id}`} className="underline font-bold">R{q.revision}</Link>
                  <span>{formatMoney(Number(q.total), q.currency, prefs.lang)}</span>
                  <span className="text-xs opacity-70">{formatDateTime(q.issued_at, prefs.lang)}</span>
                </li>
              ))}
            </ul>
          )}
          {r.quote_valid_until && status === "validated" && <p className="text-xs">{a.quoteValidUntil} {formatDay(r.quote_valid_until, prefs.lang)}</p>}
          {["submitted", "validated", "confirmed"].includes(status) && <IssueQuoteForm requestId={r.id} source={source} />}
        </section>

        <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
          <h2 className="font-serif font-bold">{t.common.actions}</h2>
          <div className="flex flex-wrap gap-3">
            {status === "validated" && <ActionButton action={setRequestStatus.bind(null, r.id, "confirmed")} className={btnPrimary} confirm>{a.confirm}</ActionButton>}
            {status === "confirmed" && <ActionButton action={setRequestStatus.bind(null, r.id, "dispatched")} className={btnPrimary} confirm>{a.dispatch}</ActionButton>}
            {(status === "submitted" || status === "validated") && <ActionButton action={setRequestStatus.bind(null, r.id, "rejected")} className={btnDanger} confirm>{a.reject}</ActionButton>}
            {["submitted", "validated", "confirmed"].includes(status) && <ActionButton action={setRequestStatus.bind(null, r.id, "cancelled")} className={btnDanger} confirm>{a.cancel}</ActionButton>}
          </div>
          {status === "dispatched" && <ReturnForm requestId={r.id} lines={lines.map((l) => ({ id: l.id, title: l.products?.title_fr ?? "", quantity: l.quantity }))} />}
        </section>
      </div>
    </>
  );
}
