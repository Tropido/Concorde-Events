import Link from "next/link";
import { Globe, Mail, MessageCircle, Phone } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assignMessageToMe, setMessageStatus } from "@/lib/actions/admin";
import { ActionButton, Avatar, FilterLinks, PageHeader } from "@/components/admin/ui";
import { MessagePill } from "@/components/ui/status";
import { cn, formatDateTime } from "@/lib/utils/formatters";
import { NewTicketButton, ReplyComposer } from "./forms";
import type { MessageChannel, MessageStatus } from "@/lib/types";

type Msg = {
  id: string; channel: MessageChannel; status: MessageStatus; name: string | null; email: string | null; phone: string | null;
  subject: string; body: string; created_at: string; updated_at: string;
  request: { id: string; reference: string } | null; assignee: { full_name: string | null } | null;
  message_replies: { id: string; body: string; internal: boolean; created_at: string; author: { full_name: string | null } | null }[];
};

const CHANNELS: MessageChannel[] = ["whatsapp", "site", "contact"];
const STATUSES: MessageStatus[] = ["open", "in_progress", "resolved"];
const icons = { whatsapp: MessageCircle, site: Globe, contact: Mail };

export default async function AdminInboxPage({ searchParams }: { searchParams: Promise<{ channel?: string; status?: string; id?: string; new?: string; ref?: string }> }) {
  const [{ t, prefs }, , sp] = await Promise.all([getT(), requireStaff(), searchParams]);
  const a = t.admin.inbox;
  const db = await createClient();
  const channel = CHANNELS.includes(sp.channel as MessageChannel) ? (sp.channel as MessageChannel) : null;
  const status = STATUSES.includes(sp.status as MessageStatus) ? (sp.status as MessageStatus) : null;
  let q = db.from("messages")
    .select("id, channel, status, name, email, phone, subject, body, created_at, updated_at, request:rental_requests(id, reference), assignee:profiles!messages_assignee_id_fkey(full_name), message_replies(id, body, internal, created_at, author:profiles!message_replies_author_id_fkey(full_name))")
    .order("updated_at", { ascending: false }).limit(150);
  if (channel) q = q.eq("channel", channel);
  q = status ? q.eq("status", status) : q.neq("status", "resolved");
  const [{ data, error }, counts] = await Promise.all([q, db.from("messages").select("channel, status").neq("status", "resolved")]);
  if (error) throw error;
  const messages = (data ?? []) as unknown as Msg[];
  const selected = messages.find((m) => m.id === sp.id) ?? messages[0];
  const byChannel = new Map<string, number>();
  for (const c of counts.data ?? []) byChannel.set(c.channel, (byChannel.get(c.channel) ?? 0) + 1);
  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { channel, status, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/inbox${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title={t.admin.nav.inbox} subtitle={a.subtitle} actions={<NewTicketButton reference={sp.ref} open={sp.new === "1"} />} />
      <div className="flex flex-col gap-2.5 lg:flex-row">
        <FilterLinks label={a.channelLabel} items={[
          { href: link({ channel: null, id: null }), label: t.common.all, count: counts.data?.length ?? 0, active: !channel },
          ...CHANNELS.map((c) => ({ href: link({ channel: c, id: null }), label: a.channel[c], count: byChannel.get(c) ?? 0, active: channel === c })),
        ]} />
        <FilterLinks label={t.common.status} items={[
          { href: link({ status: null, id: null }), label: a.unresolved, active: !status },
          ...STATUSES.map((s) => ({ href: link({ status: s, id: null }), label: a.status[s], active: status === s })),
        ]} />
      </div>

      {messages.length === 0 ? <p className="card p-12 text-center text-sm text-ink/55">{a.empty}</p> : (
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <ul className="card max-h-[75vh] space-y-1 overflow-y-auto p-2">
            {messages.map((m) => {
              const Icon = icons[m.channel];
              return (
                <li key={m.id}>
                  <Link href={link({ id: m.id })} aria-current={selected?.id === m.id ? "true" : undefined}
                    className={cn("flex gap-3 rounded-2xl p-3", selected?.id === m.id ? "bg-paper ring-1 ring-line" : "hover:bg-paper/60")}>
                    <span className="relative">
                      <Avatar name={m.name} className="h-10 w-10" />
                      <span className="absolute -bottom-0.5 -end-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-card ring-1 ring-line"><Icon className="h-3 w-3" aria-label={a.channel[m.channel]} /></span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">{m.name ?? "—"}</p>
                        <time className="shrink-0 text-[11px] text-ink/45" dateTime={m.updated_at}>{formatDateTime(m.updated_at, prefs.lang)}</time>
                      </div>
                      <p className="truncate text-xs text-ink/70">{m.subject}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <MessagePill status={m.status} label={a.status[m.status]} />
                        {m.request && <span className="font-mono text-[11px] text-ink/45"><bdi>{m.request.reference}</bdi></span>}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {selected && (
            <section className="card flex min-h-[60vh] flex-col" aria-labelledby="thread-title">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
                <div className="space-y-1">
                  <p className="label">{a.channel[selected.channel]}</p>
                  <h2 id="thread-title" className="text-xl font-semibold tracking-tight">{selected.subject}</h2>
                  <p className="text-sm text-ink/60">
                    {selected.name}{selected.phone && <> · <bdi dir="ltr">{selected.phone}</bdi></>}{selected.email && <> · <bdi dir="ltr">{selected.email}</bdi></>}
                    {selected.request && <> · <Link href={`/admin/requests/${selected.request.id}`} className="font-mono underline"><bdi>{selected.request.reference}</bdi></Link></>}
                  </p>
                  <p className="text-xs text-ink/45">{t.admin.requests.assignedTo}: {selected.assignee?.full_name ?? t.admin.requests.unassigned}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.phone && <a href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`} className="btn-light btn-sm" aria-label={t.admin.requests.call}><Phone className="h-4 w-4" /></a>}
                  <ActionButton action={assignMessageToMe.bind(null, selected.id)}>{a.assignMe}</ActionButton>
                  {STATUSES.filter((s) => s !== selected.status).map((s) => (
                    <ActionButton key={s} action={setMessageStatus.bind(null, selected.id, s)} className={s === "resolved" ? "btn-ink btn-sm" : "btn-light btn-sm"}>{a.moveTo[s]}</ActionButton>
                  ))}
                </div>
              </header>
              <ol className="flex-1 space-y-3 overflow-y-auto p-5">
                <li className="max-w-[80%] rounded-2xl rounded-ss-md bg-paper p-4 text-sm">
                  <p className="mb-1 text-[11px] text-ink/50">{selected.name} · {formatDateTime(selected.created_at, prefs.lang)}</p>
                  <p className="whitespace-pre-line">{selected.body}</p>
                </li>
                {[...selected.message_replies].sort((x, y) => x.created_at.localeCompare(y.created_at)).map((r) => {
                  const viaWa = r.body.startsWith("[WhatsApp] ");
                  return (
                    <li key={r.id} className={cn("ms-auto max-w-[80%] rounded-2xl rounded-se-md p-4 text-sm", viaWa ? "bg-ink text-card" : r.internal ? "bg-warn-soft" : "bg-tone-sand")}>
                      <p className={cn("mb-1 text-[11px]", viaWa ? "text-almondCream/60" : "text-ink/50")}>
                        {r.author?.full_name ?? "—"} · {formatDateTime(r.created_at, prefs.lang)} · {viaWa ? a.sentWhatsapp : r.internal ? a.internal : a.publicReply}
                      </p>
                      <p className="whitespace-pre-line">{viaWa ? r.body.slice(11) : r.body}</p>
                    </li>
                  );
                })}
              </ol>
              <ReplyComposer messageId={selected.id} channel={selected.channel} phone={selected.phone} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
