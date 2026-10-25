import type { Language, Translations } from "@/lib/i18n/translations";
import type { QuoteSnapshot } from "@/lib/types";
import { formatDateTime, formatDay, formatMoney } from "@/lib/utils/formatters";

/** Renders an issued quote exactly as frozen in its snapshot. Every value is rendered as
 *  React text (escaped), never as HTML; nothing is recalculated here. */
export function QuoteDocument({ snapshot: s, lang, t }: { snapshot: QuoteSnapshot; lang: Language; t: Translations }) {
  // Quotes are TND; documents issued before the TND-only switch keep their own currency.
  const money = (v: number) => (s.currency === "TND" ? formatMoney(v, "TND", lang) : new Intl.NumberFormat(lang === "ar" ? "ar-TN-u-nu-latn" : "fr-FR", { style: "currency", currency: s.currency }).format(v));
  const ev = s.event;
  return (
    <article className="space-y-8 rounded-[1.75rem] bg-card p-8 text-sm text-ink shadow-lift print:rounded-none print:p-0 print:shadow-none sm:p-12">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-8">
        <div className="space-y-1">
          <p className="text-2xl font-bold tracking-[-0.02em]">Concorde Events</p>
          <p className="font-mono text-[10.5px] uppercase tracking-label text-ink/50">{t.quote.issuer}</p>
        </div>
        <div className="space-y-1 text-end">
          <h1 className="text-3xl font-bold tracking-tight">{t.quote.title}</h1>
          <p className="font-mono text-xs"><bdi>{s.reference}</bdi> · R{s.revision}</p>
          <p className="text-xs text-ink/60">{t.quote.issuedOn} {formatDateTime(s.issued_at, lang)}</p>
          <p className="text-xs text-ink/60">{t.quote.validUntil} {formatDay(s.valid_until, lang)}</p>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1">
          <h2 className="label">{t.quote.client}</h2>
          <p className="font-semibold">{s.customer.name}</p>
          {s.customer.company && <p>{s.customer.company}</p>}
          <p><bdi dir="ltr">{s.customer.email}</bdi></p>
          <p><bdi dir="ltr">{s.customer.phone}</bdi></p>
        </div>
        <div className="space-y-1 sm:text-end">
          <h2 className="label">{t.quote.event}</h2>
          {ev?.type && <p className="font-semibold">{t.eventTypes[ev.type]}</p>}
          {ev?.venue && <p>{ev.venue}</p>}
          {ev?.guests ? <p>{t.quote.guests(ev.guests)}</p> : null}
          {ev?.delivery_mode && <p>{t.checkout.delivery[ev.delivery_mode].title}</p>}
          <p className="text-xs text-ink/60">{s.tier === "pro" ? t.quote.tierPro : t.quote.tierRetail}{s.discount_percent ? ` · −${s.discount_percent}%` : ""}</p>
        </div>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-ink text-start">
              <th scope="col" className="label py-2 text-start">{t.quote.item}</th>
              <th scope="col" className="label py-2 text-start">{t.quote.period}</th>
              <th scope="col" className="label py-2 text-end">{t.quote.qty}</th>
              <th scope="col" className="label py-2 text-end">{t.quote.nights}</th>
              <th scope="col" className="label py-2 text-end">{t.quote.unitPrice}</th>
              <th scope="col" className="label py-2 text-end">{t.quote.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l) => (
              <tr key={l.line_id} className="break-inside-avoid border-b border-line align-top">
                <td className="py-3 pe-3 font-medium">{(lang === "ar" && l.title_ar) || l.title_fr}</td>
                <td className="whitespace-nowrap py-3 pe-3 text-ink/70"><bdi>{formatDay(l.start_date, lang)}</bdi> – <bdi>{formatDay(l.end_date, lang)}</bdi></td>
                <td className="py-3 text-end tabular-nums">{l.quantity}</td>
                <td className="py-3 text-end tabular-nums">{l.nights}</td>
                <td className="whitespace-nowrap py-3 text-end tabular-nums">{money(l.unit_price)}</td>
                <td className="whitespace-nowrap py-3 text-end font-medium tabular-nums">{money(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={5} className="pt-5 text-end text-base font-medium">{t.quote.total}</th>
              <td className="whitespace-nowrap pt-5 text-end text-2xl font-bold tabular-nums">{money(s.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {s.fx && <p className="text-xs text-ink/55">{t.quote.legacyFx(String(s.fx.rate_eur_tnd))}</p>}
      {s.notes && (
        <section className="space-y-1">
          <h2 className="label">{t.quote.notes}</h2>
          <p className="whitespace-pre-line">{s.notes}</p>
        </section>
      )}
      <p className="border-t border-line pt-4 text-xs text-ink/55">{t.quote.notInvoice}</p>
    </article>
  );
}
