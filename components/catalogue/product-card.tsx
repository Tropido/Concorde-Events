"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "@/lib/context/app-context";
import { isApprovedPro, type CatalogueProduct } from "@/lib/types";
import { PriceTag } from "./date-selection-modal";

export function ProductCard({ product: p, layout = "grid" }: { product: CatalogueProduct; layout?: "grid" | "list" }) {
  const { t, viewer, setPreviewProduct, setBookingProduct } = useApp();
  const priceLabel = p.price?.tier === "pro" && isApprovedPro(viewer) ? t.catalogue.proRate : t.catalogue.retailRate;

  const actions = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setPreviewProduct(p)} aria-label={`${t.showcase.quickPreview}: ${p.title}`}
        className="p-2.5 rounded-xl bg-desertSand/40 dark:bg-darkBg border border-tan/30 hover:border-toffeeBrown apple-press">
        <Eye className="w-4 h-4" aria-hidden />
      </button>
      <button type="button" onClick={() => setBookingProduct(p)} disabled={p.stock <= 0}
        className="px-4 py-2.5 rounded-xl bg-toffeeBrown hover:bg-coffeeBean text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 apple-press">
        <CalendarCheck className="w-3.5 h-3.5" aria-hidden />{t.catalogue.book}
      </button>
    </div>
  );

  if (layout === "list") {
    return (
      <div className="apple-card rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5 border border-tan/30">
        <div className="flex items-center gap-5 w-full sm:w-auto min-w-0">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-desertSand/30">
            {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="96px" className="object-cover" />}
          </div>
          <div className="min-w-0" lang={p.lang}>
            <Link href={`/catalogue/${p.slug}`} className="text-lg font-bold font-serif hover:text-toffeeBrown dark:hover:text-tan">{p.title}</Link>
            <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 truncate">{[p.material, p.color].filter(Boolean).join(" • ")}</p>
            <p className="text-[11px] font-bold text-toffeeBrown dark:text-tan mt-1">{t.catalogue.inStock(p.stock)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <PriceTag price={p.price} className="text-base font-bold" />
          {actions}
        </div>
      </div>
    );
  }

  return (
    <motion.div whileHover={{ y: -6 }} className="apple-card rounded-3xl overflow-hidden border border-tan/30 flex flex-col group">
      <div className="relative h-60 w-full overflow-hidden bg-desertSand/30">
        {p.images[0] && (
          <Image src={p.images[0]} alt={p.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            className="object-cover group-hover:scale-105 transition-transform duration-500" />
        )}
        <span className="absolute bottom-3 start-3 bg-coffeeBean/80 text-almondCream backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold">
          {t.catalogue.inStock(p.stock)}
        </span>
      </div>
      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between" lang={p.lang}>
        <div>
          {p.category && <p className="text-[10px] font-bold uppercase tracking-wider text-toffeeBrown dark:text-tan">{p.category.name}</p>}
          <Link href={`/catalogue/${p.slug}`} className="text-lg font-bold font-serif hover:text-toffeeBrown dark:hover:text-tan">{p.title}</Link>
          <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-1 line-clamp-2">{p.description}</p>
        </div>
        <div className="pt-3 border-t border-tan/20 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[9px] uppercase font-bold text-toffeeBrown dark:text-tan">{priceLabel}</span>
            <PriceTag price={p.price} className="text-base font-bold" />
          </div>
          {actions}
        </div>
      </div>
    </motion.div>
  );
}
