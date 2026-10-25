import Image from "next/image";
import { cn } from "@/lib/utils/formatters";
import type { Tone } from "@/lib/types";

export function ProductThumb({ src, tone, title, className }: { src?: string | null; tone: Tone; title: string; className?: string }) {
  return (
    <span className={cn("relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-ink/30", `tone-${tone}`, className)}>
      {src ? <Image src={src} alt="" fill sizes="48px" className="object-cover" /> : title.charAt(0)}
    </span>
  );
}
