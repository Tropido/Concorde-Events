"use client";

import { useState, useTransition } from "react";
import { KeyRound, Mail, MessageCircle } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { sendPasswordReset, type ResetResult } from "@/lib/actions/reset";
import { RESET_LINK_MINUTES, type ResetChannel } from "@/lib/password-reset";
import { normalizePhone } from "@/lib/phone";
import { Dialog } from "@/components/ui/dialog";
import { CloseButton } from "@/components/ui/kit";
import { ResultText, btnGhost, btnPrimary } from "@/components/admin/ui";
import { cn, formatDateTime } from "@/lib/utils/formatters";

export type AuditRow = { id: number; channel: string | null; masked_destination: string | null; reason: string | null; created_at: string; actor: { full_name: string | null } | null };

export function ResetPassword({ profileId, email, phone, isAdmin, history }: { profileId: string; email: string; phone: string | null; isAdmin: boolean; history: AuditRow[] }) {
  const { t, language } = useApp();
  const a = t.order.reset;
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<ResetChannel>("email");
  const [destination, setDestination] = useState(email);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [pending, start] = useTransition();
  const stored = channel === "email" ? email : phone ?? "";
  const other = channel === "email" ? destination.trim().toLowerCase() !== email.toLowerCase() : normalizePhone(destination) !== normalizePhone(stored);

  const pick = (c: ResetChannel) => {
    setChannel(c);
    setDestination(c === "email" ? email : phone ?? "");
    setResult(null);
    setConfirmed(false);
  };
  const close = () => {
    setOpen(false);
    setResult(null); // the WhatsApp link goes with the dialog
    setConfirmed(false);
    setReason("");
  };

  return (
    <div className="space-y-2 border-t border-line pt-3">
      <button type="button" onClick={() => setOpen(true)} className={btnGhost}><KeyRound className="h-3.5 w-3.5" aria-hidden />{a.title}</button>
      {history.length > 0 && (
        <ul className="space-y-1 text-[11px] text-ink/55">
          {history.map((h) => (
            <li key={h.id}>{formatDateTime(h.created_at, language)} · {h.actor?.full_name ?? "—"} · <bdi dir="ltr">{h.masked_destination}</bdi>{h.reason && ` · ${h.reason}`}</li>
          ))}
        </ul>
      )}

      <Dialog open={open} onClose={close} labelledBy={`reset-${profileId}`} className="max-w-md">
        <form className="space-y-4 p-6" onSubmit={(e) => {
          e.preventDefault();
          if (other && !confirmed) return setConfirmed(true);
          start(async () => setResult(await sendPasswordReset({ profileId, channel, destination, reason: reason || null })));
        }}>
          <div className="flex items-start justify-between gap-3">
            <h2 id={`reset-${profileId}`} className="text-xl font-semibold tracking-tight">{a.title}</h2>
            <CloseButton onClick={close} label={t.common.close} />
          </div>
          <div role="tablist" aria-label={a.channel} className="grid grid-cols-2 gap-1 rounded-full bg-paper p-1">
            {(["email", "whatsapp"] as const).map((c) => {
              const Icon = c === "email" ? Mail : MessageCircle;
              return (
                <button key={c} type="button" role="tab" aria-selected={channel === c} onClick={() => pick(c)}
                  className={cn("inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium", channel === c ? "bg-card shadow-inset" : "text-ink/60")}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />{a.channels[c]}
                </button>
              );
            })}
          </div>
          <label className="block"><span className="field-label">{a.destination}</span>
            <input required dir="ltr" value={destination} readOnly={!isAdmin} onChange={(e) => { setDestination(e.target.value); setConfirmed(false); }} className={cn("field", !isAdmin && "opacity-70")} />
            {!isAdmin && <span className="mt-1 block text-[11px] text-ink/55">{a.storedOnly}</span>}
          </label>
          {other && (
            <label className="block"><span className="field-label">{a.reason}</span>
              <textarea required minLength={3} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="field resize-y" />
            </label>
          )}
          {other && confirmed && <p role="alert" className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{a.confirmOther(destination)}</p>}
          <p className="text-xs text-ink/60">{a.validity(RESET_LINK_MINUTES)}</p>
          {result?.ok && result.whatsappUrl ? (
            <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => setResult({ ok: true })} className="btn w-full bg-ok text-card hover:opacity-90"><MessageCircle className="h-4 w-4" aria-hidden />{a.openWhatsapp}</a>
          ) : (
            <div className="flex items-center gap-3">
              <button type="submit" disabled={pending || (channel === "whatsapp" && !destination)} className={btnPrimary}>{other && !confirmed ? t.common.confirm : a.send}</button>
              {result?.ok ? <span role="status" className="text-xs text-ok">{channel === "email" ? a.sent : a.opened}</span> : <ResultText state={result} />}
            </div>
          )}
        </form>
      </Dialog>
    </div>
  );
}
