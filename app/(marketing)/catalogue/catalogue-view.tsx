"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { ProductCard } from "@/components/catalogue/product-card";
import { EmptyState, PillTabs, ease } from "@/components/ui/kit";
import type { CatalogueProduct, Category } from "@/lib/types";

type Sort = "featured" | "price_asc" | "price_desc" | "name";

export function CatalogueView({ products, categories, initialCategory }: { products: CatalogueProduct[]; categories: Category[]; initialCategory?: string }) {
  const { t, language } = useApp();
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(categories.some((c) => c.slug === initialCategory) ? initialCategory! : "all");
  const [sort, setSort] = useState<Sort>("featured");

  const shown = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase(language);
    const list = products.filter((p) =>
      (!needle || [p.title, p.description, p.material ?? "", p.sku ?? "", ...p.tags].some((s) => s.toLocaleLowerCase(language).includes(needle))) &&
      (cat === "all" || p.category?.slug === cat));
    const price = (p: CatalogueProduct) => p.price?.amount ?? Number.POSITIVE_INFINITY;
    if (sort === "price_asc") list.sort((a, b) => price(a) - price(b));
    if (sort === "price_desc") list.sort((a, b) => (b.price?.amount ?? -1) - (a.price?.amount ?? -1));
    if (sort === "name") list.sort((a, b) => a.title.localeCompare(b.title, language));
    return list;
  }, [products, q, cat, sort, language]);

  const pickCategory = (slug: string) => {
    setCat(slug);
    router.replace(slug === "all" ? path : `${path}?cat=${slug}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <PillTabs label={t.catalogue.filterLabel} value={cat} onChange={pickCategory} className="lg:max-w-[60%]"
          options={[{ value: "all", label: t.common.all, count: products.length }, ...categories.filter((c) => c.count > 0).map((c) => ({ value: c.slug, label: c.name, count: c.count }))]} />
        <div className="flex gap-2 lg:ms-auto">
          <label className="relative flex-1 lg:w-64 lg:flex-none">
            <span className="sr-only">{t.common.search}</span>
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.catalogue.searchPlaceholder}
              className="h-10 w-full rounded-full bg-card ps-10 pe-4 text-sm ring-1 ring-line placeholder:text-ink/40 focus:outline-none focus:ring-ink/40" />
          </label>
          <label>
            <span className="sr-only">{t.catalogue.sortLabel}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-full bg-card px-4 text-sm ring-1 ring-line focus:outline-none">
              {(["featured", "price_asc", "price_desc", "name"] as Sort[]).map((s) => <option key={s} value={s}>{t.catalogue.sort[s]}</option>)}
            </select>
          </label>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState title={t.catalogue.emptyTitle} text={t.catalogue.emptyText} />
      ) : shown.length === 0 ? (
        <EmptyState title={t.catalogue.noResults} action={<button type="button" className="btn-ink btn-sm" onClick={() => { setQ(""); pickCategory("all"); }}>{t.catalogue.resetFilters}</button>} />
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-x-2.5 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {shown.map((p, i) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease }}>
                <ProductCard product={p} priority={i < 4} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
