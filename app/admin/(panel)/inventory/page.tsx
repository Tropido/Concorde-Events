import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setProductStatus } from "@/lib/actions/admin";
import { ActionButton, FilterLinks, PageHeader } from "@/components/admin/ui";
import { ProductThumb } from "./thumb";
import { formatNumber, formatTND } from "@/lib/utils/formatters";
import type { Tone } from "@/lib/types";

type Row = {
  id: string; slug: string; sku: string | null; title_fr: string; status: string; images: string[]; tone: Tone; featured: boolean;
  categories: { name_fr: string } | null;
  product_stock: { quantity_owned: number; quantity_maintenance: number }[];
  product_prices: { tier: "retail" | "pro"; amount: number }[];
  product_internal: { purchase_cost: number | null } | null;
};

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const [{ t, prefs }, , sp] = await Promise.all([getT(), requireStaff(), searchParams]);
  const a = t.admin.inventory;
  const db = await createClient();
  const { data, error } = await db.from("products")
    .select("id, slug, sku, title_fr, status, images, tone, featured, categories(name_fr), product_stock(quantity_owned, quantity_maintenance), product_prices(tier, amount), product_internal(purchase_cost)")
    .order("status").order("title_fr");
  if (error) throw error;
  const all = (data ?? []) as unknown as Row[];
  const view = sp.view === "retired" ? "retired" : sp.view === "all" ? "all" : "active";
  const needle = (sp.q ?? "").trim().toLowerCase();
  const rows = all.filter((r) => (view === "all" || r.status === view) && (!needle || [r.title_fr, r.slug, r.sku ?? ""].some((s) => s.toLowerCase().includes(needle))));
  const active = all.filter((r) => r.status === "active");
  const units = active.reduce((s, r) => s + (r.product_stock[0]?.quantity_owned ?? 0), 0);
  const maintenance = active.reduce((s, r) => s + (r.product_stock[0]?.quantity_maintenance ?? 0), 0);
  const assets = active.reduce((s, r) => s + Number(r.product_internal?.purchase_cost ?? 0) * (r.product_stock[0]?.quantity_owned ?? 0), 0);
  const price = (r: Row, tier: "retail" | "pro") => {
    const p = r.product_prices.find((x) => x.tier === tier);
    return p ? formatTND(Number(p.amount), prefs.lang) : "—";
  };

  return (
    <>
      <PageHeader title={t.admin.nav.inventory} subtitle={a.subtitle}
        actions={<Link href="/admin/inventory/new" className="btn-ink btn-sm"><Plus className="h-4 w-4" aria-hidden />{a.newProduct}</Link>} />
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [a.kpiActive, formatNumber(active.length, prefs.lang)],
          [a.kpiUnits, formatNumber(units, prefs.lang)],
          [a.kpiMaintenance, formatNumber(maintenance, prefs.lang)],
          [a.kpiAssets, assets ? formatTND(assets, prefs.lang) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="card p-5"><p className="text-sm text-ink/60">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p></div>
        ))}
      </div>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <FilterLinks label={t.common.status} items={(["active", "retired", "all"] as const).map((v) => ({
          href: `/admin/inventory${v === "active" ? "" : `?view=${v}`}`, label: a.views[v], active: view === v,
          count: v === "all" ? all.length : all.filter((r) => r.status === v).length,
        }))} />
        <form role="search" className="relative lg:ms-auto lg:w-72">
          {view !== "active" && <input type="hidden" name="view" value={view} />}
          <label className="sr-only" htmlFor="inv-q">{t.common.search}</label>
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden />
          <input id="inv-q" name="q" defaultValue={sp.q ?? ""} placeholder={a.searchPlaceholder} className="h-10 w-full rounded-full bg-card ps-10 pe-4 text-sm ring-1 ring-line focus:outline-none focus:ring-ink/40" />
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-lg font-semibold tracking-tight">{a.empty}</p>
          <Link href="/admin/inventory/new" className="btn-ink">{a.newProduct}</Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line">
                {[a.piece, a.category, a.stock, a.retail, a.pro, t.common.status, ""].map((h, i) => <th key={i} scope="col" className="label px-4 py-3 text-start first:ps-6">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = r.product_stock[0];
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3 ps-6">
                      <Link href={`/admin/inventory/${r.id}`} className="flex items-center gap-3">
                        <ProductThumb src={r.images[0]} tone={r.tone} title={r.title_fr} />
                        <div className="min-w-0">
                          <p className="truncate font-medium hover:underline">{r.title_fr}{r.featured && <span className="ms-1.5 text-toffeeBrown" title={a.featured}>★</span>}</p>
                          <p className="truncate font-mono text-[11px] text-ink/45" dir="ltr">{r.sku ?? r.slug}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink/70">{r.categories?.name_fr ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{s ? <>{s.quantity_owned - s.quantity_maintenance}<span className="text-ink/40"> / {s.quantity_owned}</span>{s.quantity_maintenance > 0 && <span className="ms-2 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] text-warn">{a.inMaintenance(s.quantity_maintenance)}</span>}</> : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{price(r, "retail")}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink/70">{price(r, "pro")}</td>
                    <td className="px-4 py-3"><span className={r.status === "active" ? "rounded-full bg-ok-soft px-2.5 py-1 text-[11px] text-ok" : "rounded-full bg-paper px-2.5 py-1 text-[11px] text-ink/50"}>{a.views[r.status as "active" | "retired"]}</span></td>
                    <td className="px-4 py-3 pe-6 text-end">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/admin/inventory/${r.id}`} className="btn-light btn-sm">{t.common.edit}</Link>
                        <ActionButton action={setProductStatus.bind(null, r.id, r.status === "active" ? "retired" : "active")} confirm>
                          {r.status === "active" ? a.retire : a.reactivate}
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
