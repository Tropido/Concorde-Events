"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/lib/context/app-context";
import { FurnitureItem } from "@/lib/types";
import { calculateRangeAvailability } from "@/lib/utils/availability";
import { AvailabilityCalendar } from "@/components/ui/availability-calendar";
import { DateSelectionModal } from "@/components/catalogue/date-selection-modal";
import {
  Sparkles,
  ArrowRight,
  Eye,
  Calendar,
  ShieldCheck,
  Award,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
  ShoppingBag,
  Clock,
  Truck,
  Layers,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";

export default function HomePage() {
  const {
    t,
    language,
    furniture,
    categories,
    currentUser,
    country,
    currencySymbol,
    formatPrice,
    addToDraft,
    startDate,
    endDate,
    setDates,
  } = useApp();

  const heroRef = useRef<HTMLDivElement>(null);
  const heroBadgeRef = useRef<HTMLSpanElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const heroCtasRef = useRef<HTMLDivElement>(null);
  const quickBarRef = useRef<HTMLDivElement>(null);

  // Quick Hero Booking State
  const [heroStart, setHeroStart] = useState<string>(startDate || "2026-08-15");
  const [heroEnd, setHeroEnd] = useState<string>(endDate || "2026-08-18");
  const [heroPieces, setHeroPieces] = useState<number>(4);
  const [quickSearchFeedback, setQuickSearchFeedback] = useState<string | null>(null);

  // Modal item for date selection
  const [modalItem, setModalItem] = useState<FurnitureItem | null>(null);

  // FAQ Accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // GSAP Smooth Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (heroBadgeRef.current) {
        tl.fromTo(
          heroBadgeRef.current,
          { opacity: 0, y: -20, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8 }
        );
      }

      if (heroTitleRef.current) {
        tl.fromTo(
          heroTitleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 1 },
          "-=0.5"
        );
      }

      if (heroSubRef.current) {
        tl.fromTo(
          heroSubRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.6"
        );
      }

      if (heroCtasRef.current) {
        tl.fromTo(
          heroCtasRef.current.children,
          { opacity: 0, y: 15, stagger: 0.1 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.5"
        );
      }

      if (quickBarRef.current) {
        tl.fromTo(
          quickBarRef.current,
          { opacity: 0, y: 30, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9 },
          "-=0.3"
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, [language]);

  const handleHeroQuickCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setDates(heroStart, heroEnd);
    setQuickSearchFeedback(
      language === "ar"
        ? `تم تحديث تواريخ الفعالية (${heroStart} إلى ${heroEnd}). تم حصر القطع المتوفرة لهذه الفترة!`
        : `Dates d'événement sélectionnées (${heroStart} au ${heroEnd}). L'inventaire disponible ci-dessous est synchronisé !`
    );
    setTimeout(() => setQuickSearchFeedback(null), 6000);
  };

  // 5 New Boxed Products matching the exact design in the user screenshot (input_file_1.png)
  const boxedNewProducts = [
    {
      id: "furn-7",
      slug: "vase",
      title: "Vase",
      priceTnd: 55,
      priceEur: 18,
      image: "/products/vase.png",
      tag: "New",
      refItem: furniture.find((f) => f.slug === "vase") || furniture[0],
    },
    {
      id: "furn-8",
      slug: "lampe",
      title: "Lampe",
      priceTnd: 55,
      priceEur: 22,
      image: "/products/lampe.png",
      tag: "New",
      refItem: furniture.find((f) => f.slug === "lampe") || furniture[0],
    },
    {
      id: "furn-9",
      slug: "coiffeuse",
      title: "Coiffeuse",
      priceTnd: 45,
      priceEur: 35,
      image: "/products/coiffeuse.png",
      tag: "New",
      refItem: furniture.find((f) => f.slug === "coiffeuse") || furniture[0],
    },
    {
      id: "furn-10",
      slug: "table-basse-ronde",
      title: "Table basse ronde",
      priceTnd: 89,
      priceEur: 65,
      image: "/products/table-basse.png",
      tag: "New",
      refItem: furniture.find((f) => f.slug === "table-basse-ronde") || furniture[0],
    },
    {
      id: "furn-11",
      slug: "pouff-cuir",
      title: "Pouff cuir",
      priceTnd: 45,
      priceEur: 30,
      image: "/products/pouff-cuir.png",
      tag: "New",
      refItem: furniture.find((f) => f.slug === "pouff-cuir") || furniture[0],
    },
  ];

  // Brand logos for ticker
  const partnerBrands = [
    { name: "Maison Dior Galas", label: "Haute Couture Partner" },
    { name: "Cartier Private Events", label: "High Jewelry VIP" },
    { name: "Ritz Paris Receptions", label: "Palace Protocol" },
    { name: "Cannes Film Festival", label: "Official Suite Decor" },
    { name: "Van Cleef & Arpels", label: "Gala Architecture" },
    { name: "Cap d'Antibes Estates", label: "Private Weddings" },
  ];

  const faqList = [
    {
      q: language === "ar" ? "كيف يتم فحص وضمان نظافة الأثاث قبل كل فعالية؟" : "Comment garantissez-vous l'état impeccable du mobilier avant chaque événement ?",
      a: language === "ar" ? "تخضع كل قطعة لبروتوكول فحص دقيق من 12 نقطة يشمل التنظيف الجاف بالبخار لقماش البوكليه، وتلميع الرخام الإيطالي، وفحص التوصيلات الكهربائية للثريات المعمارية." : "Chaque pièce fait l'objet d'un audit en 12 points rigoureux dans nos ateliers parisiens et tunisois : nettoyage vapeur du bouclé, polissage des marbres et certification électrique des luminaires.",
    },
    {
      q: language === "ar" ? "هل يمكن للمحترفين ومنظمي الحفلات الحصول على أسعار جملة؟" : "Les décorateurs et agences bénéficient-ils de tarifs wholesale ?",
      a: language === "ar" ? "نعم بكل تأكيد. نوفر حسابات مهنية معتمدة تمنح خصماً فورياً يتراوح بين 20% و35%، مع حاسبة هوامش ربح متقدمة وتأكيد حجوزات بأولوية قصوى." : "Absolument. Nos partenaires pros (agences événementielles, wedding planners, scénographes) disposent d'une remise wholesale de 20% à 35% et d'un simulateur de marge dédié.",
    },
    {
      q: language === "ar" ? "ما هي شروط التوصيل والتركيب في موقع الفعالية؟" : "Comment se déroule la logistique et l'installation sur place ?",
      a: language === "ar" ? "يتولى فريقنا الفني المتخصص بالقفازات البيضاء نقل الأثاث في شاحنات مبطنة مكيفة، مع تركيب دقيق حسب المخطط الهندسي للفعالية واستلام هادئ فور انتهاء الحفل." : "Notre brigade gants blancs assure le transport en camions capitonnés, la mise en place scénographique millimétrée et le démontage discret à l'horaire de votre choix.",
    },
  ];

  // Pieces currently available during selected dates
  const availablePiecesForDates = furniture.map((item) => {
    const avail = calculateRangeAvailability(item, startDate, endDate);
    return {
      ...item,
      availableCount: avail.minAvailableInPeriod,
    };
  });

  return (
    <div ref={heroRef} className="space-y-20 pb-28 overflow-hidden w-full">
      {/* ========================================================================= */}
      {/* SECTION 1: PANORAMIC HERO SHOWCASE (Using user uploaded panoramic image) */}
      {/* ========================================================================= */}
      <section className="relative w-full pt-4 px-3 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Main Hero Visual Banner (Wide Panoramic Proportions) */}
          <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-tan/40 shadow-2xl bg-[#1a1511] w-full h-[480px] sm:h-[540px] lg:h-[580px]">
            <Image
              src="/modern-office-space-with-futuristic-decor-furniture.jpg"
              alt="Concorde Events Panoramic Luxury Furniture Architecture"
              fill
              className="object-cover object-center brightness-[0.88] contrast-[1.05]"
              priority
            />

            {/* Subtle Gradient Overlays for High-Contrast Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />

            {/* Floating Top Tag */}
            <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-10">
              <span
                ref={heroBadgeRef}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 dark:bg-black/85 backdrop-blur-xl text-coffeeBean dark:text-tan text-[11px] sm:text-xs font-bold uppercase tracking-widest border border-tan/40 shadow-lg"
              >
                <Sparkles className="w-3.5 h-3.5 text-toffeeBrown dark:text-tan animate-pulse" />
                {t.hero.badge}
              </span>
            </div>

            {/* Center-Bottom Hero Headlines with Generous Breathing Room */}
            <div className="absolute inset-x-0 bottom-8 sm:bottom-12 px-6 sm:px-10 z-10 text-white max-w-3xl">
              <h1
                ref={heroTitleRef}
                className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-serif leading-[1.12] drop-shadow-md"
              >
                {t.hero.title}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-tan via-almondCream to-desertSand">
                  {t.hero.titleAccent}
                </span>
              </h1>

              <p
                ref={heroSubRef}
                className="mt-3 sm:mt-4 text-xs sm:text-sm lg:text-base text-almondCream/90 max-w-xl leading-relaxed font-normal"
              >
                {t.hero.subtitle}
              </p>

              {/* Action Buttons with comfortable spacing */}
              <div
                ref={heroCtasRef}
                className="pt-5 sm:pt-6 flex flex-wrap items-center gap-3 sm:gap-4"
              >
                <Link
                  href="/catalogue"
                  className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-full bg-toffeeBrown hover:bg-coffeeBean text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xl shadow-toffeeBrown/30 flex items-center gap-2 apple-press border border-tan/30"
                >
                  <span>{t.hero.ctaExplore}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href={`https://wa.me/33612345678?text=Bonjour,%20je%20souhaite%20un%20devis%20location%20pour%20la%20collection%20Concorde%20(${country === "TN" ? "Tunisie" : "France"})`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 sm:px-7 sm:py-4 rounded-full bg-white/90 dark:bg-darkSurface/90 hover:bg-white text-coffeeBean dark:text-almondCream font-bold text-xs uppercase tracking-wider transition-all backdrop-blur-xl border border-tan/40 flex items-center gap-2 apple-press shadow-lg"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>{t.hero.ctaWhatsapp}</span>
                </a>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DATE CHECKER (Spaced out comfortable rhythm - No stacking/overlapping)   */}
          {/* ========================================================================= */}
          <div
            ref={quickBarRef}
            className="mt-8 sm:mt-10 max-w-[1200px] mx-auto"
          >
            <form
              onSubmit={handleHeroQuickCheck}
              className="apple-card rounded-2xl p-4 sm:p-5 shadow-apple border border-tan/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-[#fcf8f4]/95 dark:bg-[#1a1511]/95"
            >
              <div>
                <label className="block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-coffeeBean dark:text-tan mb-1.5">
                  {t.hero.quickBooking.startDate}
                </label>
                <input
                  type="date"
                  value={heroStart}
                  onChange={(e) => setHeroStart(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-xs font-bold text-coffeeBean dark:text-white focus:outline-none focus:ring-2 focus:ring-toffeeBrown"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-coffeeBean dark:text-tan mb-1.5">
                  {t.hero.quickBooking.endDate}
                </label>
                <input
                  type="date"
                  value={heroEnd}
                  onChange={(e) => setHeroEnd(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-xs font-bold text-coffeeBean dark:text-white focus:outline-none focus:ring-2 focus:ring-toffeeBrown"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-coffeeBean dark:text-tan mb-1.5">
                  {t.hero.quickBooking.pieces}
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={heroPieces}
                  onChange={(e) => setHeroPieces(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-xs font-bold text-coffeeBean dark:text-white focus:outline-none focus:ring-2 focus:ring-toffeeBrown"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-xl bg-toffeeBrown hover:bg-coffeeBean text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-md shadow-toffeeBrown/25 flex items-center justify-center gap-2 apple-press"
                >
                  <Calendar className="w-4 h-4 text-almondCream" />
                  <span>{t.hero.quickBooking.checkAvailability}</span>
                </button>
              </div>
            </form>

            {quickSearchFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center"
              >
                {quickSearchFeedback}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: BRAND & ARTISAN PARTNERS TICKER RIBBON                         */}
      {/* ========================================================================= */}
      <section className="w-full border-y border-tan/30 bg-desertSand/15 dark:bg-darkSurface/50 py-6 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 text-center mb-4">
          <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.25em] text-toffeeBrown dark:text-tan">
            {t.brands.heading}
          </span>
        </div>

        <div className="flex overflow-hidden relative">
          <motion.div
            animate={{ x: language === "ar" ? ["0%", "50%"] : ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 24 }}
            className="flex items-center gap-12 sm:gap-16 whitespace-nowrap pl-4"
          >
            {[...partnerBrands, ...partnerBrands].map((b, i) => (
              <div key={i} className="flex items-center gap-3 group opacity-75 hover:opacity-100 transition-opacity">
                <div className="w-2.5 h-2.5 rounded-full bg-tan group-hover:scale-125 transition-transform" />
                <span className="text-sm sm:text-base font-bold font-serif text-coffeeBean dark:text-almondCream tracking-wide">
                  {b.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-desertSand/40 dark:bg-darkBg text-coffeeBean/70 dark:text-tan border border-tan/20">
                  {b.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: "Our new products" BOXED 5-COLUMN GRID (Matching User Image)   */}
      {/* ========================================================================= */}
      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto space-y-5">
          {/* Section Header with Horizontal Divider Line extending over width */}
          <div className="border-b border-neutral-300 dark:border-neutral-700/80 pb-3 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-neutral-900 dark:text-white tracking-wide">
              Our new products
            </h2>
            <Link
              href="/catalogue"
              className="text-xs font-bold text-toffeeBrown dark:text-tan hover:underline flex items-center gap-1"
            >
              <span>{t.showcase.viewAll}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 5-Column Boxed Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {boxedNewProducts.map((p) => {
              const currentPrice = formatPrice(p.priceEur, p.priceTnd);
              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-[#1a1511] border border-neutral-300 dark:border-neutral-700/80 rounded-xl p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div>
                    {/* Inner image container with subtle border/background */}
                    <Link
                      href={`/catalogue/${p.slug}`}
                      className="relative h-44 sm:h-48 w-full rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-center p-2 mb-2 overflow-hidden block"
                    >
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Quick view overlay icon */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="p-2 rounded-full bg-white/90 text-neutral-800 shadow">
                          <Eye className="w-4 h-4" />
                        </span>
                      </div>
                    </Link>

                    {/* "New" Green outline badge */}
                    <div className="mb-1">
                      <span className="border border-emerald-500 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded inline-block">
                        New
                      </span>
                    </div>

                    {/* Title linking to dedicated product landing page */}
                    <Link
                      href={`/catalogue/${p.slug}`}
                      className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-toffeeBrown dark:hover:text-tan transition-colors block truncate"
                    >
                      {p.title}
                    </Link>

                    {/* Red Price Tag matching reference screenshot */}
                    <div className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-500 mt-1">
                      {currentPrice}
                    </div>
                  </div>

                  {/* Bottom Action Row: Buy Pill Button & Cart Icon */}
                  <div className="flex items-center gap-2 pt-3 mt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setModalItem(p.refItem)}
                      className="bg-black hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white dark:text-black text-white text-xs font-bold py-1.5 px-3 rounded-md flex-1 text-center transition apple-press"
                    >
                      Buy
                    </button>

                    <button
                      type="button"
                      onClick={() => addToDraft(p.refItem, 1)}
                      title="Ajouter au devis"
                      className="border border-neutral-300 dark:border-neutral-700 rounded-md p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition apple-press"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: REAL-TIME CALENDAR & DYNAMIC AVAILABLE FURNITURE LIST          */}
      {/* ========================================================================= */}
      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">
              {t.scheduling.badge}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-serif text-coffeeBean dark:text-white">
              {t.scheduling.title}
            </h2>
            <p className="text-xs sm:text-sm text-coffeeBean/75 dark:text-almondCream/75">
              Sélectionnez vos dates d'événement ci-dessous pour voir instantanément les pièces disponibles en temps réel.
            </p>
          </div>

          {/* Calendar Box (Top item buttons removed per user requirement) */}
          <div className="max-w-[1200px] mx-auto">
            <AvailabilityCalendar
              item={furniture[0]}
              startDate={startDate}
              endDate={endDate}
              onSelectDates={(s, e) => setDates(s, e)}
            />
          </div>

          {/* Dynamic Available Inventory List for the Selected Dates */}
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between border-b border-tan/30 pb-2">
              <h3 className="text-base sm:text-lg font-bold font-serif text-coffeeBean dark:text-almondCream">
                Mobilier disponible du <strong>{startDate}</strong> au <strong>{endDate}</strong>
              </h3>
              <span className="text-xs font-bold text-toffeeBrown dark:text-tan">
                {availablePiecesForDates.filter((p) => p.availableCount > 0).length} pièces disponibles
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {availablePiecesForDates.map((piece) => (
                <div
                  key={piece.id}
                  className="apple-card rounded-2xl p-3.5 flex flex-col justify-between border border-tan/30 hover:border-toffeeBrown transition-colors space-y-2"
                >
                  <Link
                    href={`/catalogue/${piece.slug}`}
                    className="relative h-36 w-full rounded-xl overflow-hidden bg-desertSand/20 block group"
                  >
                    <Image
                      src={piece.images[0]}
                      alt={piece.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </Link>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-toffeeBrown dark:text-tan uppercase tracking-wider">
                        {piece.category_name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          piece.availableCount > 0
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {piece.availableCount > 0
                          ? `${piece.availableCount} dispo`
                          : "Complet"}
                      </span>
                    </div>

                    <Link
                      href={`/catalogue/${piece.slug}`}
                      className="font-serif font-bold text-sm text-coffeeBean dark:text-white hover:underline block truncate mt-1"
                    >
                      {piece.title}
                    </Link>

                    <div className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                      {formatPrice(piece.rental_price, piece.rental_price_tnd)} / jour
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-tan/20">
                    <button
                      type="button"
                      disabled={piece.availableCount <= 0}
                      onClick={() => setModalItem(piece)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all apple-press text-center ${
                        piece.availableCount > 0
                          ? "bg-toffeeBrown hover:bg-coffeeBean text-white shadow-sm"
                          : "bg-neutral-200 dark:bg-zinc-800 text-neutral-400 cursor-not-allowed"
                      }`}
                    >
                      Réserver
                    </button>

                    <Link
                      href={`/catalogue/${piece.slug}`}
                      className="p-2 rounded-xl bg-desertSand/30 dark:bg-darkSurface text-coffeeBean dark:text-almondCream hover:bg-desertSand/60 transition-colors"
                      title="Voir la page produit"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: CURATED UNIVERSES & COLLECTIONS GRID                           */}
      {/* ========================================================================= */}
      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="flex items-end justify-between border-b border-tan/30 pb-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">
                {t.categories.badge}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-coffeeBean dark:text-white mt-1">
                {t.categories.title}
              </h2>
            </div>
            <Link
              href="/catalogue"
              className="text-xs sm:text-sm font-bold text-toffeeBrown dark:text-tan hover:underline flex items-center gap-1"
            >
              <span>{t.categories.viewAll}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <motion.div
                key={cat.id}
                whileHover={{ y: -6 }}
                className="rounded-3xl overflow-hidden relative h-72 sm:h-80 border border-tan/40 shadow-xl group"
              >
                <Image
                  src={cat.image_url}
                  alt={cat.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-6 flex flex-col justify-end text-white">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-tan">
                    {cat.item_count} {t.categories.piecesCount}
                  </span>
                  <h3 className="text-2xl font-bold font-serif group-hover:text-almondCream transition-colors mt-1">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-almondCream/80 mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                  <div className="pt-3">
                    <Link
                      href={`/catalogue?cat=${cat.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-tan hover:text-white"
                    >
                      <span>Explorer la sélection</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6: ARTISANAL CRAFTSMANSHIP & WHITE-GLOVE SERVICES (4 Pillars)     */}
      {/* ========================================================================= */}
      <section className="w-full bg-desertSand/20 dark:bg-darkSurface/50 py-14 border-y border-tan/30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">
              {t.craftsmanship.badge}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-coffeeBean dark:text-white">
              {t.craftsmanship.title}
            </h2>
            <p className="text-xs sm:text-sm text-coffeeBean/75 dark:text-almondCream/75">
              {t.craftsmanship.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {t.craftsmanship.pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="apple-card p-5 rounded-2xl space-y-3 border border-tan/40 hover:border-toffeeBrown transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-toffeeBrown to-coffeeBean text-white flex items-center justify-center font-serif text-base font-black shadow-md">
                  {idx + 1}
                </div>
                <h3 className="text-sm font-bold font-serif text-coffeeBean dark:text-white">
                  {pillar.title}
                </h3>
                <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 7: VIP CLIENT TESTIMONIALS & PRESS REVIEWS                        */}
      {/* ========================================================================= */}
      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">
              {t.testimonials.badge}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-coffeeBean dark:text-white">
              {t.testimonials.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.testimonials.quotes.map((q, idx) => (
              <div
                key={idx}
                className="apple-card p-6 rounded-2xl space-y-3 border border-tan/40 relative flex flex-col justify-between"
              >
                <div className="text-3xl font-serif text-toffeeBrown/40 leading-none">“</div>
                <p className="text-xs sm:text-sm text-coffeeBean/85 dark:text-almondCream/85 italic leading-relaxed">
                  {q.quote}
                </p>
                <div className="pt-3 border-t border-tan/20">
                  <div className="font-bold text-sm text-coffeeBean dark:text-white font-serif">
                    {q.author}
                  </div>
                  <div className="text-[11px] text-toffeeBrown dark:text-tan font-semibold">
                    {q.role} • {q.event}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 8: ACCORDION FAQ (Assurance & Protocole)                          */}
      {/* ========================================================================= */}
      <section className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto space-y-5">
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-toffeeBrown dark:text-tan">
              Protocole & Assurance
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-coffeeBean dark:text-white">
              Questions Fréquentes
            </h2>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            {faqList.map((faq, idx) => (
              <div
                key={idx}
                className="apple-card rounded-2xl border border-tan/30 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-coffeeBean dark:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-toffeeBrown transition-transform ${
                      openFaqIndex === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaqIndex === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-coffeeBean/75 dark:text-almondCream/75 leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Date Selection Modal */}
      {modalItem && (
        <DateSelectionModal
          item={modalItem}
          currentUserRole={currentUser.role}
          onClose={() => setModalItem(null)}
          onConfirmAdd={(item, s, e, qty) => {
            addToDraft(item, qty, s, e);
            setModalItem(null);
          }}
        />
      )}
    </div>
  );
}
