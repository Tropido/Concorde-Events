"use client";

import { useActionState, useEffect, useRef } from "react";
import { useApp } from "@/lib/context/app-context";
import { replyToMessage, sendMessage, type FormState } from "@/lib/actions/account";
import { formatDateTime } from "@/lib/utils/formatters";

export type Thread = {
  id: string; subject: string; body: string; status: string; created_at: string;
  message_replies: { id: string; body: string; author_id: string | null; created_at: string }[];
};

const input = "w-full p-3 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-toffeeBrown";
const button = "px-5 py-2.5 rounded-full bg-toffeeBrown hover:bg-coffeeBean text-white text-xs font-bold disabled:opacity-60";

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <form ref={formRef} action={action} className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
        <h2 className="font-serif text-lg font-bold">{t.account.newMessage}</h2>
        <label className="block text-xs font-semibold">{t.account.subject}
          <input name="subject" required maxLength={200} className={`${input} mt-1`} />
        </label>
        {requests.length > 0 && (
          <label className="block text-xs font-semibold">{t.common.reference} ({t.common.optional})
            <select name="request_id" className={`${input} mt-1`} defaultValue="">
              <option value="">—</option>
              {requests.map((r) => <option key={r.id} value={r.id}>{r.reference}</option>)}
            </select>
          </label>
        )}
        <label className="block text-xs font-semibold">{t.account.message}
          <textarea name="body" required rows={5} maxLength={5000} className={`${input} mt-1`} />
        </label>
        {state?.error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{t.common.errorGeneric}</p>}
        <button type="submit" disabled={pending} className={button}>{pending ? t.common.saving : t.account.send}</button>
      </form>

      <div className="lg:col-span-2 space-y-4">
        {threads.length === 0 && <p className="text-sm py-8 text-center">{t.account.noMessages}</p>}
        {threads.map((m) => (
          <article key={m.id} className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
            <header className="flex flex-wrap justify-between gap-2">
              <h3 className="font-bold">{m.subject}</h3>
              <time className="text-xs opacity-70" dateTime={m.created_at}>{formatDateTime(m.created_at, language)}</time>
            </header>
            <p className="text-sm whitespace-pre-line">{m.body}</p>
            {m.message_replies
              .slice()
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((r) => (
                <div key={r.id} className={`p-3 rounded-2xl text-sm ${r.author_id === viewerId ? "bg-tan/15 ms-8" : "bg-toffeeBrown/10 me-8"}`}>
                  <p className="text-[11px] font-bold mb-1">
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
    <form ref={formRef} action={action} className="flex gap-2 items-end pt-2">
      <input type="hidden" name="message_id" value={messageId} />
      <label className="flex-1 text-xs font-semibold">
        <span className="sr-only">{t.account.reply}</span>
        <textarea name="body" required rows={2} maxLength={5000} placeholder={t.account.reply} className={input} />
      </label>
      <button type="submit" disabled={pending} className={button}>{t.account.send}</button>
    </form>
  );
}
