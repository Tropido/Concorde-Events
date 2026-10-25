"use client";

import { useActionState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { submitContact } from "@/lib/actions/contact";
import { BUSINESS_WHATSAPP_DISPLAY, waLink } from "@/lib/utils/whatsapp";

export function ContactForm({ defaults }: { defaults: { name: string; email: string; phone: string } }) {
  const { t } = useApp();
  const [state, action, pending] = useActionState(submitContact, null);
  const field = (label: string, input: React.ReactNode, wide = false) => (
    <label className={wide ? "block sm:col-span-2" : "block"}><span className="field-label">{label}</span>{input}</label>
  );

  return (
    <div className="grid gap-2.5 lg:grid-cols-[2fr_1fr]">
      <div className="card p-6 sm:p-10">
        {state?.ok ? (
          <p role="status" className="flex items-center gap-3 text-[15px]"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-ok text-card"><Check className="h-4 w-4" /></span>{t.contact.sent}</p>
        ) : (
          <form action={action} className="grid gap-3 sm:grid-cols-2">
            {field(t.contact.name, <input name="name" required maxLength={120} autoComplete="name" defaultValue={defaults.name} className="field" />)}
            {field(t.contact.email, <input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={defaults.email} className="field" dir="ltr" />)}
            {field(`${t.contact.phone} · ${t.common.optional}`, <input name="phone" type="tel" maxLength={40} autoComplete="tel" defaultValue={defaults.phone} className="field" dir="ltr" />)}
            {field(t.contact.subject, <input name="subject" required maxLength={200} className="field" />)}
            {field(t.contact.message, <textarea name="body" required rows={6} maxLength={5000} className="field resize-none" />, true)}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            {state?.error && <p role="alert" className="rounded-2xl bg-bad-soft p-3 text-sm text-bad sm:col-span-2">{t.submitErrors[state.error]}</p>}
            <div className="sm:col-span-2"><button type="submit" disabled={pending} className="btn-ink">{pending ? t.contact.sending : t.contact.send}</button></div>
          </form>
        )}
      </div>
      <aside className="flex flex-col justify-between gap-8 rounded-[1.75rem] bg-ink p-6 text-card sm:p-8">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">{t.contact.whatsappTitle}</h2>
          <p className="text-sm text-almondCream/70">{t.contact.whatsappText}</p>
          <p className="text-xl font-semibold"><bdi dir="ltr">{BUSINESS_WHATSAPP_DISPLAY}</bdi></p>
        </div>
        <div className="space-y-3">
          <a href={waLink(t.hero.whatsappGreeting)} target="_blank" rel="noopener noreferrer" className="btn w-full bg-card text-ink hover:bg-almondCream">
            <MessageCircle className="h-4 w-4" aria-hidden />{t.contact.whatsappButton}
          </a>
          <p className="text-xs text-almondCream/50">{t.contact.addressPending}</p>
        </div>
      </aside>
    </div>
  );
}
