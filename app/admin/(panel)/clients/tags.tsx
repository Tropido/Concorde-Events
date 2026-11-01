"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { createClientTag, toggleClientTag, type AdminResult } from "@/lib/actions/admin";
import { ResultText } from "@/components/admin/ui";
import { localized } from "@/lib/i18n/localize";
import { cn } from "@/lib/utils/formatters";

export type TagColor = "almond" | "sand" | "tan" | "copper" | "cream" | "stone" | "ok" | "warn" | "bad";
export const TAG_COLORS: TagColor[] = ["almond", "sand", "tan", "copper", "cream", "stone", "ok", "warn", "bad"];
export type ClientTag = { id: string; slug: string; label_fr: string; label_en: string | null; label_ar: string | null; color: TagColor; is_system: boolean; created_by: string | null; archived_at: string | null };

const swatch: Record<TagColor, string> = {
  almond: "tone-almond", sand: "tone-sand", tan: "tone-tan", copper: "tone-copper", cream: "tone-cream", stone: "tone-stone",
  ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad",
};
/** Same rule as private.tag_key: case and accents don't count. */
const key = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, "-");

export function TagPill({ tag, className }: { tag: ClientTag; className?: string }) {
  const { language } = useApp();
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-normal", tag.archived_at ? "bg-paper text-ink/45" : swatch[tag.color], className)}>{localized(tag, "label", language)}</span>;
}

/** Toggle chips for one client, with a "+" chip that finds or creates a label. Every change is
 *  applied at once and rolled back if the server refuses it. */
export function ClientTags({ profileId, tags, initial }: { profileId: string; tags: ClientTag[]; initial: string[] }) {
  const { t, language } = useApp();
  const a = t.admin.clients;
  const [all, setAll] = useState(tags);
  const [on, setOn] = useState(initial);
  const [state, setState] = useState<AdminResult | null>(null);
  const [q, setQ] = useState("");
  const [color, setColor] = useState<TagColor>("sand");
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [pending, start] = useTransition();
  const pop = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Archived labels leave the picker but stay, greyed, on the clients that carry them.
  const shown = all.filter((x) => !x.archived_at || on.includes(x.id));
  const matches = q.trim() ? all.filter((x) => !x.archived_at && key(localized(x, "label", language) ?? "").includes(key(q))) : [];
  const exact = all.find((x) => !x.archived_at && [x.label_fr, x.label_en, x.label_ar].some((l) => l && key(l) === key(q)));

  const toggle = (id: string, next: boolean) => {
    const before = on;
    setOn(next ? [...on, id] : on.filter((x) => x !== id));
    setState(null);
    start(async () => {
      const r = await toggleClientTag(profileId, id, next);
      if (!r.ok) { setOn(before); setState(r); }
    });
  };
  const close = () => { pop.current?.hidePopover(); setQ(""); setEn(""); setAr(""); };
  const pick = (id: string) => { if (!on.includes(id)) toggle(id, true); close(); };
  const create = () => {
    const label = q.trim();
    if (!label) return;
    const temp = `new-${crypto.randomUUID()}`;
    const before = { all, on };
    setAll([...all, { id: temp, slug: "", label_fr: label, label_en: en.trim() || null, label_ar: ar.trim() || null, color, is_system: false, created_by: null, archived_at: null }]);
    setOn([...on, temp]);
    setState(null);
    const input = { label_fr: label, label_en: en.trim() || null, label_ar: ar.trim() || null, color };
    start(async () => {
      const r = await createClientTag(profileId, input);
      if (!r.ok) { setAll(before.all); setOn(before.on); setState(r); return; }
      setAll((x) => x.map((tag) => (tag.id === temp ? { ...tag, id: r.id } : tag)));
      setOn((x) => x.map((id) => (id === temp ? r.id : id)));
    });
    close();
  };
  const open = () => {
    const el = pop.current, b = opener.current?.getBoundingClientRect();
    if (!el || !b) return;
    el.showPopover();
    el.style.top = `${Math.min(b.bottom + 8, innerHeight - el.offsetHeight - 8)}px`;
    el.style.left = `${Math.max(8, Math.min(b.left, innerWidth - el.offsetWidth - 8))}px`;
    input.current?.focus();
  };

  return (
    <fieldset>
      <legend className="field-label">{a.flags}</legend>
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.map((x) => {
          const active = on.includes(x.id);
          return (
            <button key={x.id} type="button" aria-pressed={active} onClick={() => toggle(x.id, !active)}
              className={cn("rounded-full px-3 py-1.5 text-xs ring-1 transition", x.archived_at ? "bg-paper text-ink/45 ring-transparent" : active ? cn(swatch[x.color], "ring-ink/40") : "bg-paper text-ink/65 ring-transparent hover:ring-line")}>
              {localized(x, "label", language)}
            </button>
          );
        })}
        <button ref={opener} type="button" onClick={open} aria-label={a.tagAdd} title={a.tagAdd} className="flex h-7 w-7 items-center justify-center rounded-full bg-paper ring-1 ring-line hover:ring-ink/30"><Plus className="h-3.5 w-3.5" aria-hidden /></button>
      </div>
      <ResultText state={state} />

      <div ref={pop} popover="auto" className="m-0 w-72 space-y-3 rounded-2xl bg-raised p-3 text-ink shadow-float ring-1 ring-line">
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} maxLength={40} placeholder={a.tagSearch} aria-label={a.tagSearch} className="field py-2"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (exact) pick(exact.id);
            else create();
          }} />
        {matches.length > 0 && (
          <ul className="max-h-40 space-y-0.5 overflow-y-auto">
            {matches.map((x) => (
              <li key={x.id}><button type="button" onClick={() => pick(x.id)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-sm hover:bg-paper"><TagPill tag={x} />{on.includes(x.id) && <span className="ms-auto text-[11px] text-ink/50">✓</span>}</button></li>
            ))}
          </ul>
        )}
        {q.trim() && !exact && (
          <>
            <div role="group" aria-label={a.tagColor} className="flex flex-wrap gap-1.5">
              {TAG_COLORS.map((c) => (
                <button key={c} type="button" aria-pressed={color === c} aria-label={c} onClick={() => setColor(c)}
                  className={cn("h-6 w-6 rounded-full ring-2 ring-offset-1 ring-offset-raised", swatch[c], color === c ? "ring-ink" : "ring-transparent")} />
              ))}
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-ink/65">{a.tagTranslations}</summary>
              <div className="space-y-2 pt-2">
                <input value={en} onChange={(e) => setEn(e.target.value)} maxLength={40} lang="en" placeholder="English" aria-label="English" className="field py-2" />
                <input value={ar} onChange={(e) => setAr(e.target.value)} maxLength={40} lang="ar" dir="rtl" placeholder="العربية" aria-label="العربية" className="field py-2" />
              </div>
            </details>
            <button type="button" disabled={pending} onClick={create} className="btn-ink btn-sm w-full">{a.tagCreate(q.trim())}</button>
          </>
        )}
      </div>
    </fieldset>
  );
}
