import "server-only";
import { createClient } from "@/lib/supabase/server";
import { discounted } from "@/lib/pro";
import { isApprovedPro, type CatalogueProduct, type Category, type ImageFit, type Price, type ProductBadge, type Tone, type Viewer } from "@/lib/types";
import { localized, localizedList } from "@/lib/i18n/localize";
import type { Language } from "@/lib/i18n/translations";
import type { Prefs } from "@/lib/prefs";

const PRODUCT_COLUMNS =
  "id, slug, sku, category_id, title_fr, title_en, title_ar, description_fr, description_en, description_ar, width, height, depth, dimension_unit, " +
  "color, color_hex, material, finish, style, weight_kg, seating_capacity, setup_minutes, deposit_amount, " +
  "highlights_fr, highlights_en, highlights_ar, care_fr, care_en, care_ar, tags, badge, tone, minimum_nights, featured, images, image_fit, " +
  "categories(id, slug, name_fr, name_en, name_ar)";

type ProductRow = {
  id: string; slug: string; sku: string | null; category_id: string | null;
  title_fr: string; title_en: string | null; title_ar: string | null; description_fr: string; description_en: string | null; description_ar: string | null;
  width: number | null; height: number | null; depth: number | null; dimension_unit: "cm" | "m";
  color: string | null; color_hex: string | null; material: string | null; finish: string | null; style: string | null;
  weight_kg: number | null; seating_capacity: number | null; setup_minutes: number | null; deposit_amount: number | null;
  highlights_fr: string[]; highlights_en: string[]; highlights_ar: string[]; care_fr: string | null; care_en: string | null; care_ar: string | null;
  tags: string[]; badge: ProductBadge | null; tone: Tone; minimum_nights: number; featured: boolean; images: string[]; image_fit: ImageFit | null;
  categories: { id: string; slug: string; name_fr: string; name_en: string | null; name_ar: string | null } | null;
};

const num = (v: number | string | null) => (v === null ? null : Number(v));

function mapProduct(row: ProductRow, prefs: Prefs, stock: number, price: Price | null): CatalogueProduct {
  // A translated title decides the language of the whole card, so text never mixes languages.
  const lang: Language = localized(row, "title", prefs.lang) !== row.title_fr ? prefs.lang : "fr";
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    title: localized(row, "title", lang) ?? row.title_fr,
    description: localized(row, "description", lang) ?? row.description_fr,
    lang,
    category: row.categories
      ? { id: row.categories.id, slug: row.categories.slug, name: localized(row.categories, "name", prefs.lang) ?? row.categories.name_fr }
      : null,
    dimensions: { width: num(row.width), height: num(row.height), depth: num(row.depth), unit: row.dimension_unit },
    color: row.color,
    colorHex: row.color_hex,
    material: row.material,
    finish: row.finish,
    style: row.style,
    weightKg: num(row.weight_kg),
    seatingCapacity: row.seating_capacity,
    setupMinutes: row.setup_minutes,
    deposit: num(row.deposit_amount),
    highlights: localizedList(row, "highlights", lang),
    care: localized(row, "care", lang),
    tags: row.tags ?? [],
    badge: row.badge,
    tone: row.tone ?? "almond",
    minimumNights: row.minimum_nights,
    featured: row.featured,
    images: row.images ?? [],
    imageFit: row.image_fit ?? "contain",
    stock,
    price,
  };
}

/** Active products stocked in Tunisia, priced in TND for this viewer. */
export async function getCatalogue(prefs: Prefs, viewer: Viewer | null, opts: { includeUnstocked?: boolean } = {}) {
  const supabase = await createClient();
  const [products, stock, prices, categories] = await Promise.all([
    supabase.from("products").select(PRODUCT_COLUMNS).eq("status", "active").order("featured", { ascending: false }).order("title_fr"),
    supabase.from("product_stock").select("product_id, quantity_owned, quantity_maintenance").eq("country", "TN"),
    // RLS only returns pro rows to approved professionals and staff.
    supabase.from("product_prices").select("product_id, tier, amount").eq("country", "TN"),
    supabase.from("categories").select("id, slug, name_fr, name_en, name_ar, description_fr, description_en, description_ar, image_url, display_order").order("display_order"),
  ]);
  for (const r of [products, stock, prices, categories]) if (r.error) throw r.error;

  const stockBy = new Map<string, number>((stock.data ?? []).map((s) => [s.product_id, s.quantity_owned - s.quantity_maintenance]));
  const pro = isApprovedPro(viewer);
  const discount = pro ? viewer!.pro?.discount ?? 0 : 0;
  const rates = new Map<string, { retail?: number; pro?: number }>();
  for (const p of prices.data ?? []) {
    const r = rates.get(p.product_id) ?? {};
    r[p.tier as "retail" | "pro"] = Number(p.amount);
    rates.set(p.product_id, r);
  }
  const priceFor = (id: string): Price | null => {
    const r = rates.get(id);
    if (!r) return null;
    // Same rule as public.submit_request: pros pay their pro rate (or retail if none) minus their discount.
    if (pro && (r.pro ?? r.retail) !== undefined) {
      return { amount: discounted(r.pro ?? r.retail!, discount), retail: r.retail ?? null, tier: "pro", discount };
    }
    return r.retail !== undefined ? { amount: r.retail, retail: r.retail, tier: "retail", discount: 0 } : null;
  };

  const items = ((products.data ?? []) as unknown as ProductRow[])
    .filter((p) => opts.includeUnstocked || stockBy.has(p.id))
    .map((p) => mapProduct(p, prefs, stockBy.get(p.id) ?? 0, priceFor(p.id)));

  const counts = new Map<string, number>();
  for (const p of items) if (p.category && p.stock > 0) counts.set(p.category.id, (counts.get(p.category.id) ?? 0) + 1);
  const cats: Category[] = (categories.data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: localized(c, "name", prefs.lang) ?? c.name_fr,
    description: localized(c, "description", prefs.lang),
    imageUrl: c.image_url,
    count: counts.get(c.id) ?? 0,
  }));

  return { products: items, categories: cats };
}
