import { getPrefs } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { getCms } from "@/lib/cms";
import { getTiers } from "@/lib/tiers";
import { HomeView } from "./home-view";

export default async function HomePage() {
  const [prefs, viewer] = await Promise.all([getPrefs(), getViewer()]);
  const [{ products, categories }, cms, tiers] = await Promise.all([getCatalogue(prefs, viewer), getCms(prefs.lang), getTiers(prefs.lang)]);
  return <HomeView products={products} categories={categories} cms={cms} tiers={tiers} />;
}
