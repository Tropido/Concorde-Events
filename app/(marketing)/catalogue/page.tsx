import type { Metadata } from "next";
import { getPrefs } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { getViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { isApprovedPro } from "@/lib/types";
import { CatalogueView } from "./catalogue-view";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getPrefs();
  return { title: translations[lang].catalogue.title };
}

export default async function CataloguePage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const [prefs, viewer, { cat }] = await Promise.all([getPrefs(), getViewer(), searchParams]);
  const { products, categories } = await getCatalogue(prefs, viewer);
  const t = translations[prefs.lang];
  const pro = isApprovedPro(viewer) && viewer?.pro;

  return (
    <div className="shell space-y-8 pt-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h1 className="display text-[clamp(2.75rem,7vw,5.5rem)]">{t.catalogue.title}</h1>
          <p className="max-w-xl text-[15px] text-ink/60 text-pretty">{t.catalogue.subtitle}</p>
        </div>
        {pro && (
          <p className="pill">
            <span className="h-2 w-2 rounded-full" style={{ background: pro.tier.color }} aria-hidden />
            {t.pro.pricesShown(pro.tier.name, pro.discount)}
          </p>
        )}
      </header>
      <CatalogueView products={products} categories={categories} initialCategory={cat} />
    </div>
  );
}
