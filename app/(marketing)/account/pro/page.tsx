import Link from "next/link";
import { Check } from "lucide-react";
import { getPrefs } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { requireViewer } from "@/lib/auth";
import { getCatalogue } from "@/lib/catalogue";
import { createClient } from "@/lib/supabase/server";
import { isApprovedPro } from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/utils/formatters";
import { MarginCalculator } from "./margin-calculator";

export default async function ProSpacePage() {
  const [prefs, viewer] = await Promise.all([getPrefs(), requireViewer("/account/pro")]);
  const t = translations[prefs.lang];
  const p = t.pro;
  if (viewer.role !== "professional") {
    return (
      <div className="card space-y-4 p-8">
        <p className="text-lg font-semibold tracking-tight">{t.account.proOnly}</p>
        <Link href="/professionnels" className="btn-ink">{p.learnMore}</Link>
      </div>
    );
  }
  const approved = isApprovedPro(viewer);
  const pro = viewer.pro;
  const supabase = await createClient();
  const [{ data: events }, catalogue] = await Promise.all([
    supabase.from("reward_events").select("id, points, reason, created_at, request:rental_requests(reference)").order("created_at", { ascending: false }).limit(20),
    approved ? getCatalogue(prefs, viewer) : Promise.resolve({ products: [] }),
  ]);
  const progress = pro?.next ? Math.min(100, Math.round(((pro.points - pro.tier.minPoints) / Math.max(1, pro.next.minPoints - pro.tier.minPoints)) * 100)) : 100;

  return (
    <>
      {pro && (
        <section className="grid gap-2.5 xl:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col justify-between gap-10 rounded-[1.75rem] bg-ink p-6 text-card sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-label text-almondCream/50">{p.yourTier}</p>
                <p className="display mt-2 text-5xl">{pro.tier.name}</p>
              </div>
              <span className="h-12 w-12 rounded-full ring-4 ring-almondCream/10" style={{ background: pro.tier.color === "#3d281a" ? "#ddb892" : pro.tier.color }} aria-hidden />
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between text-sm">
                <span><span className="text-3xl font-semibold tabular-nums">{formatNumber(pro.points, prefs.lang)}</span> <span className="text-almondCream/60">{p.points}</span></span>
                <span className="text-almondCream/60">{pro.next ? p.toNext(formatNumber(Math.max(0, pro.next.minPoints - pro.points), prefs.lang), pro.next.name) : p.topTier}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-almondCream/10" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={p.progress}>
                <div className="h-full rounded-full bg-tan" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-almondCream/55">{p.pointsRule}</p>
            </div>
          </div>
          <div className="card space-y-5 p-6 sm:p-8">
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-semibold tracking-tight">{p.yourBenefits}</p>
              <p className="display text-4xl">{pro.discount > 0 ? <bdi dir="ltr">−{pro.discount}%</bdi> : "—"}</p>
            </div>
            <ul className="space-y-2.5 text-sm">
              {pro.benefits.map((b) => <li key={b} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-toffeeBrown" aria-hidden />{b}</li>)}
            </ul>
            {!approved && <p className="rounded-2xl bg-warn-soft p-3 text-xs text-warn">{t.account.pendingBanner}</p>}
          </div>
        </section>
      )}

      {approved && (
        <section className="card space-y-5 p-6 sm:p-8" aria-labelledby="calc-title">
          <div>
            <h2 id="calc-title" className="text-xl font-semibold tracking-tight">{t.account.proToolsTitle}</h2>
            <p className="text-sm text-ink/55">{t.account.proToolsIntro}</p>
          </div>
          <MarginCalculator products={catalogue.products.filter((x) => x.price)} />
        </section>
      )}

      <section className="card p-6 sm:p-8" aria-labelledby="history-title">
        <h2 id="history-title" className="text-xl font-semibold tracking-tight">{p.history}</h2>
        {!events?.length ? <p className="pt-4 text-sm text-ink/55">{p.historyEmpty}</p> : (
          <ul className="mt-4 divide-y divide-line">
            {events.map((e) => {
              const ref = (e.request as unknown as { reference: string } | null)?.reference;
              return (
                <li key={e.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{e.reason === "request_completed" ? p.reasonCompleted(ref ?? "") : e.reason}</p>
                    <p className="text-xs text-ink/50">{formatDateTime(e.created_at, prefs.lang)}</p>
                  </div>
                  <span className={e.points > 0 ? "font-semibold tabular-nums text-ok" : "font-semibold tabular-nums text-bad"}>{e.points > 0 ? "+" : ""}{formatNumber(e.points, prefs.lang)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
