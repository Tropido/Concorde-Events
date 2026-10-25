"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Plus, X } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { cn, formatTND } from "@/lib/utils/formatters";
import type { Price, Tone } from "@/lib/types";

export const ease = [0.22, 1, 0.36, 1] as const;

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} dir="ltr">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#2b1d13" />
        <path d="M21.5 11.2a7 7 0 1 0 0 9.6" fill="none" stroke="#ddb892" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="21.6" cy="16" r="1.7" fill="#ddb892" />
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[15px] font-bold tracking-[-0.02em]">Concorde</span>
          <span className="block font-mono text-[9px] uppercase tracking-[0.28em] text-ink/50">Events</span>
        </span>
      )}
    </span>
  );
}

/** Nightly TND price. Approved pros also see the public rate struck through. */
export function PriceTag({ price, className, size = "md", showUnit = true }: { price: Price | null; className?: string; size?: "sm" | "md" | "lg"; showUnit?: boolean }) {
  const { t, language } = useApp();
  if (!price) return <span className={cn("text-sm text-ink/60", className)}>{t.common.priceOnRequest}</span>;
  const big = size === "lg" ? "text-3xl" : size === "md" ? "text-base" : "text-sm";
  const saving = price.tier === "pro" && price.retail !== null && price.retail > price.amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn("font-semibold tabular-nums tracking-tight", big)}>{formatTND(price.amount, language)}</span>
      {showUnit && <span className="text-xs text-ink/50">{t.common.perNight}</span>}
      {saving && <s className="text-xs text-ink/40 tabular-nums">{formatTND(price.retail!, language)}</s>}
    </span>
  );
}

/** A product picture on its tinted tile; a quiet monogram when no photo exists yet. */
export function ProductTile({ src, alt, tone, sizes, priority, className, children }: {
  src?: string | null; alt: string; tone: Tone; sizes: string; priority?: boolean; className?: string; children?: React.ReactNode;
}) {
  return (
    <div className={cn("grain relative overflow-hidden", `tone-${tone}`, className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority}
          className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.04]" />
      ) : (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center display text-[7rem] text-ink/[0.07] select-none">
          {alt.trim().charAt(0)}
        </span>
      )}
      {children}
    </div>
  );
}

/** Slowly turning circular label, the one ornamental motion of the storefront. */
export function RotatingBadge({ text, className, children }: { text: string; className?: string; children?: React.ReactNode }) {
  const id = useId().replace(/:/g, "");
  return (
    <span className={cn("relative inline-flex h-20 w-20 items-center justify-center", className)} aria-hidden>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-spin-slow">
        <defs>
          <path id={id} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text className="fill-ink/70 font-mono" fontSize="9.2" letterSpacing="2.6">
          <textPath href={`#${id}`}>{text}</textPath>
        </text>
      </svg>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-card">{children}</span>
    </span>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max, label, size = "md" }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number | null; label: string; size?: "sm" | "md";
}) {
  const { t } = useApp();
  const h = size === "sm" ? "h-8" : "h-12";
  return (
    <div className={cn("inline-flex items-center rounded-full bg-paper ring-1 ring-line", h)} role="group" aria-label={label}>
      <button type="button" aria-label={t.booking.decrease} disabled={value <= min} onClick={() => onChange(value - 1)}
        className={cn("flex items-center justify-center rounded-full disabled:opacity-30", size === "sm" ? "w-8" : "w-11")}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label={t.booking.increase} disabled={max != null && value >= max} onClick={() => onChange(value + 1)}
        className={cn("flex items-center justify-center rounded-full disabled:opacity-30", size === "sm" ? "w-8" : "w-11")}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Segmented pills whose active background slides between options. */
export function PillTabs<T extends string>({ options, value, onChange, label, className }: {
  options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string; className?: string;
}) {
  const id = useId();
  return (
    <div role="tablist" aria-label={label} className={cn("no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-card p-1 ring-1 ring-line", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={active} onClick={() => onChange(o.value)}
            className={cn("relative whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors", active ? "text-card" : "text-ink/65 hover:text-ink")}>
            {active && <motion.span layoutId={`pill-${id}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative">{o.label}{o.count !== undefined && <span className="ms-1.5 opacity-60 tabular-nums">{o.count}</span>}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Side sheet (bag, filters). Escape and the backdrop close it; focus moves inside. */
export function Drawer({ open, onClose, labelledBy, children, side = "end" }: {
  open: boolean; onClose: () => void; labelledBy: string; children: React.ReactNode; side?: "end" | "start";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { language } = useApp();
  const fromEnd = side === "end";
  const offscreen = (fromEnd ? 1 : -1) * (language === "ar" ? -1 : 1) * 110;

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      before?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}
            initial={{ x: `${offscreen}%` }} animate={{ x: 0 }} exit={{ x: `${offscreen}%` }} transition={{ duration: 0.45, ease }}
            className={cn("absolute top-0 bottom-0 flex w-full max-w-[440px] flex-col bg-card shadow-float outline-none sm:top-2 sm:bottom-2 sm:rounded-[1.75rem]",
              fromEnd ? "end-0 sm:end-2" : "start-0 sm:start-2")}>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-full bg-paper hover:bg-line">
      <X className="h-4 w-4" />
    </button>
  );
}

/** Bottom-centre confirmations ("added to your request"). */
export function Toaster() {
  const { toasts, dismissToast } = useApp();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-3">
      <AnimatePresence>
        {toasts.map((x) => (
          <motion.div key={x.id} layout initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.35, ease }}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-ink py-1.5 ps-1.5 pe-1.5 text-card shadow-float">
            {x.image ? (
              <span className={cn("relative h-9 w-9 shrink-0 overflow-hidden rounded-full", `tone-${x.tone ?? "almond"}`)}>
                <Image src={x.image} alt="" fill sizes="36px" className="object-cover" />
              </span>
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ok text-card"><Check className="h-4 w-4" /></span>
            )}
            <span className="text-sm">{x.title}</span>
            {x.action && (x.action.href ? (
              <Link href={x.action.href} onClick={() => dismissToast(x.id)} className="rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-ink">{x.action.label}</Link>
            ) : (
              <button type="button" onClick={() => { x.action?.onClick?.(); dismissToast(x.id); }} className="rounded-full bg-card px-3.5 py-2 text-xs font-semibold text-ink">{x.action.label}</button>
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      {text && <p className="max-w-md text-sm text-ink/60 text-pretty">{text}</p>}
      {action}
    </div>
  );
}
