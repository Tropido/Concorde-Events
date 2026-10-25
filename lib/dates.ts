import type { Country } from "@/lib/types";

// Date-only rental arithmetic. Strings are ISO "YYYY-MM-DD"; days are counted on the
// UTC calendar so DST changes can never add or lose a night. Mirrors the SQL checks in
// public.submit_request, which remain authoritative.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** Day number since the epoch, or null for anything that is not a real calendar date. */
export function dayNumber(iso: string | null | undefined): number | null {
  if (!iso || !ISO_DAY.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) return null;
  return t / DAY_MS;
}

export function fromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const n = dayNumber(iso);
  if (n === null) throw new Error(`Invalid date: ${iso}`);
  return fromDayNumber(n + days);
}

/** Billable nights: calendar-date difference (15 -> 18 is 3 nights). */
export function nights(start: string, end: string): number | null {
  const s = dayNumber(start);
  const e = dayNumber(end);
  return s === null || e === null ? null : e - s;
}

/** Today in the business's local time zone for that stock country. */
export function todayIn(country: Country, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: country === "TN" ? "Africa/Tunis" : "Europe/Paris",
  }).format(now);
}

export const MAX_NIGHTS = 365;

export type RangeProblem = "missing" | "invalid" | "same_day" | "reversed" | "past" | "too_short" | "too_long";

export function validateRange(
  start: string,
  end: string,
  { today, minimumNights = 1 }: { today: string; minimumNights?: number },
): RangeProblem | null {
  if (!start || !end) return "missing";
  const s = dayNumber(start);
  const e = dayNumber(end);
  const t = dayNumber(today);
  if (s === null || e === null || t === null) return "invalid";
  if (e === s) return "same_day";
  if (e < s) return "reversed";
  if (s < t) return "past";
  if (e - s < minimumNights) return "too_short";
  if (e - s > MAX_NIGHTS) return "too_long";
  return null;
}
