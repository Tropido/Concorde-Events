"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ChevronDown, ImagePlus, Plus } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { createClient } from "@/lib/supabase/client";
import { moveCategory, saveCategory, type AdminResult, type CategoryInput } from "@/lib/actions/admin";
import { ActionButton, ResultText, btnPrimary } from "@/components/admin/ui";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils/formatters";
import { TONES } from "@/lib/types";

const EMPTY: CategoryInput = { slug: "", name_fr: "", name_en: null, name_ar: null, icon: "Sparkles", tone: "sand", image_url: null };
const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);

export function CategoriesManager({ categories }: { categories: (CategoryInput & { id: string })[] }) {
  const { t } = useApp();
  const a = t.admin.inventory;
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-2.5">
      <ul className="space-y-2.5">
        {categories.map((c, i) => (
          <li key={c.id}>
            <CategoryRow category={c} first={i === 0} last={i === categories.length - 1} />
          </li>
        ))}
      </ul>
      {adding
        ? <div className="card p-5"><CategoryForm initial={EMPTY} onDone={() => setAdding(false)} /></div>
        : <button type="button" onClick={() => setAdding(true)} className="btn-light btn-sm"><Plus className="h-4 w-4" aria-hidden />{a.newCategory}</button>}
    </div>
  );
}

function CategoryRow({ category: c, first, last }: { category: CategoryInput & { id: string }; first: boolean; last: boolean }) {
  const { t, language } = useApp();
  const a = t.admin.inventory;
  const [open, setOpen] = useState(false);
  const name = (language === "en" && c.name_en) || (language === "ar" && c.name_ar) || c.name_fr;
  return (
    <article className="card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", `tone-${c.tone}`)}><CategoryIcon name={c.icon} className="h-5 w-5" /></span>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-start">
          <span className="min-w-0 flex-1"><span className="block truncate font-semibold tracking-tight">{name}</span><span className="block truncate font-mono text-[11px] text-ink/50" dir="ltr">{c.slug}</span></span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink/40 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <span className="flex gap-1">
          {!first && <ActionButton action={moveCategory.bind(null, c.id, -1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-paper hover:bg-line"><ArrowUp className="h-3.5 w-3.5" aria-label={a.moveUp} /></ActionButton>}
          {!last && <ActionButton action={moveCategory.bind(null, c.id, 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-paper hover:bg-line"><ArrowDown className="h-3.5 w-3.5" aria-label={a.moveDown} /></ActionButton>}
        </span>
      </div>
      {open && <div className="border-t border-line p-5"><CategoryForm initial={c} onDone={() => setOpen(false)} /></div>}
    </article>
  );
}

function CategoryForm({ initial, onDone }: { initial: CategoryInput; onDone: () => void }) {
  const { t } = useApp();
  const a = t.admin.inventory;
  const [v, setV] = useState(initial);
  const [state, setState] = useState<AdminResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof CategoryInput>(k: K, val: CategoryInput[K]) => setV((x) => ({ ...x, [k]: val }));

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const path = `categories/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) setState({ ok: false, error: "upload_failed" });
    else set("image_url", supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    setUploading(false);
  };

  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const res = await saveCategory(v);
        setState(res);
        if (res.ok) onDone();
      });
    }}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block"><span className="field-label">{a.nameFr}</span>
          <input required maxLength={120} value={v.name_fr} className="field"
            onChange={(e) => setV((x) => ({ ...x, name_fr: e.target.value, slug: initial.slug || slugify(e.target.value) }))} /></label>
        <label className="block"><span className="field-label">{a.slug}</span>
          <input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} dir="ltr" value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} className="field font-mono" /></label>
        <label className="block"><span className="field-label">{a.nameEn}</span>
          <input lang="en" maxLength={120} value={v.name_en ?? ""} onChange={(e) => set("name_en", e.target.value || null)} className="field" /></label>
        <label className="block"><span className="field-label">{a.nameAr}</span>
          <input dir="rtl" lang="ar" maxLength={120} value={v.name_ar ?? ""} onChange={(e) => set("name_ar", e.target.value || null)} className="field" /></label>
      </div>

      <fieldset>
        <legend className="field-label">{a.icon}</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_ICON_NAMES.map((name) => (
            <button key={name} type="button" aria-pressed={v.icon === name} aria-label={name} title={name} onClick={() => set("icon", name)}
              className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition", v.icon === name ? "bg-ink text-card ring-ink" : "bg-paper ring-transparent hover:ring-line")}>
              <CategoryIcon name={name} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">{a.tone}</legend>
        <div className="flex flex-wrap gap-2">
          {TONES.map((tone) => (
            <button key={tone} type="button" onClick={() => set("tone", tone)} aria-pressed={v.tone === tone} aria-label={a.tones[tone]} title={a.tones[tone]}
              className={cn("h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-card transition", `tone-${tone}`, v.tone === tone ? "ring-ink" : "ring-transparent hover:ring-line")} />
          ))}
        </div>
      </fieldset>

      <div>
        <span className="field-label">{a.categoryCover}</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="relative block h-16 w-24 overflow-hidden rounded-xl bg-paper">{v.image_url && <Image src={v.image_url} alt="" fill sizes="96px" className="object-cover" />}</span>
          <label className={cn("btn-light btn-sm cursor-pointer", uploading && "animate-pulse")}>
            <ImagePlus className="h-4 w-4" aria-hidden />{uploading ? a.uploading : a.upload}
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} className="sr-only" />
          </label>
          {v.image_url && <button type="button" className="text-xs text-bad underline" onClick={() => set("image_url", null)}>{a.removeImage}</button>}
        </div>
        <p className="mt-1 text-[11px] text-ink/55">{a.categoryCoverHint}</p>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || uploading} className={btnPrimary}>{t.common.save}</button>
        <ResultText state={state} />
      </div>
    </form>
  );
}
