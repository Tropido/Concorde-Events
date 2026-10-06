"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MessageCircle, Minus, Plus, X } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { markWhatsappOpened, submitRequest } from "@/lib/actions/requests";
import { nights } from "@/lib/dates";
import { formatDay, formatMoney } from "@/lib/utils/formatters";
import { waLink } from "@/lib/utils/whatsapp";
import type { SubmitErrorCode } from "@/lib/i18n/translations";
import type { CatalogueProduct } from "@/lib/types";

const input = "w-full p-3 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-toffeeBrown";

export function DraftPanel({ products }: { products: CatalogueProduct[] }) {
  const { t, language, country, viewer, draft, updateDraftQuantity, removeFromDraft, clearDraft } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<SubmitErrorCode | null>(null);
  const [done, setDone] = useState<{ reference: string; key: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  // One key per attempt at a given draft: a retried submit (e.g. after a network error)
  // returns the same reference instead of creating a duplicate request.
  const keyRef = useRef<{ draft: string; key: string } | null>(null);

  const priceBy = useMemo(() => new Map(products.map((p) => [p.id, p.price])), [products]);
  const estimate = useMemo(() => {
    let total = 0;
    for (const l of draft) {
      const price = priceBy.get(l.productId);
      const n = nights(l.startDate, l.endDate);
      if (!price || price.amount === null || n === null) return null;
      total += price.amount * l.quantity * n;
    }
    const currency = draft.length ? priceBy.get(draft[0].productId)?.currency : undefined;
    return currency ? { total, currency } : null;
  }, [draft, priceBy]);

  const submit = (form: FormData) => {
    const draftJson = JSON.stringify(draft);
    if (keyRef.current?.draft !== draftJson) keyRef.current = { draft: draftJson, key: crypto.randomUUID() };
    const key = keyRef.current.key;
    const contact = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      company: String(form.get("company") ?? "") || undefined,
      notes: String(form.get("notes") ?? "") || undefined,
      website: String(form.get("website") ?? "") || undefined,
    };
    setError(null);
    startTransition(async () => {
      const res = await submitRequest({
        idempotencyKey: key,
        country,
        ...contact,
        lines: draft.map((l) => ({ productId: l.productId, quantity: l.quantity, startDate: l.startDate, endDate: l.endDate })),
      });
      if (!res.ok) {
        setError(res.error); // the draft stays intact
        return;
      }
      const lines = draft
        .map((l) => `• ${l.quantity} × ${l.title} — ${l.startDate} → ${l.endDate} (${t.common.nights(nights(l.startDate, l.endDate) ?? 0)})`)
        .join("\n");
      setDone({
        reference: res.reference,
        key,
        message: `${t.draft.whatsappIntro(res.reference)}\n${lines}\n${t.draft.whatsappContact}: ${contact.name}, ${contact.phone}`,
      });
      keyRef.current = null;
      setFormOpen(false);
      clearDraft();
    });
  };

  return (
    <section id="draft" aria-labelledby="draft-title" className="scroll-mt-28 bg-coffeeBean text-almondCream p-6 sm:p-10 rounded-3xl border border-tan/30 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-tan/20 pb-5">
        <div>
          <p className="text-xs font-bold text-tan uppercase tracking-widest">{t.draft.badge}</p>
          <h2 id="draft-title" className="text-2xl sm:text-3xl font-extrabold font-serif text-white">{t.draft.title}</h2>
        </div>
        <p className="text-xs text-almondCream/70">
          {t.draft.countryNote(country === "TN" ? t.common.tunisia : t.common.france)} · {t.draft.lines(draft.length)}
        </p>
      </div>

      {done && (
        <div role="status" className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 space-y-3">
          <p className="flex items-center gap-2 font-bold text-white">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" aria-hidden />{t.draft.successTitle}
          </p>
          <p className="text-sm">{t.draft.successText(done.reference)}</p>
          <div className="flex flex-wrap gap-3">
            <a href={waLink(done.message)} target="_blank" rel="noopener noreferrer"
              onClick={() => void markWhatsappOpened(done.key)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider">
              <MessageCircle className="w-4 h-4" aria-hidden />{t.draft.openWhatsapp}
            </a>
            {viewer && (
              <Link href="/account" className="inline-flex items-center px-5 py-3 rounded-full border border-tan/40 text-xs font-bold uppercase tracking-wider">
                {t.draft.trackInAccount}
              </Link>
            )}
          </div>
        </div>
      )}

      {draft.length === 0 ? (
        !done && <p className="text-sm text-almondCream/70 italic text-center py-6">{t.draft.empty}</p>
      ) : (
        <>
          <ul className="divide-y divide-tan/15">
            {draft.map((l) => {
              const n = nights(l.startDate, l.endDate) ?? 0;
              return (
                <li key={l.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-darkSurface shrink-0">
                      {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white font-serif truncate">{l.title}</p>
                      <p className="text-xs text-tan">
                        <bdi>{formatDay(l.startDate, language)}</bdi> → <bdi>{formatDay(l.endDate, language)}</bdi> · {t.common.nights(n)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-darkBg/60 rounded-xl px-2 py-1 border border-tan/20">
                      <button type="button" aria-label={t.booking.decrease} onClick={() => updateDraftQuantity(l.id, l.quantity - 1)} className="p-1 hover:text-white">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center" aria-live="polite">{l.quantity}</span>
                      <button type="button" aria-label={t.booking.increase} disabled={l.quantity >= l.maxQuantity}
                        onClick={() => updateDraftQuantity(l.id, l.quantity + 1)} className="p-1 hover:text-white disabled:opacity-40">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button type="button" onClick={() => removeFromDraft(l.id)} aria-label={`${t.draft.remove}: ${l.title}`} className="p-1 text-almondCream/60 hover:text-rose-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="pt-5 border-t border-tan/20 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div>
              {estimate && (
                <p className="text-2xl font-black text-tan font-serif">
                  <span className="block text-xs font-bold text-almondCream/70 font-sans">{t.draft.estimatedTotal}</span>
                  {formatMoney(estimate.total, estimate.currency, language)}
                </p>
              )}
              <p className="text-[11px] text-almondCream/60 max-w-md">{t.draft.estimateNote}</p>
            </div>
            {!formOpen && (
              <button type="button" onClick={() => setFormOpen(true)}
                className="px-8 py-4 rounded-full bg-toffeeBrown hover:bg-tan hover:text-coffeeBean text-white font-extrabold text-xs uppercase tracking-wider shadow-xl">
                {t.draft.submit}
              </button>
            )}
          </div>

          {formOpen && (
            <form action={submit} className="space-y-4 pt-2" aria-labelledby="contact-title">
              <div>
                <h3 id="contact-title" className="text-xl font-bold font-serif text-white">{t.draft.contactTitle}</h3>
                <p className="text-xs text-almondCream/70">{t.draft.contactIntro}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-coffeeBean dark:text-almondCream">
                <Field label={t.draft.name}><input name="name" required maxLength={120} autoComplete="name" defaultValue={viewer?.fullName ?? ""} className={input} /></Field>
                <Field label={t.draft.phone}><input name="phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" defaultValue={viewer?.phone ?? ""} className={input} /></Field>
                <Field label={t.draft.email}><input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={viewer?.email ?? ""} className={input} /></Field>
                <Field label={`${t.draft.company} (${t.common.optional})`}><input name="company" maxLength={120} autoComplete="organization" defaultValue={viewer?.companyName ?? ""} className={input} /></Field>
                <Field label={`${t.draft.notes} (${t.common.optional})`} wide>
                  <textarea name="notes" rows={3} maxLength={2000} placeholder={t.draft.notesPlaceholder} className={input} />
                </Field>
                {/* Honeypot: hidden from people and assistive tech, often filled by bots. */}
                <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
              </div>
              {error && <p role="alert" className="text-sm font-semibold text-rose-300">{t.submitErrors[error]}</p>}
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={pending}
                  className="px-8 py-4 rounded-full bg-toffeeBrown hover:bg-tan hover:text-coffeeBean text-white font-extrabold text-xs uppercase tracking-wider disabled:opacity-60">
                  {pending ? t.draft.sending : t.draft.send}
                </button>
                <button type="button" onClick={() => setFormOpen(false)} className="px-6 py-4 rounded-full border border-tan/30 text-xs font-bold">
                  {t.common.cancel}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block text-xs font-semibold text-almondCream ${wide ? "sm:col-span-2" : ""}`}>
      <span className="block mb-1">{label}</span>
      {children}
    </label>
  );
}
