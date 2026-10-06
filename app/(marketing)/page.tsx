import { getPrefs } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { getCms } from "@/lib/cms";
import { HomeView } from "./home-view";

export default async function HomePage() {
  const [prefs, viewer] = await Promise.all([getPrefs(), getViewer()]);
  const [{ products, categories }, cms] = await Promise.all([getCatalogue(prefs, viewer), getCms(prefs.lang)]);
  return <HomeView products={products} categories={categories.filter((c) => c.count > 0)} cms={cms} />;
}
