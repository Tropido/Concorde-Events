"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, PackageCheck, PackageOpen } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { AreaChart, RankedBars, Ring, Sparkline } from "@/components/admin/charts";
import { Avatar, Panel } from "@/components/admin/ui";
import { PillTabs, ease } from "@/components/ui/kit";
import { StatusPill } from "@/components/ui/status";
import { cn, formatDay, formatNumber, formatTND } from "@/lib/utils/formatters";
import type { OverviewData } from "@/lib/admin/overview";

export function OverviewView({ data, name }: { data: OverviewData; name: string }) {
  const { t, language } = useApp();
  const o = t.admin.overview;
  const [metric, setMetric] = useState<"booked" | "requests">("booked");
  const money = (v: number) => formatTND(Math.round(v), language);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Tunis" }).format(new Date()));
  const greet = hour < 12 ? o.morning : hour < 18 ? o.afternoon : o.evening;
  const fmt = metric === "booked" ? money : (v: number) => formatNumber(Math.round(v), language);

  const kpis = [
    { label: o.kpiBooked, value: money(data.kpis.booked.value), delta: data.kpis.booked.delta, spark: data.kpis.booked.spark },
    { label: o.kpiRequests, value: formatNumber(data.kpis.requests.value, language), delta: data.kpis.requests.delta, spark: data.kpis.requests.spark },
    { label: o.kpiPipeline, value: money(data.kpis.pipeline.value), hint: o.quotesOpen(data.kpis.pipeline.count) },
    { label: o.kpiAverage, value: money(data.kpis.average.value), hint: o.last30 },
  ];

  return (
    <>
      <header className="card flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="text-sm text-ink/55">{formatDay(data.today, language, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="display text-4xl sm:text-5xl">{greet}{language === "ar" ? "، " : ", "}<bdi>{name.split(" ")[0]}</bdi></h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/requests?status=submitted" className="btn-ink btn-sm">{o.toReview}</Link>
          <Link href="/admin/inventory/new" className="btn-light btn-sm">{t.admin.inventory.newProduct}</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: i * 0.05 }} className="card min-w-0 space-y-3 p-4 sm:p-5">
            <p className="text-sm text-ink/60">{k.label}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{k.value}</p>
            <div className="flex items-end justify-between gap-2">
              {"delta" in k && k.delta !== undefined ? (
                k.delta === null ? <span className="text-xs text-ink/45">{o.noComparison}</span> : (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", k.delta >= 0 ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
                    {k.delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}<bdi dir="ltr">{k.delta > 0 ? "+" : ""}{k.delta}%</bdi>
                  </span>
                )
              ) : <span className="text-xs text-ink/45">{k.hint}</span>}
              {"spark" in k && k.spark && <span className="hidden sm:block"><Sparkline values={k.spark} label={k.label} /></span>}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={metric === "booked" ? o.chartBooked : o.chartRequests}
          action={<PillTabs label={o.chartMetric} value={metric} onChange={setMetric} options={[{ value: "booked", label: o.metricBooked }, { value: "requests", label: o.metricRequests }]} />}>
          <AreaChart label={metric === "booked" ? o.chartBooked : o.chartRequests} emptyLabel={o.chartEmpty} format={fmt}
            points={data.daily.map((d) => ({ key: d.day, label: formatDay(d.day, language, { day: "numeric", month: "short" }), value: d[metric], sub: metric === "booked" ? o.requestsCount(d.requests) : undefined }))} />
        </Panel>
        <Panel title={o.live} action={<Link href="/admin/requests" className="text-xs text-ink/55 hover:text-ink">{t.common.viewAll}</Link>}>
          {data.live.length === 0 ? <p className="text-sm text-ink/50">{t.admin.requests.empty}</p> : (
            <ul className="space-y-1">
              {data.live.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/requests/${r.id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-paper">
                    <Avatar name={r.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium"><bdi>{r.name}</bdi>{r.tier === "pro" && <span className="ms-1.5 rounded-full bg-ink px-1.5 py-0.5 text-[10px] text-card">PRO</span>}</p>
                      <p className="truncate font-mono text-[11px] text-ink/45"><bdi>{r.reference}</bdi> · {money(r.value)}</p>
                    </div>
                    <StatusPill status={r.status} label={t.requestStatus[r.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <Panel title={o.today}>
          <div className="space-y-4">
            <Movement icon={PackageOpen} title={o.departures} rows={data.departures} empty={o.noDepartures} />
            <Movement icon={PackageCheck} title={o.returns} rows={data.returns} empty={o.noReturns} />
          </div>
        </Panel>
        <Panel title={o.byCategory}>
          <RankedBars rows={data.categories} format={money} emptyLabel={o.chartEmpty} />
        </Panel>
        <Panel title={o.utilisation}>
          <Ring value={data.utilisation.usable ? data.utilisation.inUse / data.utilisation.usable : 0} label={o.utilisation}
            caption={o.unitsInUse(data.utilisation.inUse, data.utilisation.usable)} />
          <div className="mt-6 space-y-2 border-t border-line pt-4">
            {data.conflicts.length === 0
              ? <p className="text-sm text-ok">{o.conflictsNone}</p>
              : <Link href="/admin/rentals" className="block rounded-2xl bg-bad-soft p-3 text-sm text-bad">{o.conflictsCount(data.conflicts.length)}</Link>}
            {data.pendingPros.length > 0 && (
              <Link href="/admin/clients" className="block rounded-2xl bg-warn-soft p-3 text-sm text-warn">{o.pendingPros(data.pendingPros.length)}</Link>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

function Movement({ icon: Icon, title, rows, empty }: { icon: typeof PackageOpen; title: string; rows: OverviewData["departures"]; empty: string }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-ink/50" aria-hidden />{title}<span className="ms-auto font-mono text-xs text-ink/45">{rows.length}</span></p>
      {rows.length === 0 ? <p className="text-xs text-ink/45">{empty}</p> : (
        <ul className="space-y-1">
          {rows.slice(0, 4).map((r, i) => (
            <li key={`${r.id}-${i}`}><Link href={`/admin/requests/${r.id}`} className="flex justify-between gap-2 rounded-xl bg-paper px-3 py-2 text-xs hover:ring-1 hover:ring-line">
              <span className="truncate">{r.qty} × {r.item}</span><span className="shrink-0 text-ink/50">{r.name}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
