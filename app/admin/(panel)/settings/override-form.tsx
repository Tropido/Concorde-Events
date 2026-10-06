"use client";

import { useActionState } from "react";
import { useApp } from "@/lib/context/app-context";
import { setFxOverride } from "@/lib/actions/admin";
import { btnGhost, field, ResultText } from "@/components/admin/ui";

export function OverrideForm() {
  const { t } = useApp();
  const a = t.admin.settings;
  const [state, action, pending] = useActionState(setFxOverride, null);
  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <label className="text-xs font-semibold">{a.rate}<input name="rate" type="number" min={1} max={10} step="0.000001" required className={field} /></label>
      <label className="text-xs font-semibold">{a.hours}<input name="hours" type="number" min={1} max={720} step={1} defaultValue={24} required className={field} /></label>
      <label className="text-xs font-semibold">{a.note}<input name="note" required maxLength={500} className={field} /></label>
      <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={btnGhost}>{a.setOverride}</button><ResultText state={state} /></div>
    </form>
  );
}
