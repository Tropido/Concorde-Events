"use client";

import { useState, useTransition } from "react";
import { useApp } from "@/lib/context/app-context";
import { issueQuote, rescheduleRequest, returnRequest, type AdminResult } from "@/lib/actions/admin";
import { btnGhost, btnPrimary, ResultText } from "@/components/admin/ui";

export function IssueQuoteForm({ requestId }: { requestId: string }) {
  const { t } = useApp();
  const a = t.admin.requests;
  const [days, setDays] = useState(14);
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4"
      onSubmit={(e) => { e.preventDefault(); start(async () => setState(await issueQuote(requestId, days))); }}>
      <label className="block"><span className="field-label">{a.validityDays}</span>
        <input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Math.floor(Number(e.target.value)) || 14)} className="field w-24" />
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
    <details className="mt-4 border-t border-line pt-4">
      <summary className="cursor-pointer text-sm font-medium">{a.reschedule}</summary>
      <form className="space-y-2 pt-3" onSubmit={(e) => { e.preventDefault(); start(async () => setState(await rescheduleRequest(requestId, dates))); }}>
        {lines.map((l, i) => (
          <div key={l.id} className="grid items-end gap-2 sm:grid-cols-3">
            <span className="text-sm">{l.title}</span>
            <label className="block"><span className="field-label">{t.booking.start}</span><input type="date" value={dates[i].start_date} onChange={(e) => set(i, "start_date", e.target.value)} className="field" /></label>
            <label className="block"><span className="field-label">{t.booking.end}</span><input type="date" value={dates[i].end_date} onChange={(e) => set(i, "end_date", e.target.value)} className="field" /></label>
          </div>
        ))}
        <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={btnGhost}>{a.saveDates}</button><ResultText state={state} /></div>
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
    <form className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm(a.confirmPrompt)) return;
        start(async () => setState(await returnRequest(requestId, lines.map((l) => ({ line_id: l.id, quantity: damaged[l.id] ?? 0 })))));
      }}>
      <p className="text-xs text-ink/55">{a.damagedHint}</p>
      {lines.map((l) => (
        <label key={l.id} className="flex items-center justify-between gap-3 text-sm">
          <span>{l.title} <span className="text-ink/45">× {l.quantity}</span></span>
          <input type="number" min={0} max={l.quantity} step={1} value={damaged[l.id] ?? 0} aria-label={`${a.damaged}: ${l.title}`}
            onChange={(e) => setDamaged((d) => ({ ...d, [l.id]: Math.min(l.quantity, Math.max(0, Math.floor(Number(e.target.value)) || 0)) }))}
            className="field w-20 text-center" />
        </label>
      ))}
      <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={btnPrimary}>{a.confirmReturn}</button><ResultText state={state} /></div>
    </form>
  );
}
