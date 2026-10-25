import Link from "next/link";
import { Search } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar, FilterLinks, PageHeader } from "@/components/admin/ui";
import { StatusPill } from "@/components/ui/status";
import { formatDateTime, formatDay, formatTND } from "@/lib/utils/formatters";
import type { RequestStatus } from "@/lib/types";

const STATUSES: RequestStatus[] = ["submitted", "validated", "confirmed", "dispatched", "completed", "cancelled", "rejected"];

type Row = {
  id: string; reference: string; customer_name: string; company_name: string | null; status: RequestStatus; tier: string;
  created_at: string; event_type: string | null; guest_count: number | null; whatsapp_opened_at: string | null; contact_confirmed_at: string | null;
  assignee: { full_name: string | null } | null; request_lines: { quantity: number; start_date: string; end_date: string; line_total: number }[];
};

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const [{ t, prefs }, , sp] = await Promise.all([getT(), requireStaff(), searchParams]);
  const a = t.admin.requests;
  const db = await createClient();
  const status = STATUSES.includes(sp.status as RequestStatus) ? (sp.status as RequestStatus) : null;
  let q = db.from("rental_requests")
    .select("id, reference, customer_name, company_name, status, tier, created_at, event_type, guest_count, whatsapp_opened_at, contact_confirmed_at, assignee:profiles!rental_requests_assignee_id_fkey(full_name), request_lines(quantity, start_date, end_date, line_total)")
    .order("created_at", { ascending: false }).limit(300);
  if (status) q = q.eq("status", status);
  // Keep only characters that cannot alter the PostgREST filter syntax.
  const needle = (sp.q ?? "").replace(/[^\p{L}\p{N}@._+\- ]/gu, "").trim().slice(0, 80);
  if (needle) q = q.or(`reference.ilike."*${needle}*",customer_name.ilike."*${needle}*",company_name.ilike."*${needle}*"`);
  const [{ data, error }, all] = await Promise.all([q, db.from("rental_requests").select("status")]);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];
  const counts = new Map<string, number>();
  for (const r of all.data ?? []) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  const href = (s: string | null) => `/admin/requests${s ? `?status=${s}` : ""}`;
  const next: Partial<Record<RequestStatus, string>> = { submitted: a.nextQuote, validated: a.nextConfirm, confirmed: a.nextDispatch, dispatched: a.nextReturn };

  return (
    <>
      <PageHeader title={t.admin.nav.requests} subtitle={a.subtitle(counts.get("submitted") ?? 0)} />
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <FilterLinks label={t.common.status} items={[
          { href: href(null), label: t.common.all, count: all.data?.length ?? 0, active: !status },
          ...STATUSES.map((s) => ({ href: href(s), label: t.requestStatus[s], count: counts.get(s) ?? 0, active: status === s })),
        ]} />
        <form role="search" className="relative lg:ms-auto lg:w-72">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="sr-only" htmlFor="req-q">{t.common.search}</label>
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden />
          <input id="req-q" name="q" defaultValue={sp.q ?? ""} placeholder={a.searchPlaceholder} className="h-10 w-full rounded-full bg-card ps-10 pe-4 text-sm ring-1 ring-line focus:outline-none focus:ring-ink/40" />
        </form>
      </div>

      {rows.length === 0 ? <p className="card p-12 text-center text-sm text-ink/55">{a.empty}</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-line text-start">
                {[t.common.reference, a.client, a.event, a.window, t.common.total, t.common.status, ""].map((h, i) => (
                  <th key={i} scope="col" className="label px-4 py-3 text-start first:ps-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const starts = r.request_lines.map((l) => l.start_date).sort();
                const ends = r.request_lines.map((l) => l.end_date).sort();
                const total = r.request_lines.reduce((s, l) => s + Number(l.line_total), 0);
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3 ps-6">
                      <Link href={`/admin/requests/${r.id}`} className="font-mono text-xs font-medium hover:underline"><bdi>{r.reference}</bdi></Link>
                      <p className="text-[11px] text-ink/45">{formatDateTime(r.created_at, prefs.lang)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.customer_name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.customer_name}{r.tier === "pro" && <span className="ms-1.5 rounded-full bg-ink px-1.5 py-0.5 text-[10px] text-card">PRO</span>}</p>
                          <p className="truncate text-xs text-ink/50">{r.company_name ?? (r.contact_confirmed_at ? a.contactConfirmed : r.whatsapp_opened_at ? a.whatsappOpened : a.noContactYet)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.event_type ? t.eventTypes[r.event_type as keyof typeof t.eventTypes] : "—"}{r.guest_count ? <span className="block text-ink/45">{t.quote.guests(r.guest_count)}</span> : null}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{starts[0] && <><bdi>{formatDay(starts[0], prefs.lang, { day: "numeric", month: "short" })}</bdi> – <bdi>{formatDay(ends[ends.length - 1], prefs.lang, { day: "numeric", month: "short" })}</bdi></>}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatTND(total, prefs.lang)}</td>
                    <td className="px-4 py-3"><StatusPill status={r.status} label={t.requestStatus[r.status]} /></td>
                    <td className="px-4 py-3 pe-6 text-end">
                      <Link href={`/admin/requests/${r.id}`} className={next[r.status] ? "btn-ink btn-sm" : "btn-light btn-sm"}>{next[r.status] ?? t.common.open}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
