import "server-only";
import { cookies } from "next/headers";
import { PREF_COOKIES, parseLang, parseTheme, type Prefs } from "@/lib/prefs";
import { translations } from "./translations";

export async function getPrefs(): Promise<Prefs> {
  const jar = await cookies();
  const lang = parseLang(jar.get(PREF_COOKIES.lang)?.value);
  return { lang, dir: lang === "ar" ? "rtl" : "ltr", theme: parseTheme(jar.get(PREF_COOKIES.theme)?.value) };
}

export async function getT() {
  const prefs = await getPrefs();
  return { t: translations[prefs.lang], prefs };
}
