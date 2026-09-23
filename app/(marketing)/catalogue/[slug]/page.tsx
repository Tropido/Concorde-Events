"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/context/app-context";
import { AvailabilityCalendar } from "@/components/ui/availability-calendar";
import { calculateRangeAvailability } from "@/lib/utils/availability";
import {
  ArrowLeft,
  CalendarCheck,
  ShieldCheck,
  Ruler,
  Layers,
  Palette,
  Eye,
  CheckCircle2,
  Share2,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { motion } from "framer-motion";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "";

  const {
    furniture,
    currentUser,
    country,
    currencySymbol,
    formatPrice,
    addToDraft,
    startDate,
    endDate,
    setDates,
  } = useApp();

  // Robust item lookup matching slug, id, or partial slug
  const item =
    furniture.find(
      (f) =>
        f.slug === slug ||
        f.slug.toLowerCase() === slug.toLowerCase() ||
        f.id === slug
    ) ||
    furniture.find(
      (f) =>
        f.slug.includes(slug) ||
        slug.includes(f.slug)
    ) ||
    furniture[0];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (!item) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold font-serif text-coffeeBean dark:text-white">Pièce non trouvée</h1>
        <p className="text-sm text-coffeeBean/70 dark:text-almondCream/70">Le modèle demandé n'est pas répertorié dans le catalogue actif.</p>
        <Link href="/catalogue" className="px-6 py-2.5 rounded-full bg-toffeeBrown text-white text-xs font-bold inline-block">
          Retour au Catalogue
        </Link>
      </div>
    );
  }

  const avail = calculateRangeAvailability(item, startDate, endDate);
  const maxAllowed = avail.minAvailableInPeriod;

  const relatedItems = furniture
    .filter((f) => f.category_id === item.category_id && f.id !== item.id)
    .slice(0, 3);

  const unitPriceFormatted = formatPrice(
    currentUser.role === "professional"
      ? item.professional_price
      : item.rental_price,
    currentUser.role === "professional"
      ? item.professional_price_tnd
      : item.rental_price_tnd
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
      {/* Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-coffeeBean/70 dark:text-tan hover:text-toffeeBrown transition-colors uppercase tracking-wider apple-press"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au Catalogue</span>
        </button>

        <span className="text-[11px] font-semibold text-coffeeBean/60 dark:text-almondCream/60">
          Devises: <strong>{country === "TN" ? "🇹🇳 TND (DT)" : "🇫🇷 EUR (€)"}</strong>
        </span>
      </div>

      {/* Main Grid: Gallery + Product Spec Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 items-start">
        {/* Left: High-Res Image Gallery */}
        <div className="space-y-4">
          <div className="relative h-[440px] sm:h-[480px] w-full rounded-3xl overflow-hidden bg-desertSand/20 dark:bg-darkSurface border border-tan/40 shadow-xl">
            <Image
              src={item.images[activeImageIndex] || item.images[0]}
              alt={item.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute top-4 right-4 bg-coffeeBean/80 text-almondCream backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-bold border border-tan/30">
              {item.category_name || "Mobilier Scénographique"}
            </div>
          </div>

          {/* Gallery Thumbnails */}
          {item.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {item.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    activeImageIndex === idx
                      ? "border-toffeeBrown scale-105 shadow-md"
                      : "border-tan/30 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Spec Info & Rental Action Panel */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-tan/20 text-toffeeBrown dark:text-tan text-xs font-bold uppercase tracking-wider border border-tan/30">
                {item.featured ? "Pièce Sculpturale d'Exception" : "Catalogue Officiel"}
              </span>
              <span className="text-xs font-bold text-coffeeBean/50 dark:text-almondCream/50">
                Ref: {item.slug}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-serif text-coffeeBean dark:text-white">
              {item.title}
            </h1>

            <p className="text-xs sm:text-sm text-coffeeBean/80 dark:text-almondCream/80 leading-relaxed">
              {item.description}
            </p>

            {/* Price Visibility Card */}
            <div className="p-5 rounded-2xl bg-white/90 dark:bg-darkSurface border border-tan/40 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-toffeeBrown dark:text-tan uppercase tracking-wider block">
                  {currentUser.role === "professional"
                    ? "Tarif Grossiste Partenaire"
                    : "Tarif de Location Indicatif"}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-500 font-serif">
                  {unitPriceFormatted}{" "}
                  <span className="text-xs font-normal text-coffeeBean/60 dark:text-almondCream/60">
                    / jour
                  </span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-coffeeBean/60 dark:text-almondCream/60 block">
                  Stock Total Détenu
                </span>
                <span className="text-lg font-bold text-coffeeBean dark:text-white">
                  {item.quantity_owned} unités
                </span>
              </div>
            </div>

            {/* Architectural Specifications List */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-desertSand/20 dark:bg-darkSurface/60 border border-tan/25 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-coffeeBean/70 dark:text-tan font-semibold">
                  <Ruler className="w-3.5 h-3.5 text-toffeeBrown dark:text-tan" />
                  <span>Dimensions</span>
                </div>
                <div className="font-bold text-coffeeBean dark:text-white truncate">
                  {item.dimensions.width} × {item.dimensions.height} × {item.dimensions.depth} {item.dimensions.unit}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-desertSand/20 dark:bg-darkSurface/60 border border-tan/25 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-coffeeBean/70 dark:text-tan font-semibold">
                  <Layers className="w-3.5 h-3.5 text-toffeeBrown dark:text-tan" />
                  <span>Matière</span>
                </div>
                <div className="font-bold text-coffeeBean dark:text-white truncate">
                  {item.material}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-desertSand/20 dark:bg-darkSurface/60 border border-tan/25 text-xs space-y-1 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-coffeeBean/70 dark:text-tan font-semibold">
                  <Palette className="w-3.5 h-3.5 text-toffeeBrown dark:text-tan" />
                  <span>Finitions</span>
                </div>
                <div className="font-bold text-coffeeBean dark:text-white truncate">
                  {item.color}
                </div>
              </div>
            </div>
          </div>

          {/* Action Box */}
          <div className="p-5 rounded-2xl bg-coffeeBean text-almondCream border border-tan/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-almondCream/80">Quantité:</span>
                <div className="flex items-center gap-2 bg-darkBg/60 rounded-xl px-2 py-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="text-tan hover:text-white font-bold text-sm px-1"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(Math.max(1, maxAllowed), q + 1))}
                    className="text-tan hover:text-white font-bold text-sm px-1"
                  >
                    +
                  </button>
                </div>
              </div>

              <span className="text-xs text-tan font-bold">
                {maxAllowed > 0 ? `${maxAllowed} dispo pour vos dates` : "Complet pour ces dates"}
              </span>
            </div>

            <button
              onClick={() => addToDraft(item, quantity)}
              disabled={maxAllowed <= 0}
              className="w-full py-3.5 rounded-xl bg-toffeeBrown text-white font-bold text-xs uppercase tracking-wider hover:bg-white hover:text-coffeeBean transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 apple-press"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {maxAllowed > 0
                  ? `Ajouter ${quantity} unité(s) à ma demande de devis`
                  : "Indisponible pour les dates sélectionnées"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Availability Calendar */}
      <section className="space-y-4 pt-4 border-t border-tan/30">
        <div className="space-y-1">
          <span className="text-xs font-bold text-toffeeBrown dark:text-tan uppercase tracking-widest">
            Disponibilité en direct
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-coffeeBean dark:text-white">
            Calendrier d'inventaire synchronisé pour {item.title}
          </h2>
        </div>

        <AvailabilityCalendar
          item={item}
          startDate={startDate}
          endDate={endDate}
          onSelectDates={setDates}
        />
      </section>

      {/* Related Furniture Grid */}
      {relatedItems.length > 0 && (
        <section className="space-y-5 pt-6 border-t border-tan/30">
          <h3 className="text-xl sm:text-2xl font-extrabold font-serif text-coffeeBean dark:text-white">
            Pièces architecturales complémentaires
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {relatedItems.map((rel) => (
              <Link
                key={rel.id}
                href={`/catalogue/${rel.slug}`}
                className="apple-card rounded-2xl p-3.5 block hover:border-toffeeBrown transition-colors group"
              >
                <div className="relative h-40 w-full rounded-xl overflow-hidden mb-3 bg-desertSand/20">
                  <Image
                    src={rel.images[0]}
                    alt={rel.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h4 className="font-bold font-serif text-sm text-coffeeBean dark:text-white group-hover:text-toffeeBrown transition-colors">
                  {rel.title}
                </h4>
                <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-1">
                  {formatPrice(rel.rental_price, rel.rental_price_tnd)} / jour
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
