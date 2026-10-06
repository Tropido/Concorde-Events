"use client";

import { useState, useTransition } from "react";
import { useApp } from "@/lib/context/app-context";
import { translations } from "@/lib/i18n/translations";
import { publishCms, type AdminResult, type CmsInput } from "@/lib/actions/admin";
import { btnGhost, btnPrimary, field, ResultText } from "@/components/admin/ui";

export function CmsForm({ locale, initial }: { locale: "fr" | "ar"; initial: CmsInput }) {
  const { t } = useApp();
  const a = t.admin.cms;
  const [c, setC] = useState(initial);
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const hero = (k: keyof CmsInput["hero"], v: string) => setC((x) => ({ ...x, hero: { ...x.hero, [k]: v } }));
  const placeholder = translations[locale].hero; // default copy used when a field is left empty

  return (
    <form className="space-y-6" lang={locale} dir={dir}
      onSubmit={(e) => { e.preventDefault(); start(async () => setState(await publishCms(locale, c))); }}>
      <section className="apple-card rounded-3xl border border-tan/30 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <h2 className="font-serif font-bold md:col-span-2">{a.hero}</h2>
        <label className="text-xs font-semibold">{a.heroBadge}<input maxLength={120} value={c.hero.badge} placeholder={placeholder.badge} onChange={(e) => hero("badge", e.target.value)} className={field} /></label>
        <label className="text-xs font-semibold">{a.heroTitle}<input maxLength={160} value={c.hero.title} placeholder={placeholder.title} onChange={(e) => hero("title", e.target.value)} className={field} /></label>
        <label className="text-xs font-semibold">{a.heroAccent}<input maxLength={160} value={c.hero.titleAccent} placeholder={placeholder.titleAccent} onChange={(e) => hero("titleAccent", e.target.value)} className={field} /></label>
        <label className="text-xs font-semibold md:col-span-2">{a.heroSubtitle}<textarea rows={3} maxLength={600} value={c.hero.subtitle} placeholder={placeholder.subtitle} onChange={(e) => hero("subtitle", e.target.value)} className={field} /></label>
      </section>

      <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
        <h2 className="font-serif font-bold">{a.faqs}</h2>
        {c.faqs.map((f, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 border-b border-tan/20 pb-3">
            <label className="text-xs font-semibold">{a.question}<input required maxLength={300} value={f.question} onChange={(e) => setC((x) => ({ ...x, faqs: x.faqs.map((q, j) => j === i ? { ...q, question: e.target.value } : q) }))} className={field} /></label>
            <label className="text-xs font-semibold">{a.answer}<textarea required rows={2} maxLength={2000} value={f.answer} onChange={(e) => setC((x) => ({ ...x, faqs: x.faqs.map((q, j) => j === i ? { ...q, answer: e.target.value } : q) }))} className={field} /></label>
            <button type="button" className="text-xs underline justify-self-start" onClick={() => setC((x) => ({ ...x, faqs: x.faqs.filter((_, j) => j !== i) }))}>{a.remove}</button>
          </div>
        ))}
        <button type="button" className={btnGhost} onClick={() => setC((x) => ({ ...x, faqs: [...x.faqs, { question: "", answer: "" }] }))}>{a.addFaq}</button>
      </section>

      <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
        <h2 className="font-serif font-bold">{a.testimonials}</h2>
        <p className="text-xs opacity-70">{a.testimonialsHint}</p>
        {c.testimonials.map((q, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-tan/20 pb-3">
            <label className="text-xs font-semibold md:col-span-3">{a.quote}<textarea required rows={2} maxLength={1000} value={q.quote} onChange={(e) => setC((x) => ({ ...x, testimonials: x.testimonials.map((v, j) => j === i ? { ...v, quote: e.target.value } : v) }))} className={field} /></label>
            <label className="text-xs font-semibold">{a.author}<input required maxLength={120} value={q.author} onChange={(e) => setC((x) => ({ ...x, testimonials: x.testimonials.map((v, j) => j === i ? { ...v, author: e.target.value } : v) }))} className={field} /></label>
            <label className="text-xs font-semibold">{a.role}<input maxLength={160} value={q.role} onChange={(e) => setC((x) => ({ ...x, testimonials: x.testimonials.map((v, j) => j === i ? { ...v, role: e.target.value } : v) }))} className={field} /></label>
            <button type="button" className="text-xs underline justify-self-start" onClick={() => setC((x) => ({ ...x, testimonials: x.testimonials.filter((_, j) => j !== i) }))}>{a.remove}</button>
          </div>
        ))}
        <button type="button" className={btnGhost} onClick={() => setC((x) => ({ ...x, testimonials: [...x.testimonials, { quote: "", author: "", role: "" }] }))}>{a.addTestimonial}</button>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>{a.publish}</button>
        <ResultText state={state} />
      </div>
    </form>
  );
}
