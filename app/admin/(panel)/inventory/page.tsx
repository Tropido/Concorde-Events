import Image from "next/image";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setProductStatus } from "@/lib/actions/admin";
import { ActionButton, btnPrimary } from "@/components/admin/ui";
import { formatMoney } from "@/lib/utils/formatters";
import type { Country, Currency } from "@/lib/types";

type Row = {
  id: string; slug: string; title_fr: string; status: string; images: string[];
  product_stock: { country: Country; quantity_owned: number; quantity_maintenance: number }[];
  product_prices: { country: Country; tier: "retail" | "pro"; amount: number }[];
};

export default async function AdminInventoryPage() {
  const [{ t, prefs }] = await Promise.all([getT(), requireStaff()]);
  const a = t.admin.inventory;
  const db = await createClient();
  const { data, error } = await db.from("products")
    .select("id, slug, title_fr, status, images, product_stock(country, quantity_owned, quantity_maintenance), product_prices(country, tier, amount)")
    .order("status").order("title_fr");
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const price = (r: Row, c: Country, tier: "retail" | "pro") => {
    const p = r.product_prices.find((x) => x.country === c && x.tier === tier);
    return p ? formatMoney(Number(p.amount), (c === "TN" ? "TND" : "EUR") as Currency, prefs.lang) : a.noPrice;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-serif font-bold">{t.admin.nav.inventory}</h1>
        <Link href="/admin/inventory/new" className={btnPrimary}>{a.newProduct}</Link>
      </div>
      {rows.length === 0 ? <p className="text-sm">{a.empty}</p> : (
        <div className="overflow-x-auto apple-card rounded-3xl border border-tan/30">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-toffeeBrown dark:text-tan">
              <tr className="border-b border-tan/30">
                <th scope="col" className="p-3 text-start">{a.titleFr}</th>
                {(["FR", "TN"] as const).map((c) => <th key={c} scope="col" className="p-3 text-start">{c === "FR" ? t.common.france : t.common.tunisia}</th>)}
                <th scope="col" className="p-3 text-start">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-b border-tan/15 ${r.status === "retired" ? "opacity-60" : ""}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-desertSand/30 shrink-0">
                        {r.images[0] && <Image src={r.images[0]} alt="" fill sizes="48px" className="object-cover" />}
                      </div>
                      <div>
                        <Link href={`/admin/inventory/${r.id}`} className="font-bold underline">{r.title_fr}</Link>
                        <p className="text-xs opacity-70" dir="ltr">{r.slug}{r.status === "retired" && ` · ${a.retired}`}</p>
                      </div>
                    </div>
                  </td>
                  {(["FR", "TN"] as const).map((c) => {
                    const s = r.product_stock.find((x) => x.country === c);
                    return (
                      <td key={c} className="p-3 text-xs space-y-0.5">
                        {s ? <p>{a.owned}: <strong>{s.quantity_owned}</strong>{s.quantity_maintenance > 0 && ` · ${a.maintenance}: ${s.quantity_maintenance}`}</p> : <p>—</p>}
                        <p>{a.retail}: {price(r, c, "retail")}</p>
                        <p>{a.pro}: {price(r, c, "pro")}</p>
                      </td>
                    );
                  })}
                  <td className="p-3">
                    <ActionButton action={setProductStatus.bind(null, r.id, r.status === "active" ? "retired" : "active")} confirm>
                      {r.status === "active" ? a.retire : a.reactivate}
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
