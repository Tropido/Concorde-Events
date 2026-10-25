"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Plus, StickyNote } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { createTicket, staffReply, type AdminResult } from "@/lib/actions/admin";
import { CloseButton, Drawer } from "@/components/ui/kit";
import { ResultText } from "@/components/admin/ui";
import type { MessageChannel } from "@/lib/types";

export function NewTicketButton({ reference, open: initial }: { reference?: string; open: boolean }) {
  const { t } = useApp();
  const a = t.admin.inbox;
  const [open, setOpen] = useState(initial);
  const [state, action, pending] = useActionState(createTicket, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);
  const field = (label: string, input: React.ReactNode) => <label className="block"><span className="field-label">{label}</span>{input}</label>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ink btn-sm"><Plus className="h-4 w-4" aria-hidden />{a.newTicket}</button>
      <Drawer open={open} onClose={() => setOpen(false)} labelledBy="ticket-title">
        <div className="flex items-center justify-between p-5">
          <h2 id="ticket-title" className="text-xl font-semibold tracking-tight">{a.newTicket}</h2>
          <CloseButton onClick={() => setOpen(false)} label={t.common.close} />
        </div>
        <form action={action} className="flex-1 space-y-3 overflow-y-auto px-5 pb-5">
          <p className="rounded-2xl bg-paper p-3 text-xs text-ink/60">{a.ticketHint}</p>
          {field(a.name, <input name="name" required maxLength={120} className="field" />)}
          {field(a.phone, <input name="phone" type="tel" maxLength={40} className="field" dir="ltr" placeholder="+216" />)}
          {field(a.email, <input name="email" type="email" maxLength={254} className="field" dir="ltr" />)}
          {field(a.requestRef, <input name="reference" defaultValue={reference ?? ""} maxLength={40} className="field font-mono" dir="ltr" />)}
          {field(a.subject, <input name="subject" required maxLength={200} className="field" />)}
          {field(a.body, <textarea name="body" required rows={5} maxLength={5000} className="field resize-none" />)}
          <div className="flex items-center gap-3 pt-2"><button type="submit" disabled={pending} className="btn-ink">{a.create}</button><ResultText state={state} /></div>
        </form>
      </Drawer>
    </>
  );
}

/** WhatsApp tickets: the reply opens WhatsApp with the text ready and is logged in the thread.
 *  Site messages: replies are visible to the client in their space. Contact form: internal notes. */
export function ReplyComposer({ messageId, channel, phone }: { messageId: string; channel: MessageChannel; phone: string | null }) {
  const { t } = useApp();
  const a = t.admin.inbox;
  const [body, setBody] = useState("");
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);
  const digits = (phone ?? "").replace(/\D/g, "");
  const canWa = channel === "whatsapp" && digits.length >= 8;

  const send = (mode: "whatsapp" | "public" | "internal") => {
    const text = body.trim();
    if (!text) return ref.current?.focus();
    if (mode === "whatsapp") window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    const form = new FormData();
    form.set("message_id", messageId);
    form.set("body", mode === "whatsapp" ? `[WhatsApp] ${text}` : text);
    if (mode !== "public") form.set("internal", "on");
    start(async () => {
      const res = await staffReply(null, form);
      setState(res);
      if (res.ok) {
        setBody("");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2 border-t border-line p-4">
      <label className="block"><span className="sr-only">{a.reply}</span>
        <textarea ref={ref} value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={5000}
          placeholder={canWa ? a.waPlaceholder : a.reply} className="field resize-none" />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {canWa && <button type="button" disabled={pending} onClick={() => send("whatsapp")} className="btn btn-sm bg-ok text-card hover:opacity-90"><MessageCircle className="h-4 w-4" aria-hidden />{a.sendWhatsapp}</button>}
        {channel === "site" && <button type="button" disabled={pending} onClick={() => send("public")} className="btn-ink btn-sm">{a.sendReply}</button>}
        <button type="button" disabled={pending} onClick={() => send("internal")} className="btn-light btn-sm"><StickyNote className="h-4 w-4" aria-hidden />{a.internalNote}</button>
        <ResultText state={state} />
      </div>
    </div>
  );
}
