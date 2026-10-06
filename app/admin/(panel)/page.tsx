import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFx } from "@/lib/fx-current";
import { formatDateTime, formatDay } from "@/lib/utils/formatters";
import type { RequestStatus } from "@/lib/types";

const STATUSES: RequestStatus[] = ["submitted", "validated", "confirmed", "dispatched", "completed", "cancelled", "rejected"];

export default async function AdminOverviewPage() {
  const [{ t, prefs }] = await Promise.all([getT(), requireStaff()]);
  const a = t.admin;
  const db = await createClient();
  const [requests, conflicts, inbox, pendingPros, fx, recent] = await Promise.all([
    db.from("rental_requests").select("status"),
    db.rpc("capacity_conflicts"),
    db.from("messages").select("id", { count: "exact", head: true }).neq("status", "resolved"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "professional").eq("status", "pending"),
    getCurrentFx(),
    db.from("rental_requests").select("id, reference, customer_name, status, country, created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  for (const r of [requests, conflicts, inbox, pendingPros, recent]) if (r.error) throw r.error;

  const counts = new Map<string, number>();
  for (const r of requests.data ?? []) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  const conflictRows = (conflicts.data ?? []) as { product_id: string; country: string; day: string; capacity: number; committed: number }[];
  const titles = conflictRows.length
    ? new Map(((await db.from("products").select("id, title_fr").in("id", [...new Set(conflictRows.map((c) => c.product_id))])).data ?? []).map((p) => [p.id, p.title_fr]))
    : new Map();

  return (
    <>
      <h1 className="text-2xl font-serif font-bold">{a.nav.overview}</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={a.overview.outNow} value={counts.get("dispatched") ?? 0} href="/admin/rentals" />
        <Stat label={a.overview.openInbox} value={inbox.count ?? 0} href="/admin/inbox" />
        <Stat label={a.overview.pendingPros} value={pendingPros.count ?? 0} href="/admin/clients" />
        <Stat label={a.overview.fx} value={fx ? `${fx.rate}` : a.overview.fxNone} hint={fx ? `${fx.source} · ${formatDateTime(fx.rateTime, prefs.lang)}` : undefined} href="/admin/settings" />
      </div>

      <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
        <h2 className="font-serif text-lg font-bold">{a.overview.byStatus}</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Link key={s} href={`/admin/requests?status=${s}`} className="px-3 py-1.5 rounded-full border border-tan/40 text-xs font-bold hover:bg-tan/20">
              {t.requestStatus[s]} · {counts.get(s) ?? 0}
            </Link>
          ))}
        </div>
      </section>

      <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
        <h2 className="font-serif text-lg font-bold">{a.overview.conflicts}</h2>
        {conflictRows.length === 0 ? (
          <p className="text-sm text-emerald-800 dark:text-emerald-300">{a.overview.conflictsNone}</p>
        ) : (
          <ul className="text-sm space-y-1" role="list">
            {conflictRows.slice(0, 30).map((c) => (
              <li key={`${c.product_id}-${c.country}-${c.day}`} className="text-rose-700 dark:text-rose-300">
                {formatDay(c.day, prefs.lang)} · {c.country} · {titles.get(c.product_id) ?? c.product_id}: {c.committed} / {c.capacity}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
        <h2 className="font-serif text-lg font-bold">{a.overview.recent}</h2>
        <ul className="divide-y divide-tan/20">
          {(recent.data ?? []).map((r) => (
            <li key={r.id} className="py-2 flex flex-wrap justify-between gap-2 text-sm">
              <Link href={`/admin/requests/${r.id}`} className="font-bold underline"><bdi>{r.reference}</bdi></Link>
              <span>{r.customer_name} · {r.country}</span>
              <span>{t.requestStatus[r.status as RequestStatus]}</span>
              <span className="text-xs opacity-70">{formatDateTime(r.created_at, prefs.lang)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: number | string; hint?: string; href: string }) {
  return (
    <Link href={href} className="apple-card rounded-2xl border border-tan/30 p-4 hover:border-toffeeBrown block">
      <p className="text-xs font-bold uppercase tracking-wider text-toffeeBrown dark:text-tan">{label}</p>
      <p className="text-2xl font-serif font-black mt-1">{value}</p>
      {hint && <p className="text-[11px] opacity-70 mt-1">{hint}</p>}
    </Link>
  );
}
