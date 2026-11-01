"use client";

import { useState, useTransition } from "react";
import { useApp } from "@/lib/context/app-context";
import { issueQuote, rescheduleRequest, type AdminResult } from "@/lib/actions/admin";
import { btnGhost, btnPrimary, ResultText } from "@/components/admin/ui";
import { DateRangePicker } from "@/components/ui/date-range-picker";

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
  return (
    <details className="mt-4 border-t border-line pt-4">
      <summary className="cursor-pointer text-sm font-medium">{a.reschedule}</summary>
      <form className="space-y-2 pt-3" onSubmit={(e) => { e.preventDefault(); start(async () => setState(await rescheduleRequest(requestId, dates))); }}>
        {lines.map((l, i) => (
          <div key={l.id} className="grid items-center gap-2 sm:grid-cols-3">
            <span className="text-sm">{l.title}</span>
            <DateRangePicker start={dates[i].start_date} end={dates[i].end_date} className="sm:col-span-2"
              onChange={(s, e) => setDates((d) => d.map((x, j) => (j === i ? { ...x, start_date: s, end_date: e } : x)))} />
          </div>
        ))}
        <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={btnGhost}>{a.saveDates}</button><ResultText state={state} /></div>
      </form>
    </details>
  );
}
