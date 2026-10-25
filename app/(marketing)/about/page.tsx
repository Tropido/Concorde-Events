import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.about.title };
}

export default async function AboutPage() {
  const { t } = await getT();
  const tones = ["tone-almond", "tone-sand", "tone-cream"];
  return (
    <div className="shell space-y-2.5 pt-6">
      <section className="card grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.3fr_1fr]">
        <h1 className="display text-[clamp(2.5rem,6vw,5rem)] text-balance">{t.about.title}</h1>
        <p className="self-end text-[15px] leading-relaxed text-ink/65 text-pretty">{t.about.intro}</p>
      </section>
      <div className="grid gap-2.5 md:grid-cols-3">
        {t.about.sections.map((s, i) => (
          <section key={s.title} className={`grain ${tones[i % 3]} flex min-h-[260px] flex-col justify-end gap-3 rounded-[1.75rem] p-6`}>
            <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>
            <p className="text-sm leading-relaxed text-ink/65">{s.text}</p>
          </section>
        ))}
      </div>
      <div className="flex justify-center pt-8"><Link href="/catalogue" className="btn-ink">{t.about.cta}</Link></div>
    </div>
  );
}
