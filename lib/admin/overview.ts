import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayIn } from "@/lib/dates";
import type { RequestStatus } from "@/lib/types";

export type OverviewData = Awaited<ReturnType<typeof loadOverview>>;

type Req = {
  id: string; reference: string; customer_name: string; company_name: string | null; status: RequestStatus; tier: string;
  created_at: string; event_type: string | null;
  request_lines: { quantity: number; start_date: string; end_date: string; line_total: number; products: { title_fr: string; category_id: string | null } | null }[];
};

const BOOKED: RequestStatus[] = ["confirmed", "dispatched", "completed"];
const LIVE: RequestStatus[] = ["submitted", "validated", "confirmed", "dispatched"];
const tunisDay = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(new Date(ts));

/** Every figure comes from stored requests, lines and stock; nothing is estimated. */
export async function loadOverview(lang: "fr" | "ar" = "fr") {
  const db = await createClient();
  const today = todayIn("TN");
  const since = addDays(today, -59);
  const [reqs, open, stock, categories, conflicts, pending] = await Promise.all([
    db.from("rental_requests")
      .select("id, reference, customer_name, company_name, status, tier, created_at, event_type, request_lines(quantity, start_date, end_date, line_total, products(title_fr, category_id))")
      .gte("created_at", `${since}T00:00:00+01:00`).order("created_at", { ascending: false }).limit(2000),
    db.from("rental_requests")
      .select("id, reference, customer_name, company_name, status, tier, created_at, event_type, request_lines(quantity, start_date, end_date, line_total, products(title_fr, category_id))")
      .in("status", LIVE).lt("created_at", `${since}T00:00:00+01:00`).limit(2000),
    db.from("product_stock").select("quantity_owned, quantity_maintenance").eq("country", "TN"),
    db.from("categories").select("id, name_fr, name_ar"),
    db.rpc("capacity_conflicts"),
    db.from("profiles").select("id, full_name, company_name, activity, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
  ]);
  for (const r of [reqs, open, stock, categories, conflicts, pending]) if (r.error) throw r.error;

  const recent = (reqs.data ?? []) as unknown as Req[];
  const all = [...recent, ...((open.data ?? []) as unknown as Req[])];
  const value = (r: Req) => r.request_lines.reduce((s, l) => s + Number(l.line_total), 0);

  // Daily series over the last 30 days, plus the 30 before for comparison.
  const days = Array.from({ length: 60 }, (_, i) => addDays(today, i - 59));
  const series = new Map(days.map((d) => [d, { requests: 0, booked: 0 }]));
  for (const r of recent) {
    const s = series.get(tunisDay(r.created_at));
    if (!s) continue;
    if (r.status !== "cancelled" && r.status !== "rejected") s.requests += 1;
    if (BOOKED.includes(r.status)) s.booked += value(r);
  }
  const daily = days.map((d) => ({ day: d, ...series.get(d)! }));
  const cur = daily.slice(30), prev = daily.slice(0, 30);
  const sum = (xs: typeof daily, k: "requests" | "booked") => xs.reduce((s, x) => s + x[k], 0);
  const delta = (a: number, b: number) => (b === 0 ? null : Math.round(((a - b) / b) * 100));

  const pipeline = all.filter((r) => r.status === "validated").reduce((s, r) => s + value(r), 0);
  const curReqs = recent.filter((r) => tunisDay(r.created_at) > addDays(today, -30) && r.status !== "cancelled" && r.status !== "rejected");
  const avg = curReqs.length ? curReqs.reduce((s, r) => s + value(r), 0) / curReqs.length : 0;

  // Stock in use today and today's movements.
  const usable = (stock.data ?? []).reduce((s, x) => s + x.quantity_owned - x.quantity_maintenance, 0);
  let inUse = 0;
  const departures: { reference: string; id: string; name: string; item: string; qty: number }[] = [];
  const returns: typeof departures = [];
  for (const r of all) {
    const holding = r.status === "confirmed" || r.status === "dispatched";
    for (const l of r.request_lines) {
      if (holding && l.start_date <= today && today <= (r.status === "dispatched" && l.end_date < today ? today : l.end_date)) inUse += l.quantity;
      const row = { reference: r.reference, id: r.id, name: r.customer_name, item: l.products?.title_fr ?? "", qty: l.quantity };
      if (r.status === "confirmed" && l.start_date === today) departures.push(row);
      if (r.status === "dispatched" && l.end_date <= today) returns.push(row);
    }
  }

  // Booked value by category (last 60 days of requests).
  const catName = new Map((categories.data ?? []).map((c) => [c.id, (lang === "ar" && c.name_ar) || c.name_fr]));
  const byCat = new Map<string, number>();
  for (const r of recent) if (BOOKED.includes(r.status)) for (const l of r.request_lines) {
    const k = (l.products?.category_id && catName.get(l.products.category_id)) || "—";
    byCat.set(k, (byCat.get(k) ?? 0) + Number(l.line_total));
  }

  return {
    today,
    daily: cur,
    kpis: {
      booked: { value: sum(cur, "booked"), delta: delta(sum(cur, "booked"), sum(prev, "booked")), spark: cur.map((d) => d.booked) },
      requests: { value: sum(cur, "requests"), delta: delta(sum(cur, "requests"), sum(prev, "requests")), spark: cur.map((d) => d.requests) },
      pipeline: { value: pipeline, count: all.filter((r) => r.status === "validated").length },
      average: { value: avg },
    },
    live: recent.slice(0, 7).map((r) => ({ id: r.id, reference: r.reference, name: r.customer_name, company: r.company_name, status: r.status, tier: r.tier, createdAt: r.created_at, value: value(r) })),
    utilisation: { inUse, usable },
    departures,
    returns,
    categories: [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, v]) => ({ label, value: v })),
    conflicts: ((conflicts.data ?? []) as { product_id: string; day: string; capacity: number; committed: number }[]).slice(0, 6),
    pendingPros: pending.data ?? [],
  };
}
