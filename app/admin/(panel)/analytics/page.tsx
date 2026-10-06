import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";
import { formatMoney } from "@/lib/utils/formatters";
import type { Country, Currency, RequestStatus } from "@/lib/types";

type Req = {
  id: string; status: RequestStatus; country: Country; quote_valid_until: string | null;
  request_lines: { quantity: number; start_date: string; end_date: string }[];
  quotes: { revision: number; currency: Currency; total: number }[];
};

// Only figures backed by records: quotes (snapshots), requests and stock. No cost/payment data
// exists, so no profit or ROI is shown.
export default async function AdminAnalyticsPage() {
  const [{ t, prefs }] = await Promise.all([getT(), requireStaff()]);
  const a = t.admin.analytics;
  const db = await createClient();
  const [reqs, stock] = await Promise.all([
    db.from("rental_requests").select("id, status, country, quote_valid_until, request_lines(quantity, start_date, end_date), quotes(revision, currency:snapshot->>currency, total:snapshot->total)"),
    db.from("product_stock").select("country, quantity_owned, quantity_maintenance"),
  ]);
  if (reqs.error) throw reqs.error;
  if (stock.error) throw stock.error;
  const rows = (reqs.data ?? []) as unknown as Req[];

  const counts = new Map<RequestStatus, number>();
  const pipeline = new Map<Currency, number>();
  const booked = new Map<string, number>(); // "YYYY-MM|CUR"
  const committed: Record<Country, number> = { FR: 0, TN: 0 };

  for (const r of rows) {
    counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    const latest = [...r.quotes].sort((x, y) => y.revision - x.revision)[0];
    const today = todayIn(r.country);
    if (latest && r.status === "validated" && r.quote_valid_until && r.quote_valid_until >= today) {
      pipeline.set(latest.currency, (pipeline.get(latest.currency) ?? 0) + Number(latest.total));
    }
    if (latest && ["confirmed", "dispatched", "completed"].includes(r.status)) {
      const month = r.request_lines.map((l) => l.start_date).sort()[0]?.slice(0, 7) ?? "—";
      const key = `${month}|${latest.currency}`;
      booked.set(key, (booked.get(key) ?? 0) + Number(latest.total));
    }
    const holds = ["confirmed", "dispatched"].includes(r.status) || (r.status === "validated" && !!r.quote_valid_until && r.quote_valid_until >= today);
    if (holds) {
      for (const l of r.request_lines) {
        const end = r.status === "dispatched" && l.end_date < today ? today : l.end_date;
        if (l.start_date <= today && today <= end) committed[r.country] += l.quantity;
      }
    }
  }
  const usable: Record<Country, number> = { FR: 0, TN: 0 };
  for (const s of stock.data ?? []) usable[s.country as Country] += s.quantity_owned - s.quantity_maintenance;
  const bookedRows = [...booked.entries()].map(([k, v]) => ({ month: k.split("|")[0], currency: k.split("|")[1] as Currency, value: v })).sort((x, y) => y.month.localeCompare(x.month));
  const maxBooked = Math.max(1, ...bookedRows.map((b) => b.value));
  const maxCount = Math.max(1, ...counts.values());

  return (
    <>
      <h1 className="text-2xl font-serif font-bold">{t.admin.nav.analytics}</h1>
      <p className="text-xs opacity-70">{a.currencyNote}</p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
          <h2 className="font-serif font-bold">{a.countsByStatus}</h2>
          <ul className="space-y-2">
            {(Object.keys(t.requestStatus) as RequestStatus[]).map((s) => (
              <li key={s} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-2 text-sm">
                <span>{t.requestStatus[s]}</span>
                <span className="h-3 rounded-full bg-tan/20 overflow-hidden"><span className="block h-full bg-toffeeBrown" style={{ width: `${((counts.get(s) ?? 0) / maxCount) * 100}%` }} /></span>
                <span className="text-end font-bold">{counts.get(s) ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
          <h2 className="font-serif font-bold">{a.pipeline}</h2>
          <p className="text-xs opacity-70">{a.pipelineHint}</p>
          {pipeline.size === 0 ? <p className="text-sm">{t.common.noData}</p> : (
            <ul className="text-lg font-serif font-bold space-y-1">
              {[...pipeline.entries()].map(([c, v]) => <li key={c}>{formatMoney(v, c, prefs.lang)}</li>)}
            </ul>
          )}
          <h2 className="font-serif font-bold pt-3">{a.utilisation}</h2>
          <p className="text-xs opacity-70">{a.utilisationHint}</p>
          <ul className="text-sm space-y-1">
            {(["FR", "TN"] as const).map((c) => (
              <li key={c}>{c === "FR" ? t.common.france : t.common.tunisia}: <strong>{committed[c]} / {usable[c]}</strong>{usable[c] > 0 && ` (${Math.round((committed[c] / usable[c]) * 100)} %)`}</li>
            ))}
          </ul>
        </section>
      </div>
      <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
        <h2 className="font-serif font-bold">{a.booked}</h2>
        <p className="text-xs opacity-70">{a.bookedHint}</p>
        {bookedRows.length === 0 ? <p className="text-sm">{t.common.noData}</p> : (
          <ul className="space-y-2">
            {bookedRows.map((b) => (
              <li key={`${b.month}-${b.currency}`} className="grid grid-cols-[6rem_1fr_9rem] items-center gap-2 text-sm">
                <span>{b.month}</span>
                <span className="h-3 rounded-full bg-tan/20 overflow-hidden"><span className="block h-full bg-fadedCopper" style={{ width: `${(b.value / maxBooked) * 100}%` }} /></span>
                <span className="text-end font-bold">{formatMoney(b.value, b.currency, prefs.lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
