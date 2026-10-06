import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setAccountStatus } from "@/lib/actions/admin";
import { ActionButton, btnDanger, btnPrimary } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils/formatters";
import { NotesForm, RoleSelect } from "./forms";
import type { AccountStatus, AppRole } from "@/lib/types";

type Row = {
  id: string; email: string; full_name: string | null; company_name: string | null; phone: string | null; vat_number: string | null;
  country: string | null; role: AppRole; status: AccountStatus; created_at: string;
  client_notes: { notes: string; flags: string[]; level: string | null } | null;
};

export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const [{ t, prefs }, viewer, sp] = await Promise.all([getT(), requireStaff(), searchParams]);
  const a = t.admin.clients;
  const pendingOnly = sp.view !== "all";
  const db = await createClient();
  let q = db.from("profiles")
    .select("id, email, full_name, company_name, phone, vat_number, country, role, status, created_at, client_notes(notes, flags, level)")
    .order("created_at", { ascending: false }).limit(200);
  if (pendingOnly) q = q.eq("status", "pending");
  if (sp.q) q = q.or(`email.ilike.%${sp.q.replace(/[%,()]/g, "")}%,full_name.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];
  const isAdmin = viewer.role === "admin";

  return (
    <>
      <h1 className="text-2xl font-serif font-bold">{t.admin.nav.clients}</h1>
      <div className="flex flex-wrap items-end gap-3">
        <Link href="/admin/clients" aria-current={pendingOnly ? "page" : undefined} className="px-3 py-1.5 rounded-full border border-tan/40 text-xs font-bold aria-[current=page]:bg-toffeeBrown aria-[current=page]:text-white">{a.pending}</Link>
        <Link href="/admin/clients?view=all" aria-current={!pendingOnly ? "page" : undefined} className="px-3 py-1.5 rounded-full border border-tan/40 text-xs font-bold aria-[current=page]:bg-toffeeBrown aria-[current=page]:text-white">{a.all}</Link>
        <form role="search" className="flex gap-2">
          <input type="hidden" name="view" value="all" />
          <label className="sr-only" htmlFor="client-q">{t.common.search}</label>
          <input id="client-q" name="q" defaultValue={sp.q ?? ""} className="p-2 rounded-xl border border-tan/40 bg-white dark:bg-darkBg text-sm" />
          <button type="submit" className="px-4 py-2 rounded-full bg-toffeeBrown text-white text-xs font-bold">{t.common.search}</button>
        </form>
      </div>
      {rows.length === 0 ? <p className="text-sm">{a.empty}</p> : (
        <ul className="space-y-4">
          {rows.map((p) => (
            <li key={p.id} className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-3">
                <div className="text-sm">
                  <p className="font-bold">{p.full_name ?? "—"} {p.company_name && <span className="font-normal">· {p.company_name}</span>}</p>
                  <p className="text-xs"><bdi dir="ltr">{p.email}</bdi>{p.phone && <> · <bdi dir="ltr">{p.phone}</bdi></>}{p.vat_number && ` · ${p.vat_number}`}{p.country && ` · ${p.country}`}</p>
                  <p className="text-xs opacity-70">{a.joined} {formatDateTime(p.created_at, prefs.lang)}</p>
                </div>
                <div className="text-xs text-end space-y-1">
                  <p>{a.role}: <strong>{a.roleLabels[p.role]}</strong></p>
                  <p>{a.status}: <strong>{a.statusLabels[p.status]}</strong></p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {p.status !== "approved" && <ActionButton action={setAccountStatus.bind(null, p.id, "approved")} className={btnPrimary}>{p.status === "suspended" ? a.reactivate : a.approve}</ActionButton>}
                {p.status === "pending" && <ActionButton action={setAccountStatus.bind(null, p.id, "rejected")} className={btnDanger} confirm>{a.reject}</ActionButton>}
                {p.status === "approved" && p.id !== viewer.id && <ActionButton action={setAccountStatus.bind(null, p.id, "suspended")} className={btnDanger} confirm>{a.suspend}</ActionButton>}
                {isAdmin && <RoleSelect profileId={p.id} role={p.role} />}
              </div>
              {(p.role === "customer" || p.role === "professional") && (
                <NotesForm profileId={p.id} notes={p.client_notes?.notes ?? ""} flags={p.client_notes?.flags ?? []} level={p.client_notes?.level ?? ""} />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
