"use client";

import { useState, useTransition } from "react";
import { Download, MessageCircle, Plus, X } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { createClient } from "@/lib/supabase/client";
import {
  addExtra, cancelOrder, confirmWithoutDeposit, markQuoteAccepted, recordPayment, removeExtra, resendEmail, saveBilling, voidPayment,
  type PaymentInput, type PaymentResult,
} from "@/lib/actions/orders";
import type { AdminResult } from "@/lib/actions/run";
import { ActionButton, Panel, ResultText, btnDanger, btnGhost, btnPrimary } from "@/components/admin/ui";
import { CloseButton, Drawer } from "@/components/ui/kit";
import { Dialog } from "@/components/ui/dialog";
import { ProgressBar } from "@/components/ui/status";
import { cn, formatDateTime, formatDay, formatTND } from "@/lib/utils/formatters";
import type { EmailKind } from "@/lib/email/copy";
import type { EmailStatus, ExtraKind } from "@/lib/i18n/order-types";
import type { PaymentKind, PaymentMethod } from "@/lib/types";

const METHODS: PaymentMethod[] = ["virement", "especes", "cheque", "d17", "flouci", "konnect", "carte", "autre"];
const KINDS: PaymentKind[] = ["deposit", "balance", "caution_held", "caution_refund", "refund"];
const PROOF_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export type PaymentRow = {
  id: string; kind: PaymentKind; method: PaymentMethod; amount: number; received_at: string; reference: string | null; note: string | null;
  voided_at: string | null; void_reason: string | null; recorder: { full_name: string | null } | null; proofUrl: string | null;
};
type Summary = {
  id: string; reference: string; name: string; phone: string; status: string; paidTotal: number; owed: number; depositPaid: number; depositRequired: number;
  dueAt: string | null; now: number; total: number; cautionHeld: number; rib: string | null;
};

export function PaymentsPanel({ r, payments, isAdmin }: { r: Summary; payments: PaymentRow[]; isAdmin: boolean }) {
  const { t, language } = useApp();
  const a = t.order.panel;
  const money = (v: number) => formatTND(v, language);
  const [open, setOpen] = useState(false);
  const phone = r.phone.replace(/\D/g, "");
  const wa = (text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  const due = r.dueAt ? new Date(r.dueAt).getTime() - r.now : null;
  const left = due === null ? null : { d: Math.floor(Math.abs(due) / 86_400_000), h: Math.floor((Math.abs(due) % 86_400_000) / 3_600_000) };
  const waiting = r.status === "accepted";
  const payable = ["accepted", "confirmed", "dispatched", "returned", "completed", "cancelled"].includes(r.status);
  const dueText = r.dueAt ? formatDay(r.dueAt.slice(0, 10), language) : "";
  const remainingDeposit = Math.max(0, r.depositRequired - r.depositPaid);

  return (
    <Panel title={a.payments} action={payable ? <button type="button" onClick={() => setOpen(true)} className={btnPrimary}><Plus className="h-3.5 w-3.5" aria-hidden />{a.record}</button> : undefined}>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProgressBar label={a.depositProgress} value={r.depositPaid} max={r.depositRequired} caption={`${money(r.depositPaid)} / ${money(r.depositRequired)}`} />
        <ProgressBar label={a.totalProgress} value={r.paidTotal} max={r.owed} caption={`${money(r.paidTotal)} / ${money(r.owed)}`} />
      </div>
      {waiting && left && (
        <p className={cn("mt-3 rounded-2xl p-3 text-sm", due! < 0 ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn")}>
          {a.deadline} : {formatDateTime(r.dueAt!, language)} · {due! < 0 ? a.overdueBy(left.d, left.h) : a.timeLeft(left.d, left.h)}
        </p>
      )}
      {r.paidTotal > r.owed && r.owed > 0 && <p className="mt-3 rounded-2xl bg-warn-soft p-3 text-sm text-warn">{a.overpaid(money(r.paidTotal - r.owed))}</p>}
      {r.cautionHeld > 0 && <p className="mt-3 text-sm text-ink/65">{a.caution} : <span className="font-medium tabular-nums">{money(r.cautionHeld)}</span></p>}

      {payments.length === 0 ? <p className="mt-4 text-sm text-ink/55">{a.empty}</p> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead><tr className="border-b border-line">
              {[a.date, a.kind, a.method, a.referenceShort, a.recordedBy].map((h) => <th key={h} scope="col" className="label py-2 pe-3 text-start">{h}</th>)}
              <th scope="col" className="label py-2 text-end">{a.amountShort}</th><th />
            </tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className={cn("border-b border-line last:border-0", p.voided_at && "text-ink/45")}>
                  <td className="whitespace-nowrap py-2.5 pe-3 text-xs">{formatDay(p.received_at.slice(0, 10), language)}</td>
                  <td className="py-2.5 pe-3">{t.order.kinds[p.kind]}</td>
                  <td className="py-2.5 pe-3">{t.order.methods[p.method]}</td>
                  <td className="py-2.5 pe-3 text-xs">{p.reference ?? "—"}{p.proofUrl && <> · <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="underline">{a.viewProof}</a></>}{p.note && <span className="block text-ink/55">{p.note}</span>}</td>
                  <td className="py-2.5 pe-3 text-xs">{p.recorder?.full_name ?? "—"}</td>
                  <td className={cn("whitespace-nowrap py-2.5 text-end font-medium tabular-nums", p.voided_at && "line-through")}>{money(p.amount)}</td>
                  <td className="py-2.5 ps-2 text-end">{p.voided_at ? <span title={p.void_reason ?? ""} className="text-[11px]">{a.voided}</span> : isAdmin && <ReasonButton label={a.voidAction} action={(reason) => voidPayment(p.id, reason)} icon />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {phone.length >= 8 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
          <a href={wa(a.waInstructions(r.name, r.reference, money(remainingDeposit), r.rib ?? ""))} target="_blank" rel="noopener noreferrer" className={btnGhost}><MessageCircle className="h-3.5 w-3.5" aria-hidden />{a.waButtons.instructions}</a>
          <a href={wa(a.waReminder(r.name, r.reference, money(remainingDeposit), dueText))} target="_blank" rel="noopener noreferrer" className={btnGhost}><MessageCircle className="h-3.5 w-3.5" aria-hidden />{a.waButtons.reminder}</a>
          <a href={wa(a.waThanks(r.name, r.reference))} target="_blank" rel="noopener noreferrer" className={btnGhost}><MessageCircle className="h-3.5 w-3.5" aria-hidden />{a.waButtons.thanks}</a>
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} labelledBy="payment-title">
        <PaymentForm requestId={r.id} defaultAmount={remainingDeposit} isAdmin={isAdmin} onClose={() => setOpen(false)} />
      </Drawer>
    </Panel>
  );
}

function PaymentForm({ requestId, defaultAmount, isAdmin, onClose }: { requestId: string; defaultAmount: number; isAdmin: boolean; onClose: () => void }) {
  const { t, language } = useApp();
  const a = t.order.panel;
  const [v, setV] = useState({ kind: (defaultAmount > 0 ? "deposit" : "balance") as PaymentInput["kind"], method: "virement" as PaymentMethod, amount: defaultAmount ? String(defaultAmount) : "", receivedAt: new Date().toISOString().slice(0, 10), reference: "", note: "" });
  const [proof, setProof] = useState<File | null>(null);
  const [state, setState] = useState<PaymentResult | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      let proofPath: string | null = null;
      if (proof) {
        if (!PROOF_TYPES.includes(proof.type) || proof.size > MAX_BYTES) return setState({ ok: false, error: "upload_failed" });
        const path = `${requestId}/${crypto.randomUUID()}.${proof.name.split(".").pop()}`;
        const { error } = await createClient().storage.from("payment-proofs").upload(path, proof, { contentType: proof.type, upsert: false });
        if (error) return setState({ ok: false, error: "upload_failed" });
        proofPath = path;
      }
      const res = await recordPayment({ requestId, kind: v.kind, method: v.method, amount: Number(v.amount), receivedAt: v.receivedAt, reference: v.reference || null, proofPath, note: v.note || null });
      setState(res);
      if (res.ok && !res.overpaid) onClose();
    });
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <div className="flex items-center justify-between p-5">
        <h2 id="payment-title" className="text-xl font-semibold tracking-tight">{a.record}</h2>
        <CloseButton onClick={onClose} label={t.common.close} />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5">
        <label className="block"><span className="field-label">{a.kind}</span>
          <select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as PaymentInput["kind"] })} className="field">
            {KINDS.filter((k) => k !== "refund" || isAdmin).map((k) => <option key={k} value={k}>{t.order.kinds[k]}</option>)}
          </select>
        </label>
        <label className="block"><span className="field-label">{a.amount}</span>
          <input required type="number" min={0.001} step="0.001" inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} className="field tabular-nums" /></label>
        <label className="block"><span className="field-label">{a.method}</span>
          <select value={v.method} onChange={(e) => setV({ ...v, method: e.target.value as PaymentMethod })} className="field">
            {METHODS.map((m) => <option key={m} value={m}>{t.order.methods[m]}</option>)}
          </select>
        </label>
        <label className="block"><span className="field-label">{a.receivedAt}</span>
          <input required type="date" value={v.receivedAt} onChange={(e) => setV({ ...v, receivedAt: e.target.value })} className="field" /></label>
        <label className="block"><span className="field-label">{a.reference}</span>
          <input maxLength={80} value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} className="field" /></label>
        <label className="block"><span className="field-label">{a.proof}</span>
          <input type="file" accept={PROOF_TYPES.join(",")} onChange={(e) => setProof(e.target.files?.[0] ?? null)} className="field" />
          <span className="mt-1 block text-[11px] text-ink/55">{a.proofHint}</span></label>
        <label className="block"><span className="field-label">{a.note}</span>
          <textarea rows={2} maxLength={1000} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} className="field resize-y" /></label>
        {state?.ok && !!state.overpaid && <p role="status" className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{a.overpaid(formatTND(state.overpaid, language))}</p>}
      </div>
      <div className="flex items-center gap-3 border-t border-line p-5">
        {state?.ok && state.overpaid
          ? <button type="button" onClick={onClose} className="btn-ink flex-1">{t.common.close}</button>
          : <button type="submit" disabled={pending} className="btn-ink flex-1">{pending ? t.common.saving : t.common.save}</button>}
        <ResultText state={state && !state.ok ? state : null} />
      </div>
    </form>
  );
}

/** A button that asks for a mandatory reason first. */
export function ReasonButton({ label, action, className = btnDanger, icon }: { label: string; action: (reason: string) => Promise<AdminResult>; className?: string; icon?: boolean }) {
  const { t } = useApp();
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={pending} aria-label={label} title={label} className={icon ? "flex h-7 w-7 items-center justify-center rounded-full hover:bg-paper" : className}
        onClick={() => {
          const reason = window.prompt(t.order.panel.reasonPrompt);
          if (reason && reason.trim()) start(async () => setState(await action(reason.trim())));
        }}>
        {icon ? <X className="h-3.5 w-3.5" aria-hidden /> : label}
      </button>
      {state && !state.ok && <ResultText state={state} />}
    </span>
  );
}

export function MarkAccepted({ requestId, quoteId, name }: { requestId: string; quoteId: string; name: string }) {
  const { t } = useApp();
  const a = t.order.panel;
  const [open, setOpen] = useState(false);
  const [signer, setSigner] = useState(name);
  const [channel, setChannel] = useState<"whatsapp" | "phone" | "in_person">("whatsapp");
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnPrimary}>{a.markAccepted}</button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="mark-title" className="max-w-sm">
        <form className="space-y-4 p-6" onSubmit={(e) => {
          e.preventDefault();
          start(async () => { const r = await markQuoteAccepted(requestId, quoteId, signer, channel); setState(r); if (r.ok) setOpen(false); });
        }}>
          <h2 id="mark-title" className="text-lg font-semibold tracking-tight">{a.markAccepted}</h2>
          <label className="block"><span className="field-label">{a.signer}</span><input required minLength={2} maxLength={120} value={signer} onChange={(e) => setSigner(e.target.value)} className="field" /></label>
          <label className="block"><span className="field-label">{a.channel}</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className="field">
              {(["whatsapp", "phone", "in_person"] as const).map((c) => <option key={c} value={c}>{a.channels[c]}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={btnPrimary}>{t.common.confirm}</button><ResultText state={state} /></div>
        </form>
      </Dialog>
    </>
  );
}

export function ConfirmWithoutDeposit({ requestId }: { requestId: string }) {
  const { t } = useApp();
  return <ReasonButton label={t.order.panel.confirmWithoutDeposit} className={btnGhost} action={(reason) => confirmWithoutDeposit(requestId, reason)} />;
}

export function CancelOrder({ requestId, invoiced }: { requestId: string; invoiced: number }) {
  const { t, language } = useApp();
  const a = t.order.panel;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [credit, setCredit] = useState("0");
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnDanger}>{a.cancelOrder}</button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="cancel-title" className="max-w-sm">
        <form className="space-y-4 p-6" onSubmit={(e) => {
          e.preventDefault();
          start(async () => { const r = await cancelOrder(requestId, reason, Number(credit) || 0); setState(r); if (r.ok) setOpen(false); });
        }}>
          <h2 id="cancel-title" className="text-lg font-semibold tracking-tight">{a.cancelOrder}</h2>
          <label className="block"><span className="field-label">{a.reason}</span><textarea required minLength={3} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="field resize-y" /></label>
          {invoiced > 0 && (
            <label className="block"><span className="field-label">{a.credit}</span>
              <input type="number" min={0} max={invoiced} step="0.001" value={credit} onChange={(e) => setCredit(e.target.value)} className="field" />
              <span className="mt-1 block text-[11px] text-ink/55">{a.creditHint(formatTND(invoiced, language))}</span></label>
          )}
          <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={btnDanger}>{a.cancelOrder}</button><ResultText state={state} /></div>
        </form>
      </Dialog>
    </>
  );
}

export type ExtraRow = { id: string; kind: ExtraKind; label: string; quantity: number; unit_price: number; vat_rate: number };

export function ExtrasPanel({ requestId, extras, defaultVat, editable }: { requestId: string; extras: ExtraRow[]; defaultVat: number; editable: boolean }) {
  const { t, language } = useApp();
  const a = t.order.panel;
  const blank = { kind: "delivery" as ExtraKind, label: a.extraKinds.delivery, quantity: "1", price: "", vat: String(defaultVat) };
  const [v, setV] = useState(blank);
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <Panel title={a.extras}>
      <p className="mb-3 text-xs text-ink/55">{a.extrasHint}</p>
      {extras.length > 0 && (
        <ul className="mb-3 divide-y divide-line text-sm">
          {extras.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 py-2">
              <span>{x.quantity > 1 && `${x.quantity} × `}{x.label} <span className="text-xs text-ink/50">· {x.vat_rate} %</span></span>
              <span className="flex items-center gap-2"><span className="tabular-nums">{formatTND(x.quantity * x.unit_price, language)}</span>
                {editable && <ActionButton action={removeExtra.bind(null, x.id)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-paper"><X className="h-3.5 w-3.5" aria-label={a.removeExtra} /></ActionButton>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <form className="grid gap-2 sm:grid-cols-6" onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addExtra({ requestId, kind: v.kind, label: v.label, quantity: Number(v.quantity), unitPrice: Number(v.price), vatRate: Number(v.vat) });
            setState(r);
            if (r.ok) setV(blank);
          });
        }}>
          <label className="sm:col-span-2"><span className="sr-only">{a.kind}</span>
            <select value={v.kind} onChange={(e) => { const kind = e.target.value as ExtraKind; setV({ ...v, kind, label: a.extraKinds[kind] }); }} className="field py-2">
              {(["delivery", "installation", "collection", "discount", "other"] as const).map((k) => <option key={k} value={k}>{a.extraKinds[k]}</option>)}
            </select>
          </label>
          <label className="sm:col-span-4"><span className="sr-only">{a.extraLabel}</span><input required maxLength={120} value={v.label} placeholder={a.extraLabel} onChange={(e) => setV({ ...v, label: e.target.value })} className="field py-2" /></label>
          <label className="sm:col-span-1"><span className="sr-only">{a.extraQty}</span><input required type="number" min={1} step={1} value={v.quantity} aria-label={a.extraQty} onChange={(e) => setV({ ...v, quantity: e.target.value })} className="field py-2" /></label>
          <label className="sm:col-span-2"><span className="sr-only">{a.extraPrice}</span><input required type="number" min={0.001} step="0.001" value={v.price} placeholder={a.extraPrice} onChange={(e) => setV({ ...v, price: e.target.value })} className="field py-2" /></label>
          <label className="sm:col-span-1"><span className="sr-only">{a.extraVat}</span><input required type="number" min={0} max={100} step="0.01" value={v.vat} aria-label={a.extraVat} onChange={(e) => setV({ ...v, vat: e.target.value })} className="field py-2" /></label>
          <div className="flex items-center gap-2 sm:col-span-2"><button type="submit" disabled={pending} className={btnGhost}>{a.addExtra}</button><ResultText state={state} /></div>
        </form>
      )}
    </Panel>
  );
}

export function BillingForm({ requestId, address, taxId }: { requestId: string; address: string; taxId: string }) {
  const { t } = useApp();
  const a = t.order.panel;
  const [v, setV] = useState({ address, taxId });
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <details className="mt-4 border-t border-line pt-4">
      <summary className="cursor-pointer text-sm font-medium">{a.billing}</summary>
      <form className="space-y-2 pt-3" onSubmit={(e) => { e.preventDefault(); start(async () => setState(await saveBilling(requestId, v.address, v.taxId))); }}>
        <label className="block"><span className="field-label">{a.billingAddress}</span><input maxLength={240} value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} className="field py-2" /></label>
        <label className="block"><span className="field-label">{a.billingTaxId}</span><input maxLength={40} dir="ltr" value={v.taxId} onChange={(e) => setV({ ...v, taxId: e.target.value })} className="field py-2" /></label>
        <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={btnGhost}>{t.common.save}</button><ResultText state={state} /></div>
      </form>
    </details>
  );
}

export type InvoiceRow = { id: string; type: "deposit" | "final" | "credit_note"; number: string; issued_at: string; total_due: number; ttn_status: "not_sent" | "sent" | "accepted" | "rejected" };

export function InvoicesPanel({ invoices }: { invoices: InvoiceRow[] }) {
  const { t, language } = useApp();
  const a = t.order;
  return (
    <Panel title={a.panel.invoices}>
      {invoices.length === 0 ? <p className="text-sm text-ink/55">{a.noInvoices}</p> : (
        <ul className="space-y-1">
          {invoices.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2 text-sm">
              <span><span className="font-medium">{a.invoiceTypes[i.type]}</span> <span className="font-mono text-xs text-ink/55"><bdi>{i.number}</bdi></span></span>
              <span className="flex items-center gap-3">
                <span className="text-[11px] text-ink/55">{a.invoicesPage.ttn} · {a.invoicesPage.ttnStatus[i.ttn_status]}</span>
                <span className="tabular-nums">{formatTND(i.total_due, language)}</span>
                <a href={`/api/invoices/${i.id}/pdf`} aria-label={`${a.download} ${i.number}`} title={a.download} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-card"><Download className="h-3.5 w-3.5" aria-hidden /></a>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export type EmailEvent = { id: string; kind: EmailKind; subject: string; status: EmailStatus; created_at: string; attempts: number; error: string | null; to_address: string };

const emailTone: Record<EmailStatus, string> = { queued: "bg-tone-sand text-ink", sent: "bg-ok-soft text-ok", failed: "bg-bad-soft text-bad", skipped: "bg-paper text-ink/60" };

export function EmailsPanel({ emails }: { emails: EmailEvent[] }) {
  const { t, language } = useApp();
  const a = t.order.panel;
  return (
    <Panel title={a.emails}>
      {emails.length === 0 ? <p className="text-sm text-ink/55">{a.noEmails}</p> : (
        <ol className="space-y-2">
          {emails.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-paper px-3 py-2 text-sm">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", emailTone[e.status])}>{a.emailStatus[e.status]}</span>
              <span className="min-w-0 flex-1"><span className="block truncate">{e.subject || a.emailKinds[e.kind]}</span>
                <span className="block text-[11px] text-ink/55"><bdi dir="ltr">{e.to_address}</bdi> · {formatDateTime(e.created_at, language)}{e.attempts > 1 && ` · ${a.attempts(e.attempts)}`}</span>
                {e.status === "failed" && e.error && <span className="block text-[11px] text-bad">{e.error}</span>}
              </span>
              {e.kind !== "password_reset" && <ActionButton action={resendEmail.bind(null, e.id)} className="text-xs underline underline-offset-2">{a.resend}</ActionButton>}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
