import Link from "next/link";
import { Search } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTiers } from "@/lib/tiers";
import { FilterLinks, PageHeader } from "@/components/admin/ui";
import { ClientCard, type ClientRow } from "./forms";
import { TagPill, type ClientTag } from "./tags";
import { cn } from "@/lib/utils/formatters";

type View = "pending" | "pros" | "plus" | "customers" | "staff" | "inactive";
const VIEWS: View[] = ["pending", "pros", "plus", "customers", "staff", "inactive"];

export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; tags?: string }> }) {
  const [{ t, prefs }, viewer, sp] = await Promise.all([getT(), requireStaff(), searchParams]);
  const a = t.admin.clients;
  const db = await createClient();
  const view: View = VIEWS.includes(sp.view as View) ? (sp.view as View) : "pending";
  let q = db.from("profiles")
    .select("id, email, full_name, company_name, phone, vat_number, activity, city, website, event_type, role, status, created_at, client_notes(notes, level), client_tag_links!client_tag_links_profile_id_fkey(tag_id), pro_accounts(tier_code, tier_locked, points, custom_discount_percent, extra_benefits)")
    .order("created_at", { ascending: false }).limit(200);
  if (view === "pending") q = q.eq("status", "pending");
  if (view === "pros") q = q.eq("role", "professional").neq("status", "pending");
  if (view === "plus") q = q.eq("role", "customer_plus").eq("status", "approved");
  if (view === "customers") q = q.eq("role", "customer").eq("status", "approved");
  if (view === "staff") q = q.in("role", ["editor", "manager", "admin"]);
  if (view === "inactive") q = q.in("status", ["rejected", "suspended"]);
  // Keep only characters that cannot alter the PostgREST filter syntax.
  const needle = (sp.q ?? "").replace(/[^\p{L}\p{N}@._+\- ]/gu, "").trim().slice(0, 80);
  if (needle) q = q.or(`email.ilike."*${needle}*",full_name.ilike."*${needle}*",company_name.ilike."*${needle}*",phone.ilike."*${needle}*"`);

  const { data: tagRows } = await db.from("client_tags").select("id, slug, label_fr, label_en, label_ar, color, is_system, created_by, archived_at").order("is_system", { ascending: false }).order("label_fr");
  const tags = (tagRows ?? []) as ClientTag[];
  // Several labels narrow the list: a client must carry all of them.
  const selected = (sp.tags ?? "").split(",").filter((x) => tags.some((tag) => tag.id === x));
  if (selected.length) {
    const { data: links } = await db.from("client_tag_links").select("profile_id, tag_id").in("tag_id", selected);
    const hits = new Map<string, number>();
    for (const l of links ?? []) hits.set(l.profile_id, (hits.get(l.profile_id) ?? 0) + 1);
    q = q.in("id", [...hits].filter(([, n]) => n === selected.length).map(([id]) => id));
  }
  const tagHref = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    const params = new URLSearchParams({ view, ...(sp.q ? { q: sp.q } : {}), ...(next.length ? { tags: next.join(",") } : {}) });
    return `/admin/clients?${params}`;
  };

  const [{ data, error }, all, reqs, tiers] = await Promise.all([
    q,
    db.from("profiles").select("role, status"),
    db.from("rental_requests").select("user_id, status, request_lines(line_total)").not("user_id", "is", null),
    getTiers(prefs.lang),
  ]);
  if (error) throw error;
  const stats = new Map<string, { requests: number; booked: number }>();
  for (const r of reqs.data ?? []) {
    const s = stats.get(r.user_id!) ?? { requests: 0, booked: 0 };
    s.requests += 1;
    if (["confirmed", "dispatched", "completed"].includes(r.status)) s.booked += (r.request_lines as { line_total: number }[]).reduce((x, l) => x + Number(l.line_total), 0);
    stats.set(r.user_id!, s);
  }
  const rows = ((data ?? []) as unknown as ClientRow[]).map((r) => ({ ...r, stats: stats.get(r.id) ?? { requests: 0, booked: 0 } }));
  const count = (v: View) => (all.data ?? []).filter((p) =>
    v === "pending" ? p.status === "pending"
    : v === "pros" ? p.role === "professional" && p.status !== "pending"
    : v === "plus" ? p.role === "customer_plus" && p.status === "approved"
    : v === "customers" ? p.role === "customer" && p.status === "approved"
    : v === "staff" ? ["editor", "manager", "admin"].includes(p.role)
    : ["rejected", "suspended"].includes(p.status)).length;

  return (
    <>
      <PageHeader title={t.admin.nav.clients} subtitle={a.subtitle} />
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <FilterLinks label={a.views.label} items={VIEWS.map((v) => ({ href: `/admin/clients?view=${v}`, label: a.views[v], count: count(v), active: view === v }))} />
        <form role="search" className="relative lg:ms-auto lg:w-72">
          <input type="hidden" name="view" value={view} />
          <label className="sr-only" htmlFor="client-q">{t.common.search}</label>
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden />
          <input id="client-q" name="q" defaultValue={sp.q ?? ""} placeholder={a.searchPlaceholder} className="h-10 w-full rounded-full bg-card ps-10 pe-4 text-sm ring-1 ring-line focus:outline-none focus:ring-ink/40" />
        </form>
      </div>
      <nav aria-label={a.tagFilter} className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
        {tags.filter((x) => !x.archived_at).map((x) => (
          <Link key={x.id} href={tagHref(x.id)} aria-current={selected.includes(x.id) ? "true" : undefined} className={cn("shrink-0 rounded-full ring-2", selected.includes(x.id) ? "ring-ink" : "ring-transparent hover:ring-line")}><TagPill tag={x} className="block px-2.5 py-1" /></Link>
        ))}
      </nav>
      {rows.length === 0 ? <p className="card p-12 text-center text-sm text-ink/55">{view === "pending" ? a.noPending : a.empty}</p> : (
        <ul className="space-y-2.5">
          {rows.map((p) => <li key={p.id}><ClientCard client={p} tiers={tiers} tags={tags} isAdmin={viewer.role === "admin"} selfId={viewer.id} defaultOpen={view === "pending"} /></li>)}
        </ul>
      )}
    </>
  );
}
