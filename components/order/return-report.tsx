"use client";

import { useState } from "react";
import Image from "next/image";
import { useApp } from "@/lib/context/app-context";
import { Dialog } from "@/components/ui/dialog";
import { CloseButton } from "@/components/ui/kit";
import { localized } from "@/lib/i18n/localize";
import { formatDateTime, formatTND } from "@/lib/utils/formatters";
import type { InspectionView } from "@/lib/types";
import { breakdownOf } from "@/lib/order";

function Photos({ urls }: { urls: string[] }) {
  const { t } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap gap-1.5">
      {urls.map((u) => (
        <button key={u} type="button" onClick={() => setOpen(u)} aria-label={t.order.inspection.viewPhoto} className="relative block h-12 w-12 overflow-hidden rounded-lg bg-paper">
          <Image src={u} alt="" fill unoptimized sizes="48px" className="object-cover" />
        </button>
      ))}
      <Dialog open={!!open} onClose={() => setOpen(null)} labelledBy="photo-title" className="max-w-3xl">
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 id="photo-title" className="text-sm font-semibold">{t.order.inspection.viewPhoto}</h2>
            <CloseButton onClick={() => setOpen(null)} label={t.common.close} />
          </div>
          {open && <span className="relative block aspect-[4/3] w-full"><Image src={open} alt="" fill unoptimized sizes="768px" className="rounded-xl object-contain" /></span>}
        </div>
      </Dialog>
    </div>
  );
}

/** "Bilan du retour": line by line, condition totals, fees and what became of the caution.
 *  Staff pass the notes in; for clients the view simply doesn't contain them. */
export function ReturnReport({ report, notes, invoiceHref }: { report: InspectionView; notes?: Record<string, string | null>; invoiceHref?: string }) {
  const { t, language } = useApp();
  const a = t.order.inspection;
  const money = (v: number) => formatTND(v, language);
  const heads = ["sent", "received", "ok", "minor", "damaged", "broken", "missing"] as const;
  return (
    <section className="card space-y-4 p-6" aria-labelledby="report-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="report-title" className="text-lg font-semibold tracking-tight">{a.reportTitle}</h2>
        <p className="text-xs text-ink/55">{formatDateTime(report.closed_at, language)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="label py-2 text-start">{t.order.piecesTitle}</th>
              {heads.map((h) => <th key={h} scope="col" className="label px-1.5 py-2 text-end">{a.heads[h]}</th>)}
              <th scope="col" className="label py-2 text-end">{a.feesHead}</th>
            </tr>
          </thead>
          <tbody>
            {report.lines.map((l) => (
              <tr key={l.line_id} className="border-b border-line align-top last:border-0">
                <td className="py-2.5 pe-3">
                  <p className="font-medium">{localized(l, "title", language)}</p>
                  <p className="text-xs text-ink/60">{breakdownOf(l, a.chips).join(" · ")}</p>
                  {l.fee_reason && <p className="text-xs text-ink/60">{l.fee_reason}</p>}
                  {notes?.[l.line_id] && <p className="mt-1 rounded-lg bg-paper px-2 py-1 text-xs">{notes[l.line_id]}</p>}
                  {l.photos.length > 0 && <div className="mt-1.5"><Photos urls={l.photos} /></div>}
                </td>
                {heads.map((h) => <td key={h} className="px-1.5 py-2.5 text-end tabular-nums">{l[h]}</td>)}
                <td className="whitespace-nowrap py-2.5 text-end tabular-nums">{l.fee ? money(l.fee) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={heads.length + 1} className="pt-3 text-end font-medium">{a.totalFees}</th>
              <td className="whitespace-nowrap pt-3 text-end font-semibold tabular-nums">{money(report.total_fees)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-ink/70">{a.cautionResult(report.caution_outcome, money(report.caution_refunded), money(report.caution_retained))}</p>
        {invoiceHref && <a href={invoiceHref} className="btn-light btn-sm">{a.finalInvoice}</a>}
      </div>
    </section>
  );
}
