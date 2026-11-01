"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { requestPlusUpgrade } from "@/lib/actions/account";

/** A Particulier asks for Particulier+; the request lands in the staff inbox. */
export function UpgradeCard({ alreadyAsked }: { alreadyAsked: boolean }) {
  const { t } = useApp();
  const a = t.account;
  const [state, action, pending] = useActionState(requestPlusUpgrade, null);
  return (
    <section id="particulier-plus" aria-labelledby="plus-title" className="card flex scroll-mt-24 flex-wrap items-center justify-between gap-4 p-6">
      <div className="flex max-w-xl gap-3">
        <Sparkles className="mt-1 h-5 w-5 shrink-0 text-toffeeBrown" aria-hidden />
        <div className="space-y-1">
          <h2 id="plus-title" className="text-lg font-semibold tracking-tight">{a.upgradeTitle}</h2>
          <p className="text-sm text-ink/65 text-pretty">{a.upgradeText}</p>
        </div>
      </div>
      {alreadyAsked || state?.ok ? (
        <p role="status" className="rounded-full bg-ok-soft px-4 py-2 text-sm text-ok">{state?.ok ? a.upgradeSent : a.upgradePending}</p>
      ) : (
        <form action={action} className="flex flex-col items-end gap-1">
          <button type="submit" disabled={pending} className="btn-ink">{pending ? t.common.loading : a.upgradeCta}</button>
          {state?.error && <span role="alert" className="text-xs text-bad">{t.common.errorGeneric}</span>}
        </form>
      )}
    </section>
  );
}
