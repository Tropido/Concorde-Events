"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, ChevronDown, ChevronRight, MessageCircle, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { useApp } from "@/lib/context/app-context";
import { todayIn, validateRange } from "@/lib/dates";
import { waLink } from "@/lib/utils/whatsapp";
import { ProductCard } from "@/components/catalogue/product-card";
import type { CatalogueProduct, Category, CMSContent } from "@/lib/types";

const dateInput = "w-full p-2.5 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-toffeeBrown";

export function HomeView({ products, categories, cms }: { products: CatalogueProduct[]; categories: Category[]; cms: CMSContent }) {
  const { t, language, country, eventDates, setEventDates } = useApp();
  const heroRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(eventDates.start);
  const [end, setEnd] = useState(eventDates.end);
  const [saved, setSaved] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Published CMS content wins; anything not published falls back to the dictionary.
  const hero = { ...t.hero, ...Object.fromEntries(Object.entries(cms.hero ?? {}).filter(([, v]) => v)) };
  const faqs = cms.faqs?.length ? cms.faqs : t.home.faqs;
  const testimonials = cms.testimonials ?? [];
  const today = todayIn(country);
  const rangeProblem = start || end ? validateRange(start, end, { today }) : null;

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-hero-in]", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" });
    });
    return () => mm.revert();
  }, [language]);

  return (
    <div ref={heroRef} className="space-y-20 pb-28 overflow-hidden w-full">
      <section className="relative w-full pt-4 px-3 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-tan/40 shadow-2xl bg-[#1a1511] w-full h-[480px] sm:h-[540px] lg:h-[580px]">
            <Image src="/modern-office-space-with-futuristic-decor-furniture.jpg" alt="" fill priority sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover object-center brightness-[0.88]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-black/80 via-black/30 to-transparent" />
            <div className="absolute top-6 start-6 sm:top-8 sm:start-8 z-10" data-hero-in>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 dark:bg-black/85 text-coffeeBean dark:text-tan text-[11px] sm:text-xs font-bold uppercase tracking-widest border border-tan/40">
                <Sparkles className="w-3.5 h-3.5" aria-hidden />{hero.badge}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-8 sm:bottom-12 px-6 sm:px-10 z-10 text-white max-w-3xl">
              <h1 data-hero-in className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-serif leading-[1.12]">
                {hero.title}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-tan via-almondCream to-desertSand">{hero.titleAccent}</span>
              </h1>
              <p data-hero-in className="mt-4 text-sm lg:text-base text-almondCream/90 max-w-xl leading-relaxed">{hero.subtitle}</p>
              <div data-hero-in className="pt-6 flex flex-wrap items-center gap-3">
                <Link href="/catalogue" className="px-7 py-3.5 rounded-full bg-toffeeBrown hover:bg-coffeeBean text-white font-extrabold text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 apple-press">
                  {hero.ctaExplore}<ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
                </Link>
                <a href={waLink(t.hero.whatsappGreeting)} target="_blank" rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-full bg-white/90 dark:bg-darkSurface/90 text-coffeeBean dark:text-almondCream font-bold text-xs uppercase tracking-wider flex items-center gap-2 apple-press">
                  <MessageCircle className="w-4 h-4 text-emerald-700" aria-hidden />{hero.ctaWhatsapp}
                </a>
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (validateRange(start, end, { today })) return;
              setEventDates({ start, end });
              setSaved(true);
            }}
            className="mt-8 apple-card rounded-2xl p-4 sm:p-5 border border-tan/50 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
            aria-labelledby="quick-dates-title"
          >
            <h2 id="quick-dates-title" className="sr-only">{t.hero.quickBooking.title}</h2>
            <label className="block text-[11px] font-extrabold uppercase tracking-widest">
              {t.hero.quickBooking.startDate}
              <input type="date" min={today} value={start} onChange={(e) => { setStart(e.target.value); setSaved(false); }} className={`${dateInput} mt-1.5`} />
            </label>
            <label className="block text-[11px] font-extrabold uppercase tracking-widest">
              {t.hero.quickBooking.endDate}
              <input type="date" min={start || today} value={end} onChange={(e) => { setEnd(e.target.value); setSaved(false); }} className={`${dateInput} mt-1.5`} />
            </label>
            <button type="submit" disabled={!start || !end || !!rangeProblem}
              className="w-full py-3 px-6 rounded-xl bg-toffeeBrown hover:bg-coffeeBean text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50">
              <Calendar className="w-4 h-4" aria-hidden />{t.hero.quickBooking.checkAvailability}
            </button>
          </form>
          <p aria-live="polite" className="mt-3 text-xs font-bold text-center">
            {rangeProblem ? <span className="text-rose-600 dark:text-rose-400">{t.booking.rangeErrors[rangeProblem]}</span>
              : saved ? <span className="text-emerald-800 dark:text-emerald-300">{t.hero.quickBooking.datesSaved}</span> : null}
          </p>
        </div>
      </section>

      {products.length > 0 && (
        <section className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1200px] mx-auto space-y-6">
            <div className="flex items-end justify-between border-b border-tan/30 pb-3 gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">{t.showcase.badge}</p>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-serif mt-1">{t.showcase.title}</h2>
                <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-1">{t.home.availabilityHint}</p>
              </div>
              <Link href="/catalogue" className="text-xs font-bold text-toffeeBrown dark:text-tan hover:underline flex items-center gap-1 shrink-0">
                {t.showcase.viewAll}<ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.slice(0, 6).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1200px] mx-auto space-y-6">
            <div className="flex items-end justify-between border-b border-tan/30 pb-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">{t.categories.badge}</p>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-serif mt-1">{t.categories.title}</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((c) => (
                <Link key={c.id} href={`/catalogue?cat=${c.slug}`} className="rounded-3xl overflow-hidden relative h-72 border border-tan/40 shadow-xl group block">
                  {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 400px" className="object-cover group-hover:scale-110 transition-transform duration-700" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-6 flex flex-col justify-end text-white">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-tan">{c.count} {t.categories.piecesCount}</span>
                    <h3 className="text-2xl font-bold font-serif mt-1">{c.name}</h3>
                    {c.description && <p className="text-xs text-almondCream/80 mt-1 line-clamp-2">{c.description}</p>}
                    <span className="pt-3 inline-flex items-center gap-1.5 text-xs font-bold text-tan">
                      {t.home.exploreCategory}<ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="w-full bg-desertSand/20 dark:bg-darkSurface/50 py-14 border-y border-tan/30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">{t.craftsmanship.badge}</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif">{t.craftsmanship.title}</h2>
            <p className="text-sm text-coffeeBean/75 dark:text-almondCream/75">{t.craftsmanship.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {t.craftsmanship.pillars.map((pillar, i) => (
              <div key={pillar.title} className="apple-card p-5 rounded-2xl space-y-3 border border-tan/40">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-toffeeBrown to-coffeeBean text-white flex items-center justify-center font-serif font-black">{i + 1}</div>
                <h3 className="text-sm font-bold font-serif">{pillar.title}</h3>
                <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1200px] mx-auto space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">{t.testimonials.badge}</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-serif">{t.testimonials.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {testimonials.map((q) => (
                <figure key={q.author + q.quote.slice(0, 20)} className="apple-card p-6 rounded-2xl space-y-3 border border-tan/40">
                  <blockquote className="text-sm italic leading-relaxed">“{q.quote}”</blockquote>
                  <figcaption className="pt-3 border-t border-tan/20 text-sm font-bold font-serif">
                    {q.author}{q.role && <span className="block text-[11px] font-semibold text-toffeeBrown dark:text-tan">{q.role}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="text-center space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">{t.home.faqBadge}</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif">{t.home.faqTitle}</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={faq.question} className="apple-card rounded-2xl border border-tan/30 overflow-hidden">
                <h3>
                  <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i} aria-controls={`faq-${i}`}
                    className="w-full p-5 text-start flex items-center justify-between gap-4 font-bold text-sm">
                    {faq.question}
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div id={`faq-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-5 text-sm text-coffeeBean/75 dark:text-almondCream/75 leading-relaxed">
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
