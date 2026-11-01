"use client";

import { useState, useTransition } from "react";
import { useApp } from "@/lib/context/app-context";
import { archiveClientTag, renameClientTag, type AdminResult } from "@/lib/actions/admin";
import { TAG_COLORS, TagPill, type ClientTag } from "../clients/tags";
import { ResultText } from "@/components/admin/ui";

/** Every label: its creator or an admin renames it, only an admin archives or restores it. */
export function TagsPanel({ tags, selfId, isAdmin }: { tags: ClientTag[]; selfId: string; isAdmin: boolean }) {
  return <ul className="divide-y divide-line">{tags.map((tag) => <Row key={tag.id} tag={tag} canRename={isAdmin || tag.created_by === selfId} canArchive={isAdmin} />)}</ul>;
}

function Row({ tag, canRename, canArchive }: { tag: ClientTag; canRename: boolean; canArchive: boolean }) {
  const { t } = useApp();
  const a = t.admin.clients;
  const [v, setV] = useState({ label_fr: tag.label_fr, label_en: tag.label_en ?? "", label_ar: tag.label_ar ?? "", color: tag.color });
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <li className="py-3">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
          <TagPill tag={tag} />{tag.is_system && <span className="text-[11px] text-ink/50">{a.tagSystem}</span>}{tag.archived_at && <span className="text-[11px] text-ink/50">{a.tagArchived}</span>}
        </summary>
        <form className="grid gap-2 pt-3 sm:grid-cols-4" onSubmit={(e) => {
          e.preventDefault();
          start(async () => setState(await renameClientTag(tag.id, { label_fr: v.label_fr, label_en: v.label_en || null, label_ar: v.label_ar || null, color: v.color })));
        }}>
          <fieldset disabled={!canRename} className="contents">
            <input required maxLength={40} value={v.label_fr} onChange={(e) => setV({ ...v, label_fr: e.target.value })} aria-label="Français" className="field py-2" />
            <input maxLength={40} lang="en" value={v.label_en} onChange={(e) => setV({ ...v, label_en: e.target.value })} aria-label="English" placeholder="English" className="field py-2" />
            <input maxLength={40} lang="ar" dir="rtl" value={v.label_ar} onChange={(e) => setV({ ...v, label_ar: e.target.value })} aria-label="العربية" placeholder="العربية" className="field py-2" />
            <select value={v.color} onChange={(e) => setV({ ...v, color: e.target.value as ClientTag["color"] })} aria-label={a.tagColor} className="field py-2">
              {TAG_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </fieldset>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-4">
            {canRename && <button type="submit" disabled={pending} className="btn-ink btn-sm">{t.common.save}</button>}
            {canArchive && <button type="button" disabled={pending} className="btn-light btn-sm" onClick={() => start(async () => setState(await archiveClientTag(tag.id, !tag.archived_at)))}>{tag.archived_at ? a.tagRestore : a.tagArchive}</button>}
            <ResultText state={state} />
          </div>
        </form>
      </details>
    </li>
  );
}
