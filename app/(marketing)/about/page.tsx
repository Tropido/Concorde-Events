import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function AboutPage() {
  const { t } = await getT();
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <header className="text-center space-y-4 max-w-3xl mx-auto">
        <p className="text-xs font-bold tracking-widest uppercase text-toffeeBrown dark:text-tan">{t.about.badge}</p>
        <h1 className="text-4xl sm:text-6xl font-extrabold font-serif">{t.about.title}</h1>
        <p className="text-base text-coffeeBean/80 dark:text-almondCream/80 leading-relaxed">{t.about.intro}</p>
      </header>
      <div className="relative h-[360px] rounded-3xl overflow-hidden border border-tan/40 shadow-2xl">
        <Image src="/modern-office-space-with-futuristic-decor-furniture.jpg" alt="" fill sizes="(max-width: 1200px) 100vw, 1200px" className="object-cover" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {t.about.sections.map((s) => (
          <section key={s.title} className="apple-card p-8 rounded-3xl border border-tan/30 space-y-3">
            <h2 className="text-xl font-bold font-serif">{s.title}</h2>
            <p className="text-sm text-coffeeBean/75 dark:text-almondCream/75 leading-relaxed">{s.text}</p>
          </section>
        ))}
      </div>
      <div className="text-center">
        <Link href="/catalogue" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-toffeeBrown hover:bg-coffeeBean text-white font-extrabold text-xs uppercase tracking-wider">
          {t.about.cta}<ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
