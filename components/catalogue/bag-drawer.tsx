"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarRange, Trash2 } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { nights } from "@/lib/dates";
import { cn, formatDay, formatTND } from "@/lib/utils/formatters";
import { CloseButton, Drawer, QuantityStepper } from "@/components/ui/kit";
import type { DraftLine } from "@/lib/types";

export function draftEstimate(draft: DraftLine[]) {
  let total = 0;
  for (const l of draft) {
    const n = nights(l.startDate, l.endDate);
    if (l.unitPrice === null || n === null) return null;
    total += l.unitPrice * l.quantity * n;
  }
  return total;
}

export function DraftLineRow({ line: l, compact = false }: { line: DraftLine; compact?: boolean }) {
  const { t, language, updateDraftQuantity, removeFromDraft } = useApp();
  const n = nights(l.startDate, l.endDate) ?? 0;
  return (
    <li className="flex gap-3 py-3">
      <Link href={`/catalogue/${l.slug}`} className={cn("relative shrink-0 overflow-hidden rounded-2xl", `tone-${l.tone ?? "almond"}`, compact ? "h-16 w-16" : "h-20 w-20")}>
        {l.image && <Image src={l.image} alt="" fill sizes="80px" className="object-cover" />}
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/catalogue/${l.slug}`} className="truncate text-sm font-semibold hover:underline">{l.title}</Link>
          {l.unitPrice !== null && <span className="shrink-0 text-sm tabular-nums">{formatTND(l.unitPrice * l.quantity * n, language)}</span>}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-ink/55">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          <bdi>{formatDay(l.startDate, language, { day: "numeric", month: "short" })}</bdi> – <bdi>{formatDay(l.endDate, language, { day: "numeric", month: "short" })}</bdi> · {t.common.nights(n)}
        </p>
        {!compact && (
          <div className="flex items-center justify-between pt-1">
            <QuantityStepper size="sm" value={l.quantity} max={l.maxQuantity} label={t.booking.quantity} onChange={(q) => updateDraftQuantity(l.id, q)} />
            <button type="button" onClick={() => removeFromDraft(l.id)} aria-label={`${t.bag.remove}: ${l.title}`} className="flex h-8 w-8 items-center justify-center rounded-full text-ink/45 hover:bg-paper hover:text-bad">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
        {compact && <p className="text-xs text-ink/55">× {l.quantity}</p>}
      </div>
    </li>
  );
}

export function BagDrawer() {
  const { t, language, draft, bagOpen, setBagOpen } = useApp();
  const total = draftEstimate(draft);
  const close = () => setBagOpen(false);
  return (
    <Drawer open={bagOpen} onClose={close} labelledBy="bag-title">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 id="bag-title" className="text-xl font-semibold tracking-tight">{t.bag.title}</h2>
          <p className="text-xs text-ink/55">{t.bag.pieces(draft.reduce((n, l) => n + l.quantity, 0))}</p>
        </div>
        <CloseButton onClick={close} label={t.common.close} />
      </div>
      {draft.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-lg font-semibold tracking-tight">{t.bag.emptyTitle}</p>
          <p className="text-sm text-ink/60">{t.bag.emptyText}</p>
          <Link href="/catalogue" onClick={close} className="btn-ink">{t.bag.browse}</Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
            {draft.map((l) => <DraftLineRow key={l.id} line={l} />)}
          </ul>
          <div className="space-y-3 border-t border-line p-5">
            {total !== null && (
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink/60">{t.bag.estimate}</span>
                <span className="text-xl font-semibold tabular-nums">{formatTND(total, language)}</span>
              </div>
            )}
            <p className="text-xs text-ink/50">{t.bag.estimateNote}</p>
            <Link href="/demande" onClick={close} className="btn-ink w-full">{t.bag.checkout}</Link>
          </div>
        </>
      )}
    </Drawer>
  );
}
