"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Star, X } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { createClient } from "@/lib/supabase/client";
import { saveProduct, type AdminResult, type ProductInput } from "@/lib/actions/admin";
import { ResultText } from "@/components/admin/ui";
import { PriceTag, ProductTile } from "@/components/ui/kit";
import { discounted } from "@/lib/pro";
import { cn, formatTND } from "@/lib/utils/formatters";
import { TONES, type ProTier, type Tone } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const num = (v: string) => (v.trim() === "" ? null : Number(v));
const int = (v: string) => (v.trim() === "" ? null : Math.floor(Number(v)));
const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);

export type ProductFormValue = ProductInput;

const SECTIONS = ["general", "media", "look", "specs", "pricing", "internal"] as const;

export function ProductForm({ initial, categories, canEditPrices, tiers }: {
  initial: ProductFormValue; categories: { id: string; name: string }[]; canEditPrices: boolean; tiers: ProTier[];
}) {
  const { t, language } = useApp();
  const a = t.admin.inventory;
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [state, setState] = useState<AdminResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const setInternal = <K extends keyof ProductFormValue["internal"]>(k: K, val: ProductFormValue["internal"][K]) => setV((x) => ({ ...x, internal: { ...x.internal, [k]: val } }));
  const prices = v.prices ?? { retail: null, pro: null };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const supabase = createClient();
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      if (!TYPES.includes(file.type) || file.size > MAX_BYTES) { setState({ ok: false, error: "upload_failed" }); continue; }
      const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) setState({ ok: false, error: "upload_failed" });
      else urls.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    }
    setV((x) => ({ ...x, images: [...x.images, ...urls].slice(0, 12) }));
    setUploading(false);
  };
  const move = (i: number, d: -1 | 1) => setV((x) => {
    const imgs = [...x.images];
    const j = i + d;
    if (j < 0 || j >= imgs.length) return x;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    return { ...x, images: imgs };
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveProduct({ ...v, prices: canEditPrices ? v.prices : undefined });
      setState(res);
      if (res.ok && !v.id && res.id) router.replace(`/admin/inventory/${res.id}`);
      else if (res.ok) router.refresh();
    });
  };

  const breakEven = v.internal.purchase_cost && prices.retail ? Math.ceil(v.internal.purchase_cost / prices.retail) : null;
  const cat = categories.find((c) => c.id === v.category_id);

  return (
    <form onSubmit={submit} className="grid items-start gap-2.5 xl:grid-cols-[180px_minmax(0,1fr)_300px]">
      <nav aria-label={a.sections.title} className="card sticky top-2.5 hidden space-y-1 p-3 xl:block">
        {SECTIONS.map((s) => <a key={s} href={`#${s}`} className="block rounded-xl px-3 py-2 text-sm text-ink/70 hover:bg-paper hover:text-ink">{a.sections[s]}</a>)}
      </nav>

      <div className="min-w-0 space-y-2.5">
        <Section id="general" title={a.sections.general}>
          <div className="grid gap-3 md:grid-cols-2">
            <F label={a.titleFr}><input required maxLength={200} value={v.title_fr} className="field"
              onChange={(e) => setV((x) => ({ ...x, title_fr: e.target.value, slug: slugTouched ? x.slug : slugify(e.target.value) }))} /></F>
            <F label={a.titleAr}><input dir="rtl" lang="ar" maxLength={200} value={v.title_ar ?? ""} onChange={(e) => set("title_ar", e.target.value || null)} className="field" /></F>
            <F label={a.descFr}><textarea rows={5} maxLength={5000} value={v.description_fr} onChange={(e) => set("description_fr", e.target.value)} className="field resize-y" /></F>
            <F label={a.descAr}><textarea dir="rtl" lang="ar" rows={5} maxLength={5000} value={v.description_ar ?? ""} onChange={(e) => set("description_ar", e.target.value || null)} className="field resize-y" /></F>
            <F label={a.slug} hint={a.slugHint}><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} value={v.slug} dir="ltr" className="field font-mono"
              onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} /></F>
            <F label={a.sku} hint={a.skuHint}><input maxLength={40} value={v.sku ?? ""} dir="ltr" onChange={(e) => set("sku", e.target.value || null)} className="field font-mono" /></F>
            <F label={a.category}>
              <select value={v.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)} className="field">
                <option value="">{a.noCategory}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <F label={a.badge}>
              <select value={v.badge ?? ""} onChange={(e) => set("badge", (e.target.value || null) as ProductFormValue["badge"])} className="field">
                <option value="">{a.noBadge}</option>
                {(["new", "bestseller", "limited"] as const).map((b) => <option key={b} value={b}>{t.product.badges[b]}</option>)}
              </select>
            </F>
          </div>
          <div className="flex flex-wrap gap-4 pt-1 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-[#2b1d13]" />{a.featured}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.status === "active"} onChange={(e) => set("status", e.target.checked ? "active" : "retired")} className="h-4 w-4 accent-[#2b1d13]" />{a.visible}</label>
          </div>
        </Section>

        <Section id="media" title={a.sections.media} hint={a.uploadHint}>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {v.images.map((src, i) => (
              <li key={src} className="group relative">
                <div className={cn("relative aspect-square overflow-hidden rounded-2xl", `tone-${v.tone}`)}><Image src={src} alt="" fill sizes="160px" className="object-cover" /></div>
                {i === 0 && <span className="absolute start-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] text-card">{a.cover}</span>}
                <div className="absolute end-2 top-2 flex gap-1">
                  {i > 0 && <IconBtn label={a.makeCover} onClick={() => setV((x) => ({ ...x, images: [src, ...x.images.filter((u) => u !== src)] }))}><Star className="h-3.5 w-3.5" /></IconBtn>}
                  <IconBtn label={a.removeImage} onClick={() => set("images", v.images.filter((u) => u !== src))}><X className="h-3.5 w-3.5" /></IconBtn>
                </div>
                <div className="absolute bottom-2 end-2 flex gap-1">
                  <IconBtn label={a.moveUp} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label={a.moveDown} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                </div>
              </li>
            ))}
            {v.images.length < 12 && (
              <li>
                <label className={cn("flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-sm text-ink/55 hover:border-ink/30 hover:text-ink", uploading && "animate-pulse")}>
                  <ImagePlus className="h-6 w-6" aria-hidden />{uploading ? a.uploading : a.upload}
                  <input type="file" accept={TYPES.join(",")} multiple disabled={uploading} onChange={(e) => upload(e.target.files)} className="sr-only" />
                </label>
              </li>
            )}
          </ul>
        </Section>

        <Section id="look" title={a.sections.look}>
          <fieldset>
            <legend className="field-label">{a.tone}</legend>
            <div className="flex flex-wrap gap-2">
              {TONES.map((tone) => (
                <button key={tone} type="button" onClick={() => set("tone", tone as Tone)} aria-pressed={v.tone === tone} aria-label={a.tones[tone]} title={a.tones[tone]}
                  className={cn("h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-card transition", `tone-${tone}`, v.tone === tone ? "ring-ink" : "ring-transparent hover:ring-line")} />
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 md:grid-cols-2">
            <F label={a.color}>
              <div className="flex gap-2">
                <input type="color" value={v.color_hex ?? "#ddb892"} onChange={(e) => set("color_hex", e.target.value)} aria-label={a.colorHex} className="h-[46px] w-14 cursor-pointer rounded-2xl bg-paper p-1" />
                <input maxLength={80} value={v.color ?? ""} onChange={(e) => set("color", e.target.value || null)} placeholder={a.colorPlaceholder} className="field" />
              </div>
            </F>
            <F label={a.material}><input maxLength={80} value={v.material ?? ""} onChange={(e) => set("material", e.target.value || null)} className="field" /></F>
            <F label={a.finish}><input maxLength={80} value={v.finish ?? ""} onChange={(e) => set("finish", e.target.value || null)} className="field" /></F>
            <F label={a.style}><input maxLength={80} value={v.style ?? ""} onChange={(e) => set("style", e.target.value || null)} placeholder={a.stylePlaceholder} className="field" /></F>
          </div>
          <ChipsInput label={a.highlightsFr} hint={a.highlightsHint} values={v.highlights_fr} max={8} onChange={(x) => set("highlights_fr", x)} />
          <ChipsInput label={a.highlightsAr} values={v.highlights_ar} max={8} onChange={(x) => set("highlights_ar", x)} rtl />
          <ChipsInput label={a.tags} hint={a.tagsHint} values={v.tags} max={20} onChange={(x) => set("tags", x)} />
        </Section>

        <Section id="specs" title={a.sections.specs}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(["width", "height", "depth"] as const).map((k) => (
              <F key={k} label={a[k]}><input type="number" min={0} step="0.1" value={v[k] ?? ""} onChange={(e) => set(k, num(e.target.value))} className="field" /></F>
            ))}
            <F label={a.unit}><select value={v.dimension_unit} onChange={(e) => set("dimension_unit", e.target.value as "cm" | "m")} className="field"><option value="cm">cm</option><option value="m">m</option></select></F>
            <F label={a.weight}><input type="number" min={0} step="0.1" value={v.weight_kg ?? ""} onChange={(e) => set("weight_kg", num(e.target.value))} className="field" /></F>
            <F label={a.seats}><input type="number" min={1} step={1} value={v.seating_capacity ?? ""} onChange={(e) => set("seating_capacity", int(e.target.value))} className="field" /></F>
            <F label={a.setup}><input type="number" min={0} step={5} value={v.setup_minutes ?? ""} onChange={(e) => set("setup_minutes", int(e.target.value))} className="field" /></F>
            <F label={a.minNights}><input type="number" min={1} max={365} step={1} value={v.minimum_nights} onChange={(e) => set("minimum_nights", Math.max(1, int(e.target.value) ?? 1))} className="field" /></F>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <F label={a.careFr}><textarea rows={3} maxLength={2000} value={v.care_fr ?? ""} onChange={(e) => set("care_fr", e.target.value || null)} className="field resize-y" placeholder={a.carePlaceholder} /></F>
            <F label={a.careAr}><textarea dir="rtl" lang="ar" rows={3} maxLength={2000} value={v.care_ar ?? ""} onChange={(e) => set("care_ar", e.target.value || null)} className="field resize-y" /></F>
          </div>
        </Section>

        <Section id="pricing" title={a.sections.pricing} hint={canEditPrices ? a.pricesHint : a.pricesAdminOnly}>
          <fieldset disabled={!canEditPrices} className="grid gap-3 md:grid-cols-3">
            <F label={a.retail}><Money value={prices.retail} onChange={(x) => set("prices", { ...prices, retail: x })} /></F>
            <F label={a.pro}><Money value={prices.pro} onChange={(x) => set("prices", { ...prices, pro: x })} /></F>
            <F label={a.deposit} hint={a.depositHint}><Money value={v.deposit_amount} onChange={(x) => set("deposit_amount", x)} zero /></F>
          </fieldset>
          {(prices.pro ?? prices.retail) && tiers.length > 0 && (
            <div className="rounded-2xl bg-paper p-4">
              <p className="mb-2 text-xs text-ink/55">{a.tierPreview}</p>
              <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                {tiers.map((tier) => (
                  <li key={tier.code} className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: tier.color }} aria-hidden />{tier.name}</span>
                    <span className="tabular-nums">{formatTND(discounted((prices.pro ?? prices.retail)!, tier.discount), language)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <F label={a.owned} hint={a.ownedHint}><input type="number" min={0} step={1} value={v.owned} onChange={(e) => set("owned", Math.max(0, int(e.target.value) ?? 0))} className="field max-w-40" /></F>
        </Section>

        <Section id="internal" title={a.sections.internal} hint={a.internalHint}>
          <div className="grid gap-3 md:grid-cols-3">
            <F label={a.purchaseCost}><Money value={v.internal.purchase_cost} onChange={(x) => setInternal("purchase_cost", x)} zero /></F>
            <F label={a.purchaseDate}><input type="date" value={v.internal.purchase_date ?? ""} onChange={(e) => setInternal("purchase_date", e.target.value || null)} className="field" /></F>
            <F label={a.condition}>
              <select value={v.internal.condition ?? ""} onChange={(e) => setInternal("condition", (e.target.value || null) as ProductFormValue["internal"]["condition"])} className="field">
                <option value="">—</option>
                {(["new", "excellent", "good", "fair"] as const).map((c) => <option key={c} value={c}>{a.conditions[c]}</option>)}
              </select>
            </F>
            <F label={a.supplier}><input maxLength={120} value={v.internal.supplier ?? ""} onChange={(e) => setInternal("supplier", e.target.value || null)} className="field" /></F>
            <F label={a.storage}><input maxLength={120} value={v.internal.storage_location ?? ""} onChange={(e) => setInternal("storage_location", e.target.value || null)} placeholder={a.storagePlaceholder} className="field" /></F>
            <div className="rounded-2xl bg-paper p-4 text-sm">
              <p className="text-xs text-ink/55">{a.breakEven}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{breakEven ? t.common.nights(breakEven) : "—"}</p>
            </div>
          </div>
          <F label={a.internalNotes}><textarea rows={3} maxLength={2000} value={v.internal.internal_notes ?? ""} onChange={(e) => setInternal("internal_notes", e.target.value || null)} className="field resize-y" /></F>
        </Section>

        <div className="card sticky bottom-2.5 z-10 flex flex-wrap items-center gap-3 p-3 shadow-float">
          <button type="submit" disabled={pending || uploading} className="btn-ink">{pending ? t.common.saving : a.save}</button>
          <button type="button" className="btn-light" onClick={() => router.push("/admin/inventory")}>{t.common.back}</button>
          <ResultText state={state} />
        </div>
      </div>

      <aside className="card sticky top-2.5 hidden space-y-3 p-4 xl:block" aria-label={a.preview}>
        <p className="label">{a.preview}</p>
        <ProductTile src={v.images[0]} alt={v.title_fr || "·"} tone={v.tone} sizes="280px" className="aspect-[4/5] rounded-[1.5rem]">
          {v.badge && <span className="pill absolute start-3 top-3 py-1 text-[11px]">{t.product.badges[v.badge]}</span>}
        </ProductTile>
        <div className="flex items-start justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="label">{cat?.name ?? t.catalogue.uncategorised}</p>
            <p className="truncate text-[15px] font-semibold tracking-tight">{v.title_fr || a.untitled}</p>
            <p className="text-xs text-ink/50">{t.catalogue.inStock(v.owned)}</p>
          </div>
          {prices.retail && <PriceTag price={{ amount: prices.retail, retail: prices.retail, tier: "retail", discount: 0 }} size="sm" showUnit={false} />}
        </div>
        {v.internal.purchase_cost && v.owned > 0 ? <p className="rounded-xl bg-paper px-3 py-2 text-xs text-ink/60">{a.assetValue}: {formatTND(v.internal.purchase_cost * v.owned, language)} · {t.common.units(v.owned)}</p> : null}
      </aside>
    </form>
  );
}

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-4 space-y-4 p-5 sm:p-6">
      <div><h2 className="text-lg font-semibold tracking-tight">{title}</h2>{hint && <p className="text-xs text-ink/55">{hint}</p>}</div>
      {children}
    </section>
  );
}

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="field-label">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] text-ink/45">{hint}</span>}</label>;
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90 shadow-lift hover:bg-card">{children}</button>;
}

function Money({ value, onChange, zero }: { value: number | null; onChange: (v: number | null) => void; zero?: boolean }) {
  return (
    <div className="relative">
      <input type="number" min={zero ? 0 : 0.001} step="0.001" value={value ?? ""} onChange={(e) => onChange(num(e.target.value))} className="field pe-12" />
      <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-xs text-ink/45">DT</span>
    </div>
  );
}

function ChipsInput({ label, hint, values, onChange, max, rtl }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; max: number; rtl?: boolean }) {
  const { t } = useApp();
  const [draft, setDraft] = useState("");
  const add = () => {
    const x = draft.trim();
    if (x && !values.includes(x) && values.length < max) onChange([...values, x]);
    setDraft("");
  };
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-paper p-2" dir={rtl ? "rtl" : undefined}>
        {values.map((x) => (
          <span key={x} className="inline-flex items-center gap-1 rounded-full bg-card py-1 ps-3 pe-1 text-xs ring-1 ring-line">
            {x}<button type="button" onClick={() => onChange(values.filter((y) => y !== x))} aria-label={`${t.common.delete}: ${x}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-paper"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={add} lang={rtl ? "ar" : undefined}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          disabled={values.length >= max} className="min-w-32 flex-1 bg-transparent px-2 py-1 text-sm focus:outline-none" aria-label={label} />
      </div>
      {hint && <span className="mt-1 block text-[11px] text-ink/45">{hint}</span>}
    </div>
  );
}
