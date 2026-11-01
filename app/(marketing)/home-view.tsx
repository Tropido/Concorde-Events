"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, MessageCircle } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { waLink } from "@/lib/utils/whatsapp";
import { cn, tierSwatch } from "@/lib/utils/formatters";
import { ProductCard } from "@/components/catalogue/product-card";
import { HeroSearch } from "@/components/home/hero-search";
import { CategoryIcon } from "@/lib/category-icons";
import { PillTabs, ease } from "@/components/ui/kit";
import type { CatalogueProduct, Category, CMSContent, ProTier } from "@/lib/types";

export function HomeView({ products, categories, cms, tiers }: { products: CatalogueProduct[]; categories: Category[]; cms: CMSContent; tiers: ProTier[] }) {
  const { t } = useApp();
  const hero = { ...t.hero, ...Object.fromEntries(Object.entries(cms.hero ?? {}).filter(([, v]) => v)) };
  const faqs = cms.faqs?.length ? cms.faqs : t.home.faqs;
  const testimonials = cms.testimonials ?? [];
  const available = products.filter((p) => p.stock > 0);

  return (
    <div className="space-y-24 pb-6">
      {/* The navbar floats over the banner, as in the reference. */}
      <section className="shell -mt-14">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }} className="relative">
          <div className="relative">
            <div className="grain relative h-[26rem] overflow-hidden rounded-[2.25rem] bg-[linear-gradient(135deg,rgb(var(--desert-sand)),rgb(var(--faded-copper))_55%,rgb(var(--coffee-bean)))] sm:h-[32rem] lg:h-[clamp(34rem,76vh,46rem)]">
              {cms.hero_image && <Image src={cms.hero_image} alt="" fill priority sizes="100vw" className="object-cover" />}
              <span className="absolute inset-0 bg-gradient-to-t from-espresso/25 via-transparent to-espresso/10" aria-hidden />
            </div>
            <div className="absolute inset-x-0 bottom-0 z-20 flex translate-y-1/2 justify-center"><HeroSearch /></div>
          </div>
          <div className="hero-notch z-10 space-y-5 pt-14 lg:absolute lg:bottom-0 lg:start-0 lg:w-[min(47%,42rem)] lg:pb-[4.5rem] lg:pe-10 lg:ps-2 lg:pt-8">
            <h1 className="display text-[clamp(2.5rem,5.4vw,5rem)] text-balance">{hero.title}</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="max-w-md flex-1 basis-64 text-[15px] leading-relaxed text-ink/70 text-pretty">{hero.subtitle}</p>
              <a href={waLink(t.hero.whatsappGreeting)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4 hover:text-ink-soft">
                <MessageCircle className="h-4 w-4" aria-hidden />{t.hero.ctaWhatsapp}
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      <Categories categories={categories.filter((c) => c.count > 0)} />
      {available.length > 0 && <Picks products={available} categories={categories} />}

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

/** Big tiles with the icon as a watermark. Hover, focus or a press brings up the espresso overlay
 *  (and the cover photo, if there is one) with the icon sliding up; reduced motion keeps the overlay only. */
function Categories({ categories }: { categories: Category[] }) {
  const { t } = useApp();
  if (categories.length === 0) return null;
  const scroller = categories.length > 8;
  return (
    <section className="shell space-y-6" aria-labelledby="cats-title">
      <h2 id="cats-title" className="display text-[clamp(2rem,4.5vw,3.5rem)]">{t.categories.title}</h2>
      <ul className={cn(scroller ? "no-scrollbar -mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-1 pt-1 sm:mx-0 sm:px-0" : "grid grid-cols-2 gap-2.5 pt-1 md:grid-cols-3 xl:grid-cols-4")}>
        {categories.map((c) => (
          <li key={c.id} className={cn(scroller && "w-[46%] shrink-0 snap-start sm:w-[31%] xl:w-[23.5%]")}>
            <Link href={`/catalogue?cat=${c.slug}`}
              className={cn("grain group relative flex aspect-[5/4] flex-col overflow-hidden rounded-[1.75rem] p-5 transition-transform duration-300 hover:-translate-y-1 focus-visible:-translate-y-1 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0 sm:p-6", `tone-${c.tone}`)}>
              <span className="tile-overlay absolute inset-0 z-10 bg-espresso/75 opacity-0 transition-opacity duration-300" aria-hidden />
              {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="(max-width: 768px) 50vw, 25vw" className="tile-overlay object-cover opacity-0 transition-opacity duration-300" />}
              <CategoryIcon name={c.icon} className="tile-icon absolute -bottom-6 -end-6 z-10 h-36 w-36 text-ink/[0.08] transition duration-300 sm:h-44 sm:w-44 rtl:-scale-x-100" />
              <span className="tile-text relative z-20 text-lg font-semibold leading-tight tracking-tight text-balance transition-colors duration-300 sm:text-2xl">{c.name}</span>
              <span className="tile-text relative z-20 mt-1 text-xs text-ink/60 transition-colors duration-300">{t.categories.pieces(c.count)}</span>
              <span className="tile-more relative z-20 mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-espresso-fg opacity-0 transition-opacity duration-300">
                {t.categories.seeAll(c.count)}<ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Picks({ products, categories }: { products: CatalogueProduct[]; categories: Category[] }) {
  const { t } = useApp();
  const [cat, setCat] = useState("all");
  const used = categories.filter((c) => products.some((p) => p.category?.id === c.id));
  const shown = useMemo(() => products.filter((p) => cat === "all" || p.category?.slug === cat).slice(0, 4), [products, cat]);
  return (
    <section className="shell space-y-6" aria-labelledby="picks-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="picks-title" className="display text-[clamp(2rem,4.5vw,3.5rem)]">{t.home.picksTitle}</h2>
        <PillTabs label={t.catalogue.filterLabel} value={cat} onChange={setCat} className="max-w-full"
          options={[{ value: "all", label: t.common.all }, ...used.map((c) => ({ value: c.slug, label: c.name }))]} />
      </div>
      <motion.div layout className="no-scrollbar -mx-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0">
        <AnimatePresence mode="popLayout">
          {shown.map((p, i) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease, delay: i * 0.03 }}
              className="w-[72%] shrink-0 snap-start md:w-auto">
              <ProductCard product={p} light />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      <div className="flex justify-center pt-2"><Link href="/catalogue" className="btn-light">{t.home.viewAll}</Link></div>
    </section>
  );
}

function ProTeaser({ tiers }: { tiers: ProTier[] }) {
  const { t } = useApp();
  return (
    <section className="shell" aria-labelledby="pro-title">
      <div className="grid gap-8 rounded-[1.75rem] bg-espresso p-6 text-espresso-fg sm:p-10 lg:grid-cols-2">
        <div className="flex flex-col justify-between gap-8">
          <div className="space-y-4">
            <p className="font-mono text-[10.5px] uppercase tracking-label text-almondCream/50">{t.pro.teaserLabel}</p>
            <h2 id="pro-title" className="display text-[clamp(2rem,4vw,3.25rem)] text-balance">{t.pro.teaserTitle}</h2>
            <p className="max-w-md text-sm text-almondCream/70">{t.pro.teaserText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/register?type=professional" className="btn bg-espresso-fg text-espresso hover:bg-almondCream">{t.pro.become}</Link>
            <Link href="/professionnels" className="btn text-espresso-fg ring-1 ring-almondCream/25 hover:ring-almondCream/60">{t.pro.learnMore}</Link>
          </div>
        </div>
        {tiers.length > 0 && (
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tiers.map((tier) => (
              <li key={tier.code} className="rounded-2xl bg-almondCream/[0.06] p-4 ring-1 ring-almondCream/10">
                <span className="mb-3 block h-1.5 w-8 rounded-full" style={{ background: tierSwatch(tier.color) }} aria-hidden />
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
