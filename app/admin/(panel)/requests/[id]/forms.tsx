"use client";

import { useState, useTransition } from "react";
import { useApp } from "@/lib/context/app-context";
import { issueQuote, rescheduleRequest, returnRequest, type AdminResult } from "@/lib/actions/admin";
import { btnGhost, btnPrimary, field, ResultText } from "@/components/admin/ui";
import type { Currency } from "@/lib/types";

export function IssueQuoteForm({ requestId, source }: { requestId: string; source: Currency }) {
  const { t } = useApp();
  const a = t.admin.requests;
  const [currency, setCurrency] = useState<Currency>(source);
  const [days, setDays] = useState(14);
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-wrap items-end gap-3 pt-3 border-t border-tan/20"
      onSubmit={(e) => { e.preventDefault(); start(async () => setState(await issueQuote(requestId, currency, days))); }}>
      <label className="text-xs font-semibold">{a.quoteCurrency}
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={`${field} mt-1`}>
          <option value="EUR">EUR</option>
          <option value="TND">TND</option>
        </select>
      </label>
      <label className="text-xs font-semibold">{a.validityDays}
        <input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Math.floor(Number(e.target.value)) || 14)} className={`${field} mt-1 w-24`} />
      </label>
      <button type="submit" disabled={pending} className={btnPrimary}>{a.issueQuote}</button>
      <ResultText state={state} />
    </form>
  );
}

export function RescheduleForm({ requestId, lines }: { requestId: string; lines: { id: string; title: string; start: string; end: string }[] }) {
  const { t } = useApp();
  const a = t.admin.requests;
  const [dates, setDates] = useState(lines.map((l) => ({ id: l.id, start_date: l.start, end_date: l.end })));
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const set = (i: number, key: "start_date" | "end_date", v: string) => setDates((d) => d.map((x, j) => (j === i ? { ...x, [key]: v } : x)));
  return (
    <details className="pt-3 border-t border-tan/20">
      <summary className="cursor-pointer text-sm font-bold">{a.reschedule}</summary>
      <form className="space-y-2 pt-3" onSubmit={(e) => { e.preventDefault(); start(async () => setState(await rescheduleRequest(requestId, dates))); }}>
        {lines.map((l, i) => (
          <div key={l.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <span className="text-sm">{l.title}</span>
            <label className="text-xs">{t.booking.start}<input type="date" value={dates[i].start_date} onChange={(e) => set(i, "start_date", e.target.value)} className={field} /></label>
            <label className="text-xs">{t.booking.end}<input type="date" value={dates[i].end_date} onChange={(e) => set(i, "end_date", e.target.value)} className={field} /></label>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={btnGhost}>{a.saveDates}</button>
          <ResultText state={state} />
        </div>
      </form>
    </details>
  );
}

export function ReturnForm({ requestId, lines }: { requestId: string; lines: { id: string; title: string; quantity: number }[] }) {
  const { t } = useApp();
  const a = t.admin.requests;
  const [damaged, setDamaged] = useState<Record<string, number>>({});
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-2 pt-3 border-t border-tan/20"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm(a.confirmPrompt)) return;
        start(async () => setState(await returnRequest(requestId, lines.map((l) => ({ line_id: l.id, quantity: damaged[l.id] ?? 0 })))));
      }}>
      <h3 className="text-sm font-bold">{a.returnTitle}</h3>
      {lines.map((l) => (
        <label key={l.id} className="flex items-center justify-between gap-3 text-sm">
          <span>{l.title} ({l.quantity}) — {a.damaged}</span>
          <input type="number" min={0} max={l.quantity} step={1} value={damaged[l.id] ?? 0}
            onChange={(e) => setDamaged((d) => ({ ...d, [l.id]: Math.min(l.quantity, Math.max(0, Math.floor(Number(e.target.value)) || 0)) }))}
            className={`${field} w-20`} />
        </label>
      ))}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>{a.confirmReturn}</button>
        <ResultText state={state} />
      </div>
    </form>
  );
}
