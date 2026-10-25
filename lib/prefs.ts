import type { Language } from "@/lib/i18n/translations";

// The only visitor preference is the language (French first, Arabic second). It lives in
// a cookie so the server renders the right language and direction on the first paint.
// Stock, prices and documents are always Tunisia / TND.
export const PREF_COOKIES = { lang: "ce_lang" } as const;

export const parseLang = (v?: string | null): Language => (v === "ar" ? "ar" : "fr");

export interface Prefs {
  lang: Language;
  dir: "ltr" | "rtl";
}

export function setPrefCookie(name: keyof typeof PREF_COOKIES, value: string) {
  document.cookie = `${PREF_COOKIES[name]}=${value}; path=/; max-age=31536000; samesite=lax`;
}
