"use client";

import React, { useState } from "react";
import { FurnitureItem } from "@/lib/types";
import { calculateRangeAvailability } from "@/lib/utils/availability";
import { useApp } from "@/lib/context/app-context";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface AvailabilityCalendarProps {
  item: FurnitureItem;
  startDate: string;
  endDate: string;
  onSelectDates: (start: string, end: string) => void;
}

export function AvailabilityCalendar({
  item,
  startDate,
  endDate,
  onSelectDates,
}: AvailabilityCalendarProps) {
  const { t, language } = useApp();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2026, 7, 1)); // Default Aug 2026

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { minAvailableInPeriod, isAvailableForRange } = calculateRangeAvailability(
    item,
    startDate,
    endDate
  );

  const [tempStart, setTempStart] = useState<string | null>(null);

  const handleDateClick = (dateStr: string) => {
    if (!tempStart) {
      setTempStart(dateStr);
      onSelectDates(dateStr, dateStr);
    } else {
      if (isBefore(parseISO(dateStr), parseISO(tempStart))) {
        setTempStart(dateStr);
        onSelectDates(dateStr, dateStr);
      } else {
        onSelectDates(tempStart, dateStr);
        setTempStart(null);
      }
    }
  };

  const isSelectedRange = (dateStr: string) => {
    const d = parseISO(dateStr);
    const s = parseISO(startDate);
    const e = parseISO(endDate);
    return (isSameDay(d, s) || isSameDay(d, e) || (d > s && d < e));
  };

  const dayHeaders = language === "ar"
    ? ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]
    : ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="bg-[#fcf8f4]/90 dark:bg-[#1a1511]/90 backdrop-blur-xl border border-tan/40 dark:border-fadedCopper/40 p-6 rounded-3xl shadow-xl space-y-6 text-coffeeBean dark:text-almondCream">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 font-serif">
            <span>{t.scheduling.title}</span>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-tan/20 text-toffeeBrown dark:text-tan border border-tan/30">
              {t.scheduling.badge}
            </span>
          </h3>
          <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70 mt-1">
            {t.scheduling.totalOwned}: <strong className="text-coffeeBean dark:text-white">{item.quantity_owned}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(addDays(monthStart, -20))}
            className="p-2 rounded-xl bg-desertSand/30 dark:bg-darkSurface hover:bg-desertSand/50 transition-colors text-coffeeBean dark:text-almondCream apple-press"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs sm:text-sm font-bold min-w-[110px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(addDays(monthEnd, 5))}
            className="p-2 rounded-xl bg-desertSand/30 dark:bg-darkSurface hover:bg-desertSand/50 transition-colors text-coffeeBean dark:text-almondCream apple-press"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-desertSand/20 dark:bg-darkSurface text-xs border border-tan/25">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="font-medium text-[11px]">{t.scheduling.legendAvailable}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-toffeeBrown"></span>
          <span className="font-medium text-[11px]">{t.scheduling.legendSelected}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="font-medium text-[11px]">{t.scheduling.legendLimited}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span className="font-medium text-[11px]">Complet</span>
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {dayHeaders.map((day) => (
          <div key={day} className="text-[11px] font-bold text-coffeeBean/60 dark:text-tan/70 uppercase tracking-wider py-1">
            {day}
          </div>
        ))}

        {daysInMonth.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const calc = calculateRangeAvailability(item, dateStr, dateStr);
          const avail = calc.minAvailableInPeriod;
          const status = calc.dailyBreakdown[0]?.status;

          const isSelected = isSelectedRange(dateStr);

          let bgClass = "bg-tan/15 text-coffeeBean dark:text-almondCream border-tan/30 hover:border-toffeeBrown";
          if (status === "limited") {
            bgClass = "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 hover:border-amber-500";
          } else if (status === "fully_booked") {
            bgClass = "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30 cursor-not-allowed opacity-60";
          } else if (status === "unavailable") {
            bgClass = "bg-neutral-500/10 text-neutral-400 border-neutral-300 dark:border-zinc-700 cursor-not-allowed opacity-40";
          }

          if (isSelected) {
            bgClass = "bg-toffeeBrown text-white font-bold border-tan shadow-lg shadow-toffeeBrown/30 scale-105 z-10";
          }

          return (
            <motion.button
              key={dateStr}
              type="button"
              whileHover={{ scale: status !== "fully_booked" && status !== "unavailable" ? 1.06 : 1 }}
              onClick={() => status !== "fully_booked" && status !== "unavailable" && handleDateClick(dateStr)}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all min-h-[56px] apple-press ${bgClass}`}
            >
              <span className="text-xs font-bold">{format(day, "d")}</span>
              <span className="text-[9px] opacity-85">{avail > 0 ? `${avail}` : "—"}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Live Selection Summary Banner (Apple Glass Pill) */}
      <div className="p-4 rounded-2xl bg-coffeeBean text-almondCream dark:bg-darkSurface border border-fadedCopper/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-[11px] text-tan uppercase tracking-wider font-semibold">
            {t.scheduling.legendSelected} (
            {Math.max(1, Math.ceil((parseISO(endDate).getTime() - parseISO(startDate).getTime()) / (1000 * 60 * 60 * 24)))} {language === "ar" ? "أيام" : "Jours"})
          </div>
          <div className="text-sm font-bold text-white mt-0.5 font-serif">
            {format(parseISO(startDate), "d MMM yyyy")} — {format(parseISO(endDate), "d MMM yyyy")}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAvailableForRange ? (
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.scheduling.unitsAvailable}: {minAvailableInPeriod}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30">
              <XCircle className="w-4 h-4" />
              <span>Complet pour ces dates</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
