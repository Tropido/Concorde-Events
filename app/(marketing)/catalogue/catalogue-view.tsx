"use client";

import { useMemo, useState } from "react";
import { Grid, List, Search } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { ProductCard } from "@/components/catalogue/product-card";
import { FxNote } from "@/components/catalogue/fx-note";
import type { CatalogueProduct, Category, FxInfo } from "@/lib/types";

const field = "w-full py-3 px-4 rounded-2xl bg-white dark:bg-darkBg border border-tan/40 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-toffeeBrown";

export function CatalogueView({ products, categories, fx, initialCategory }: {
  products: CatalogueProduct[]; categories: Category[]; fx: FxInfo | null; initialCategory?: string;
}) {
  const { t } = useApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(categories.some((c) => c.slug === initialCategory) ? initialCategory! : "all");
  const [material, setMaterial] = useState("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const materials = useMemo(() => [...new Set(products.map((p) => p.material).filter(Boolean) as string[])], [products]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) =>
      (!needle || [p.title, p.description, ...p.tags].some((s) => s.toLowerCase().includes(needle))) &&
      (cat === "all" || p.category?.slug === cat) &&
      (material === "all" || p.material === material));
  }, [products, q, cat, material]);

  return (
    <div className="space-y-8">
      <div className="apple-card border border-tan/30 p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="relative md:col-span-2">
            <span className="sr-only">{t.common.search}</span>
            <Search className="w-4 h-4 absolute start-4 top-1/2 -translate-y-1/2 text-coffeeBean/50" aria-hidden />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.catalogue.searchPlaceholder} className={`${field} ps-11`} />
          </label>
          <label>
            <span className="sr-only">{t.catalogue.allCategories}</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={field}>
              <option value="all">{t.catalogue.allCategories} ({products.length})</option>
              {categories.filter((c) => c.count > 0).map((c) => <option key={c.id} value={c.slug}>{c.name} ({c.count})</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">{t.catalogue.allMaterials}</span>
            <select value={material} onChange={(e) => setMaterial(e.target.value)} className={field}>
              <option value="all">{t.catalogue.allMaterials}</option>
              {materials.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <FxNote fx={fx} />
          <div className="flex items-center gap-2 ms-auto">
            {(["grid", "list"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLayout(l)} aria-pressed={layout === l}
                aria-label={l === "grid" ? t.catalogue.gridView : t.catalogue.listView}
                className={`p-2.5 rounded-xl border ${layout === l ? "bg-toffeeBrown text-white border-toffeeBrown" : "border-tan/40 bg-desertSand/30 dark:bg-darkSurface"}`}>
                {l === "grid" ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-center py-16 text-sm">{t.catalogue.emptyCountry}</p>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-tan/40 space-y-3">
          <p className="text-sm font-bold">{t.catalogue.noResults}</p>
          <button type="button" onClick={() => { setQ(""); setCat("all"); setMaterial("all"); }}
            className="px-4 py-2 rounded-xl bg-toffeeBrown text-white font-bold text-xs">{t.catalogue.resetFilters}</button>
        </div>
      ) : (
        <div className={layout === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {shown.map((p) => <ProductCard key={p.id} product={p} layout={layout} />)}
        </div>
      )}
    </div>
  );
}
