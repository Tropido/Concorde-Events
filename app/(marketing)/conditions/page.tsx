import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { getCms } from "@/lib/cms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.order.termsTitle };
}

export default async function ConditionsPage() {
  const { t, prefs } = await getT();
  const { terms } = await getCms(prefs.lang);
  const o = t.order;
  return (
    <div className="shell pt-6">
      <article className="card mx-auto max-w-3xl space-y-6 p-6 sm:p-10">
        <h1 className="display text-4xl sm:text-5xl text-balance">{o.termsTitle}</h1>
        {terms ? (
          <div className="space-y-4 text-[15px] leading-relaxed">{terms.split(/\n\s*\n/).map((p) => <p key={p} className="whitespace-pre-line">{p}</p>)}</div>
        ) : (
          <>
            <p role="note" className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{o.termsPending}</p>
            {o.termsSections.map((s) => (
              <section key={s.title} className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
                <p className="text-[15px] leading-relaxed text-ink/75">{s.text}</p>
              </section>
            ))}
          </>
        )}
      </article>
    </div>
  );
}
