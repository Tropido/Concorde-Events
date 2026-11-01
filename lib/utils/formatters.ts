import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Language } from "@/lib/i18n/translations";
import { dayNumber } from "@/lib/dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Latin digits in every language (the norm for prices in Tunisia).
const LOCALES: Record<Language, string> = { fr: "fr-TN-u-nu-latn", en: "en-GB", ar: "ar-TN-u-nu-latn" };
export const localeOf = (lang: Language) => LOCALES[lang];

/** Dinars with up to 3 decimals (millimes), shown only when present: "1 250 DT", "87,500 DT", "1,250 DT" in English. */
export function formatTND(amount: number, lang: Language) {
  // Tunisian convention: whole dinars without decimals ("1 250 DT"), otherwise the three millime digits ("7 064,850 DT").
  const digits = Number.isInteger(Math.round(amount * 1000) / 1000) ? 0 : 3;
  const n = new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(amount);
  return lang === "ar" ? `${n} د.ت` : `${n} DT`;
}

/** @deprecated kept for older call sites; every amount in the system is TND. */
export function formatMoney(amount: number, _currency: string, lang: Language) {
  return formatTND(amount, lang);
}

export function formatNumber(n: number, lang: Language, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(localeOf(lang), opts).format(n);
}

/** Formats a date-only ISO string without shifting it through the local time zone. */
export function formatDay(iso: string, lang: Language, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const n = dayNumber(iso);
  if (n === null) return iso;
  return new Intl.DateTimeFormat(localeOf(lang), { ...opts, timeZone: "UTC" }).format(new Date(n * 86_400_000));
}

export function formatDateTime(isoTimestamp: string, lang: Language) {
  return new Intl.DateTimeFormat(localeOf(lang), { dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone: "Africa/Tunis" }).format(new Date(isoTimestamp));
}

/** A tier swatch for dark surfaces: tier colours too dark to see there fall back to tan. */
export function tierSwatch(hex: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return "rgb(var(--tan))";
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 70 ? "rgb(var(--tan))" : hex;
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "·";
}
