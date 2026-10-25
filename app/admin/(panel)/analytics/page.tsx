import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayIn } from "@/lib/dates";
import { PageHeader } from "@/components/admin/ui";
import { AnalyticsView, type AnalyticsData } from "./analytics-view";
import type { RequestStatus } from "@/lib/types";

type Req = {
  status: RequestStatus; tier: string; event_type: string | null; created_at: string;
  request_lines: { product_id: string; quantity: number; nights: number; line_total: number; start_date: string }[];
};

const BOOKED: RequestStatus[] = ["confirmed", "dispatched", "completed"];

// Only figures backed by records (requests, lines, stock, purchase costs).
export default async function AdminAnalyticsPage() {
  const [{ t }] = await Promise.all([getT(), requireStaff()]);
  const db = await createClient();
  const [reqs, products] = await Promise.all([
    db.from("rental_requests").select("status, tier, event_type, created_at, request_lines(product_id, quantity, nights, line_total, start_date)").eq("country", "TN").limit(5000),
    db.from("products").select("id, title_fr, product_stock(quantity_owned), product_internal(purchase_cost)"),
  ]);
  if (reqs.error) throw reqs.error;
  if (products.error) throw products.error;
  const rows = (reqs.data ?? []) as unknown as Req[];

  const today = todayIn("TN");
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - (11 - i));
    return d.toISOString().slice(0, 7);
  });
  const byMonth = new Map(months.map((m) => [m, 0]));
  const byStatus = new Map<string, number>();
  const byEvent = new Map<string, number>();
  const byProduct = new Map<string, { units: number; revenue: number }>();
  let proValue = 0, retailValue = 0, decided = 0, won = 0;

  for (const r of rows) {
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    const value = r.request_lines.reduce((s, l) => s + Number(l.line_total), 0);
    if (r.status !== "submitted" && r.status !== "validated") decided += 1;
    if (BOOKED.includes(r.status)) {
      won += 1;
      const month = r.request_lines.map((l) => l.start_date).sort()[0]?.slice(0, 7);
      if (month && byMonth.has(month)) byMonth.set(month, byMonth.get(month)! + value);
      if (r.tier === "pro") proValue += value; else retailValue += value;
      const ev = r.event_type ?? "other";
      byEvent.set(ev, (byEvent.get(ev) ?? 0) + value);
      for (const l of r.request_lines) {
        const p = byProduct.get(l.product_id) ?? { units: 0, revenue: 0 };
        p.units += l.quantity * l.nights;
        p.revenue += Number(l.line_total);
        byProduct.set(l.product_id, p);
      }
    }
  }

  const productRows = (products.data ?? []).map((p) => {
    const owned = (p.product_stock as { quantity_owned: number }[])[0]?.quantity_owned ?? 0;
    const internal = p.product_internal as unknown as { purchase_cost: number | null } | { purchase_cost: number | null }[] | null;
    const row = Array.isArray(internal) ? internal[0] : internal;
    const cost = Number(row?.purchase_cost ?? 0) * owned;
    const s = byProduct.get(p.id) ?? { units: 0, revenue: 0 };
    return { title: p.title_fr, units: s.units, revenue: s.revenue, cost, roi: cost > 0 ? s.revenue / cost : null };
  }).filter((p) => p.revenue > 0 || p.cost > 0).sort((a, b) => b.revenue - a.revenue);

  const data: AnalyticsData = {
    months: months.map((m) => ({ month: m, value: byMonth.get(m)! })),
    statuses: (["submitted", "validated", "confirmed", "dispatched", "completed", "cancelled", "rejected"] as RequestStatus[]).map((s) => ({ status: s, count: byStatus.get(s) ?? 0 })),
    events: [...byEvent.entries()].sort((a, b) => b[1] - a[1]).map(([type, value]) => ({ type, value })),
    products: productRows.slice(0, 12),
    split: { pro: proValue, retail: retailValue },
    conversion: decided ? won / decided : null,
    since: addDays(today, -365),
  };

  return (
    <>
      <PageHeader title={t.admin.nav.analytics} subtitle={t.admin.analytics.subtitle} />
      <AnalyticsView data={data} />
    </>
  );
}
