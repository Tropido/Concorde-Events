import type { Language, Translations } from "@/lib/i18n/translations";
import type { QuoteSnapshot } from "@/lib/types";
import { formatDateTime, formatDay, formatMoney } from "@/lib/utils/formatters";

/** Renders an issued quote exactly as frozen in its snapshot. Every value is rendered as
 *  React text (escaped), never as HTML; nothing is recalculated here. */
export function QuoteDocument({ snapshot: s, lang, t }: { snapshot: QuoteSnapshot; lang: Language; t: Translations }) {
  const money = (v: number) => formatMoney(v, s.currency, lang);
  return (
    <article className="bg-white text-[#2d1f16] rounded-2xl shadow-xl print:shadow-none print:rounded-none p-8 sm:p-10 space-y-8 text-sm">
      <header className="flex flex-wrap justify-between gap-6 border-b border-[#ddb892] pb-6">
        <div>
          <p className="font-serif text-2xl font-black tracking-[0.2em]">CONCORDE EVENTS</p>
          <p className="text-xs text-[#7f5539]">{s.country === "TN" ? t.common.tunisia : t.common.france}</p>
        </div>
        <div className="text-end space-y-1">
          <h1 className="font-serif text-xl font-bold">{t.quote.title}</h1>
          <p className="font-bold"><bdi>{s.reference}</bdi> · {s.revision > 1 ? `R${s.revision}` : "R1"}</p>
          <p className="text-xs">{t.quote.issuedOn} {formatDateTime(s.issued_at, lang)}</p>
          <p className="text-xs">{t.quote.validUntil} {formatDay(s.valid_until, lang)}</p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#7f5539]">{t.quote.client}</h2>
          <p className="font-bold">{s.customer.name}</p>
          {s.customer.company && <p>{s.customer.company}</p>}
          <p><bdi dir="ltr">{s.customer.email}</bdi></p>
          <p><bdi dir="ltr">{s.customer.phone}</bdi></p>
        </div>
        <div className="sm:text-end">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7f5539]">{s.tier === "pro" ? t.quote.tierPro : t.quote.tierRetail}</p>
          <p className="text-xs">{t.common.currency}: {s.currency}</p>
        </div>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-[#ddb892] text-xs uppercase tracking-wider text-[#7f5539]">
              <th scope="col" className="py-2 text-start">{t.quote.item}</th>
              <th scope="col" className="py-2 text-start">{t.quote.period}</th>
              <th scope="col" className="py-2 text-end">{t.quote.qty}</th>
              <th scope="col" className="py-2 text-end">{t.quote.nights}</th>
              <th scope="col" className="py-2 text-end">{t.quote.unitPrice}</th>
              <th scope="col" className="py-2 text-end">{t.quote.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l) => (
              <tr key={l.line_id} className="border-b border-[#ede0d4] align-top break-inside-avoid">
                <td className="py-2 pe-3 font-semibold">{(lang === "ar" && l.title_ar) || l.title_fr}</td>
                <td className="py-2 pe-3 whitespace-nowrap"><bdi>{formatDay(l.start_date, lang)}</bdi> → <bdi>{formatDay(l.end_date, lang)}</bdi></td>
                <td className="py-2 text-end">{l.quantity}</td>
                <td className="py-2 text-end">{l.nights}</td>
                <td className="py-2 text-end whitespace-nowrap">{money(l.unit_price)}</td>
                <td className="py-2 text-end whitespace-nowrap font-semibold">{money(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={5} className="pt-4 text-end text-base">{t.quote.total}</th>
              <td className="pt-4 text-end text-base font-black whitespace-nowrap">{money(s.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {s.fx && (
        <p className="text-xs text-[#7f5539]">
          {t.quote.fxNote(String(s.fx.rate_eur_tnd), s.fx.source === "manual" ? t.quote.manualRate : t.quote.providerRate, formatDateTime(s.fx.rate_time, lang))}
        </p>
      )}
      {s.notes && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#7f5539]">{t.quote.notes}</h2>
          <p className="whitespace-pre-line">{s.notes}</p>
        </section>
      )}
      <p className="text-xs border-t border-[#ede0d4] pt-4">{t.quote.notInvoice}</p>
    </article>
  );
}
