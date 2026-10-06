"use client";

import { useState } from "react";
import { useApp } from "@/lib/context/app-context";
import { formatMoney } from "@/lib/utils/formatters";
import type { CatalogueProduct } from "@/lib/types";

const input = "w-full p-3 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-toffeeBrown";

/** Resale estimate from the pro's own nightly rate. Indicative only; quotes come from staff. */
export function MarginCalculator({ products }: { products: CatalogueProduct[] }) {
  const { t, language } = useApp();
  const [id, setId] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [n, setN] = useState(1);
  const [margin, setMargin] = useState(30);
  const p = products.find((x) => x.id === id);
  if (!p?.price || p.price.amount === null) return <p className="text-sm">{t.common.noData}</p>;

  const cost = p.price.amount * Math.max(1, qty) * Math.max(1, n);
  const client = cost * (1 + Math.max(0, margin) / 100);
  const money = (v: number) => formatMoney(v, p.price!.currency, language);

  return (
    <div className="apple-card rounded-3xl border border-tan/30 p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <label className="block text-xs font-semibold">{t.booking.title}
          <select value={id} onChange={(e) => setId(e.target.value)} className={`${input} mt-1`}>
            {products.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-xs font-semibold">{t.booking.quantity}
            <input type="number" min={1} step={1} value={qty} onChange={(e) => setQty(Math.floor(Number(e.target.value)) || 1)} className={`${input} mt-1`} />
          </label>
          <label className="block text-xs font-semibold">{t.quote.nights}
            <input type="number" min={1} step={1} value={n} onChange={(e) => setN(Math.floor(Number(e.target.value)) || 1)} className={`${input} mt-1`} />
          </label>
          <label className="block text-xs font-semibold">{t.account.marginLabel}
            <input type="number" min={0} max={500} step={1} value={margin} onChange={(e) => setMargin(Number(e.target.value) || 0)} className={`${input} mt-1`} />
          </label>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-3 content-start" aria-live="polite">
        <div className="flex justify-between"><dt>{t.account.costPrice}</dt><dd className="font-bold">{money(cost)}</dd></div>
        <div className="flex justify-between"><dt>{t.account.clientPrice}</dt><dd className="font-bold text-toffeeBrown dark:text-tan">{money(client)}</dd></div>
        <div className="flex justify-between border-t border-tan/20 pt-2"><dt>{t.account.profit}</dt><dd className="font-bold">{money(client - cost)}</dd></div>
        <p className="text-[11px] opacity-70">{t.draft.estimateNote}</p>
      </dl>
    </div>
  );
}
