"use client";

import { fromDayNumber, dayNumber } from "@/lib/dates";
import { monthGrid, type DayBlock } from "@/lib/date-range";
import { cn } from "@/lib/utils/formatters";

const DAY = 86_400_000;
const MONDAY = dayNumber("2024-01-01")!; // a known Monday, for weekday labels

export const fmt = (locale: string, n: number, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(new Date(n * DAY));

export interface MonthGridProps {
  year: number;
  month: number;
  locale: string;
  today: number | null;
  /** Start/end of the chosen (or previewed) range, as day numbers. */
  shown: { from: number; to: number } | null;
  start: number | null;
  end: number | null;
  focusDay: string | null;
  block: (iso: string) => DayBlock | null;
  /** Per-day units free (product pickers only); days at <= 25% of stock read as limited. */
  available?: Map<string, number> | null;
  stock?: number;
  label: (iso: string, block: DayBlock | null, limited: boolean) => string;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
  onFocusDay: (iso: string) => void;
  onKey: (e: React.KeyboardEvent<HTMLButtonElement>, iso: string) => void;
}

/** One month as an ARIA grid: Monday-first weeks, a continuous band over the range with
 *  rounded caps, and roving focus (only the focused day is in the tab order). */
export function MonthGrid(p: MonthGridProps) {
  const { first, last, offset } = monthGrid(p.year, p.month);
  const weekdays = Array.from({ length: 7 }, (_, i) => fmt(p.locale, MONDAY + i, { weekday: "short" }));
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: last - first + 1 }, (_, i) => first + i)];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <div role="grid" aria-label={fmt(p.locale, first, { month: "long", year: "numeric" })} className="w-full select-none" onPointerLeave={() => p.onHover(null)}>
      <div role="row" className="grid grid-cols-7">
        {weekdays.map((w) => <span key={w} role="columnheader" className="py-1.5 text-center font-mono text-[10px] uppercase text-ink/50">{w}</span>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} role="row" className="grid grid-cols-7">
          {week.map((n, di) => {
            if (n === null) return <span key={`b${di}`} role="gridcell" aria-hidden />;
            const iso = fromDayNumber(n);
            const blocked = p.block(iso);
            const avail = p.available?.get(iso);
            const limited = avail !== undefined && avail > 0 && p.stock !== undefined && avail <= Math.ceil(p.stock * 0.25);
            const inBand = p.shown !== null && n >= p.shown.from && n <= p.shown.to && p.shown.to > p.shown.from;
            const cap = n === p.start || n === p.end;
            return (
              <span key={iso} role="gridcell" aria-selected={cap || inBand} className={cn("relative flex justify-center py-0.5",
                inBand && "bg-ink/[0.08]", inBand && n === p.shown!.from && "rounded-s-full", inBand && n === p.shown!.to && "rounded-e-full")}>
                <button type="button" data-day={iso} tabIndex={iso === p.focusDay ? 0 : -1}
                  aria-disabled={blocked ? true : undefined} aria-label={p.label(iso, blocked, limited)}
                  onClick={() => !blocked && p.onPick(iso)} onPointerEnter={() => p.onHover(iso)}
                  onFocus={() => { p.onFocusDay(iso); p.onHover(iso); }} onKeyDown={(e) => p.onKey(e, iso)}
                  className={cn("relative flex h-11 w-full max-w-11 flex-col items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                    "focus-visible:outline-offset-0",
                    blocked ? "cursor-not-allowed text-ink/30" : "hover:ring-1 hover:ring-ink/30",
                    (blocked === "full" || blocked === "unavailable") && "line-through",
                    !blocked && limited && !cap && "text-warn",
                    n === p.today && !cap && "font-semibold underline decoration-toffeeBrown decoration-2 underline-offset-4",
                    cap && "bg-ink font-semibold text-card hover:ring-0")}>
                  {fmt(p.locale, n, { day: "numeric" })}
                  {p.available && avail !== undefined && !blocked && (
                    <span className={cn("text-[9px] leading-none opacity-60", cap && "opacity-80")}>{avail}</span>
                  )}
                </button>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", className)} aria-hidden />
      {label}
    </span>
  );
}
