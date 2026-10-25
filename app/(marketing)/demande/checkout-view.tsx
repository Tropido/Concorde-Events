"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Mail, MessageCircle, Phone, Store, Truck } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { markWhatsappOpened, submitRequest } from "@/lib/actions/requests";
import { nights } from "@/lib/dates";
import { cn, formatTND } from "@/lib/utils/formatters";
import { waLink } from "@/lib/utils/whatsapp";
import { DraftLineRow, draftEstimate } from "@/components/catalogue/bag-drawer";
import { EmptyState, ease } from "@/components/ui/kit";
import { EVENT_TYPES, type ContactChannel, type DeliveryMode, type EventType } from "@/lib/types";
import type { SubmitErrorCode } from "@/lib/i18n/translations";

export function CheckoutView() {
  const { t, language, viewer, draft, clearDraft } = useApp();
  const c = t.checkout;
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [delivery, setDelivery] = useState<DeliveryMode>("delivery");
  const [contact, setContact] = useState<ContactChannel>("whatsapp");
  const [error, setError] = useState<SubmitErrorCode | null>(null);
  const [done, setDone] = useState<{ reference: string; key: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  // One key per attempt at a given draft: a retried submit returns the same reference.
  const keyRef = useRef<{ draft: string; key: string } | null>(null);
  const total = draftEstimate(draft);

  const submit = (form: FormData) => {
    const draftJson = JSON.stringify(draft);
    if (keyRef.current?.draft !== draftJson) keyRef.current = { draft: draftJson, key: crypto.randomUUID() };
    const key = keyRef.current.key;
    const str = (k: string) => String(form.get(k) ?? "").trim() || undefined;
    const guests = Number(form.get("guests"));
    const contactInfo = { name: str("name") ?? "", phone: str("phone") ?? "", email: str("email") ?? "" };
    setError(null);
    start(async () => {
      const res = await submitRequest({
        idempotencyKey: key,
        ...contactInfo,
        company: str("company"),
        notes: str("notes"),
        website: str("website"),
        eventType: eventType ?? undefined,
        venue: str("venue"),
        guests: Number.isInteger(guests) && guests > 0 ? guests : undefined,
        delivery,
        contact,
        lines: draft.map((l) => ({ productId: l.productId, quantity: l.quantity, startDate: l.startDate, endDate: l.endDate })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const lines = draft.map((l) => `• ${l.quantity} × ${l.title} — ${l.startDate} → ${l.endDate} (${t.common.nights(nights(l.startDate, l.endDate) ?? 0)})`).join("\n");
      setDone({ reference: res.reference, key, message: `${c.whatsappIntro(res.reference)}\n${lines}\n${c.whatsappContact}: ${contactInfo.name}, ${contactInfo.phone}` });
      keyRef.current = null;
      clearDraft();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  if (done) return <ThankYou reference={done.reference} onWhatsapp={() => { void markWhatsappOpened(done.key); window.open(waLink(done.message), "_blank", "noopener"); }} />;

  if (draft.length === 0) {
    return (
      <div className="shell pt-10">
        <EmptyState title={t.bag.emptyTitle} text={t.bag.emptyText} action={<Link href="/catalogue" className="btn-ink">{t.bag.browse}</Link>} />
      </div>
    );
  }

  const option = (active: boolean) => cn("flex items-center gap-3 rounded-2xl p-4 text-start ring-1 transition", active ? "bg-card ring-ink" : "bg-paper ring-transparent hover:ring-line");

  return (
    <form action={submit} className="shell grid items-start gap-2.5 pt-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
      <div className="card space-y-10 p-6 sm:p-10">
        <div className="space-y-2">
          <p className="label">{c.label}</p>
          <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">{c.title}</h1>
        </div>

        <Step n={1} title={c.contactTitle}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={c.name}><input name="name" required maxLength={120} autoComplete="name" defaultValue={viewer?.fullName ?? ""} className="field" /></Field>
            <Field label={c.phone}><input name="phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" defaultValue={viewer?.phone ?? ""} className="field" dir="ltr" /></Field>
            <Field label={c.email}><input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={viewer?.email ?? ""} className="field" dir="ltr" /></Field>
            <Field label={`${c.company} · ${t.common.optional}`}><input name="company" maxLength={120} autoComplete="organization" defaultValue={viewer?.companyName ?? ""} className="field" /></Field>
          </div>
          {/* Honeypot: hidden from people and assistive tech, often filled by bots. */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        </Step>

        <Step n={2} title={c.eventTitle}>
          <fieldset>
            <legend className="field-label">{c.eventType}</legend>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((e) => (
                <button key={e} type="button" aria-pressed={eventType === e} onClick={() => setEventType(eventType === e ? null : e)}
                  className={cn("rounded-full px-4 py-2 text-sm ring-1 transition", eventType === e ? "bg-ink text-card ring-ink" : "bg-paper ring-transparent hover:ring-line")}>
                  {t.eventTypes[e]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Field label={c.venue}><input name="venue" maxLength={200} placeholder={c.venuePlaceholder} className="field" /></Field>
            <Field label={c.guests}><input name="guests" type="number" min={1} max={100000} inputMode="numeric" className="field" /></Field>
          </div>
          <fieldset>
            <legend className="field-label">{c.deliveryTitle}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([["delivery", Truck], ["pickup", Store]] as const).map(([v, Icon]) => (
                <button key={v} type="button" aria-pressed={delivery === v} onClick={() => setDelivery(v)} className={option(delivery === v)}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper"><Icon className="h-4 w-4" aria-hidden /></span>
                  <span><span className="block text-sm font-semibold">{c.delivery[v].title}</span><span className="block text-xs text-ink/55">{c.delivery[v].text}</span></span>
                </button>
              ))}
            </div>
          </fieldset>
        </Step>

        <Step n={3} title={c.confirmTitle}>
          <fieldset>
            <legend className="field-label">{c.contactPref}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {([["whatsapp", MessageCircle], ["phone", Phone], ["email", Mail]] as const).map(([v, Icon]) => (
                <button key={v} type="button" aria-pressed={contact === v} onClick={() => setContact(v)} className={option(contact === v)}>
                  <Icon className="h-4 w-4" aria-hidden /><span className="text-sm font-semibold">{c.contactOptions[v]}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <Field label={`${c.notes} · ${t.common.optional}`}>
            <textarea name="notes" rows={3} maxLength={2000} placeholder={c.notesPlaceholder} className="field resize-none" />
          </Field>
        </Step>
      </div>

      <aside className="card space-y-5 p-6 lg:sticky lg:top-20" aria-labelledby="summary-title">
        <h2 id="summary-title" className="text-lg font-semibold tracking-tight">{c.summary}</h2>
        <ul className="max-h-[42vh] divide-y divide-line overflow-y-auto">{draft.map((l) => <DraftLineRow key={l.id} line={l} compact />)}</ul>
        <dl className="space-y-2 border-t border-line pt-4 text-sm">
          {viewer?.pro && viewer.status === "approved" && viewer.pro.discount > 0 && (
            <div className="flex justify-between text-ink/60"><dt>{t.pro.discountApplied(viewer.pro.tier.name)}</dt><dd><bdi dir="ltr">−{viewer.pro.discount}%</bdi></dd></div>
          )}
          <div className="flex items-baseline justify-between"><dt className="text-ink/60">{t.bag.estimate}</dt><dd className="text-2xl font-semibold tabular-nums">{total !== null ? formatTND(total, language) : "—"}</dd></div>
        </dl>
        {error && <p role="alert" className="rounded-2xl bg-bad-soft p-3 text-sm text-bad">{t.submitErrors[error]}</p>}
        <button type="submit" disabled={pending} className="btn-ink h-12 w-full">{pending ? c.sending : c.send}</button>
        <p className="text-xs leading-relaxed text-ink/50">{c.noPayment}</p>
      </aside>
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-xs text-card">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="field-label">{label}</span>{children}</label>;
}

function ThankYou({ reference, onWhatsapp }: { reference: string; onWhatsapp: () => void }) {
  const { t, viewer } = useApp();
  const c = t.checkout;
  return (
    <div className="shell flex min-h-[60vh] items-center justify-center pt-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="card relative w-full max-w-lg space-y-5 p-10 text-center">
        <div className="relative mx-auto h-16 w-16">
          {Array.from({ length: 8 }, (_, i) => (
            <motion.span key={i} className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-tan"
              initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: Math.cos((i / 8) * 2 * Math.PI) * 52, y: Math.sin((i / 8) * 2 * Math.PI) * 52, opacity: [0, 1, 0] }}
              transition={{ duration: 1.1, ease, delay: 0.15 }} aria-hidden />
          ))}
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-ok text-card"><Check className="h-7 w-7" /></motion.span>
        </div>
        <div role="status" className="space-y-5">
          <p className="label"><bdi>{reference}</bdi></p>
          <h1 className="display text-5xl">{c.thanksTitle}</h1>
          <p className="text-sm text-ink/65 text-pretty">{c.thanksText}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <button type="button" onClick={onWhatsapp} className="btn-ink"><MessageCircle className="h-4 w-4" aria-hidden />{c.openWhatsapp}</button>
          {viewer
            ? <Link href="/account" className="btn-light">{c.track}</Link>
            : <Link href="/register" className="btn-light">{c.createAccount}</Link>}
        </div>
      </motion.div>
    </div>
  );
}
