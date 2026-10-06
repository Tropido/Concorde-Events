import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assignMessageToMe, setMessageStatus } from "@/lib/actions/admin";
import { ActionButton } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils/formatters";
import { ReplyForm, TicketForm } from "./forms";
import type { MessageChannel, MessageStatus } from "@/lib/types";

type Msg = {
  id: string; channel: MessageChannel; status: MessageStatus; name: string | null; email: string | null; phone: string | null;
  country: string | null; subject: string; body: string; created_at: string;
  request: { id: string; reference: string } | null; assignee: { full_name: string | null } | null;
  message_replies: { id: string; body: string; internal: boolean; created_at: string; author: { full_name: string | null } | null }[];
};

const CHANNELS: MessageChannel[] = ["site", "contact", "whatsapp"];
const STATUSES: MessageStatus[] = ["open", "in_progress", "resolved"];

export default async function AdminInboxPage({ searchParams }: { searchParams: Promise<{ channel?: string; status?: string; new?: string; ref?: string }> }) {
  const [{ t, prefs }, , sp] = await Promise.all([getT(), requireStaff(), searchParams]);
  const a = t.admin.inbox;
  const db = await createClient();
  let q = db.from("messages")
    .select("id, channel, status, name, email, phone, country, subject, body, created_at, request:rental_requests(id, reference), assignee:profiles!messages_assignee_id_fkey(full_name), message_replies(id, body, internal, created_at, author:profiles!message_replies_author_id_fkey(full_name))")
    .order("created_at", { ascending: false }).limit(100);
  if (CHANNELS.includes(sp.channel as MessageChannel)) q = q.eq("channel", sp.channel!);
  q = STATUSES.includes(sp.status as MessageStatus) ? q.eq("status", sp.status!) : q.neq("status", "resolved");
  const { data, error } = await q;
  if (error) throw error;
  const messages = (data ?? []) as unknown as Msg[];
  const filter = (k: string, v: string | undefined) => {
    const p = new URLSearchParams({ ...(sp.channel ? { channel: sp.channel } : {}), ...(sp.status ? { status: sp.status } : {}) });
    if (v) p.set(k, v); else p.delete(k);
    return `/admin/inbox?${p}`;
  };

  return (
    <>
      <h1 className="text-2xl font-serif font-bold">{t.admin.nav.inbox}</h1>
      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <Link href={filter("channel", undefined)} className="px-3 py-1.5 rounded-full border border-tan/40">{t.common.all}</Link>
        {CHANNELS.map((c) => <Link key={c} href={filter("channel", c)} aria-current={sp.channel === c ? "page" : undefined} className="px-3 py-1.5 rounded-full border border-tan/40 aria-[current=page]:bg-toffeeBrown aria-[current=page]:text-white">{a.channel[c]}</Link>)}
        <span className="mx-2" aria-hidden>|</span>
        {STATUSES.map((s) => <Link key={s} href={filter("status", s)} aria-current={sp.status === s ? "page" : undefined} className="px-3 py-1.5 rounded-full border border-tan/40 aria-[current=page]:bg-toffeeBrown aria-[current=page]:text-white">{a.status[s]}</Link>)}
      </div>

      <details open={sp.new === "1"} className="apple-card rounded-3xl border border-tan/30 p-5">
        <summary className="cursor-pointer font-bold">{a.newTicket}</summary>
        <TicketForm reference={sp.ref} />
      </details>

      {messages.length === 0 ? <p className="text-sm">{a.empty}</p> : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li key={m.id} className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-toffeeBrown dark:text-tan">{a.channel[m.channel]} · {a.status[m.status]}</p>
                  <h2 className="font-bold">{m.subject}</h2>
                  <p className="text-xs">
                    {a.from}: {m.name ?? "—"} {m.email && <bdi dir="ltr">· {m.email}</bdi>} {m.phone && <bdi dir="ltr">· {m.phone}</bdi>} {m.country && `· ${m.country}`}
                    {m.request && <> · <Link href={`/admin/requests/${m.request.id}`} className="underline"><bdi>{m.request.reference}</bdi></Link></>}
                  </p>
                </div>
                <div className="text-xs text-end space-y-1">
                  <p>{formatDateTime(m.created_at, prefs.lang)}</p>
                  <p>{t.admin.requests.assignedTo}: {m.assignee?.full_name ?? t.admin.requests.unassigned}</p>
                </div>
              </div>
              <p className="text-sm whitespace-pre-line">{m.body}</p>
              {m.message_replies.sort((x, y) => x.created_at.localeCompare(y.created_at)).map((r) => (
                <div key={r.id} className={`p-3 rounded-2xl text-sm ${r.internal ? "bg-amber-500/10 border border-amber-500/30" : "bg-tan/15"}`}>
                  <p className="text-[11px] font-bold mb-1">{r.author?.full_name ?? "—"} · {formatDateTime(r.created_at, prefs.lang)}{r.internal && ` · ${a.internal}`}</p>
                  <p className="whitespace-pre-line">{r.body}</p>
                </div>
              ))}
              <ReplyForm messageId={m.id} canReplyPublicly={m.channel === "site"} />
              <div className="flex flex-wrap gap-2">
                <ActionButton action={assignMessageToMe.bind(null, m.id)}>{a.assignMe}</ActionButton>
                {STATUSES.filter((s) => s !== m.status).map((s) => (
                  <ActionButton key={s} action={setMessageStatus.bind(null, m.id, s)}>{a.status[s]}</ActionButton>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
