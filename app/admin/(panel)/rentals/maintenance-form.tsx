"use client";

import { useState, useTransition } from "react";
import { useApp } from "@/lib/context/app-context";
import { resolveMaintenance, type AdminResult } from "@/lib/actions/admin";
import { btnDanger, btnGhost, ResultText } from "@/components/admin/ui";

export function MaintenanceForm({ productId, max }: { productId: string; max: number }) {
  const { t } = useApp();
  const a = t.admin.inventory;
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const go = (outcome: "repaired" | "written_off") => {
    if (outcome === "written_off" && !confirm(t.admin.requests.confirmPrompt)) return;
    start(async () => setState(await resolveMaintenance(productId, qty, outcome)));
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="sr-only" htmlFor={`m-${productId}`}>{t.booking.quantity}</label>
      <input id={`m-${productId}`} type="number" min={1} max={max} step={1} value={qty}
        onChange={(e) => setQty(Math.min(max, Math.max(1, Math.floor(Number(e.target.value)) || 1)))} className="field w-16 py-2 text-center" />
      <button type="button" disabled={pending} className={btnGhost} onClick={() => go("repaired")}>{a.repaired}</button>
      <button type="button" disabled={pending} className={btnDanger} onClick={() => go("written_off")}>{a.writtenOff}</button>
      <ResultText state={state} />
    </div>
  );
}
