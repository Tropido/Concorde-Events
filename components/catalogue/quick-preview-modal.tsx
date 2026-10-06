"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { Dialog } from "@/components/ui/dialog";
import { PriceTag } from "./date-selection-modal";

export function QuickPreviewModal() {
  const { t, previewProduct: p, setPreviewProduct, setBookingProduct } = useApp();
  const close = () => setPreviewProduct(null);

  return (
    <Dialog open={!!p} onClose={close} labelledBy="preview-title" className="max-w-2xl">
      {p && (
        <div className="p-6 sm:p-8 relative">
          <button type="button" onClick={close} aria-label={t.common.close}
            className="absolute top-4 end-4 p-2 rounded-full bg-desertSand/40 dark:bg-darkSurface hover:bg-desertSand/70">
            <X className="w-5 h-5" />
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="relative h-64 rounded-2xl overflow-hidden bg-desertSand/30 border border-tan/40">
              {p.images[0] && <Image src={p.images[0]} alt={p.title} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />}
            </div>
            <div className="space-y-4" lang={p.lang}>
              {p.category && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-toffeeBrown dark:text-tan bg-tan/20 px-2.5 py-1 rounded-full border border-tan/30">
                  {p.category.name}
                </span>
              )}
              <h2 id="preview-title" className="text-2xl font-bold font-serif">{p.title}</h2>
              <p className="text-xs text-coffeeBean/75 dark:text-almondCream/75 line-clamp-3">{p.description}</p>
              <PriceTag price={p.price} className="block text-lg font-bold text-toffeeBrown dark:text-tan font-serif" />
              <p className="text-xs font-semibold">{t.catalogue.inStock(p.stock)}</p>
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => { close(); setBookingProduct(p); }}
                  className="flex-1 py-3 rounded-full bg-toffeeBrown text-white font-extrabold text-xs uppercase tracking-wider hover:bg-coffeeBean apple-press">
                  {t.showcase.selectDates}
                </button>
                <Link href={`/catalogue/${p.slug}`} onClick={close}
                  className="px-4 py-3 rounded-full bg-desertSand/40 font-bold text-xs hover:bg-desertSand/70 border border-tan/30 apple-press">
                  {t.common.details}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
