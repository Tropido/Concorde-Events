"use client";

import { useActionState, useState, useTransition } from "react";
import { useApp } from "@/lib/context/app-context";
import { saveClientNotes, setRole, type AdminResult } from "@/lib/actions/admin";
import { btnGhost, field, ResultText } from "@/components/admin/ui";
import type { AppRole } from "@/lib/types";

const ROLES: AppRole[] = ["customer", "professional", "editor", "manager", "admin"];

export function RoleSelect({ profileId, role }: { profileId: string; role: AppRole }) {
  const { t } = useApp();
  const a = t.admin.clients;
  const [value, setValue] = useState(role);
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <label className="sr-only" htmlFor={`role-${profileId}`}>{a.changeRole}</label>
      <select id={`role-${profileId}`} value={value} onChange={(e) => setValue(e.target.value as AppRole)} className="p-2 rounded-xl border border-tan/40 bg-white dark:bg-darkBg text-xs">
        {ROLES.map((r) => <option key={r} value={r}>{a.roleLabels[r]}</option>)}
      </select>
      <button type="button" disabled={pending || value === role} className={btnGhost}
        onClick={() => { if (confirm(t.admin.requests.confirmPrompt)) start(async () => setState(await setRole(profileId, value))); }}>
        {a.changeRole}
      </button>
      <ResultText state={state} />
    </span>
  );
}

export function NotesForm({ profileId, notes, flags, level }: { profileId: string; notes: string; flags: string[]; level: string }) {
  const { t } = useApp();
  const a = t.admin.clients;
  const [state, action, pending] = useActionState(saveClientNotes, null);
  return (
    <details className="pt-2 border-t border-tan/20">
      <summary className="cursor-pointer text-xs font-bold">{a.notes}</summary>
      <form action={action} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
        <input type="hidden" name="profile_id" value={profileId} />
        <label className="text-xs font-semibold sm:col-span-3">{a.notes}<textarea name="notes" rows={3} maxLength={5000} defaultValue={notes} className={field} /></label>
        <label className="text-xs font-semibold sm:col-span-2">{a.flags}<input name="flags" maxLength={500} defaultValue={flags.join(", ")} className={field} /><span className="block font-normal opacity-70">{a.flagsHint}</span></label>
        <label className="text-xs font-semibold">{a.level}<input name="level" maxLength={40} defaultValue={level} className={field} /></label>
        <div className="flex items-center gap-3"><button type="submit" disabled={pending} className={btnGhost}>{a.saveNotes}</button><ResultText state={state} /></div>
      </form>
    </details>
  );
}
