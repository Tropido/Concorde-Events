"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Clock, Heart, Ruler, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { toggleFavourite } from "@/lib/actions/account";
import { BookingPanel } from "@/components/catalogue/date-selection-modal";
import { ProductCard } from "@/components/catalogue/product-card";
import { PriceTag, ProductTile, ease } from "@/components/ui/kit";
import { cn, formatNumber, formatTND } from "@/lib/utils/formatters";
import type { CatalogueProduct } from "@/lib/types";

type Tab = "details" | "dimensions" | "care";

export function ProductDetail({ product: p, related, favourite }: { product: CatalogueProduct; related: CatalogueProduct[]; favourite: boolean }) {
  const { t, language, viewer } = useApp();
  const [image, setImage] = useState(0);
  const [fav, setFav] = useState(favourite);
  const [tab, setTab] = useState<Tab>("details");
  const [pending, startTransition] = useTransition();
  const d = p.dimensions;
  const dims = [d.width, d.height, d.depth].every((v) => v !== null) ? `${d.width} × ${d.height} × ${d.depth} ${d.unit}` : null;

  const chips = [
    ...p.highlights.map((h) => ({ icon: Sparkles, text: h })),
    ...(p.seatingCapacity ? [{ icon: Users, text: t.product.seats(p.seatingCapacity) }] : []),
    ...(p.setupMinutes ? [{ icon: Clock, text: t.product.setup(p.setupMinutes) }] : []),
    ...(p.deposit ? [{ icon: ShieldCheck, text: t.product.deposit(formatTND(p.deposit, language)) }] : []),
  ];

  const specs: [string, string | null][] = [
    [t.product.material, p.material],
    [t.product.finish, [p.finish, p.color].filter(Boolean).join(" · ") || null],
    [t.product.style, p.style],
    [t.product.reference, p.sku],
    [t.product.minimum, t.common.nights(p.minimumNights)],
  ];
  const sizes: [string, string | null][] = [
    [t.product.dimensions, dims],
    [t.product.weight, p.weightKg ? `${formatNumber(p.weightKg, language)} kg` : null],
    [t.product.capacity, p.seatingCapacity ? t.product.seats(p.seatingCapacity) : null],
  ];

  return (
    <div className="shell space-y-20 pt-6">
      <nav aria-label={t.product.breadcrumb} className="flex items-center gap-1.5 text-xs text-ink/55">
        <Link href="/catalogue" className="hover:text-ink">{t.nav.catalogue}</Link>
        {p.category && <><ChevronRight className="h-3 w-3 rtl:rotate-180" aria-hidden /><Link href={`/catalogue?cat=${p.category.slug}`} className="hover:text-ink">{p.category.name}</Link></>}
        <ChevronRight className="h-3 w-3 rtl:rotate-180" aria-hidden /><span className="truncate text-ink" aria-current="page">{p.title}</span>
      </nav>

      <div className="grid items-start gap-2.5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-2.5 lg:sticky lg:top-20">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={image} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease }}>
              <ProductTile src={p.images[image]} alt={p.title} tone={p.tone} priority sizes="(max-width: 1024px) 100vw, 58vw" className="aspect-square rounded-[1.75rem] sm:aspect-[5/4]" />
            </motion.div>
          </AnimatePresence>
          {p.images.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {p.images.map((src, i) => (
                <button key={src} type="button" onClick={() => setImage(i)} aria-pressed={image === i} aria-label={`${p.title} ${i + 1}`}
                  className={cn("shrink-0 rounded-2xl ring-2 ring-offset-2 ring-offset-paper transition", image === i ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100")}>
                  <ProductTile src={src} alt="" tone={p.tone} sizes="88px" className="h-20 w-20 rounded-2xl" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-7 p-6 sm:p-8" lang={p.lang}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="label">{p.category?.name ?? t.catalogue.uncategorised}</p>
                {p.badge && <span className="pill py-1 text-[11px]">{t.product.badges[p.badge]}</span>}
              </div>
              <h1 className="display text-[clamp(2.25rem,4.5vw,3.75rem)] text-balance">{p.title}</h1>
            </div>
            {viewer ? (
              <button type="button" disabled={pending} aria-pressed={fav} aria-label={fav ? t.product.unfavourite : t.product.favourite}
                onClick={() => startTransition(async () => { const next = !fav; setFav(next); const res = await toggleFavourite(p.id, next); if (!res.ok) setFav(!next); })}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper hover:bg-line">
                <Heart className={cn("h-5 w-5 transition", fav && "fill-toffeeBrown text-toffeeBrown")} />
              </button>
            ) : (
              <Link href={`/login?next=/catalogue/${p.slug}`} aria-label={t.product.signInToSave} title={t.product.signInToSave}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper hover:bg-line"><Heart className="h-5 w-5" /></Link>
            )}
          </div>

          <div className="space-y-1">
            <PriceTag price={p.price} size="lg" />
            <p className="text-xs text-ink/55">
              {p.price?.tier === "pro" ? t.product.proPriceNote(p.price.discount) : t.product.retailNote}
            </p>
          </div>

          {p.description && <p className="text-[15px] leading-relaxed text-ink/70 text-pretty">{p.description}</p>}

          {(p.colorHex || p.color) && (
            <div className="flex items-center gap-3 text-sm">
              {p.colorHex && <span className="h-8 w-8 rounded-full ring-2 ring-card ring-offset-2 ring-offset-line" style={{ background: p.colorHex }} aria-hidden />}
              <span><span className="text-ink/55">{t.product.finish} · </span>{p.color ?? p.finish}</span>
            </div>
          )}

          {p.stock > 0 ? <BookingPanel product={p} layout="stacked" /> : <p className="rounded-2xl bg-paper p-4 text-sm">{t.booking.soldOut}</p>}

          {chips.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {chips.map((c) => <li key={c.text} className="chip"><c.icon className="h-3.5 w-3.5" aria-hidden />{c.text}</li>)}
            </ul>
          )}

          <div>
            <div role="tablist" aria-label={t.product.infoTabs} className="flex gap-5 border-b border-line">
              {(["details", "dimensions", "care"] as Tab[]).filter((x) => x !== "care" || p.care).map((x) => (
                <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)}
                  className={cn("relative pb-3 text-sm transition-colors", tab === x ? "text-ink" : "text-ink/50 hover:text-ink")}>
                  {t.product.tabs[x]}
                  {tab === x && <motion.span layoutId="product-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink" />}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="pt-4 text-sm">
              {tab === "care" ? (
                <p className="whitespace-pre-line leading-relaxed text-ink/70">{p.care}</p>
              ) : (
                <dl className="divide-y divide-line">
                  {(tab === "details" ? specs : sizes).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-6 py-2.5">
                      <dt className="text-ink/55">{k}</dt>
                      <dd className="text-end font-medium">{v}</dd>
                    </div>
                  ))}
                  {tab === "dimensions" && !dims && <p className="flex items-center gap-2 py-2.5 text-ink/55"><Ruler className="h-4 w-4" />{t.product.dimensionsOnRequest}</p>}
                </dl>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="space-y-6">
          <h2 id="related-title" className="text-3xl font-semibold tracking-tight">{t.product.related}</h2>
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-8 md:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
