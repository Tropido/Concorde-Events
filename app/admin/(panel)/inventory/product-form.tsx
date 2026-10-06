"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context/app-context";
import { createClient } from "@/lib/supabase/client";
import { saveProduct, type AdminResult, type ProductInput } from "@/lib/actions/admin";
import { btnGhost, btnPrimary, field, ResultText } from "@/components/admin/ui";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const num = (v: string) => (v.trim() === "" ? null : Number(v));

export type ProductFormValue = ProductInput;

export function ProductForm({ initial, categories, canEditPrices }: {
  initial: ProductFormValue; categories: { id: string; name: string }[]; canEditPrices: boolean;
}) {
  const { t } = useApp();
  const a = t.admin.inventory;
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [state, setState] = useState<AdminResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((x) => ({ ...x, [k]: val }));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const supabase = createClient();
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      if (!TYPES.includes(file.type) || file.size > MAX_BYTES) {
        setState({ ok: false, error: "upload_failed" });
        continue;
      }
      const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) setState({ ok: false, error: "upload_failed" });
      else urls.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    }
    setV((x) => ({ ...x, images: [...x.images, ...urls].slice(0, 12) }));
    setUploading(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: ProductInput = {
      ...v,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      prices: canEditPrices ? v.prices : undefined,
    };
    start(async () => {
      const res = await saveProduct(input);
      setState(res);
      if (res.ok && !v.id && res.id) router.replace(`/admin/inventory/${res.id}`);
    });
  };

  const stockRow = (c: "FR" | "TN") => v.stock[c] ?? { owned: 0 };
  const priceRow = (c: "FR" | "TN") => v.prices?.[c] ?? { retail: null, pro: null };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="apple-card rounded-3xl border border-tan/30 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-xs font-semibold">{a.titleFr}<input required maxLength={200} value={v.title_fr} onChange={(e) => set("title_fr", e.target.value)} className={field} /></label>
        <label className="text-xs font-semibold">{a.titleAr}<input dir="rtl" lang="ar" maxLength={200} value={v.title_ar ?? ""} onChange={(e) => set("title_ar", e.target.value || null)} className={field} /></label>
        <label className="text-xs font-semibold">{a.descFr}<textarea rows={4} maxLength={5000} value={v.description_fr} onChange={(e) => set("description_fr", e.target.value)} className={field} /></label>
        <label className="text-xs font-semibold">{a.descAr}<textarea dir="rtl" lang="ar" rows={4} maxLength={5000} value={v.description_ar ?? ""} onChange={(e) => set("description_ar", e.target.value || null)} className={field} /></label>
        <label className="text-xs font-semibold">{a.slug}
          <input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} className={field} aria-describedby="slug-hint" dir="ltr" />
          <span id="slug-hint" className="block font-normal opacity-70">{a.slugHint}</span>
        </label>
        <label className="text-xs font-semibold">{a.category}
          <select value={v.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)} className={field}>
            <option value="">{a.noCategory}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(["width", "height", "depth"] as const).map((k) => (
            <label key={k} className="text-xs font-semibold">{a[k]}
              <input type="number" min={0} step="0.01" value={v[k] ?? ""} onChange={(e) => set(k, num(e.target.value))} className={field} />
            </label>
          ))}
          <label className="text-xs font-semibold">{a.unit}
            <select value={v.dimension_unit} onChange={(e) => set("dimension_unit", e.target.value as "cm" | "m")} className={field}>
              <option value="cm">cm</option><option value="m">m</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold">{a.color}<input maxLength={80} value={v.color ?? ""} onChange={(e) => set("color", e.target.value || null)} className={field} /></label>
          <label className="text-xs font-semibold">{a.material}<input maxLength={80} value={v.material ?? ""} onChange={(e) => set("material", e.target.value || null)} className={field} /></label>
        </div>
        <label className="text-xs font-semibold">{a.tags}<input value={tags} onChange={(e) => setTags(e.target.value)} className={field} /><span className="block font-normal opacity-70">{a.tagsHint}</span></label>
        <div className="grid grid-cols-2 gap-2 items-end">
          <label className="text-xs font-semibold">{a.minNights}<input type="number" min={1} max={365} step={1} value={v.minimum_nights} onChange={(e) => set("minimum_nights", Math.max(1, Math.floor(Number(e.target.value)) || 1))} className={field} /></label>
          <label className="text-xs font-semibold flex items-center gap-2 pb-3"><input type="checkbox" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} />{a.featured}</label>
        </div>
      </section>

      <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
        <h2 className="font-serif font-bold">{a.images}</h2>
        <div className="flex flex-wrap gap-3">
          {v.images.map((src) => (
            <div key={src} className="relative w-28 space-y-1">
              <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-tan/40">
                <Image src={src} alt="" fill sizes="112px" className="object-cover" />
              </div>
              <button type="button" className="text-xs underline" onClick={() => set("images", v.images.filter((i) => i !== src))}>{a.removeImage}</button>
            </div>
          ))}
        </div>
        <label className="text-xs font-semibold block">{uploading ? a.uploading : a.upload}
          <input type="file" accept={TYPES.join(",")} multiple disabled={uploading} onChange={(e) => upload(e.target.files)} className="block mt-1 text-sm" />
          <span className="block font-normal opacity-70">{a.uploadHint}</span>
        </label>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["FR", "TN"] as const).map((c) => (
          <div key={c} className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
            <h2 className="font-serif font-bold">{a.stockFor(c === "FR" ? t.common.france : t.common.tunisia)}</h2>
            <label className="text-xs font-semibold">{a.owned}
              <input type="number" min={0} step={1} value={stockRow(c).owned}
                onChange={(e) => set("stock", { ...v.stock, [c]: { owned: Math.max(0, Math.floor(Number(e.target.value)) || 0) } })} className={field} />
            </label>
            <fieldset className="grid grid-cols-2 gap-2" disabled={!canEditPrices}>
              <legend className="text-xs font-semibold mb-1">{a.prices} ({c === "FR" ? "EUR" : "TND"})</legend>
              {(["retail", "pro"] as const).map((tier) => (
                <label key={tier} className="text-xs">{a[tier]}
                  <input type="number" min={0} step={c === "TN" ? "0.001" : "0.01"} value={priceRow(c)[tier] ?? ""}
                    onChange={(e) => set("prices", { ...v.prices, [c]: { ...priceRow(c), [tier]: num(e.target.value) } })} className={field} />
                </label>
              ))}
            </fieldset>
            {!canEditPrices && <p className="text-[11px] opacity-70">{a.pricesAdminOnly}</p>}
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || uploading} className={btnPrimary}>{a.save}</button>
        <button type="button" className={btnGhost} onClick={() => router.push("/admin/inventory")}>{t.common.back}</button>
        <ResultText state={state} />
      </div>
    </form>
  );
}
