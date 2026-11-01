import Link from "next/link";
import { Download } from "lucide-react";
import { ProgressBar, StatusPill, StatusTrack } from "@/components/ui/status";
import { AcceptQuote } from "@/components/order/accept-quote";
import { ReturnReport } from "@/components/order/return-report";
import { localized } from "@/lib/i18n/localize";
import { formatDateTime, formatDay, formatTND } from "@/lib/utils/formatters";
import type { Language, Translations } from "@/lib/i18n/translations";
import type { OrderView as Order } from "@/lib/types";

/** One order as its client sees it, in /account and on the guest tracking link. Everything comes
 *  from private.client_view, which leaves out what is internal. */
export function OrderView({ view: v, t, lang, token }: { view: Order; t: Translations; lang: Language; token?: string }) {
  const o = t.order;
  const money = (n: number) => formatTND(n, lang);
  const quoteHref = v.quote && (token ? `/suivi/${token}/devis` : `/quote/${v.quote.id}`);
  const remaining = Math.max(0, v.owed - v.paid_total);
  const accepted = v.payment_status !== "unpaid" || v.deposit.paid > 0;
  const depositDue = v.status === "accepted" && v.deposit.paid < v.deposit.required;
  const payable = depositDue || v.payment_status === "balance_due";
  const finalInvoice = v.invoices.find((i) => i.type === "final");

  return (
    <div className="space-y-2.5">
      <header className="card space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label"><bdi>{v.reference}</bdi></p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{v.event_type ? t.eventTypes[v.event_type] : t.account.request}</h1>
            <p className="text-xs text-ink/55">{t.account.requestedOn} {formatDateTime(v.created_at, lang)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={v.status} label={t.requestStatus[v.status]} />
            {accepted && <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium">{o.paymentStatus[v.payment_status]}</span>}
          </div>
        </div>
        <StatusTrack status={v.status} labels={t.requestStatus} />
        {v.reacceptance_required && <p role="status" className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{o.reaccept}</p>}
        {v.quote && (
          <div className="flex flex-wrap items-center gap-2">
            {v.can_accept && <AcceptQuote requestId={token ? undefined : v.id} token={token} quoteId={v.quote.id} total={v.total_ttc ?? 0} deposit={Math.max(0, v.deposit.required - v.deposit.paid)} deadlineHours={v.deposit.deadline_hours} name={v.customer_name} />}
            <Link href={quoteHref!} className="btn-light">{o.quoteLink}</Link>
          </div>
        )}
      </header>

      {v.inspection && <ReturnReport report={v.inspection} invoiceHref={finalInvoice && `/api/invoices/${finalInvoice.id}/pdf${token ? `?t=${token}` : ""}`} />}

      <div className="grid items-start gap-2.5 lg:grid-cols-2">
        <section className="card space-y-3 p-6" aria-labelledby="pieces-title">
          <h2 id="pieces-title" className="text-lg font-semibold tracking-tight">{o.piecesTitle}</h2>
          <ul className="divide-y divide-line text-sm">
            {v.lines.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span>{l.quantity} × {localized(l, "title", lang)} <span className="ms-1 rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink/70">{o.inspection.logistics[l.logistics_status]}</span></span>
                <span className="text-xs text-ink/60"><bdi>{formatDay(l.start_date, lang)}</bdi> – <bdi>{formatDay(l.end_date, lang)}</bdi> · {t.common.nights(l.nights)}</span>
              </li>
            ))}
          </ul>
        </section>

        {accepted && (
          <section className="card space-y-4 p-6" aria-labelledby="pay-title">
            <h2 id="pay-title" className="text-lg font-semibold tracking-tight">{o.summaryTitle}</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink/60">{o.total}</dt><dd className="tabular-nums">{money(v.total_ttc ?? 0)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink/60">{o.paid}</dt><dd className="tabular-nums">{money(v.paid_total)}</dd></div>
              <div className="flex justify-between gap-3 font-semibold"><dt>{o.remaining}</dt><dd className="tabular-nums">{money(remaining)}</dd></div>
            </dl>
            <ProgressBar label={o.depositProgress} value={v.deposit.paid} max={v.deposit.required} caption={`${money(v.deposit.paid)} / ${money(v.deposit.required)}`} />
            {depositDue && v.deposit.due_at && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{o.payBefore(formatDateTime(v.deposit.due_at, lang))}</p>}
            {payable && (
              <div className="space-y-1 rounded-2xl bg-paper p-4 text-sm">
                <p className="font-semibold">{o.instructionsTitle}</p>
                {v.company.rib || v.company.iban ? (
                  <dl className="space-y-1">
                    {v.company.bank_name && <div className="flex justify-between gap-3"><dt className="text-ink/60">{o.bank}</dt><dd>{v.company.bank_name}</dd></div>}
                    {v.company.rib && <div className="flex justify-between gap-3"><dt className="text-ink/60">{o.rib}</dt><dd className="font-mono text-xs"><bdi>{v.company.rib}</bdi></dd></div>}
                    {v.company.iban && <div className="flex justify-between gap-3"><dt className="text-ink/60">{o.iban}</dt><dd className="font-mono text-xs"><bdi>{v.company.iban}</bdi></dd></div>}
                    <div className="flex justify-between gap-3"><dt className="text-ink/60">{o.mention}</dt><dd className="font-mono text-xs"><bdi>{v.reference}</bdi></dd></div>
                  </dl>
                ) : <p className="text-ink/60">{o.instructionsEmpty}</p>}
              </div>
            )}
          </section>
        )}

        {v.invoices.length > 0 && (
          <section className="card space-y-3 p-6" aria-labelledby="invoices-title">
            <h2 id="invoices-title" className="text-lg font-semibold tracking-tight">{o.invoicesTitle}</h2>
            <ul className="space-y-1.5">
              {v.invoices.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper p-3 text-sm">
                  <span><span className="font-medium">{o.invoiceTypes[i.type]}</span> <span className="font-mono text-xs text-ink/60"><bdi>{i.number}</bdi></span></span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{money(i.total_due)}</span>
                    <a href={`/api/invoices/${i.id}/pdf${token ? `?t=${token}` : ""}`} className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"><Download className="h-3.5 w-3.5" aria-hidden />{o.download}</a>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {v.payments.length > 0 && (
          <section className="card space-y-3 p-6" aria-labelledby="payments-title">
            <h2 id="payments-title" className="text-lg font-semibold tracking-tight">{o.paymentsTitle}</h2>
            <ul className="divide-y divide-line text-sm">
              {v.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                  <span>{o.kinds[p.kind]} · {o.methods[p.method]}</span>
                  <span className="flex items-center gap-3"><span className="text-xs text-ink/55">{formatDay(p.received_at.slice(0, 10), lang)}</span><span className="tabular-nums">{money(p.amount)}</span></span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
