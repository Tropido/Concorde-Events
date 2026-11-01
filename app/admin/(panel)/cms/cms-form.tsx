"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useApp } from "@/lib/context/app-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/formatters";
import { translations, type Language } from "@/lib/i18n/translations";
import { publishCms, type AdminResult, type CmsInput } from "@/lib/actions/admin";
import { btnGhost, btnPrimary, field, ResultText } from "@/components/admin/ui";

const TYPES = ["image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function CmsForm({ locale, initial }: { locale: Language; initial: CmsInput }) {
  const { t } = useApp();
  const a = t.admin.cms;
  const [c, setC] = useState(initial);
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const hero = (k: keyof CmsInput["hero"], v: string) => setC((x) => ({ ...x, hero: { ...x.hero, [k]: v } }));
  const placeholder = translations[locale].hero; // default copy used when a field is left empty
  const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    if (!TYPES.includes(file.type) || file.size > MAX_BYTES) return setState({ ok: false, error: "upload_failed" });
    setUploading(true);
    const supabase = createClient();
    const path = `hero/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const { error } = await supabase.storage.from("site-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) setState({ ok: false, error: "upload_failed" });
    else setC((x) => ({ ...x, hero_image: supabase.storage.from("site-images").getPublicUrl(path).data.publicUrl }));
    setUploading(false);
  };

  return (
    <form className="space-y-2.5" lang={locale} dir={dir}
      onSubmit={(e) => { e.preventDefault(); start(async () => setState(await publishCms(locale, c))); }}>
      <section className="card grid grid-cols-1 gap-3 p-5 sm:p-6 md:grid-cols-2">
        <h2 className="text-lg font-semibold tracking-tight md:col-span-2">{a.hero}</h2>
        <div className="md:col-span-2">
          <span className="field-label">{a.heroImage}</span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="relative block h-24 w-40 overflow-hidden rounded-2xl bg-paper">{c.hero_image && <Image src={c.hero_image} alt="" fill sizes="160px" className="object-cover" />}</span>
            <label className={cn(btnGhost, "cursor-pointer", uploading && "animate-pulse")}>{a.heroImageUpload}<input type="file" accept={TYPES.join(",")} disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} className="sr-only" /></label>
            {c.hero_image && <button type="button" className="text-xs text-bad underline" onClick={() => setC((x) => ({ ...x, hero_image: null }))}>{a.remove}</button>}
          </div>
          <p className="mt-1 text-[11px] text-ink/55">{a.heroImageHint}</p>
        </div>
        <label className="block space-y-1.5 text-xs text-ink/70">{a.heroTitle}<input maxLength={160} value={c.hero.title} placeholder={placeholder.title} onChange={(e) => hero("title", e.target.value)} className={field} /></label>
        <label className="block space-y-1.5 text-xs text-ink/70 md:col-span-2">{a.heroSubtitle}<textarea rows={3} maxLength={600} value={c.hero.subtitle} placeholder={placeholder.subtitle} onChange={(e) => hero("subtitle", e.target.value)} className={field} /></label>
      </section>

      <section className="card space-y-3 p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">{a.faqs}</h2>
        {c.faqs.map((f, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-2 border-b border-line pb-3">
            <label className="block space-y-1.5 text-xs text-ink/70">{a.question}<input required maxLength={300} value={f.question} onChange={(e) => setC((x) => ({ ...x, faqs: x.faqs.map((q, j) => j === i ? { ...q, question: e.target.value } : q) }))} className={field} /></label>
            <label className="block space-y-1.5 text-xs text-ink/70">{a.answer}<textarea required rows={2} maxLength={2000} value={f.answer} onChange={(e) => setC((x) => ({ ...x, faqs: x.faqs.map((q, j) => j === i ? { ...q, answer: e.target.value } : q) }))} className={field} /></label>
            <button type="button" className="justify-self-start text-xs text-bad underline" onClick={() => setC((x) => ({ ...x, faqs: x.faqs.filter((_, j) => j !== i) }))}>{a.remove}</button>
          </div>
        ))}
        <button type="button" className={btnGhost} onClick={() => setC((x) => ({ ...x, faqs: [...x.faqs, { question: "", answer: "" }] }))}>{a.addFaq}</button>
      </section>

      <section className="card space-y-3 p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">{a.testimonials}</h2>
        <p className="text-xs text-ink/55">{a.testimonialsHint}</p>
        {c.testimonials.map((q, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-line pb-3">
            <label className="block space-y-1.5 text-xs text-ink/70 md:col-span-3">{a.quote}<textarea required rows={2} maxLength={1000} value={q.quote} onChange={(e) => setC((x) => ({ ...x, testimonials: x.testimonials.map((v, j) => j === i ? { ...v, quote: e.target.value } : v) }))} className={field} /></label>
            <label className="block space-y-1.5 text-xs text-ink/70">{a.author}<input required maxLength={120} value={q.author} onChange={(e) => setC((x) => ({ ...x, testimonials: x.testimonials.map((v, j) => j === i ? { ...v, author: e.target.value } : v) }))} className={field} /></label>
            <label className="block space-y-1.5 text-xs text-ink/70">{a.role}<input maxLength={160} value={q.role} onChange={(e) => setC((x) => ({ ...x, testimonials: x.testimonials.map((v, j) => j === i ? { ...v, role: e.target.value } : v) }))} className={field} /></label>
            <button type="button" className="justify-self-start text-xs text-bad underline" onClick={() => setC((x) => ({ ...x, testimonials: x.testimonials.filter((_, j) => j !== i) }))}>{a.remove}</button>
          </div>
        ))}
        <button type="button" className={btnGhost} onClick={() => setC((x) => ({ ...x, testimonials: [...x.testimonials, { quote: "", author: "", role: "" }] }))}>{a.addTestimonial}</button>
      </section>

      <section className="card space-y-2 p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">{t.order.cms.terms}</h2>
        <p className="text-xs text-ink/55">{t.order.cms.termsHint}</p>
        <textarea rows={8} maxLength={30000} value={c.terms} aria-label={t.order.cms.terms} onChange={(e) => setC((x) => ({ ...x, terms: e.target.value }))} className={field} />
      </section>

      <div className="card sticky bottom-2.5 flex items-center gap-3 p-3 shadow-float">
        <button type="submit" disabled={pending} className={btnPrimary}>{a.publish}</button>
        <ResultText state={state} />
      </div>
    </form>
  );
}
