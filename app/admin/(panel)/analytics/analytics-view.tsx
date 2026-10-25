"use client";

import { useApp } from "@/lib/context/app-context";
import { ColumnChart, RankedBars } from "@/components/admin/charts";
import { Panel } from "@/components/admin/ui";
import { formatDay, formatNumber, formatTND } from "@/lib/utils/formatters";
import type { RequestStatus } from "@/lib/types";

export type AnalyticsData = {
  months: { month: string; value: number }[];
  statuses: { status: RequestStatus; count: number }[];
  events: { type: string; value: number }[];
  products: { title: string; units: number; revenue: number; cost: number; roi: number | null }[];
  split: { pro: number; retail: number };
  conversion: number | null;
  since: string;
};

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const { t, language } = useApp();
  const a = t.admin.analytics;
  const money = (v: number) => formatTND(Math.round(v), language);
  const totalYear = data.months.reduce((s, m) => s + m.value, 0);
  const split = data.split.pro + data.split.retail;

  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={a.bookedYear} value={money(totalYear)} />
        <Stat label={a.conversion} value={data.conversion === null ? "—" : `${Math.round(data.conversion * 100)}%`} hint={a.conversionHint} />
        <Stat label={a.proShare} value={split ? `${Math.round((data.split.pro / split) * 100)}%` : "—"} hint={money(data.split.pro)} />
        <Stat label={a.retailShare} value={split ? `${Math.round((data.split.retail / split) * 100)}%` : "—"} hint={money(data.split.retail)} />
      </div>
      <Panel title={a.booked}>
        <ColumnChart label={a.booked} emptyLabel={t.common.noData} format={money}
          cols={data.months.map((m) => ({ label: formatDay(`${m.month}-01`, language, { month: "short" }), value: m.value }))} />
        <p className="mt-3 text-xs text-ink/50">{a.bookedHint}</p>
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-2">
        <Panel title={a.countsByStatus}>
          <RankedBars emptyLabel={t.common.noData} format={(v) => formatNumber(v, language)}
            rows={data.statuses.filter((s) => s.count > 0).map((s) => ({ label: t.requestStatus[s.status], value: s.count }))} />
        </Panel>
        <Panel title={a.byEvent}>
          <RankedBars emptyLabel={t.common.noData} format={money}
            rows={data.events.map((e) => ({ label: t.eventTypes[e.type as keyof typeof t.eventTypes] ?? e.type, value: e.value }))} />
        </Panel>
      </div>
      <Panel title={a.assets}>
        {data.products.length === 0 ? <p className="text-sm text-ink/50">{t.common.noData}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="border-b border-line">{[a.piece, a.nightsBooked, a.revenue, a.cost, a.roi].map((h) => <th key={h} scope="col" className="label py-2 text-start last:text-end">{h}</th>)}</tr></thead>
              <tbody>
                {data.products.map((p) => (
                  <tr key={p.title} className="border-b border-line last:border-0">
                    <td className="py-3 font-medium">{p.title}</td>
                    <td className="py-3 tabular-nums">{formatNumber(p.units, language)}</td>
                    <td className="py-3 tabular-nums">{money(p.revenue)}</td>
                    <td className="py-3 tabular-nums text-ink/60">{p.cost ? money(p.cost) : "—"}</td>
                    <td className="py-3 text-end tabular-nums">
                      {p.roi === null ? <span className="text-ink/40">{a.noCost}</span> : (
                        <span className={p.roi >= 1 ? "rounded-full bg-ok-soft px-2 py-0.5 text-ok" : "rounded-full bg-paper px-2 py-0.5"}>{Math.round(p.roi * 100)}%</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-ink/50">{a.assetsHint}</p>
      </Panel>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink/45">{hint}</p>}
    </div>
  );
}
