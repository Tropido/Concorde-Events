import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Currency } from "@/lib/types";
import type { Language } from "@/lib/i18n/translations";
import { dayNumber } from "@/lib/dates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const locale = (lang: Language) => (lang === "ar" ? "ar-TN" : "fr-FR");

/** Intl knows each currency's minor unit (EUR 2 decimals, TND 3). */
export function formatMoney(amount: number, currency: Currency, lang: Language) {
  return new Intl.NumberFormat(locale(lang), { style: "currency", currency }).format(amount);
}

/** Formats a date-only ISO string without shifting it through the local time zone. */
export function formatDay(iso: string, lang: Language, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const n = dayNumber(iso);
  if (n === null) return iso;
  return new Intl.DateTimeFormat(locale(lang), { ...opts, timeZone: "UTC" }).format(new Date(n * 86_400_000));
}

export function formatDateTime(isoTimestamp: string, lang: Language) {
  return new Intl.DateTimeFormat(locale(lang), { dateStyle: "medium", timeStyle: "short" }).format(new Date(isoTimestamp));
}
