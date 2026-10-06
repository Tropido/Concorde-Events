import "server-only";
import { cookies } from "next/headers";
import { PREF_COOKIES, parseCountry, parseCurrency, parseLang, type Prefs } from "@/lib/prefs";
import { translations } from "./translations";

export async function getPrefs(): Promise<Prefs> {
  const jar = await cookies();
  const lang = parseLang(jar.get(PREF_COOKIES.lang)?.value);
  const country = parseCountry(jar.get(PREF_COOKIES.country)?.value);
  return {
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    country,
    currency: parseCurrency(jar.get(PREF_COOKIES.currency)?.value, country),
  };
}

export async function getT() {
  const prefs = await getPrefs();
  return { t: translations[prefs.lang], prefs };
}
