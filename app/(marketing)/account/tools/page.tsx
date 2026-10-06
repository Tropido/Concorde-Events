import { getPrefs } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { requireViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { isApprovedPro } from "@/lib/types";
import { MarginCalculator } from "./margin-calculator";

export default async function ProToolsPage() {
  const [prefs, viewer] = await Promise.all([getPrefs(), requireViewer("/account/tools")]);
  const t = translations[prefs.lang];
  if (!isApprovedPro(viewer)) return <p className="py-12 text-center text-sm">{t.account.proOnly}</p>;
  // Prices come from the database through RLS: pro rows only exist for approved pros.
  const { products } = await getCatalogue(prefs, viewer);
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl font-bold">{t.account.proToolsTitle}</h2>
        <p className="text-sm text-coffeeBean/70 dark:text-almondCream/70">{t.account.proToolsIntro}</p>
      </div>
      <MarginCalculator products={products.filter((p) => p.price?.tier === "pro" && p.price.amount !== null)} />
    </section>
  );
}
