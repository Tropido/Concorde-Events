import { ProductTile } from "@/components/ui/kit";
import { cn } from "@/lib/utils/formatters";
import type { ImageFit, Tone } from "@/lib/types";

export function ProductThumb({ src, tone, fit, title, className }: { src?: string | null; tone: Tone; fit?: ImageFit; title: string; className?: string }) {
  return <ProductTile src={src} alt="" tone={tone} fit={fit} sizes="48px" className={cn("h-12 w-12 shrink-0 rounded-xl [&>span]:text-2xl", className)}>{!src && <span className="sr-only">{title}</span>}</ProductTile>;
}
