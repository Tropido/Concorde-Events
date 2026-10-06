"use client";

import { useActionState } from "react";
import { useApp } from "@/lib/context/app-context";
import { updateProfile } from "@/lib/actions/account";
import type { Viewer } from "@/lib/types";

const input = "w-full p-3 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-toffeeBrown";

export function ProfileForm({ viewer }: { viewer: Viewer }) {
  const { t } = useApp();
  const [state, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="apple-card rounded-3xl border border-tan/30 p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
      <label className="text-xs font-semibold">{t.auth.fullName}
        <input name="full_name" required maxLength={120} defaultValue={viewer.fullName ?? ""} className={`${input} mt-1`} />
      </label>
      <label className="text-xs font-semibold">{t.auth.email}
        <input value={viewer.email} readOnly disabled className={`${input} mt-1 opacity-70`} />
      </label>
      <label className="text-xs font-semibold">{t.auth.phone}
        <input name="phone" type="tel" maxLength={40} defaultValue={viewer.phone ?? ""} className={`${input} mt-1`} />
      </label>
      <label className="text-xs font-semibold">{t.common.country}
        <select name="country" defaultValue={viewer.country ?? ""} className={`${input} mt-1`}>
          <option value="">—</option>
          <option value="FR">{t.common.france}</option>
          <option value="TN">{t.common.tunisia}</option>
        </select>
      </label>
      <label className="text-xs font-semibold">{t.auth.company}
        <input name="company_name" maxLength={120} defaultValue={viewer.companyName ?? ""} className={`${input} mt-1`} />
      </label>
      <label className="text-xs font-semibold">{t.auth.vat}
        <input name="vat_number" maxLength={40} defaultValue={viewer.vatNumber ?? ""} className={`${input} mt-1`} />
      </label>
      <div className="sm:col-span-2 flex items-center gap-4">
        <button type="submit" disabled={pending} className="px-6 py-3 rounded-full bg-toffeeBrown hover:bg-coffeeBean text-white text-xs font-bold disabled:opacity-60">
          {pending ? t.common.saving : t.common.save}
        </button>
        <span aria-live="polite" className="text-sm">
          {state?.ok && t.account.profileSaved}
          {state?.error && <span className="text-rose-700 dark:text-rose-300">{t.common.errorGeneric}</span>}
        </span>
      </div>
    </form>
  );
}
