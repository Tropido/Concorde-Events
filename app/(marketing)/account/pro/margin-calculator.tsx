"use client";

import { useState } from "react";
import { useApp } from "@/lib/context/app-context";
import { formatTND } from "@/lib/utils/formatters";
import type { CatalogueProduct } from "@/lib/types";

/** Resale estimate from the pro's own nightly rate (discount included). Indicative only. */
export function MarginCalculator({ products }: { products: CatalogueProduct[] }) {
  const { t, language } = useApp();
  const [id, setId] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [n, setN] = useState(1);
  const [margin, setMargin] = useState(30);
  const p = products.find((x) => x.id === id);
  if (!p?.price) return <p className="text-sm text-ink/55">{t.common.noData}</p>;

  const cost = p.price.amount * Math.max(1, qty) * Math.max(1, n);
  const client = cost * (1 + Math.max(0, margin) / 100);
  const money = (v: number) => formatTND(v, language);
  const num = (v: string, min = 1) => Math.max(min, Math.floor(Number(v)) || min);

  return (
    <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2"><span className="field-label">{t.account.calcProduct}</span>
          <select value={id} onChange={(e) => setId(e.target.value)} className="field">
            {products.map((x) => <option key={x.id} value={x.id}>{x.title} · {formatTND(x.price!.amount, language)}</option>)}
          </select>
        </label>
        <label className="block"><span className="field-label">{t.booking.quantity}</span><input type="number" min={1} value={qty} onChange={(e) => setQty(num(e.target.value))} className="field" /></label>
        <label className="block"><span className="field-label">{t.quote.nights}</span><input type="number" min={1} value={n} onChange={(e) => setN(num(e.target.value))} className="field" /></label>
        <label className="block sm:col-span-2"><span className="field-label">{t.account.marginLabel} · {margin}%</span>
          <input type="range" min={0} max={150} step={5} value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full accent-[#2b1d13]" />
        </label>
      </div>
      <dl className="space-y-3 rounded-3xl bg-paper p-5 text-sm" aria-live="polite">
        <div className="flex justify-between"><dt className="text-ink/60">{t.account.costPrice}</dt><dd className="tabular-nums">{money(cost)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink/60">{t.account.profit}</dt><dd className="tabular-nums text-ok">+{money(client - cost)}</dd></div>
        <div className="flex items-baseline justify-between border-t border-line pt-3"><dt>{t.account.clientPrice}</dt><dd className="text-2xl font-semibold tabular-nums">{money(client)}</dd></div>
        <p className="text-xs text-ink/45">{t.bag.estimateNote}</p>
      </dl>
    </div>
  );
}
