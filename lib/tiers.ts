import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mapTier, TIER_COLUMNS, type TierRow } from "@/lib/pro";
import type { Language } from "@/lib/i18n/translations";
import type { ProTier } from "@/lib/types";

/** Public programme tiers (readable by everyone), ordered from entry level up. */
export async function getTiers(lang: Language): Promise<ProTier[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pro_tiers").select(TIER_COLUMNS).order("rank");
  if (error) throw error;
  return ((data ?? []) as TierRow[]).map((r) => mapTier(r, lang));
}
