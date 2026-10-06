import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/utils/formatters";
import { todayIn } from "@/lib/dates";
import { MaintenanceForm } from "./maintenance-form";
import type { Country } from "@/lib/types";

type Out = {
  id: string; reference: string; customer_name: string; country: Country;
  request_lines: { id: string; quantity: number; start_date: string; end_date: string; products: { title_fr: string } | null }[];
};

export default async function AdminRentalsPage() {
  const [{ t, prefs }] = await Promise.all([getT(), requireStaff()]);
  const a = t.admin.rentals;
  const db = await createClient();
  const [out, maintenance] = await Promise.all([
    db.from("rental_requests").select("id, reference, customer_name, country, request_lines(id, quantity, start_date, end_date, products(title_fr))")
      .eq("status", "dispatched").order("created_at"),
    db.from("product_stock").select("product_id, country, quantity_owned, quantity_maintenance, products(title_fr)").gt("quantity_maintenance", 0),
  ]);
  if (out.error) throw out.error;
  if (maintenance.error) throw maintenance.error;
  const rentals = (out.data ?? []) as unknown as Out[];

  return (
    <>
      <h1 className="text-2xl font-serif font-bold">{t.admin.nav.rentals}</h1>
      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold">{a.out}</h2>
        {rentals.length === 0 ? <p className="text-sm">{a.none}</p> : (
          <ul className="space-y-3">
            {rentals.map((r) => {
              const due = r.request_lines.map((l) => l.end_date).sort().at(-1)!;
              const late = due < todayIn(r.country);
              return (
                <li key={r.id} className={`apple-card rounded-2xl border p-4 text-sm ${late ? "border-rose-500/60" : "border-tan/30"}`}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <Link href={`/admin/requests/${r.id}`} className="font-bold underline"><bdi>{r.reference}</bdi></Link>
                    <span>{r.customer_name} · {r.country}</span>
                    <span className={late ? "font-bold text-rose-700 dark:text-rose-300" : ""}>{late ? a.late : a.due}: {formatDay(due, prefs.lang)}</span>
                  </div>
                  <ul className="text-xs mt-2">
                    {r.request_lines.map((l) => <li key={l.id}>{l.quantity} × {l.products?.title_fr}</li>)}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold">{a.maintenanceTitle}</h2>
        {(maintenance.data ?? []).length === 0 ? <p className="text-sm">{a.maintenanceEmpty}</p> : (
          <ul className="space-y-3">
            {(maintenance.data ?? []).map((m) => (
              <li key={`${m.product_id}-${m.country}`} className="apple-card rounded-2xl border border-tan/30 p-4 text-sm flex flex-wrap items-center justify-between gap-3">
                <span>{(m.products as unknown as { title_fr: string } | null)?.title_fr} · {m.country} · {t.admin.inventory.maintenance}: <strong>{m.quantity_maintenance}</strong> / {m.quantity_owned}</span>
                <MaintenanceForm productId={m.product_id} country={m.country as Country} max={m.quantity_maintenance} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
