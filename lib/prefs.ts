import type { Language } from "@/lib/i18n/translations";

// Visitor preferences: the language (French first, Arabic second) and the colour theme.
// They live in cookies so the server renders the right language, direction and theme on
// the first paint. Stock, prices and documents are always Tunisia / TND.
export const PREF_COOKIES = { lang: "ce_lang", theme: "ce_theme" } as const;

export type Theme = "light" | "dark" | "system";
export const THEMES: Theme[] = ["light", "dark", "system"];

export const parseLang = (v?: string | null): Language => (v === "ar" ? "ar" : "fr");
export const parseTheme = (v?: string | null): Theme => (v === "light" || v === "dark" ? v : "system");

export interface Prefs {
  lang: Language;
  dir: "ltr" | "rtl";
  theme: Theme;
}

export function setPrefCookie(name: keyof typeof PREF_COOKIES, value: string) {
  document.cookie = `${PREF_COOKIES[name]}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/** Puts the class on <html> for a choice; "system" follows the device setting. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

/** Runs in <head> before paint: resolves "system" (the server can't know it) and follows
 *  device changes while the choice stays "system". */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");var a=function(){if(d.dataset.theme==="system")d.classList.toggle("dark",m.matches)};a();m.addEventListener("change",a)}catch(e){}})();`;
