"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FurnitureItem } from "@/lib/types";
import { AvailabilityCalendar } from "@/components/ui/availability-calendar";
import { calculateRangeAvailability } from "@/lib/utils/availability";
import { useApp } from "@/lib/context/app-context";
import { X, Calendar, ShoppingBag, CheckCircle2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DateSelectionModalProps {
  item: FurnitureItem | null;
  currentUserRole: string;
  onClose: () => void;
  onConfirmAdd: (
    item: FurnitureItem,
    startDate: string,
    endDate: string,
    quantity: number
  ) => void;
}

export function DateSelectionModal({
  item,
  currentUserRole,
  onClose,
  onConfirmAdd,
}: DateSelectionModalProps) {
  const { t, language, formatPrice, currencySymbol } = useApp();
  const [itemStartDate, setItemStartDate] = useState<string>("2026-08-15");
  const [itemEndDate, setItemEndDate] = useState<string>("2026-08-18");
  const [quantity, setQuantity] = useState<number>(1);

  if (!item) return null;

  const avail = calculateRangeAvailability(item, itemStartDate, itemEndDate);
  const maxAvailable = avail.minAvailableInPeriod;

  const daysCount = Math.max(
    1,
    Math.ceil(
      (new Date(itemEndDate).getTime() - new Date(itemStartDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const handleAdd = () => {
    onConfirmAdd(item, itemStartDate, itemEndDate, quantity);
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-hidden"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-[#fcf8f4] dark:bg-[#1a1511] text-coffeeBean dark:text-almondCream border border-tan/40 dark:border-fadedCopper/40 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden my-auto"
        >
          {/* Compact Landscape Header */}
          <div className="px-5 py-3.5 border-b border-tan/30 dark:border-fadedCopper/30 flex items-center justify-between bg-desertSand/20 dark:bg-darkSurface/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-desertSand/40 border border-tan/40 flex-shrink-0 shadow-sm">
                <Image src={item.images[0]} alt={item.title} fill className="object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-toffeeBrown dark:text-tan uppercase tracking-widest bg-tan/20 px-2 py-0.5 rounded-full border border-tan/30">
                    {item.category_name || "Mobilier"}
                  </span>
                  <span className="text-[10px] text-coffeeBean/70 dark:text-almondCream/70 font-semibold">
                    Ref: {item.slug}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold font-serif truncate mt-0.5 text-coffeeBean dark:text-white">
                  {item.title}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-desertSand/40 dark:bg-darkSurface text-coffeeBean dark:text-almondCream hover:bg-desertSand/70 transition-colors apple-press flex-shrink-0 ml-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Compact 2-Column Landscape Body (Less Height, More Width) */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Quick Parameters & Summary (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Date Pickers */}
              <div className="p-3.5 rounded-xl bg-desertSand/20 dark:bg-darkSurface border border-tan/30 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-toffeeBrown dark:text-tan block">
                  Sélection des Dates de l'Événement
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-coffeeBean/80 dark:text-tan uppercase mb-1">
                      Début
                    </label>
                    <input
                      type="date"
                      value={itemStartDate}
                      onChange={(e) => setItemStartDate(e.target.value)}
                      className="w-full p-2 rounded-lg bg-white dark:bg-darkBg border border-tan/40 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-toffeeBrown"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-coffeeBean/80 dark:text-tan uppercase mb-1">
                      Fin
                    </label>
                    <input
                      type="date"
                      value={itemEndDate}
                      onChange={(e) => setItemEndDate(e.target.value)}
                      className="w-full p-2 rounded-lg bg-white dark:bg-darkBg border border-tan/40 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-toffeeBrown"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-tan/20">
                  <span className="text-coffeeBean/70 dark:text-almondCream/70">Durée:</span>
                  <strong className="text-toffeeBrown dark:text-tan">{daysCount} jour(s)</strong>
                </div>
              </div>

              {/* Quantity & Stock Check */}
              <div className="p-3.5 rounded-xl bg-desertSand/20 dark:bg-darkSurface border border-tan/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-coffeeBean dark:text-almondCream">
                    Quantité requise:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-darkBg border border-tan/40 text-xs font-bold text-coffeeBean dark:text-almondCream hover:bg-tan/20"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, maxAvailable)}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-12 p-1 rounded-lg bg-white dark:bg-darkBg border border-tan/40 text-center font-bold text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-darkBg border border-tan/40 text-xs font-bold text-coffeeBean dark:text-almondCream hover:bg-tan/20"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-tan/20">
                  <span className="text-coffeeBean/70 dark:text-almondCream/70">Disponibilité garantie:</span>
                  <span
                    className={`font-bold ${
                      maxAvailable > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"
                    }`}
                  >
                    {maxAvailable > 0 ? `${maxAvailable} unité(s) en stock` : "Complet pour ces dates"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-coffeeBean/70 dark:text-almondCream/70">Tarif unitaire:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {formatPrice(item.rental_price, item.rental_price_tnd)} / jour
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 rounded-xl bg-desertSand/40 text-coffeeBean dark:text-almondCream font-bold text-xs hover:bg-desertSand/60 transition-colors apple-press text-center"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  disabled={maxAvailable === 0}
                  onClick={handleAdd}
                  className={`flex-[2] py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 apple-press shadow-md ${
                    maxAvailable > 0
                      ? "bg-toffeeBrown hover:bg-coffeeBean text-white shadow-toffeeBrown/25"
                      : "bg-neutral-300 dark:bg-zinc-800 text-neutral-500 cursor-not-allowed"
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Confirmer la sélection</span>
                </button>
              </div>
            </div>

            {/* Right Column: Compact Calendar (lg:col-span-7) */}
            <div className="lg:col-span-7">
              <div className="bg-white/80 dark:bg-darkSurface/90 border border-tan/30 rounded-xl p-3 shadow-inner">
                <AvailabilityCalendar
                  item={item}
                  startDate={itemStartDate}
                  endDate={itemEndDate}
                  onSelectDates={(s, e) => {
                    setItemStartDate(s);
                    setItemEndDate(e);
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
