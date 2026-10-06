"use client";

import { useState, useTransition } from "react";
import { useApp } from "@/lib/context/app-context";
import { resolveMaintenance, type AdminResult } from "@/lib/actions/admin";
import { btnDanger, btnGhost, field, ResultText } from "@/components/admin/ui";
import type { Country } from "@/lib/types";

export function MaintenanceForm({ productId, country, max }: { productId: string; country: Country; max: number }) {
  const { t } = useApp();
  const a = t.admin.inventory;
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const go = (outcome: "repaired" | "written_off") => {
    if (outcome === "written_off" && !confirm(t.admin.requests.confirmPrompt)) return;
    start(async () => setState(await resolveMaintenance(productId, country, qty, outcome)));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`m-${productId}-${country}`}>{t.booking.quantity}</label>
      <input id={`m-${productId}-${country}`} type="number" min={1} max={max} step={1} value={qty}
        onChange={(e) => setQty(Math.min(max, Math.max(1, Math.floor(Number(e.target.value)) || 1)))} className={`${field} w-20`} />
      <button type="button" disabled={pending} className={btnGhost} onClick={() => go("repaired")}>{a.repaired}</button>
      <button type="button" disabled={pending} className={btnDanger} onClick={() => go("written_off")}>{a.writtenOff}</button>
      <ResultText state={state} />
    </div>
  );
}
