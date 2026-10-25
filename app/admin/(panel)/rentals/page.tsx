import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/utils/formatters";
import { todayIn } from "@/lib/dates";
import { Avatar, PageHeader, Panel } from "@/components/admin/ui";
import { MaintenanceForm } from "./maintenance-form";
import { cn } from "@/lib/utils/formatters";

type Out = {
  id: string; reference: string; customer_name: string; customer_phone: string; event_venue: string | null;
  request_lines: { id: string; quantity: number; start_date: string; end_date: string; products: { title_fr: string } | null }[];
};

export default async function AdminRentalsPage() {
  const [{ t, prefs }] = await Promise.all([getT(), requireStaff()]);
  const a = t.admin.rentals;
  const db = await createClient();
  const today = todayIn("TN");
  const [out, upcoming, maintenance, conflicts] = await Promise.all([
    db.from("rental_requests").select("id, reference, customer_name, customer_phone, event_venue, request_lines(id, quantity, start_date, end_date, products(title_fr))").eq("status", "dispatched").order("created_at"),
    db.from("rental_requests").select("id, reference, customer_name, customer_phone, event_venue, request_lines(id, quantity, start_date, end_date, products(title_fr))").eq("status", "confirmed").order("created_at"),
    db.from("product_stock").select("product_id, quantity_owned, quantity_maintenance, products(title_fr)").eq("country", "TN").gt("quantity_maintenance", 0),
    db.rpc("capacity_conflicts"),
  ]);
  for (const r of [out, upcoming, maintenance, conflicts]) if (r.error) throw r.error;
  const due = (r: Out) => r.request_lines.map((l) => l.end_date).sort().at(-1)!;
  const starts = (r: Out) => r.request_lines.map((l) => l.start_date).sort()[0];
  const rentals = ((out.data ?? []) as unknown as Out[]).sort((x, y) => due(x).localeCompare(due(y)));
  const next = ((upcoming.data ?? []) as unknown as Out[]).sort((x, y) => starts(x).localeCompare(starts(y)));
  const conflictRows = (conflicts.data ?? []) as { product_id: string; day: string; capacity: number; committed: number }[];
  const titles = new Map((maintenance.data ?? []).map((m) => [m.product_id, (m.products as unknown as { title_fr: string } | null)?.title_fr]));

  const card = (r: Out, kind: "out" | "next") => {
    const d = kind === "out" ? due(r) : starts(r);
    const late = kind === "out" && d < today;
    return (
      <li key={r.id}>
        <Link href={`/admin/requests/${r.id}`} className={cn("block space-y-2 rounded-2xl bg-paper p-4 hover:ring-1 hover:ring-line", late && "ring-1 ring-bad/40")}>
          <div className="flex items-center gap-3">
            <Avatar name={r.customer_name} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{r.customer_name}</p><p className="font-mono text-[11px] text-ink/45"><bdi>{r.reference}</bdi>{r.event_venue && ` · ${r.event_venue}`}</p></div>
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px]", late ? "bg-bad text-card" : d === today ? "bg-warn-soft text-warn" : "bg-card")}>
              {late ? a.late : kind === "out" ? a.due : a.leaves} {formatDay(d, prefs.lang, { day: "numeric", month: "short" })}
            </span>
          </div>
          <p className="text-xs text-ink/60">{r.request_lines.map((l) => `${l.quantity} × ${l.products?.title_fr}`).join(" · ")}</p>
        </Link>
      </li>
    );
  };

  return (
    <>
      <PageHeader title={t.admin.nav.rentals} subtitle={a.subtitle} />
      <div className="grid gap-2.5 xl:grid-cols-2">
        <Panel title={`${a.out} · ${rentals.length}`}>{rentals.length === 0 ? <p className="text-sm text-ink/50">{a.none}</p> : <ul className="space-y-2">{rentals.map((r) => card(r, "out"))}</ul>}</Panel>
        <Panel title={`${a.upcoming} · ${next.length}`}>{next.length === 0 ? <p className="text-sm text-ink/50">{a.noUpcoming}</p> : <ul className="space-y-2">{next.map((r) => card(r, "next"))}</ul>}</Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-2">
        <Panel title={a.maintenanceTitle}>
          {(maintenance.data ?? []).length === 0 ? <p className="text-sm text-ink/50">{a.maintenanceEmpty}</p> : (
            <ul className="space-y-2">
              {(maintenance.data ?? []).map((m) => (
                <li key={m.product_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper p-4 text-sm">
                  <span><span className="font-medium">{titles.get(m.product_id)}</span> <span className="text-ink/55">· {m.quantity_maintenance} / {m.quantity_owned}</span></span>
                  <MaintenanceForm productId={m.product_id} max={m.quantity_maintenance} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={t.admin.overview.conflicts}>
          {conflictRows.length === 0 ? <p className="text-sm text-ok">{t.admin.overview.conflictsNone}</p> : (
            <ul className="space-y-1.5 text-sm">
              {conflictRows.slice(0, 30).map((c) => (
                <li key={`${c.product_id}-${c.day}`} className="flex justify-between rounded-xl bg-bad-soft px-3 py-2 text-bad">
                  <span>{formatDay(c.day, prefs.lang)} · {titles.get(c.product_id) ?? c.product_id.slice(0, 8)}</span><span className="tabular-nums">{c.committed} / {c.capacity}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
