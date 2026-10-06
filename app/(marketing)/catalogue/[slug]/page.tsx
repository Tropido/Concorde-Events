import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPrefs } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/server";
import { ProductDetail } from "./product-detail";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const [prefs, viewer] = await Promise.all([getPrefs(), getViewer()]);
  const { products, fx } = await getCatalogue(prefs, viewer, { includeUnstocked: true });
  // Exact match only: an unknown slug is a 404, never a different product.
  const product = products.find((p) => p.slug === slug);
  return { product, products, fx, viewer };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product } = await load((await params).slug);
  return product ? { title: `${product.title} | Concorde Events`, description: product.description.slice(0, 160) } : {};
}

export default async function ProductPage({ params }: Props) {
  const { product, products, fx, viewer } = await load((await params).slug);
  if (!product) notFound();

  let favourite = false;
  if (viewer) {
    const supabase = await createClient();
    const { data } = await supabase.from("favourites").select("product_id").eq("product_id", product.id).maybeSingle();
    favourite = !!data;
  }
  const related = products
    .filter((p) => p.id !== product.id && p.stock > 0 && p.category?.id === product.category?.id)
    .slice(0, 3);

  return <ProductDetail product={product} related={related} fx={fx} favourite={favourite} />;
}
