import { notFound } from "next/navigation";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProductForm, type ProductFormValue } from "../product-form";
import type { Country } from "@/lib/types";

const EMPTY: ProductFormValue = {
  slug: "", title_fr: "", title_ar: null, description_fr: "", description_ar: null, category_id: null,
  width: null, height: null, depth: null, dimension_unit: "cm", color: null, material: null, tags: [],
  minimum_nights: 1, featured: false, images: [], stock: {}, prices: {},
};

// /admin/inventory/new and /admin/inventory/<uuid> share this page.
export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ t, prefs }, viewer] = await Promise.all([getT(), requireStaff()]);
  const db = await createClient();
  const { data: cats } = await db.from("categories").select("id, name_fr, name_ar").order("display_order");
  const categories = (cats ?? []).map((c) => ({ id: c.id, name: (prefs.lang === "ar" && c.name_ar) || c.name_fr }));

  let initial = EMPTY;
  if (id !== "new") {
    if (!z.string().uuid().safeParse(id).success) notFound();
    const { data: p, error } = await db.from("products")
      .select("*, product_stock(country, quantity_owned), product_prices(country, tier, amount)")
      .eq("id", id).maybeSingle();
    if (error) throw error;
    if (!p) notFound();
    const stock: ProductFormValue["stock"] = {};
    for (const s of p.product_stock as { country: Country; quantity_owned: number }[]) stock[s.country] = { owned: s.quantity_owned };
    const prices: NonNullable<ProductFormValue["prices"]> = {};
    for (const pr of p.product_prices as { country: Country; tier: "retail" | "pro"; amount: number }[]) {
      prices[pr.country] = { retail: null, pro: null, ...prices[pr.country], [pr.tier]: Number(pr.amount) };
    }
    initial = {
      id: p.id, slug: p.slug, title_fr: p.title_fr, title_ar: p.title_ar, description_fr: p.description_fr,
      description_ar: p.description_ar, category_id: p.category_id, width: p.width && Number(p.width),
      height: p.height && Number(p.height), depth: p.depth && Number(p.depth), dimension_unit: p.dimension_unit,
      color: p.color, material: p.material, tags: p.tags ?? [], minimum_nights: p.minimum_nights,
      featured: p.featured, images: p.images ?? [], stock, prices,
    };
  }

  return (
    <>
      <h1 className="text-2xl font-serif font-bold">{id === "new" ? t.admin.inventory.newProduct : `${t.admin.inventory.edit} · ${initial.title_fr}`}</h1>
      <ProductForm initial={initial} categories={categories} canEditPrices={viewer.role === "admin"} />
    </>
  );
}
