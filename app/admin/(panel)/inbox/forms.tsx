"use client";

import { useActionState, useEffect, useRef } from "react";
import { useApp } from "@/lib/context/app-context";
import { createTicket, staffReply } from "@/lib/actions/admin";
import { btnPrimary, field, ResultText } from "@/components/admin/ui";

export function TicketForm({ reference }: { reference?: string }) {
  const { t } = useApp();
  const a = t.admin.inbox;
  const [state, action, pending] = useActionState(createTicket, null);
  return (
    <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
      <label className="text-xs font-semibold">{a.name}<input name="name" required maxLength={120} className={field} /></label>
      <label className="text-xs font-semibold">{a.phone}<input name="phone" type="tel" maxLength={40} className={field} /></label>
      <label className="text-xs font-semibold">{a.email}<input name="email" type="email" maxLength={254} className={field} /></label>
      <label className="text-xs font-semibold">{t.common.country}
        <select name="country" className={field} defaultValue="">
          <option value="">—</option><option value="FR">{t.common.france}</option><option value="TN">{t.common.tunisia}</option>
        </select>
      </label>
      <label className="text-xs font-semibold">{a.requestRef}<input name="reference" defaultValue={reference ?? ""} maxLength={40} className={field} /></label>
      <label className="text-xs font-semibold">{a.subject}<input name="subject" required maxLength={200} className={field} /></label>
      <label className="text-xs font-semibold sm:col-span-2">{a.body}<textarea name="body" required rows={4} maxLength={5000} className={field} /></label>
      <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={btnPrimary}>{a.create}</button><ResultText state={state} /></div>
    </form>
  );
}

/** Contact-form and WhatsApp threads have no client account: replies there are internal notes
 *  (answer by e-mail/WhatsApp, then log it here). */
export function ReplyForm({ messageId, canReplyPublicly }: { messageId: string; canReplyPublicly: boolean }) {
  const { t } = useApp();
  const a = t.admin.inbox;
  const [state, action, pending] = useActionState(staffReply, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="message_id" value={messageId} />
      <label className="block text-xs font-semibold"><span className="sr-only">{a.reply}</span>
        <textarea name="body" required rows={2} maxLength={5000} placeholder={a.reply} className={field} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" name="internal" defaultChecked={!canReplyPublicly} disabled={!canReplyPublicly} />
          {a.internalNote}
        </label>
        {!canReplyPublicly && <input type="hidden" name="internal" value="on" />}
        <button type="submit" disabled={pending} className={btnPrimary}>{a.sendReply}</button>
        <ResultText state={state} />
      </div>
    </form>
  );
}
