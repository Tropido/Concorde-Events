import { getPrefs } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { getViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { CatalogueView } from "./catalogue-view";
import { DraftPanel } from "@/components/catalogue/draft-panel";

export default async function CataloguePage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const [prefs, viewer, { cat }] = await Promise.all([getPrefs(), getViewer(), searchParams]);
  const { products, categories, fx } = await getCatalogue(prefs, viewer);
  const t = translations[prefs.lang];

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <header className="space-y-3 text-center max-w-3xl mx-auto">
        <p className="text-xs font-bold text-toffeeBrown dark:text-tan uppercase tracking-widest">{t.catalogue.badge}</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold font-serif">{t.catalogue.title}</h1>
        <p className="text-sm text-coffeeBean/75 dark:text-almondCream/75">{t.catalogue.subtitle}</p>
      </header>
      <CatalogueView products={products} categories={categories} fx={fx} initialCategory={cat} />
      <DraftPanel products={products} />
    </div>
  );
}
