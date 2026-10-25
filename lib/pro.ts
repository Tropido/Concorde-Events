import type { Language } from "@/lib/i18n/translations";
import type { ProStatus, ProTier } from "@/lib/types";

export type TierRow = {
  code: string; rank: number; name_fr: string; name_ar: string | null; min_points: number;
  discount_percent: number | string; benefits_fr: string[]; benefits_ar: string[]; color: string;
};
export type ProAccountRow = {
  tier_code: string; tier_locked: boolean; points: number; custom_discount_percent: number | string | null; extra_benefits: string[];
};

export const TIER_COLUMNS = "code, rank, name_fr, name_ar, min_points, discount_percent, benefits_fr, benefits_ar, color";

export function mapTier(row: TierRow, lang: Language): ProTier {
  const ar = lang === "ar";
  return {
    code: row.code,
    rank: row.rank,
    name: (ar && row.name_ar) || row.name_fr,
    minPoints: row.min_points,
    discount: Number(row.discount_percent),
    benefits: ar && row.benefits_ar.length ? row.benefits_ar : row.benefits_fr,
    color: row.color,
  };
}

export function buildProStatus(account: ProAccountRow, tierRows: TierRow[], lang: Language): ProStatus | null {
  const tiers = tierRows.map((r) => mapTier(r, lang)).sort((a, b) => a.rank - b.rank);
  const tier = tiers.find((t) => t.code === account.tier_code);
  if (!tier) return null;
  const next = tiers.find((t) => t.rank > tier.rank) ?? null;
  // Benefits accumulate: a tier includes everything from the tiers below it.
  const inherited = tiers.filter((t) => t.rank <= tier.rank).flatMap((t) => t.benefits);
  return {
    tier,
    next,
    points: account.points,
    discount: account.custom_discount_percent !== null ? Number(account.custom_discount_percent) : tier.discount,
    benefits: [...new Set([...inherited, ...account.extra_benefits])],
    locked: account.tier_locked,
  };
}

/** Pro rate minus discount, rounded to millimes like public.submit_request. */
export const discounted = (amount: number, discount: number) => Math.round(amount * (1 - discount / 100) * 1000) / 1000;
