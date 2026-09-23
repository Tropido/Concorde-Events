"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/lib/context/app-context";
import { formatCurrency } from "@/lib/utils/formatters";
import { calculateRangeAvailability } from "@/lib/utils/availability";
import { X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function QuickPreviewModal() {
  const {
    activePreviewItem,
    setActivePreviewItem,
    currentUser,
    addToDraft,
    startDate,
    endDate,
    t,
  } = useApp();

  const [quantity, setQuantity] = useState(1);

  if (!activePreviewItem) return null;

  const avail = calculateRangeAvailability(activePreviewItem, startDate, endDate);
  const maxAllowed = avail.minAvailableInPeriod;

  return (
    <AnimatePresence>
      <div
        onClick={() => setActivePreviewItem(null)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="bg-[#fcf8f4] dark:bg-[#1a1511] text-coffeeBean dark:text-almondCream border border-tan/40 dark:border-fadedCopper/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative overflow-hidden"
        >
          <button
            onClick={() => setActivePreviewItem(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-desertSand/40 dark:bg-darkSurface text-coffeeBean dark:text-almondCream hover:bg-desertSand/70 transition-colors apple-press"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="relative h-64 rounded-2xl overflow-hidden bg-desertSand/30 border border-tan/40 shadow-inner">
              <Image
                src={activePreviewItem.images[0]}
                alt={activePreviewItem.title}
                fill
                className="object-cover"
              />
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-toffeeBrown dark:text-tan bg-tan/20 px-2.5 py-1 rounded-full border border-tan/30">
                {activePreviewItem.category_name}
              </span>

              <h3 className="text-2xl font-bold font-serif">
                {activePreviewItem.title}
              </h3>

              <p className="text-xs text-coffeeBean/75 dark:text-almondCream/75 line-clamp-3">
                {activePreviewItem.description}
              </p>

              <div className="pt-1">
                {currentUser.role === "professional" ||
                currentUser.role === "admin" ||
                currentUser.role === "super_admin" ||
                currentUser.role === "manager" ? (
                  <div className="text-lg font-bold text-toffeeBrown dark:text-tan font-serif">
                    {formatCurrency(activePreviewItem.professional_price)}{" "}
                    <span className="text-xs font-normal text-coffeeBean/70 dark:text-almondCream/60">/ jour</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-toffeeBrown dark:text-tan font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sur devis personnalisé</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{t.scheduling.unitsAvailable}: {maxAllowed}</span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    addToDraft(activePreviewItem, quantity);
                    setActivePreviewItem(null);
                  }}
                  disabled={maxAllowed <= 0}
                  className="flex-1 py-3 rounded-full bg-toffeeBrown text-white font-extrabold text-xs uppercase tracking-wider hover:bg-coffeeBean transition-colors disabled:opacity-50 shadow-md apple-press"
                >
                  {t.showcase.addToDraft}
                </button>

                <Link
                  href={`/catalogue/${activePreviewItem.slug}`}
                  onClick={() => setActivePreviewItem(null)}
                  className="px-4 py-3 rounded-full bg-desertSand/40 text-coffeeBean dark:text-almondCream font-bold text-xs hover:bg-desertSand/70 transition-colors border border-tan/30 apple-press"
                >
                  Détails
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
