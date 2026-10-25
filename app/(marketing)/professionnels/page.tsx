import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth";
import { getTiers } from "@/lib/tiers";
import { formatNumber } from "@/lib/utils/formatters";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.pro.pageTitle, description: t.pro.pageIntro };
}

export default async function ProsPage() {
  const [{ t, prefs }, viewer] = await Promise.all([getT(), getViewer()]);
  const tiers = await getTiers(prefs.lang);
  const p = t.pro;
  const isPro = viewer?.role === "professional";

  return (
    <div className="shell space-y-2.5 pt-6">
      <section className="grid gap-2.5 lg:grid-cols-12">
        <div className="card flex flex-col justify-between gap-10 p-6 sm:p-10 lg:col-span-7">
          <p className="pill w-fit">{p.teaserLabel}</p>
          <div className="space-y-5">
            <h1 className="display max-w-[14ch] text-[clamp(2.5rem,6vw,5rem)] text-balance">{p.pageTitle}</h1>
            <p className="max-w-lg text-[15px] leading-relaxed text-ink/65 text-pretty">{p.pageIntro}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isPro ? <Link href="/account/pro" className="btn-ink">{p.mySpace}</Link> : <Link href="/register?type=professional" className="btn-ink">{p.become}</Link>}
            <Link href="/catalogue" className="btn-light">{t.nav.catalogue}</Link>
          </div>
        </div>
        <div className="grain tone-sand flex flex-col justify-between gap-6 rounded-[1.75rem] p-6 sm:p-10 lg:col-span-5">
          <p className="label">{p.howPointsLabel}</p>
          <p className="text-3xl font-semibold leading-tight tracking-tight text-balance">{p.pointsRule}</p>
          <p className="text-sm text-ink/65">{p.pointsText}</p>
        </div>
      </section>

      <section className="card overflow-hidden" aria-labelledby="compare-title">
        <h2 id="compare-title" className="p-6 text-2xl font-semibold tracking-tight sm:p-8">{p.compareTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-line text-start">
                <th scope="col" className="w-1/2 px-6 py-3 text-start font-normal text-ink/55 sm:px-8">{p.feature}</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold">{t.auth.customer}</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold">{t.auth.professional}</th>
              </tr>
            </thead>
            <tbody>
              {p.compare.map((row) => (
                <tr key={row.label} className="border-b border-line last:border-0">
                  <th scope="row" className="px-6 py-3.5 text-start font-normal sm:px-8">{row.label}</th>
                  {[row.customer, row.pro].map((v, i) => (
                    <td key={i} className="px-4 py-3.5 text-center">
                      {v === true ? <Check className="mx-auto h-4 w-4 text-ok" aria-label={p.yes} /> : v === false ? <Minus className="mx-auto h-4 w-4 text-ink/25" aria-label={p.no} /> : <span className="text-xs">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {tiers.length > 0 && (
        <section aria-labelledby="tiers-title" className="space-y-2.5 pt-12">
          <h2 id="tiers-title" className="px-1 pb-4 text-3xl font-semibold tracking-tight sm:text-4xl">{p.tiersTitle}</h2>
          <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier, i) => (
              <li key={tier.code} className="card flex flex-col gap-5 p-6">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full" style={{ background: tier.color }} aria-hidden />
                    <span className="text-xl font-semibold tracking-tight">{tier.name}</span>
                  </span>
                  <span className="font-mono text-xs text-ink/50">{tier.minPoints > 0 ? p.fromPoints(formatNumber(tier.minPoints, prefs.lang)) : p.entry}</span>
                </div>
                <p className="display text-5xl">{tier.discount > 0 ? <bdi dir="ltr">−{tier.discount}%</bdi> : p.proRates}</p>
                <ul className="space-y-2 text-sm">
                  {i > 0 && <li className="text-ink/50">{p.everythingIn(tiers[i - 1].name)}</li>}
                  {tier.benefits.map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-toffeeBrown" aria-hidden />{b}</li>)}
                </ul>
              </li>
            ))}
          </ol>
          <p className="px-1 pt-2 text-xs text-ink/50">{p.tiersNote}</p>
        </section>
      )}
    </div>
  );
}
