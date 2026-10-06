import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatDay } from "@/lib/utils/formatters";
import type { RequestStatus } from "@/lib/types";

const STATUSES: RequestStatus[] = ["submitted", "validated", "confirmed", "dispatched", "completed", "cancelled", "rejected"];

type Row = {
  id: string; reference: string; customer_name: string; company_name: string | null; country: string; status: RequestStatus;
  created_at: string; whatsapp_opened_at: string | null; contact_confirmed_at: string | null;
  assignee: { full_name: string | null } | null; request_lines: { start_date: string; end_date: string }[];
};

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; country?: string }> }) {
  const [{ t, prefs }, , sp] = await Promise.all([getT(), requireStaff(), searchParams]);
  const a = t.admin;
  const db = await createClient();
  let q = db.from("rental_requests")
    .select("id, reference, customer_name, company_name, country, status, created_at, whatsapp_opened_at, contact_confirmed_at, assignee:profiles!rental_requests_assignee_id_fkey(full_name), request_lines(start_date, end_date)")
    .order("created_at", { ascending: false }).limit(200);
  if (STATUSES.includes(sp.status as RequestStatus)) q = q.eq("status", sp.status!);
  if (sp.country === "FR" || sp.country === "TN") q = q.eq("country", sp.country);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <h1 className="text-2xl font-serif font-bold">{a.nav.requests}</h1>
      <form className="flex flex-wrap gap-3 items-end" role="search">
        <label className="text-xs font-semibold">{t.common.status}
          <select name="status" defaultValue={sp.status ?? ""} className="block mt-1 p-2 rounded-xl border border-tan/40 bg-white dark:bg-darkBg text-sm">
            <option value="">{a.requests.filterAll}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t.requestStatus[s]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">{t.common.country}
          <select name="country" defaultValue={sp.country ?? ""} className="block mt-1 p-2 rounded-xl border border-tan/40 bg-white dark:bg-darkBg text-sm">
            <option value="">{t.common.all}</option>
            <option value="FR">{t.common.france}</option>
            <option value="TN">{t.common.tunisia}</option>
          </select>
        </label>
        <button type="submit" className="px-4 py-2 rounded-full bg-toffeeBrown text-white text-xs font-bold">{t.common.search}</button>
      </form>

      {rows.length === 0 ? <p className="text-sm">{a.requests.empty}</p> : (
        <div className="overflow-x-auto apple-card rounded-3xl border border-tan/30">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-toffeeBrown dark:text-tan">
              <tr className="border-b border-tan/30">
                <th scope="col" className="p-3 text-start">{t.common.reference}</th>
                <th scope="col" className="p-3 text-start">{a.requests.client}</th>
                <th scope="col" className="p-3 text-start">{t.common.country}</th>
                <th scope="col" className="p-3 text-start">{t.common.status}</th>
                <th scope="col" className="p-3 text-start">{a.requests.window}</th>
                <th scope="col" className="p-3 text-start">{a.requests.created}</th>
                <th scope="col" className="p-3 text-start">WhatsApp</th>
                <th scope="col" className="p-3 text-start">{a.requests.assignedTo}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const starts = r.request_lines.map((l) => l.start_date).sort();
                const ends = r.request_lines.map((l) => l.end_date).sort();
                return (
                  <tr key={r.id} className="border-b border-tan/15 hover:bg-tan/10">
                    <td className="p-3"><Link href={`/admin/requests/${r.id}`} className="font-bold underline"><bdi>{r.reference}</bdi></Link></td>
                    <td className="p-3">{r.customer_name}{r.company_name && <span className="block text-xs opacity-70">{r.company_name}</span>}</td>
                    <td className="p-3">{r.country}</td>
                    <td className="p-3">{t.requestStatus[r.status]}</td>
                    <td className="p-3 whitespace-nowrap">{starts[0] && <><bdi>{formatDay(starts[0], prefs.lang)}</bdi> → <bdi>{formatDay(ends[ends.length - 1], prefs.lang)}</bdi></>}</td>
                    <td className="p-3 whitespace-nowrap text-xs">{formatDateTime(r.created_at, prefs.lang)}</td>
                    <td className="p-3 text-xs">
                      {r.contact_confirmed_at ? `✓ ${a.requests.contactConfirmed}` : r.whatsapp_opened_at ? a.requests.whatsappOpened : "—"}
                    </td>
                    <td className="p-3 text-xs">{r.assignee?.full_name ?? a.requests.unassigned}</td>
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
