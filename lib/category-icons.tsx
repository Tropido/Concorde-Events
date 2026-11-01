import { Armchair, Cake, Crown, Flame, Flower2, Gem, GlassWater, Heart, Lamp, LampCeiling, LampFloor, Martini, Rows3, Sofa, Sparkles, Square, Tent, TreePalm, UtensilsCrossed, Wine, type LucideIcon } from "lucide-react";

// Allowlist mirrored by the check constraint on public.categories.icon. Lucide has no candle
// in the installed version: Flame stands in for it.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Sofa, Armchair, Lamp, LampCeiling, LampFloor, Flower2, Wine, Martini, GlassWater, UtensilsCrossed,
  Sparkles, Crown, TreePalm, Tent, Square, Rows3, Gem, Flame, Heart, Cake,
};
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}
