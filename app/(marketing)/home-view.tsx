"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, ChevronDown, MessageCircle } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { todayIn, validateRange } from "@/lib/dates";
import { waLink } from "@/lib/utils/whatsapp";
import { cn } from "@/lib/utils/formatters";
import { ProductCard } from "@/components/catalogue/product-card";
import { PillTabs, PriceTag, ProductTile, RotatingBadge, ease } from "@/components/ui/kit";
import type { CatalogueProduct, Category, CMSContent, ProTier } from "@/lib/types";

const enter = (i: number) => ({
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.8, ease, delay: 0.08 * i },
});

export function HomeView({ products, categories, cms, tiers }: { products: CatalogueProduct[]; categories: Category[]; cms: CMSContent; tiers: ProTier[] }) {
  const { t, setBookingProduct } = useApp();
  const hero = { ...t.hero, ...Object.fromEntries(Object.entries(cms.hero ?? {}).filter(([, v]) => v)) };
  const faqs = cms.faqs?.length ? cms.faqs : t.home.faqs;
  const testimonials = cms.testimonials ?? [];
  const available = products.filter((p) => p.stock > 0);
  const featured = available.find((p) => p.featured && p.images[0]) ?? available.find((p) => p.images[0]) ?? available[0];
  const spotlight = categories.filter((c) => c.count > 0).sort((a, b) => b.count - a.count)[0];
  const spotlightProduct = spotlight && available.find((p) => p.category?.id === spotlight.id && p.images[0] && p.id !== featured?.id);

  return (
    <div className="space-y-24 pb-6">
      {/* Bento hero: one orchestrated entrance, nothing else moves on load. */}
      <section className="shell pt-3">
        <div className="grid gap-2.5 lg:grid-cols-12">
          <motion.div {...enter(0)} className="card flex flex-col justify-between gap-10 p-6 sm:p-10 lg:col-span-7">
            <span className="pill w-fit"><span className="h-1.5 w-1.5 rounded-full bg-toffeeBrown" aria-hidden />{hero.badge}</span>
            <div className="space-y-6">
              <h1 className="display max-w-[12ch] text-[clamp(2.75rem,7vw,5.75rem)] text-balance">{hero.title}</h1>
              <p className="max-w-md text-[15px] leading-relaxed text-ink/65 text-pretty">{hero.subtitle}</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/catalogue" className="btn-ink">{hero.ctaExplore}</Link>
                <a href={waLink(t.hero.whatsappGreeting)} target="_blank" rel="noopener noreferrer" className="btn-light">
                  <MessageCircle className="h-4 w-4" aria-hidden />{hero.ctaWhatsapp}
                </a>
              </div>
            </div>
            <ul className="grid gap-3 border-t border-line pt-5 text-sm sm:grid-cols-3">
              {t.hero.facts.map((f) => (
                <li key={f.title}><p className="font-semibold tracking-tight">{f.title}</p><p className="text-xs text-ink/55">{f.text}</p></li>
              ))}
            </ul>
          </motion.div>

          {featured ? (
            <motion.article {...enter(1)} className="group relative flex min-h-[460px] flex-col overflow-hidden rounded-[1.75rem] lg:col-span-5 lg:row-span-2">
              <ProductTile src={featured.images[0]} alt={featured.title} tone={featured.tone} sizes="(max-width: 1024px) 100vw, 40vw" priority className="absolute inset-0" />
              <div className="relative flex items-start justify-between p-5 sm:p-6">
                <div lang={featured.lang}>
                  <p className="label">{t.home.featuredLabel}</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">{featured.title}</h2>
                </div>
                <RotatingBadge text={t.home.badgeRing}><ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" /></RotatingBadge>
              </div>
              <div className="relative mt-auto m-3 flex items-center gap-2 rounded-full bg-card/90 p-1.5 ps-5 backdrop-blur">
                <PriceTag price={featured.price} size="sm" />
                <Link href={`/catalogue/${featured.slug}`} className="ms-auto rounded-full px-3 py-2 text-xs font-medium hover:bg-paper">{t.common.details}</Link>
                <button type="button" onClick={() => setBookingProduct(featured)} className="btn-ink btn-sm">{t.home.chooseDates}</button>
              </div>
            </motion.article>
          ) : (
            <motion.div {...enter(1)} className="grain tone-sand flex min-h-[320px] flex-col justify-end rounded-[1.75rem] p-8 lg:col-span-5 lg:row-span-2">
              <p className="max-w-xs text-2xl font-semibold tracking-tight">{t.home.catalogueSoon}</p>
            </motion.div>
          )}

          <div className="grid gap-2.5 sm:grid-cols-2 lg:col-span-7">
            {spotlight ? (
              <motion.div {...enter(2)}>
                <Link href={`/catalogue?cat=${spotlight.slug}`} className="group grain tone-almond relative flex h-full min-h-[200px] overflow-hidden rounded-[1.75rem] p-6">
                  <div className="relative z-10 flex flex-col justify-between">
                    <p className="label">{t.home.collection}</p>
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">{spotlight.name}</p>
                      <p className="text-xs text-ink/55">{t.categories.pieces(spotlight.count)}</p>
                    </div>
                  </div>
                  {spotlightProduct && (
                    <ProductTile src={spotlightProduct.images[0]} alt="" tone="almond" sizes="200px" className="absolute -bottom-4 end-4 h-[78%] w-[46%] rounded-2xl" />
                  )}
                </Link>
              </motion.div>
            ) : <div />}
            <motion.div {...enter(3)}><QuickDates /></motion.div>
          </div>
        </div>
      </section>

      {available.length > 0 && <Picks products={available} categories={categories} />}

      {categories.some((c) => c.count > 0) && (
        <section className="shell space-y-6" aria-labelledby="cats-title">
          <h2 id="cats-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.categories.title}</h2>
          <div className="no-scrollbar -mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
            {categories.filter((c) => c.count > 0).map((c, i) => (
              <Link key={c.id} href={`/catalogue?cat=${c.slug}`}
                className={cn("grain flex aspect-[4/5] w-40 shrink-0 flex-col justify-between rounded-[1.5rem] p-4 transition-transform hover:-translate-y-1 sm:w-auto", `tone-${(["almond", "sand", "cream", "tan", "stone", "copper"] as const)[i % 6]}`)}>
                <span className="label">{t.categories.pieces(c.count)}</span>
                <span className="text-lg font-semibold leading-tight tracking-tight text-balance">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="shell" aria-labelledby="how-title">
        <div className="card grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-3">
            <h2 id="how-title" className="text-3xl font-semibold tracking-tight sm:text-4xl text-balance">{t.home.howTitle}</h2>
            <p className="text-sm text-ink/60">{t.home.howIntro}</p>
          </div>
          <ol className="grid gap-6 sm:grid-cols-2">
            {t.home.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper font-mono text-xs tabular-nums">{i + 1}</span>
                <div><p className="font-semibold tracking-tight">{s.title}</p><p className="mt-1 text-sm text-ink/60">{s.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ProTeaser tiers={tiers} />

      {testimonials.length > 0 && (
        <section className="shell space-y-6" aria-labelledby="quotes-title">
          <h2 id="quotes-title" className="text-3xl font-semibold tracking-tight">{t.testimonials.title}</h2>
          <div className="grid gap-2.5 md:grid-cols-3">
            {testimonials.map((q) => (
              <figure key={q.author + q.quote.slice(0, 16)} className="card flex flex-col justify-between gap-6 p-6">
                <blockquote className="text-lg leading-snug tracking-tight">“{q.quote}”</blockquote>
                <figcaption className="text-sm"><span className="font-semibold">{q.author}</span>{q.role && <span className="block text-ink/55">{q.role}</span>}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <Faq faqs={faqs} />
    </div>
  );
}

function QuickDates() {
  const { t, eventDates, setEventDates } = useApp();
  const today = todayIn("TN");
  const [start, setStart] = useState(eventDates.start);
  const [end, setEnd] = useState(eventDates.end);
  const [saved, setSaved] = useState(false);
  const problem = start || end ? validateRange(start, end, { today }) : null;
  return (
    <form className="card flex h-full flex-col justify-between gap-4 p-6"
      onSubmit={(e) => { e.preventDefault(); if (!validateRange(start, end, { today })) { setEventDates({ start, end }); setSaved(true); } }}>
      <div className="flex items-center justify-between">
        <p className="label">{t.hero.quickBooking.title}</p>
        <CalendarDays className="h-4 w-4 text-ink/40" aria-hidden />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label><span className="sr-only">{t.hero.quickBooking.startDate}</span>
          <input type="date" min={today} value={start} onChange={(e) => { setStart(e.target.value); setSaved(false); }} className="field px-3 text-xs" aria-label={t.hero.quickBooking.startDate} /></label>
        <label><span className="sr-only">{t.hero.quickBooking.endDate}</span>
          <input type="date" min={start || today} value={end} onChange={(e) => { setEnd(e.target.value); setSaved(false); }} className="field px-3 text-xs" aria-label={t.hero.quickBooking.endDate} /></label>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-xs text-ink/55">
          {problem ? <span className="text-bad">{t.booking.rangeErrors[problem]}</span> : saved ? t.hero.quickBooking.datesSaved : t.hero.quickBooking.hint}
        </p>
        <button type="submit" disabled={!start || !end || !!problem} className="btn-ink btn-sm shrink-0">{t.hero.quickBooking.save}</button>
      </div>
    </form>
  );
}

function Picks({ products, categories }: { products: CatalogueProduct[]; categories: Category[] }) {
  const { t } = useApp();
  const [cat, setCat] = useState("all");
  const used = categories.filter((c) => products.some((p) => p.category?.id === c.id));
  const shown = useMemo(() => products.filter((p) => cat === "all" || p.category?.slug === cat).slice(0, 8), [products, cat]);
  return (
    <section className="shell space-y-6" aria-labelledby="picks-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="picks-title" className="display text-[clamp(2rem,4.5vw,3.5rem)]">{t.home.picksTitle}</h2>
        <PillTabs label={t.catalogue.filterLabel} value={cat} onChange={setCat}
          options={[{ value: "all", label: t.common.all }, ...used.map((c) => ({ value: c.slug, label: c.name }))]} />
      </div>
      <motion.div layout className="grid grid-cols-2 gap-x-2.5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {shown.map((p, i) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease, delay: i * 0.03 }}>
              <ProductCard product={p} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      <div className="flex justify-center"><Link href="/catalogue" className="btn-light">{t.home.viewAll}</Link></div>
    </section>
  );
}

function ProTeaser({ tiers }: { tiers: ProTier[] }) {
  const { t } = useApp();
  return (
    <section className="shell" aria-labelledby="pro-title">
      <div className="grid gap-8 rounded-[1.75rem] bg-ink p-6 text-card sm:p-10 lg:grid-cols-2">
        <div className="flex flex-col justify-between gap-8">
          <div className="space-y-4">
            <p className="font-mono text-[10.5px] uppercase tracking-label text-almondCream/50">{t.pro.teaserLabel}</p>
            <h2 id="pro-title" className="display text-[clamp(2rem,4vw,3.25rem)] text-balance">{t.pro.teaserTitle}</h2>
            <p className="max-w-md text-sm text-almondCream/70">{t.pro.teaserText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/register?type=professional" className="btn bg-card text-ink hover:bg-almondCream">{t.pro.become}</Link>
            <Link href="/professionnels" className="btn text-card ring-1 ring-almondCream/25 hover:ring-almondCream/60">{t.pro.learnMore}</Link>
          </div>
        </div>
        {tiers.length > 0 && (
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tiers.map((tier) => (
              <li key={tier.code} className="rounded-2xl bg-almondCream/[0.06] p-4 ring-1 ring-almondCream/10">
                <span className="mb-3 block h-1.5 w-8 rounded-full" style={{ background: tier.color === "#3d281a" || tier.color === "#5c3d28" ? "#ddb892" : tier.color }} aria-hidden />
                <p className="font-semibold tracking-tight">{tier.name}</p>
                <p className="text-xs text-almondCream/55">{tier.discount > 0 ? t.pro.tierDiscount(tier.discount) : t.pro.proRates}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Faq({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const { t } = useApp();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="shell" aria-labelledby="faq-title">
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <h2 id="faq-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.home.faqTitle}</h2>
        <div className="divide-y divide-line border-y border-line">
          {faqs.map((f, i) => (
            <div key={f.question}>
              <h3>
                <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} aria-controls={`faq-${i}`}
                  className="flex w-full items-center justify-between gap-6 py-5 text-start text-[15px] font-medium tracking-tight">
                  {f.question}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-300", open === i && "rotate-180")} aria-hidden />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div id={`faq-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
                    <p className="max-w-2xl pb-5 text-sm leading-relaxed text-ink/65">{f.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
