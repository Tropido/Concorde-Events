"use client";

import { useActionState, useEffect, useRef } from "react";
import { useApp } from "@/lib/context/app-context";
import { replyToMessage, sendMessage, type FormState } from "@/lib/actions/account";
import { formatDateTime } from "@/lib/utils/formatters";

export type Thread = {
  id: string; subject: string; body: string; status: string; created_at: string;
  message_replies: { id: string; body: string; author_id: string | null; created_at: string }[];
};

const input = "field";
const button = "btn-ink btn-sm";

function useResetOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function MessagesView({ viewerId, threads, requests }: {
  viewerId: string; threads: Thread[]; requests: { id: string; reference: string }[];
}) {
  const { t, language } = useApp();
  const [state, action, pending] = useActionState(sendMessage, null);
  const formRef = useResetOnSuccess(state);

  return (
    <div className="grid grid-cols-1 items-start gap-2.5 xl:grid-cols-3">
      <form ref={formRef} action={action} className="card space-y-3 p-6">
        <h2 className="text-lg font-semibold tracking-tight">{t.account.newMessage}</h2>
        <label className="block text-xs text-ink/70">{t.account.subject}
          <input name="subject" required maxLength={200} className={`${input} mt-1.5`} />
        </label>
        {requests.length > 0 && (
          <label className="block text-xs text-ink/70">{t.common.reference} ({t.common.optional})
            <select name="request_id" className={`${input} mt-1.5`} defaultValue="">
              <option value="">—</option>
              {requests.map((r) => <option key={r.id} value={r.id}>{r.reference}</option>)}
            </select>
          </label>
        )}
        <label className="block text-xs text-ink/70">{t.account.message}
          <textarea name="body" required rows={5} maxLength={5000} className={`${input} mt-1.5`} />
        </label>
        {state?.error && <p role="alert" className="text-sm text-bad">{t.common.errorGeneric}</p>}
        <button type="submit" disabled={pending} className={button}>{pending ? t.common.saving : t.account.send}</button>
      </form>

      <div className="space-y-2.5 xl:col-span-2">
        {threads.length === 0 && <p className="card p-10 text-center text-sm text-ink/55">{t.account.noMessages}</p>}
        {threads.map((m) => (
          <article key={m.id} className="card space-y-3 p-6">
            <header className="flex flex-wrap justify-between gap-2">
              <h3 className="font-semibold tracking-tight">{m.subject}</h3>
              <time className="text-xs text-ink/50" dateTime={m.created_at}>{formatDateTime(m.created_at, language)}</time>
            </header>
            <p className="text-sm whitespace-pre-line">{m.body}</p>
            {m.message_replies
              .slice()
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((r) => (
                <div key={r.id} className={`rounded-2xl p-3 text-sm ${r.author_id === viewerId ? "ms-8 bg-paper" : "me-8 bg-tone-sand"}`}>
                  <p className="mb-1 text-[11px] font-medium text-ink/55">
                    {r.author_id === viewerId ? t.account.you : t.account.staffReply} · {formatDateTime(r.created_at, language)}
                  </p>
                  <p className="whitespace-pre-line">{r.body}</p>
                </div>
              ))}
            <ReplyForm messageId={m.id} />
          </article>
        ))}
      </div>
    </div>
  );
}

function ReplyForm({ messageId }: { messageId: string }) {
  const { t } = useApp();
  const [state, action, pending] = useActionState(replyToMessage, null);
  const formRef = useResetOnSuccess(state);
  return (
    <form ref={formRef} action={action} className="flex items-end gap-2 pt-2">
      <input type="hidden" name="message_id" value={messageId} />
      <label className="flex-1">
        <span className="sr-only">{t.account.reply}</span>
        <textarea name="body" required rows={2} maxLength={5000} placeholder={t.account.reply} className={input} />
      </label>
      <button type="submit" disabled={pending} className={button}>{t.account.send}</button>
    </form>
  );
}
