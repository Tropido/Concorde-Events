import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Language } from "@/lib/i18n/translations";
import type { CMSContent } from "@/lib/types";

/** Published homepage content for one language ({} when nothing has been published). */
export async function getCms(locale: Language): Promise<CMSContent> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cms_content").select("locale, content").in("locale", [locale, "fr"]);
  if (error) throw error;
  const by = (l: Language) => data?.find((r) => r.locale === l)?.content as CMSContent | undefined;
  const content = by(locale) ?? {};
  return { ...content, hero_image: content.hero_image || by("fr")?.hero_image || null };
}
