import Link from "next/link";
import { Download } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FilterLinks, PageHeader, Panel } from "@/components/admin/ui";
import { formatDay, formatTND } from "@/lib/utils/formatters";
import { TtnTable, type InvoiceListRow } from "./ttn-table";
import { loadInvoices, type InvoiceFilters } from "./load";

const TYPES = ["deposit", "final", "credit_note"] as const;
const TTN = ["not_sent", "sent", "accepted", "rejected"] as const;

export default async function AdminInvoicesPage({ searchParams }: { searchParams: Promise<InvoiceFilters> }) {
  const [{ t, prefs }, , sp] = await Promise.all([getT(), requireStaff(), searchParams]);
  const a = t.order.invoicesPage;
  const db = await createClient();
  const rows = await loadInvoices(db, sp);
  const money = (v: number) => formatTND(v, prefs.lang);
  const href = (patch: Partial<InvoiceFilters>) => {
    const next = { ...sp, ...patch };
    const q = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `/admin/invoices${q.size ? `?${q}` : ""}`;
  };
  const months = [...new Set(rows.map((r) => r.issued_at.slice(0, 7)))].sort().reverse();
  // A credit note takes its amounts off the month it was issued in.
  const sign = (r: InvoiceListRow) => (r.type === "credit_note" ? -1 : 1);
  const totals = months.map((m) => {
    const of = rows.filter((r) => r.issued_at.startsWith(m));
    const sum = (k: "ht" | "tva" | "ttc") => of.reduce((s, r) => s + sign(r) * Number(r[k]), 0);
    return { month: m, ht: sum("ht"), tva: sum("tva"), ttc: sum("ttc") };
  });

  return (
    <>
      <PageHeader title={a.title} subtitle={a.subtitle}
        actions={<a href={`/admin/invoices/export?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`} className="btn-light btn-sm"><Download className="h-4 w-4" aria-hidden />{a.export}</a>} />
      <div className="flex flex-wrap gap-2.5">
        <FilterLinks label={a.type} items={[{ href: href({ type: undefined }), label: a.allTypes, active: !sp.type }, ...TYPES.map((x) => ({ href: href({ type: x }), label: t.order.invoiceTypes[x], active: sp.type === x }))]} />
        <FilterLinks label={a.ttn} items={[{ href: href({ ttn: undefined }), label: a.allTtn, active: !sp.ttn }, ...TTN.map((x) => ({ href: href({ ttn: x }), label: a.ttnStatus[x], active: sp.ttn === x }))]} />
        <FilterLinks label={a.unpaid} items={[{ href: href({ unpaid: sp.unpaid ? undefined : "1" }), label: a.unpaid, active: !!sp.unpaid }]} />
        {sp.month && <Link href={href({ month: undefined })} className="btn-light btn-sm">{sp.month} ×</Link>}
      </div>
      {rows.length === 0 ? <p className="card p-12 text-center text-sm text-ink/55">{a.empty}</p> : <TtnTable rows={rows} />}
      {totals.length > 0 && (
        <Panel title={a.monthTotals}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="border-b border-line">
                <th scope="col" className="label py-2 text-start">{a.month}</th>
                {[a.ht, a.tva, a.ttc].map((h) => <th key={h} scope="col" className="label py-2 text-end">{h}</th>)}
              </tr></thead>
              <tbody>
                {totals.map((m) => (
                  <tr key={m.month} className="border-b border-line last:border-0">
                    <td className="py-2.5"><Link href={href({ month: m.month })} className="capitalize hover:underline">{formatDay(`${m.month}-01`, prefs.lang, { month: "long", year: "numeric" })}</Link></td>
                    <td className="py-2.5 text-end tabular-nums">{money(m.ht)}</td>
                    <td className="py-2.5 text-end tabular-nums">{money(m.tva)}</td>
                    <td className="py-2.5 text-end font-medium tabular-nums">{money(m.ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <p className="px-1 text-xs text-ink/55">{a.ttnNote}</p>
    </>
  );
}
