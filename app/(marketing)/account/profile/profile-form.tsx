"use client";

import { useActionState } from "react";
import { useApp } from "@/lib/context/app-context";
import { updateProfile } from "@/lib/actions/account";
import { ACTIVITIES } from "@/components/auth/auth-forms";
import type { Viewer } from "@/lib/types";

export function ProfileForm({ viewer }: { viewer: Viewer }) {
  const { t } = useApp();
  const a = t.auth;
  const [state, action, pending] = useActionState(updateProfile, null);
  const pro = viewer.role === "professional";
  const field = (label: string, input: React.ReactNode) => <label className="block"><span className="field-label">{label}</span>{input}</label>;
  return (
    <form action={action} className="card grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:col-span-2">{t.account.profile}</h1>
      {field(a.fullName, <input name="full_name" required maxLength={120} defaultValue={viewer.fullName ?? ""} className="field" />)}
      {field(a.email, <input value={viewer.email} readOnly disabled className="field opacity-60" dir="ltr" />)}
      {field(a.phone, <input name="phone" type="tel" maxLength={40} defaultValue={viewer.phone ?? ""} className="field" dir="ltr" />)}
      {field(a.city, <input name="city" maxLength={80} defaultValue={viewer.city ?? ""} className="field" />)}
      {field(a.company, <input name="company_name" maxLength={120} defaultValue={viewer.companyName ?? ""} className="field" />)}
      {field(a.vat, <input name="vat_number" maxLength={40} defaultValue={viewer.vatNumber ?? ""} className="field" dir="ltr" />)}
      {pro && field(a.activity, (
        <select name="activity" defaultValue={viewer.activity ?? ""} className="field">
          <option value="">—</option>
          {ACTIVITIES.map((x) => <option key={x} value={x}>{a.activities[x]}</option>)}
        </select>
      ))}
      {pro && field(a.website, <input name="website" maxLength={200} defaultValue={viewer.website ?? ""} className="field" dir="ltr" />)}
      <div className="flex items-center gap-4 pt-2 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-ink">{pending ? t.common.saving : t.common.save}</button>
        <span aria-live="polite" className="text-sm">
          {state?.ok && <span className="text-ok">{t.account.profileSaved}</span>}
          {state?.error && <span className="text-bad">{t.common.errorGeneric}</span>}
        </span>
      </div>
    </form>
  );
}
