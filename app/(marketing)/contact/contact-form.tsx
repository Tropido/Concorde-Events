"use client";

import { useActionState } from "react";
import { MessageCircle } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { submitContact } from "@/lib/actions/contact";
import { BUSINESS_WHATSAPP_DISPLAY, waLink } from "@/lib/utils/whatsapp";
import type { Country } from "@/lib/types";

const input = "w-full p-3 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-toffeeBrown";

export function ContactForm({ country, defaults }: { country: Country; defaults: { name: string; email: string; phone: string } }) {
  const { t } = useApp();
  const [state, action, pending] = useActionState(submitContact, null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 apple-card rounded-3xl border border-tan/30 p-6 sm:p-8">
        {state?.ok ? (
          <p role="status" className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{t.contact.sent}</p>
        ) : (
          <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="hidden" name="country" value={country} />
            <label className="text-xs font-semibold">
              {t.contact.name}
              <input name="name" required maxLength={120} autoComplete="name" defaultValue={defaults.name} className={`${input} mt-1`} />
            </label>
            <label className="text-xs font-semibold">
              {t.contact.email}
              <input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={defaults.email} className={`${input} mt-1`} />
            </label>
            <label className="text-xs font-semibold">
              {t.contact.phone} ({t.common.optional})
              <input name="phone" type="tel" maxLength={40} autoComplete="tel" defaultValue={defaults.phone} className={`${input} mt-1`} />
            </label>
            <label className="text-xs font-semibold">
              {t.contact.subject}
              <input name="subject" required maxLength={200} className={`${input} mt-1`} />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              {t.contact.message}
              <textarea name="body" required rows={6} maxLength={5000} className={`${input} mt-1`} />
            </label>
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            {state?.error && (
              <p role="alert" className="sm:col-span-2 text-sm font-semibold text-rose-700 dark:text-rose-300">{t.submitErrors[state.error]}</p>
            )}
            <button type="submit" disabled={pending}
              className="sm:col-span-2 py-4 rounded-full bg-toffeeBrown hover:bg-coffeeBean text-white font-extrabold text-xs uppercase tracking-wider disabled:opacity-60">
              {pending ? t.contact.sending : t.contact.send}
            </button>
          </form>
        )}
      </div>
      <aside className="apple-card rounded-3xl border border-tan/30 p-6 sm:p-8 space-y-4 h-fit">
        <h2 className="text-xl font-bold font-serif">{t.contact.whatsappTitle}</h2>
        <p className="text-sm text-coffeeBean/75 dark:text-almondCream/75">{t.contact.whatsappText}</p>
        <p className="font-bold"><bdi dir="ltr">{BUSINESS_WHATSAPP_DISPLAY}</bdi></p>
        <a href={waLink(t.hero.whatsappGreeting)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider">
          <MessageCircle className="w-4 h-4" aria-hidden />{t.contact.whatsappButton}
        </a>
        <p className="text-xs text-coffeeBean/60 dark:text-almondCream/60">{t.contact.addressPending}</p>
      </aside>
    </div>
  );
}
