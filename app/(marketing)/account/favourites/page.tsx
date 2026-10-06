import Link from "next/link";
import { getPrefs } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { requireViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/catalogue/product-card";

export default async function FavouritesPage() {
  const [prefs, viewer] = await Promise.all([getPrefs(), requireViewer("/account/favourites")]);
  const t = translations[prefs.lang];
  const supabase = await createClient();
  const [{ data: favs, error }, { products }] = await Promise.all([
    supabase.from("favourites").select("product_id").eq("profile_id", viewer.id),
    getCatalogue(prefs, viewer, { includeUnstocked: true }),
  ]);
  if (error) throw error;
  const ids = new Set((favs ?? []).map((f) => f.product_id));
  const items = products.filter((p) => ids.has(p.id));

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm">
        {t.account.noFavourites}{" "}
        <Link href="/catalogue" className="underline font-bold">{t.nav.catalogue}</Link>
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
