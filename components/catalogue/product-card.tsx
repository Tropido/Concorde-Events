"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { cn } from "@/lib/utils/formatters";
import { PriceTag, ProductTile } from "@/components/ui/kit";
import type { CatalogueProduct } from "@/lib/types";

export function ProductCard({ product: p, priority, className }: { product: CatalogueProduct; priority?: boolean; className?: string }) {
  const { t, setBookingProduct } = useApp();
  const soldOut = p.stock <= 0;
  return (
    <article className={cn("group relative flex flex-col gap-3", className)}>
      <div className="relative">
      <Link href={`/catalogue/${p.slug}`} className="block rounded-[1.5rem] focus-visible:outline-offset-4" aria-label={p.title}>
        <ProductTile src={p.images[0]} alt={p.title} tone={p.tone} priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="aspect-[4/5] rounded-[1.5rem]">
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            {p.badge ? <span className="pill py-1 text-[11px]">{t.product.badges[p.badge]}</span> : <span />}
            {p.price?.tier === "pro" && p.price.discount > 0 && (
              <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-card"><bdi dir="ltr">−{p.price.discount}%</bdi></span>
            )}
          </div>
        </ProductTile>
      </Link>
      <button type="button" onClick={() => setBookingProduct(p)} disabled={soldOut}
        aria-label={`${t.catalogue.book}: ${p.title}`}
        className="absolute bottom-3 end-3 flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink shadow-lift transition-all duration-300 hover:bg-ink hover:text-card disabled:hidden sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100">
        <Plus className="h-4 w-4" />
      </button>
      </div>
      <div className="flex items-start justify-between gap-3 px-1" lang={p.lang}>
        <div className="min-w-0">
          <p className="label">{p.category?.name ?? t.catalogue.uncategorised}</p>
          <Link href={`/catalogue/${p.slug}`} className="mt-1 block truncate text-[15px] font-semibold tracking-tight hover:underline">{p.title}</Link>
          <p className="mt-0.5 text-xs text-ink/50">{soldOut ? t.booking.soldOutShort : t.catalogue.inStock(p.stock)}</p>
        </div>
        <PriceTag price={p.price} size="sm" showUnit={false} className="shrink-0 flex-col items-end text-end" />
      </div>
    </article>
  );
}
