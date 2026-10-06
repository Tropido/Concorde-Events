import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Language } from "@/lib/i18n/translations";
import type { CMSContent } from "@/lib/types";

/** Published homepage content for one language ({} when nothing has been published). */
export async function getCms(locale: Language): Promise<CMSContent> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cms_content").select("content").eq("locale", locale).maybeSingle();
  if (error) throw error;
  return (data?.content as CMSContent) ?? {};
}
