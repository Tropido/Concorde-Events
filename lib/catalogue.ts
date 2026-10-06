import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isApprovedPro, type CatalogueProduct, type Category, type Currency, type FxInfo, type Price, type Viewer } from "@/lib/types";
import type { Prefs } from "@/lib/prefs";

const PRODUCT_COLUMNS =
  "id, slug, category_id, title_fr, title_ar, description_fr, description_ar, width, height, depth, dimension_unit, color, material, tags, minimum_nights, featured, images, categories(id, slug, name_fr, name_ar)";

type ProductRow = {
  id: string; slug: string; category_id: string | null;
  title_fr: string; title_ar: string | null; description_fr: string; description_ar: string | null;
  width: number | null; height: number | null; depth: number | null; dimension_unit: "cm" | "m";
  color: string | null; material: string | null; tags: string[]; minimum_nights: number; featured: boolean; images: string[];
  categories: { id: string; slug: string; name_fr: string; name_ar: string | null } | null;
};
type PriceRow = {
  product_id: string; tier: "retail" | "pro"; amount: number; currency: Currency;
  amount_eur: number | null; amount_tnd: number | null;
};

function toPrice(row: PriceRow, display: Currency): Price {
  return {
    amount: Number(display === "EUR" ? row.amount_eur : row.amount_tnd) || null,
    currency: display,
    sourceAmount: Number(row.amount),
    sourceCurrency: row.currency,
    tier: row.tier,
  };
}

function mapProduct(row: ProductRow, prefs: Prefs, stock: number, price: Price | null): CatalogueProduct {
  const ar = prefs.lang === "ar" && !!row.title_ar;
  return {
    id: row.id,
    slug: row.slug,
    title: ar ? row.title_ar! : row.title_fr,
    description: ar ? row.description_ar ?? row.description_fr : row.description_fr,
    lang: ar ? "ar" : "fr",
    category: row.categories
      ? { id: row.categories.id, slug: row.categories.slug, name: (prefs.lang === "ar" && row.categories.name_ar) || row.categories.name_fr }
      : null,
    dimensions: { width: row.width, height: row.height, depth: row.depth, unit: row.dimension_unit },
    color: row.color,
    material: row.material,
    tags: row.tags ?? [],
    minimumNights: row.minimum_nights,
    featured: row.featured,
    images: row.images ?? [],
    stock,
    price,
  };
}

/** Active products stocked in the visitor's country, priced for this viewer's tier. */
export async function getCatalogue(prefs: Prefs, viewer: Viewer | null, opts: { includeUnstocked?: boolean } = {}) {
  const supabase = await createClient();
  const productQuery = supabase.from("products").select(PRODUCT_COLUMNS).eq("status", "active")
    .order("featured", { ascending: false }).order("title_fr");

  const [products, stock, prices, categories, rate] = await Promise.all([
    productQuery,
    supabase.from("product_stock").select("product_id, quantity_owned, quantity_maintenance").eq("country", prefs.country),
    supabase.from("catalogue_prices").select("product_id, tier, amount, currency, amount_eur, amount_tnd").eq("country", prefs.country),
    supabase.from("categories").select("id, slug, name_fr, name_ar, description_fr, description_ar, image_url, display_order").order("display_order"),
    supabase.from("current_fx").select("rate, source, rate_time").maybeSingle(),
  ]);
  for (const r of [products, stock, prices, categories, rate]) if (r.error) throw r.error;

  const stockBy = new Map<string, number>(
    (stock.data ?? []).map((s) => [s.product_id, s.quantity_owned - s.quantity_maintenance]),
  );
  const tier = isApprovedPro(viewer) ? "pro" : "retail";
  const priceBy = new Map<string, PriceRow>();
  for (const p of (prices.data ?? []) as PriceRow[]) {
    // Approved pros get their pro rate; everyone else (and pros without one) the retail rate.
    if (p.tier === tier || (p.tier === "retail" && !priceBy.has(p.product_id))) priceBy.set(p.product_id, p);
  }

  const items = ((products.data ?? []) as unknown as ProductRow[])
    .filter((p) => opts.includeUnstocked || stockBy.has(p.id))
    .map((p) => {
      const row = priceBy.get(p.id);
      return mapProduct(p, prefs, stockBy.get(p.id) ?? 0, row ? toPrice(row, prefs.currency) : null);
    });

  const fx: FxInfo | null = rate.data
    ? { rate: Number(rate.data.rate), source: rate.data.source, rateTime: rate.data.rate_time }
    : null;

  const counts = new Map<string, number>();
  for (const p of items) if (p.category && p.stock > 0) counts.set(p.category.id, (counts.get(p.category.id) ?? 0) + 1);
  const cats: Category[] = (categories.data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: (prefs.lang === "ar" && c.name_ar) || c.name_fr,
    description: (prefs.lang === "ar" && c.description_ar) || c.description_fr,
    imageUrl: c.image_url,
    count: counts.get(c.id) ?? 0,
  }));

  return { products: items, categories: cats, fx };
}
