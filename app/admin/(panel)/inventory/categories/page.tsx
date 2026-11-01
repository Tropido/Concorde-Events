import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { CategoriesManager } from "./categories-manager";
import type { CategoryInput } from "@/lib/actions/admin";

export default async function AdminCategoriesPage() {
  const [{ t }] = await Promise.all([getT(), requireStaff()]);
  const db = await createClient();
  const { data, error } = await db.from("categories").select("id, slug, name_fr, name_en, name_ar, icon, tone, image_url").order("display_order").order("name_fr");
  if (error) throw error;
  return (
    <>
      <PageHeader title={t.admin.inventory.categoriesTitle} subtitle={t.admin.inventory.categoriesHint} />
      <CategoriesManager categories={(data ?? []) as (CategoryInput & { id: string })[]} />
    </>
  );
}
