"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Heart, Layers, Palette, Ruler } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { toggleFavourite } from "@/lib/actions/account";
import { BookingPanel, PriceTag } from "@/components/catalogue/date-selection-modal";
import { ProductCard } from "@/components/catalogue/product-card";
import { FxNote } from "@/components/catalogue/fx-note";
import { isApprovedPro, type CatalogueProduct, type FxInfo } from "@/lib/types";

export function ProductDetail({ product: p, related, fx, favourite }: {
  product: CatalogueProduct; related: CatalogueProduct[]; fx: FxInfo | null; favourite: boolean;
}) {
  const { t, viewer } = useApp();
  const [image, setImage] = useState(0);
  const [fav, setFav] = useState(favourite);
  const [pending, startTransition] = useTransition();
  const d = p.dimensions;
  const dims = [d.width, d.height, d.depth].every((v) => v !== null) ? `${d.width} × ${d.height} × ${d.depth} ${d.unit}` : null;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
      <Link href="/catalogue" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-coffeeBean/70 dark:text-tan hover:text-toffeeBrown">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden />{t.product.back}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="space-y-4">
          <div className="relative h-[360px] sm:h-[480px] w-full rounded-3xl overflow-hidden bg-desertSand/20 dark:bg-darkSurface border border-tan/40">
            {p.images[image] && <Image src={p.images[image]} alt={p.title} fill priority sizes="(max-width: 1024px) 100vw, 600px" className="object-cover" />}
            {p.category && (
              <span className="absolute top-4 end-4 bg-coffeeBean/80 text-almondCream backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-bold">{p.category.name}</span>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {p.images.map((src, i) => (
                <button key={src} type="button" onClick={() => setImage(i)} aria-pressed={image === i} aria-label={`${p.title} ${i + 1}`}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 ${image === i ? "border-toffeeBrown" : "border-tan/30 opacity-70 hover:opacity-100"}`}>
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5" lang={p.lang}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-tan/20 text-toffeeBrown dark:text-tan text-xs font-bold uppercase tracking-wider border border-tan/30">
              {p.featured ? t.product.featured : t.product.standard}
            </span>
            <span className="text-xs font-bold text-coffeeBean/60 dark:text-almondCream/60">{t.product.reference} <bdi>{p.slug}</bdi></span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold font-serif">{p.title}</h1>
            {viewer ? (
              <button type="button" disabled={pending} aria-pressed={fav} aria-label={fav ? t.product.unfavourite : t.product.favourite}
                onClick={() => startTransition(async () => {
                  const next = !fav;
                  setFav(next);
                  const res = await toggleFavourite(p.id, next);
                  if (!res.ok) setFav(!next);
                })}
                className="p-3 rounded-full border border-tan/40 hover:bg-tan/20 shrink-0">
                <Heart className={`w-5 h-5 ${fav ? "fill-toffeeBrown text-toffeeBrown" : ""}`} />
              </button>
            ) : (
              <Link href={`/login?next=/catalogue/${p.slug}`} title={t.product.signInToSave} aria-label={t.product.signInToSave}
                className="p-3 rounded-full border border-tan/40 hover:bg-tan/20 shrink-0">
                <Heart className="w-5 h-5" />
              </Link>
            )}
          </div>
          <p className="text-sm text-coffeeBean/80 dark:text-almondCream/80 leading-relaxed">{p.description}</p>

          <div className="p-5 rounded-2xl apple-card border border-tan/40 flex items-center justify-between gap-4">
            <div>
              <span className="block text-[11px] font-bold text-toffeeBrown dark:text-tan uppercase tracking-wider">
                {p.price?.tier === "pro" && isApprovedPro(viewer) ? t.catalogue.proRate : t.catalogue.retailRate}
              </span>
              <PriceTag price={p.price} className="text-2xl sm:text-3xl font-black font-serif" />
            </div>
            <div className="text-end text-xs">
              <p className="font-bold">{t.product.stock(p.stock)}</p>
              {p.minimumNights > 1 && <p>{t.product.minimumNights(p.minimumNights)}</p>}
            </div>
          </div>
          <FxNote fx={fx} />

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dims && <Spec icon={<Ruler className="w-3.5 h-3.5" />} label={t.product.dimensions} value={dims} />}
            {p.material && <Spec icon={<Layers className="w-3.5 h-3.5" />} label={t.product.material} value={p.material} />}
            {p.color && <Spec icon={<Palette className="w-3.5 h-3.5" />} label={t.product.finish} value={p.color} />}
          </dl>
        </div>
      </div>

      <section aria-labelledby="availability-title" className="space-y-4 pt-4 border-t border-tan/30">
        <h2 id="availability-title" className="text-2xl sm:text-3xl font-extrabold font-serif">{t.product.availabilityTitle(p.title)}</h2>
        {p.stock > 0 ? <BookingPanel product={p} /> : <p className="text-sm">{t.booking.soldOut}</p>}
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="space-y-5 pt-6 border-t border-tan/30">
          <h2 id="related-title" className="text-xl sm:text-2xl font-extrabold font-serif">{t.product.related}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3.5 rounded-xl bg-desertSand/20 dark:bg-darkSurface/60 border border-tan/25 text-xs space-y-1">
      <dt className="flex items-center gap-1.5 text-coffeeBean/70 dark:text-tan font-semibold">{icon}{label}</dt>
      <dd className="font-bold truncate">{value}</dd>
    </div>
  );
}
