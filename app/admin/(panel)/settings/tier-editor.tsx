"use client";

import { useState, useTransition } from "react";
import { useApp } from "@/lib/context/app-context";
import { saveTier, type AdminResult } from "@/lib/actions/admin";
import { ResultText } from "@/components/admin/ui";
import type { TierRow } from "@/lib/pro";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function TierEditor({ tier, readOnly }: { tier: TierRow; readOnly: boolean }) {
  const { t } = useApp();
  const a = t.admin.settings;
  const [v, setV] = useState({
    name_fr: tier.name_fr, name_ar: tier.name_ar ?? "", min_points: tier.min_points, discount_percent: Number(tier.discount_percent),
    benefits_fr: tier.benefits_fr.join("\n"), benefits_ar: tier.benefits_ar.join("\n"), color: tier.color,
  });
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const f = (label: string, input: React.ReactNode) => <label className="block"><span className="field-label">{label}</span>{input}</label>;

  return (
    <form className="space-y-3 rounded-2xl bg-paper p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setState(await saveTier({
          code: tier.code, name_fr: v.name_fr, name_ar: v.name_ar || null, min_points: v.min_points, discount_percent: v.discount_percent,
          benefits_fr: lines(v.benefits_fr), benefits_ar: lines(v.benefits_ar), color: v.color,
        })));
      }}>
      <fieldset disabled={readOnly} className="space-y-3">
        <div className="flex items-center gap-3">
          <input type="color" value={v.color} onChange={(e) => setV({ ...v, color: e.target.value })} aria-label={a.color} className="h-9 w-9 cursor-pointer rounded-full bg-card p-0.5" />
          <input value={v.name_fr} onChange={(e) => setV({ ...v, name_fr: e.target.value })} required maxLength={60} aria-label={a.nameFr} className="field bg-card py-2 text-base font-semibold" />
          <input value={v.name_ar} onChange={(e) => setV({ ...v, name_ar: e.target.value })} maxLength={60} dir="rtl" lang="ar" aria-label={a.nameAr} className="field bg-card py-2" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {f(a.minPoints, <input type="number" min={0} step={50} value={v.min_points} onChange={(e) => setV({ ...v, min_points: Math.max(0, Math.floor(Number(e.target.value)) || 0) })} className="field bg-card" />)}
          {f(a.discount, <input type="number" min={0} max={50} step={0.5} value={v.discount_percent} onChange={(e) => setV({ ...v, discount_percent: Math.min(50, Math.max(0, Number(e.target.value) || 0)) })} className="field bg-card" />)}
        </div>
        {f(a.benefitsFr, <textarea rows={3} value={v.benefits_fr} onChange={(e) => setV({ ...v, benefits_fr: e.target.value })} className="field resize-y bg-card" />)}
        {f(a.benefitsAr, <textarea rows={3} dir="rtl" lang="ar" value={v.benefits_ar} onChange={(e) => setV({ ...v, benefits_ar: e.target.value })} className="field resize-y bg-card" />)}
        {!readOnly && <div className="flex items-center gap-3"><button type="submit" disabled={pending} className="btn-ink btn-sm">{t.common.save}</button><ResultText state={state} /></div>}
      </fieldset>
    </form>
  );
}
