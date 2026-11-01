"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { markTtn } from "@/lib/actions/orders";
import type { AdminResult } from "@/lib/actions/run";
import { ResultText, btnPrimary } from "@/components/admin/ui";
import { cn, formatDay, formatTND } from "@/lib/utils/formatters";
import type { TtnStatus } from "@/lib/i18n/order-types";
import type { InvoiceType } from "@/lib/invoicing/types";
import type { PaymentStatus } from "@/lib/types";

export type InvoiceListRow = {
  id: string; type: InvoiceType; number: string; issued_at: string; due_at: string | null; ht: number; tva: number; ttc: number; stamp: number; total_due: number;
  ttn_status: TtnStatus; ttn_reference: string | null; request_id: string;
  rental_requests: { reference: string; customer_name: string; company_name: string | null; billing_tax_id: string | null; payment_status: PaymentStatus } | null;
  invoice_rates: { rate: number; ht: number; tva: number }[];
};

const ttnTone: Record<TtnStatus, string> = { not_sent: "bg-warn-soft text-warn", sent: "bg-tone-sand text-ink", accepted: "bg-ok-soft text-ok", rejected: "bg-bad-soft text-bad" };

export function TtnTable({ rows }: { rows: InvoiceListRow[] }) {
  const { t, language } = useApp();
  const a = t.order.invoicesPage;
  const money = (v: number) => formatTND(v, language);
  const [picked, setPicked] = useState<string[]>([]);
  const [ref, setRef] = useState("");
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const all = picked.length === rows.length;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="w-10 px-4 py-3 ps-6"><input type="checkbox" aria-label={a.selectAll} checked={all} onChange={() => setPicked(all ? [] : rows.map((r) => r.id))} className="h-4 w-4 accent-ink" /></th>
            {[a.number, a.client, a.date].map((h) => <th key={h} scope="col" className="label px-3 py-3 text-start">{h}</th>)}
            {[a.ht, a.tva, a.ttc].map((h) => <th key={h} scope="col" className="label px-3 py-3 text-end">{h}</th>)}
            <th scope="col" className="label px-3 py-3 text-start">{a.ttn}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper/60">
              <td className="px-4 py-3 ps-6"><input type="checkbox" aria-label={r.number} checked={picked.includes(r.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, r.id] : picked.filter((x) => x !== r.id))} className="h-4 w-4 accent-ink" /></td>
              <td className="px-3 py-3">
                <Link href={`/admin/requests/${r.request_id}`} className="font-mono text-xs font-medium hover:underline"><bdi>{r.number}</bdi></Link>
                <p className="text-[11px] text-ink/50">{t.order.invoiceTypes[r.type]}</p>
              </td>
              <td className="px-3 py-3"><p className="font-medium">{r.rental_requests?.company_name ?? r.rental_requests?.customer_name}</p><p className="font-mono text-[11px] text-ink/50"><bdi>{r.rental_requests?.reference}</bdi></p></td>
              <td className="whitespace-nowrap px-3 py-3 text-xs">{formatDay(r.issued_at.slice(0, 10), language)}</td>
              <td className="px-3 py-3 text-end tabular-nums">{money(r.ht)}</td>
              <td className="px-3 py-3 text-end tabular-nums">{money(r.tva)}</td>
              <td className="px-3 py-3 text-end font-medium tabular-nums">{money(r.ttc)}</td>
              <td className="px-3 py-3"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", ttnTone[r.ttn_status])}>{a.ttnStatus[r.ttn_status]}</span>{r.ttn_reference && <span className="ms-1.5 font-mono text-[11px] text-ink/50">{r.ttn_reference}</span>}</td>
              <td className="px-3 py-3 pe-6 text-end"><a href={`/api/invoices/${r.id}/pdf`} aria-label={`${t.order.download} ${r.number}`} className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-paper"><Download className="h-3.5 w-3.5" aria-hidden /></a></td>
            </tr>
          ))}
        </tbody>
      </table>
      {picked.length > 0 && (
        <form className="flex flex-wrap items-center gap-2 border-t border-line p-4" onSubmit={(e) => {
          e.preventDefault();
          start(async () => { const r = await markTtn(picked, "sent", ref); setState(r); if (r.ok) { setPicked([]); setRef(""); } });
        }}>
          <span className="text-sm text-ink/65">{a.selected(picked.length)}</span>
          <input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={120} placeholder={a.ttnReference} aria-label={a.ttnReference} className="field w-56 py-2" />
          <button type="submit" disabled={pending} className={btnPrimary}>{a.markSent}</button>
          <ResultText state={state} />
        </form>
      )}
    </div>
  );
}
