import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTiers } from "@/lib/tiers";
import { ProductForm, type ProductFormValue } from "../product-form";

const EMPTY: ProductFormValue = {
  slug: "", sku: null, title_fr: "", title_ar: null, description_fr: "", description_ar: null, category_id: null,
  badge: null, tone: "almond", color: null, color_hex: null, material: null, finish: null, style: null,
  width: null, height: null, depth: null, dimension_unit: "cm", weight_kg: null, seating_capacity: null, setup_minutes: null,
  deposit_amount: null, highlights_fr: [], highlights_ar: [], care_fr: null, care_ar: null, tags: [],
  minimum_nights: 1, featured: false, status: "active", images: [], owned: 0, prices: { retail: null, pro: null },
  internal: { purchase_cost: null, purchase_date: null, supplier: null, storage_location: null, condition: null, internal_notes: null },
};

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

// /admin/inventory/new and /admin/inventory/<uuid> share this page.
export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ t, prefs }, viewer] = await Promise.all([getT(), requireStaff()]);
  const db = await createClient();
  const [{ data: cats }, tiers] = await Promise.all([
    db.from("categories").select("id, name_fr, name_ar").order("display_order"),
    getTiers(prefs.lang),
  ]);
  const categories = (cats ?? []).map((c) => ({ id: c.id, name: (prefs.lang === "ar" && c.name_ar) || c.name_fr }));

  let initial = EMPTY;
  if (id !== "new") {
    if (!z.string().uuid().safeParse(id).success) notFound();
    const { data: p, error } = await db.from("products")
      .select("*, product_stock(country, quantity_owned), product_prices(country, tier, amount), product_internal(*)")
      .eq("id", id).maybeSingle();
    if (error) throw error;
    if (!p) notFound();
    const stock = (p.product_stock as { country: string; quantity_owned: number }[]).find((s) => s.country === "TN");
    const price = (tier: string) => n((p.product_prices as { country: string; tier: string; amount: number }[]).find((x) => x.country === "TN" && x.tier === tier)?.amount);
    const rawInternal = p.product_internal as unknown;
    const internal = ((Array.isArray(rawInternal) ? rawInternal[0] : rawInternal) ?? {}) as Record<string, unknown>;
    initial = {
      id: p.id, slug: p.slug, sku: p.sku, title_fr: p.title_fr, title_ar: p.title_ar, description_fr: p.description_fr, description_ar: p.description_ar,
      category_id: p.category_id, badge: p.badge, tone: p.tone, color: p.color, color_hex: p.color_hex, material: p.material, finish: p.finish, style: p.style,
      width: n(p.width), height: n(p.height), depth: n(p.depth), dimension_unit: p.dimension_unit, weight_kg: n(p.weight_kg),
      seating_capacity: p.seating_capacity, setup_minutes: p.setup_minutes, deposit_amount: n(p.deposit_amount),
      highlights_fr: p.highlights_fr ?? [], highlights_ar: p.highlights_ar ?? [], care_fr: p.care_fr, care_ar: p.care_ar, tags: p.tags ?? [],
      minimum_nights: p.minimum_nights, featured: p.featured, status: p.status, images: p.images ?? [], owned: stock?.quantity_owned ?? 0,
      prices: { retail: price("retail"), pro: price("pro") },
      internal: {
        purchase_cost: n(internal.purchase_cost), purchase_date: (internal.purchase_date as string) ?? null, supplier: (internal.supplier as string) ?? null,
        storage_location: (internal.storage_location as string) ?? null, condition: (internal.condition as ProductFormValue["internal"]["condition"]) ?? null,
        internal_notes: (internal.internal_notes as string) ?? null,
      },
    };
  }

  return (
    <>
      <header className="card flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
        <div className="space-y-1">
          <Link href="/admin/inventory" className="inline-flex items-center gap-1 text-xs text-ink/55 hover:text-ink"><ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />{t.admin.nav.inventory}</Link>
          <h1 className="display text-3xl sm:text-4xl">{id === "new" ? t.admin.inventory.newProduct : initial.title_fr}</h1>
        </div>
        {initial.id && initial.status === "active" && <Link href={`/catalogue/${initial.slug}`} target="_blank" className="btn-light btn-sm"><ExternalLink className="h-4 w-4" aria-hidden />{t.admin.inventory.viewOnSite}</Link>}
      </header>
      <ProductForm initial={initial} categories={categories} canEditPrices={viewer.role === "admin"} tiers={tiers} />
    </>
  );
}
