import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Language } from "@/lib/i18n/translations";
import { dayNumber } from "@/lib/dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Latin digits in both languages (the norm for prices in Tunisia).
const locale = (lang: Language) => (lang === "ar" ? "ar-TN-u-nu-latn" : "fr-FR");

/** Dinars with up to 3 decimals (millimes), shown only when present: "1 250 DT", "87,500 DT". */
export function formatTND(amount: number, lang: Language) {
  // Tunisian convention: whole dinars without decimals ("1 250 DT"), otherwise the three millime digits ("7 064,850 DT").
  const digits = Number.isInteger(Math.round(amount * 1000) / 1000) ? 0 : 3;
  const n = new Intl.NumberFormat(locale(lang), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(amount);
  return lang === "ar" ? `${n} د.ت` : `${n} DT`;
}

/** @deprecated kept for older call sites; every amount in the system is TND. */
export function formatMoney(amount: number, _currency: string, lang: Language) {
  return formatTND(amount, lang);
}

export function formatNumber(n: number, lang: Language, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale(lang), opts).format(n);
}

/** Formats a date-only ISO string without shifting it through the local time zone. */
export function formatDay(iso: string, lang: Language, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const n = dayNumber(iso);
  if (n === null) return iso;
  return new Intl.DateTimeFormat(locale(lang), { ...opts, timeZone: "UTC" }).format(new Date(n * 86_400_000));
}

export function formatDateTime(isoTimestamp: string, lang: Language) {
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Tunis" }).format(new Date(isoTimestamp));
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "·";
}
