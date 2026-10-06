import type { Country, Currency } from "@/lib/types";
import type { Language } from "@/lib/i18n/translations";

// Visitor preferences live in cookies so the server renders the right language,
// direction, stock country and currency on the first paint.
export const PREF_COOKIES = { lang: "ce_lang", country: "ce_country", currency: "ce_currency" } as const;

export const parseLang = (v?: string | null): Language => (v === "ar" ? "ar" : "fr");
export const parseCountry = (v?: string | null): Country => (v === "TN" ? "TN" : "FR");
export const currencyOf = (c: Country): Currency => (c === "TN" ? "TND" : "EUR");
export const parseCurrency = (v: string | null | undefined, country: Country): Currency =>
  v === "EUR" || v === "TND" ? v : currencyOf(country);

export interface Prefs {
  lang: Language;
  dir: "ltr" | "rtl";
  country: Country;
  currency: Currency;
}

export function setPrefCookie(name: keyof typeof PREF_COOKIES, value: string) {
  document.cookie = `${PREF_COOKIES[name]}=${value}; path=/; max-age=31536000; samesite=lax`;
}
