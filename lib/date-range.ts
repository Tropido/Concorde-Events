import { dayNumber, fromDayNumber, MAX_NIGHTS, type RangeProblem } from "@/lib/dates";

// Pure rules behind the date picker. They only add "what can be clicked" to lib/dates.ts;
// validateRange (and submit_request on the server) stay the authority on a whole range.

export interface Range {
  start: string;
  end: string;
}

/** Why a day can't be picked right now. RangeProblem keys reuse the existing messages. */
export type DayBlock = Extract<RangeProblem, "past" | "same_day" | "too_short" | "too_long"> | "full" | "unavailable";

export function monthGrid(year: number, month: number) {
  const first = Date.UTC(year, month, 1) / 86_400_000;
  const last = Date.UTC(year, month + 1, 0) / 86_400_000;
  // getUTCDay: Sunday = 0. Weeks start on Monday in Tunisia.
  const offset = (new Date(first * 86_400_000).getUTCDay() + 6) % 7;
  return { first, last, offset };
}

export function shiftMonth(view: { y: number; m: number }, delta: number) {
  const total = view.y * 12 + view.m + delta;
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
}

export function monthOf(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return { y, m: m - 1 };
}

/** Same day of the month `delta` months away, clamped to that month's length. */
export function addMonths(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const target = shiftMonth({ y, m: m - 1 }, delta);
  const { first, last } = monthGrid(target.y, target.m);
  return fromDayNumber(Math.min(first + d - 1, last));
}

/** First click sets the start, the second the end. A click on or before the start, or
 *  after a complete range, starts a new range. */
export function selectDay(range: Range, iso: string): Range {
  const s = dayNumber(range.start);
  const d = dayNumber(iso);
  if (d === null) return range;
  if (s === null || range.end || d <= s) return { start: iso, end: "" };
  return { start: range.start, end: iso };
}

export function dayBlock(
  iso: string,
  { range, today, minimumNights = 1, available }: { range: Range; today: string | null; minimumNights?: number; available?: Map<string, number> | null },
): DayBlock | null {
  const d = dayNumber(iso)!;
  const t = today ? dayNumber(today) : null;
  if (t !== null && d < t) return "past";
  if (available?.get(iso) === 0) return "full";
  const s = dayNumber(range.start);
  // Only the end of a range under construction has extra rules; earlier days restart it.
  if (s === null || range.end || d < s) return null;
  if (d === s) return "same_day";
  if (d - s < minimumNights) return "too_short";
  if (d - s > MAX_NIGHTS) return "too_long";
  // Stock is occupied from the start through the return day: one full day blocks the range.
  if (available) for (let n = s; n <= d; n++) if (available.get(fromDayNumber(n)) === 0) return "unavailable";
  return null;
}

/** The range to highlight: the chosen one, or start..hovered day while picking the end. */
export function visibleRange(range: Range, hover: string | null): { from: number; to: number } | null {
  const s = dayNumber(range.start);
  if (s === null) return null;
  const e = dayNumber(range.end) ?? (hover ? dayNumber(hover) : null);
  return { from: s, to: e !== null && e > s ? e : s };
}

/** Day offset for a key. Arrows follow what the reader sees, so they swap in RTL. */
export function keyStep(key: string, rtl: boolean): number | null {
  switch (key) {
    case "ArrowRight": return rtl ? -1 : 1;
    case "ArrowLeft": return rtl ? 1 : -1;
    case "ArrowDown": return 7;
    case "ArrowUp": return -7;
    default: return null;
  }
}
