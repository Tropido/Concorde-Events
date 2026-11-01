"use client";

import { useMemo, useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { createClient } from "@/lib/supabase/client";
import { closeInspection, receiveReturn, saveInspectionDraft } from "@/lib/actions/orders";
import type { AdminResult } from "@/lib/actions/run";
import { Panel, ResultText, btnGhost, btnPrimary } from "@/components/admin/ui";
import { CloseButton, Drawer, ProductTile, QuantityStepper } from "@/components/ui/kit";
import { cn, formatTND } from "@/lib/utils/formatters";
import type { ImageFit, Tone } from "@/lib/types";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 6;
const CONDITIONS = ["ok", "minor", "damaged", "broken", "missing"] as const;
type Condition = (typeof CONDITIONS)[number];

export type ReturnLine = {
  id: string; title: string; quantity: number; received: number; image: string | null; imageFit: ImageFit; tone: Tone;
  repairFee: number | null; replacementValue: number | null;
};

/** Step 1: what actually came back. Anything short carries into the inspection as missing. */
export function ReceiveReturn({ requestId, lines }: { requestId: string; lines: ReturnLine[] }) {
  const { t } = useApp();
  const a = t.order.inspection;
  const [open, setOpen] = useState(false);
  const [received, setReceived] = useState<Record<string, number>>(Object.fromEntries(lines.map((l) => [l.id, l.quantity])));
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnPrimary}>{a.returnButton}</button>
      <Drawer open={open} onClose={() => setOpen(false)} labelledBy="receive-title">
        <div className="flex items-center justify-between p-5">
          <h2 id="receive-title" className="text-xl font-semibold tracking-tight">{a.receiveTitle}</h2>
          <CloseButton onClick={() => setOpen(false)} label={t.common.close} />
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-5">
          <button type="button" onClick={() => setReceived(Object.fromEntries(lines.map((l) => [l.id, l.quantity])))} className={btnGhost}>{a.allReceived}</button>
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <ProductTile src={l.image} alt="" tone={l.tone} fit={l.imageFit} sizes="56px" className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-ink/55">{a.sent} : {l.quantity}</p>
                </div>
                <div className="text-end">
                  <p className="mb-1 text-[11px] text-ink/55">{a.received}</p>
                  <QuantityStepper value={received[l.id]} min={0} max={l.quantity} size="sm" label={`${a.received} : ${l.title}`} onChange={(v) => setReceived((x) => ({ ...x, [l.id]: v }))} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-3 border-t border-line p-5">
          <button type="button" disabled={pending} className="btn-ink flex-1" onClick={() => start(async () => {
            const r = await receiveReturn(requestId, lines.map((l) => ({ line_id: l.id, received: received[l.id] })));
            setState(r);
            if (r.ok) setOpen(false);
          })}>{a.confirmReceive}</button>
          <ResultText state={state && !state.ok ? state : null} />
        </div>
      </Drawer>
    </>
  );
}

type LineState = Record<Condition, number> & { fee: string; feeTouched: boolean; fee_reason: string; reasonTouched: boolean; note: string; photos: string[]; photos_visible: boolean };
export type InspectionDraft = { lines: Record<string, LineState>; outcome: "refund" | "retain" | "none"; retained: string };

const blank = (l: ReturnLine): LineState => ({
  ok: l.received, minor: 0, damaged: 0, broken: 0, missing: l.quantity - l.received,
  fee: "", feeTouched: false, fee_reason: "", reasonTouched: false, note: "", photos: [], photos_visible: false,
});

/** Step 2: every unit sorted into a condition, with fees, photos and the caution. */
export function InspectionPanel({ requestId, lines, cautionHeld, initial }: { requestId: string; lines: ReturnLine[]; cautionHeld: number; initial: InspectionDraft | null }) {
  const { t, language } = useApp();
  const a = t.order.inspection;
  const money = (v: number) => formatTND(v, language);
  const [draft, setDraft] = useState<InspectionDraft>(() => ({
    outcome: initial?.outcome ?? (cautionHeld > 0 ? "refund" : "none"), retained: initial?.retained ?? "",
    lines: Object.fromEntries(lines.map((l) => [l.id, { ...blank(l), ...initial?.lines[l.id] }])),
  }));
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();

  const suggestion = (l: ReturnLine, s: LineState) => s.damaged * (l.repairFee ?? 0) + (s.broken + s.missing) * (l.replacementValue ?? 0);
  const reason = (s: LineState) => CONDITIONS.filter((c) => c !== "ok" && s[c] > 0).map((c) => a.chips[c](s[c])).join(", ");
  const update = (l: ReturnLine, patch: Partial<LineState>) => setDraft((d) => {
    const next = { ...d.lines[l.id], ...patch };
    if (!next.feeTouched) next.fee = suggestion(l, next) ? String(suggestion(l, next)) : "";
    if (!next.reasonTouched) next.fee_reason = reason(next);
    return { ...d, lines: { ...d.lines, [l.id]: next } };
  });
  const left = (l: ReturnLine) => l.quantity - CONDITIONS.reduce((n, c) => n + draft.lines[l.id][c], 0);
  const totalFees = useMemo(() => lines.reduce((n, l) => n + (Number(draft.lines[l.id].fee) || 0), 0), [lines, draft]);
  const balanced = lines.every((l) => left(l) === 0);

  const upload = async (l: ReturnLine, files: FileList | null) => {
    const room = MAX_PHOTOS - draft.lines[l.id].photos.length;
    const chosen = Array.from(files ?? []).slice(0, room);
    if (chosen.some((f) => !PHOTO_TYPES.includes(f.type) || f.size > MAX_BYTES)) return setState({ ok: false, error: "upload_failed" });
    const db = createClient();
    const paths: string[] = [];
    for (const file of chosen) {
      const path = `${requestId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await db.storage.from("inspection-photos").upload(path, file, { contentType: file.type, upsert: false });
      if (error) return setState({ ok: false, error: "upload_failed" });
      paths.push(path);
    }
    update(l, { photos: [...draft.lines[l.id].photos, ...paths] });
  };

  return (
    <Panel title={a.inspectTitle}>
      <ul className="space-y-3">
        {lines.map((l) => {
          const s = draft.lines[l.id];
          const remainder = left(l);
          return (
            <li key={l.id} className="space-y-3 rounded-2xl bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{l.title} <span className="font-normal text-ink/55">· {a.sent} {l.quantity} · {a.received} {l.received}</span></p>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", remainder === 0 ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}>{a.remainder(remainder)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {CONDITIONS.map((c) => (
                  <div key={c} className="rounded-xl bg-card p-2.5">
                    <p className="mb-1.5 text-[11px] text-ink/60">{a.conditions[c]}</p>
                    <QuantityStepper value={s[c]} min={c === "missing" ? l.quantity - l.received : 0} max={l.quantity} size="sm" label={`${a.conditions[c]} : ${l.title}`} onChange={(v) => update(l, { [c]: v })} />
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block"><span className="field-label">{a.fee}</span>
                  <input type="number" min={0} step="0.001" value={s.fee} onChange={(e) => update(l, { fee: e.target.value, feeTouched: true })} className="field bg-card py-2" />
                  {suggestion(l, s) > 0 && <span className="mt-1 block text-[11px] text-ink/55">{a.suggested(money(suggestion(l, s)))}</span>}
                </label>
                <label className="block"><span className="field-label">{a.feeReason}</span>
                  <input maxLength={300} value={s.fee_reason} onChange={(e) => update(l, { fee_reason: e.target.value, reasonTouched: true })} className="field bg-card py-2" /></label>
              </div>
              <label className="block"><span className="field-label">{a.note}</span>
                <textarea rows={2} maxLength={1000} value={s.note} onChange={(e) => update(l, { note: e.target.value })} className="field resize-y bg-card" /></label>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {s.photos.length < MAX_PHOTOS && (
                  <label className={cn(btnGhost, "cursor-pointer")}><ImagePlus className="h-3.5 w-3.5" aria-hidden />{a.photos(s.photos.length, MAX_PHOTOS)}
                    <input type="file" accept={PHOTO_TYPES.join(",")} multiple onChange={(e) => upload(l, e.target.files)} className="sr-only" /></label>
                )}
                {s.photos.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 rounded-full bg-card py-1 pe-1 ps-3 text-xs">{p.split("/").pop()?.slice(0, 8)}
                    <button type="button" onClick={() => update(l, { photos: s.photos.filter((x) => x !== p) })} aria-label={t.common.delete} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-paper"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {s.photos.length > 0 && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={s.photos_visible} onChange={(e) => update(l, { photos_visible: e.target.checked })} className="h-4 w-4 accent-ink" />{a.photosVisible}</label>}
              </div>
            </li>
          );
        })}
      </ul>

      <fieldset className="mt-4 space-y-2 rounded-2xl bg-paper p-4">
        <legend className="sr-only">{a.cautionTitle}</legend>
        <p className="text-sm font-semibold">{a.cautionTitle}{cautionHeld > 0 && <span className="font-normal text-ink/55"> · {money(cautionHeld)}</span>}</p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {(cautionHeld > 0 ? (["refund", "retain"] as const) : (["none"] as const)).map((o) => (
            <label key={o} className="flex items-center gap-2"><input type="radio" name="caution" checked={draft.outcome === o} onChange={() => setDraft((d) => ({ ...d, outcome: o }))} className="accent-ink" />{a.cautionOutcomes[o]}</label>
          ))}
          {draft.outcome === "retain" && <input type="number" min={0.001} max={Math.min(cautionHeld, totalFees)} step="0.001" value={draft.retained} aria-label={a.cautionOutcomes.retain} onChange={(e) => setDraft((d) => ({ ...d, retained: e.target.value }))} className="field w-32 bg-card py-2" />}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-sm">{a.totalFees} : <span className="font-semibold tabular-nums">{money(totalFees)}</span></p>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <ResultText state={state} />
          <button type="button" disabled={pending} className={btnGhost} onClick={() => start(async () => setState(await saveInspectionDraft(requestId, draft)))}>{a.saveDraft}</button>
          <button type="button" disabled={pending || !balanced} className={btnPrimary} onClick={() => {
            if (!confirm(a.closeConfirm)) return;
            start(async () => setState(await closeInspection(requestId, lines.map((l) => {
              const s = draft.lines[l.id];
              return { line_id: l.id, ok: s.ok, minor: s.minor, damaged: s.damaged, broken: s.broken, missing: s.missing, fee: Number(s.fee) || 0, fee_reason: s.fee_reason, note: s.note, photos: s.photos, photos_visible: s.photos_visible };
            }), { outcome: draft.outcome, amount: Number(draft.retained) || 0 })));
          }}>{a.close}</button>
        </div>
      </div>
    </Panel>
  );
}
