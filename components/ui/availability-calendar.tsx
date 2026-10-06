"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { dayNumber, fromDayNumber, todayIn } from "@/lib/dates";
import { useAvailability } from "@/components/catalogue/use-availability";
import { cn } from "@/lib/utils/formatters";

interface Props {
  productId: string;
  /** Usable stock in this country; days at <= 25% of it are shown as limited. */
  stock: number;
  startDate: string;
  endDate: string;
  onSelectDates: (start: string, end: string) => void;
}

const MONDAY = dayNumber("2024-01-01")!; // a known Monday, for weekday labels

function monthInfo(year: number, month: number) {
  const first = Date.UTC(year, month, 1) / 86_400_000;
  const last = Date.UTC(year, month + 1, 0) / 86_400_000;
  // getUTCDay: Sunday = 0. Weeks start on Monday in France and Tunisia.
  const offset = (new Date(first * 86_400_000).getUTCDay() + 6) % 7;
  return { first, last, offset };
}

export function AvailabilityCalendar({ productId, stock, startDate, endDate, onSelectDates }: Props) {
  const { t, language, country } = useApp();
  const locale = language === "ar" ? "ar-TN" : "fr-FR";
  const today = dayNumber(todayIn(country))!;
  const initial = new Date((dayNumber(startDate) ?? today) * 86_400_000);
  const [view, setView] = useState({ y: initial.getUTCFullYear(), m: initial.getUTCMonth() });
  const { first, last, offset } = monthInfo(view.y, view.m);
  const { days, error } = useAvailability(productId, country, fromDayNumber(first), fromDayNumber(last));

  const s = dayNumber(startDate);
  const e = dayNumber(endDate);
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date((MONDAY + i) * 86_400_000))),
    [locale],
  );
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(first * 86_400_000),
  );

  const pick = (n: number) => {
    const iso = fromDayNumber(n);
    // First click (or a click before the current start) starts a new range; the next sets the end.
    if (s === null || e !== null || n <= s) onSelectDates(iso, "");
    else onSelectDates(startDate, iso);
  };

  const shift = (delta: number) =>
    setView(({ y, m }) => ({ y: m + delta < 0 ? y - 1 : m + delta > 11 ? y + 1 : y, m: (m + delta + 12) % 12 }));

  return (
    <div className="space-y-4 text-coffeeBean dark:text-almondCream">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => shift(-1)} aria-label={t.calendar.prev}
          className="p-2 rounded-xl bg-desertSand/30 dark:bg-darkSurface hover:bg-desertSand/50 apple-press">
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        <span className="text-sm font-bold capitalize" aria-live="polite">{monthLabel}</span>
        <button type="button" onClick={() => shift(1)} aria-label={t.calendar.next}
          className="p-2 rounded-xl bg-desertSand/30 dark:bg-darkSurface hover:bg-desertSand/50 apple-press">
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>

      <p className="text-[11px] text-coffeeBean/70 dark:text-almondCream/70">{t.calendar.hint}</p>
      {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{t.common.errorGeneric}</p>}

      <div className="grid grid-cols-7 gap-1.5 text-center" role="grid">
        {weekdays.map((w) => (
          <div key={w} className="text-[10px] font-bold uppercase text-coffeeBean/60 dark:text-tan/70 py-1">{w}</div>
        ))}
        {Array.from({ length: offset }, (_, i) => <div key={`pad-${i}`} aria-hidden />)}
        {Array.from({ length: last - first + 1 }, (_, i) => {
          const n = first + i;
          const iso = fromDayNumber(n);
          const avail = days?.get(iso);
          const past = n < today;
          const full = avail === 0;
          const limited = avail !== undefined && avail > 0 && avail <= Math.ceil(stock * 0.25);
          const selected = s !== null && (n === s || (e !== null && n >= s && n <= e));
          return (
            <button
              key={iso}
              type="button"
              disabled={past || full}
              onClick={() => pick(n)}
              aria-pressed={selected}
              aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(new Date(n * 86_400_000))}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border min-h-[48px] text-xs transition-colors",
                "border-tan/30 bg-tan/10 hover:border-toffeeBrown disabled:cursor-not-allowed",
                limited && "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200",
                full && "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300",
                past && "opacity-35",
                selected && "bg-toffeeBrown border-tan text-white font-bold",
              )}
            >
              <span className="font-bold">{new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(new Date(n * 86_400_000))}</span>
              <span className="text-[9px] opacity-80">{past || avail === undefined ? " " : avail}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[11px]">
        <Legend className="bg-tan/40" label={t.scheduling.legendAvailable} />
        <Legend className="bg-amber-500" label={t.scheduling.legendLimited} />
        <Legend className="bg-rose-500" label={t.scheduling.legendFull} />
        <Legend className="bg-toffeeBrown" label={t.scheduling.legendSelected} />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("w-2.5 h-2.5 rounded-full", className)} aria-hidden />
      {label}
    </span>
  );
}
