"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Check, MailCheck, UserRound } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/formatters";
import { ease } from "@/components/ui/kit";

export const ACTIVITIES = ["wedding_planner", "agency", "venue", "caterer", "designer", "photographer", "other"] as const;

export function AuthCard({ title, subtitle, children, aside, wide = false }: {
  title: string; subtitle?: string; children: React.ReactNode; aside?: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="shell flex flex-1 items-start justify-center pt-8 sm:pt-14">
      <div className={cn("grid w-full gap-2.5", aside ? "max-w-5xl lg:grid-cols-[1.2fr_1fr]" : wide ? "max-w-xl" : "max-w-md")}>
        <div className="card space-y-7 p-6 sm:p-10">
          <div className="space-y-2">
            <h1 className="display text-4xl sm:text-5xl">{title}</h1>
            {subtitle && <p className="text-sm text-ink/60">{subtitle}</p>}
          </div>
          {children}
        </div>
        {aside}
      </div>
    </div>
  );
}

function ErrorText({ state }: { state: AuthState }) {
  const { t } = useApp();
  if (!state?.error) return null;
  const msg = state.error === "noStaffAccess" ? t.auth.noStaffAccess : t.auth.errors[state.error];
  return <p role="alert" className="rounded-2xl bg-bad-soft p-3 text-sm text-bad">{msg}</p>;
}

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={cn("block", wide && "sm:col-span-2")}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/45">{hint}</span>}
    </label>
  );
}

export function LoginForm({ next, scope, linkError }: { next?: string; scope: "customer" | "admin"; linkError?: boolean }) {
  const { t } = useApp();
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4">
      {linkError && <p role="alert" className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{t.auth.linkInvalid}</p>}
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="scope" value={scope} />
      <Field label={t.auth.email}><input name="email" type="email" required autoComplete="email" className="field" dir="ltr" /></Field>
      <Field label={t.auth.password}><input name="password" type="password" required autoComplete="current-password" className="field" dir="ltr" /></Field>
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className="btn-ink h-12 w-full">{pending ? t.common.loading : t.auth.submitLogin}</button>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-ink/60 hover:text-ink">{t.auth.forgot}</Link>
        {scope === "customer" && <Link href="/register" className="font-medium hover:underline">{t.auth.noAccount}</Link>}
      </div>
    </form>
  );
}

export function RegisterForm({ initialType }: { initialType: "customer" | "professional" }) {
  const { t } = useApp();
  const a = t.auth;
  const [state, action, pending] = useActionState(signUp, null);
  const [type, setType] = useState(initialType);

  if (state?.ok) {
    return (
      <div role="status" className="space-y-3 rounded-3xl bg-paper p-6 text-center">
        <MailCheck className="mx-auto h-8 w-8 text-toffeeBrown" aria-hidden />
        <p className="text-lg font-semibold tracking-tight">{a.checkEmailTitle}</p>
        <p className="text-sm text-ink/60">{type === "professional" ? a.checkEmailPro : a.checkEmailText}</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="field-label">{a.accountType}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {([["customer", UserRound], ["professional", Briefcase]] as const).map(([v, Icon]) => (
            <label key={v} className={cn("relative cursor-pointer rounded-2xl p-4 ring-1 transition", type === v ? "bg-card ring-ink" : "bg-paper ring-transparent hover:ring-line")}>
              <input type="radio" name="account_type" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />
              <Icon className="mb-3 h-5 w-5" aria-hidden />
              <span className="block text-sm font-semibold">{v === "customer" ? a.customer : a.professional}</span>
              <span className="block text-xs text-ink/55">{v === "customer" ? a.customerHint : a.professionalHint}</span>
              {type === v && <Check className="absolute end-3 top-3 h-4 w-4" aria-hidden />}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={a.fullName}><input name="full_name" required maxLength={120} autoComplete="name" className="field" /></Field>
        <Field label={a.phone}><input name="phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" className="field" dir="ltr" /></Field>
        <Field label={a.email} wide><input name="email" type="email" required maxLength={254} autoComplete="email" className="field" dir="ltr" /></Field>
        <Field label={`${a.city} · ${t.common.optional}`}><input name="city" maxLength={80} autoComplete="address-level2" className="field" /></Field>
        <Field label={a.password} hint={a.passwordHint}><input name="password" type="password" required minLength={8} maxLength={200} autoComplete="new-password" className="field" dir="ltr" /></Field>
      </div>

      <AnimatePresence initial={false}>
        {type === "professional" && (
          <motion.fieldset initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
            <legend className="mb-3 text-sm font-semibold">{a.proSection}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={a.company}><input name="company_name" required maxLength={120} autoComplete="organization" className="field" /></Field>
              <Field label={a.activity}>
                <select name="activity" required defaultValue="" className="field">
                  <option value="" disabled>{a.activityPlaceholder}</option>
                  {ACTIVITIES.map((x) => <option key={x} value={x}>{a.activities[x]}</option>)}
                </select>
              </Field>
              <Field label={`${a.vat} · ${t.common.optional}`}><input name="vat_number" maxLength={40} className="field" dir="ltr" /></Field>
              <Field label={`${a.website} · ${t.common.optional}`}><input name="website" maxLength={200} placeholder="instagram.com/…" className="field" dir="ltr" /></Field>
            </div>
            <p className="mt-3 text-xs text-ink/55">{a.proNote}</p>
          </motion.fieldset>
        )}
      </AnimatePresence>

      <ErrorText state={state} />
      <button type="submit" disabled={pending} className="btn-ink h-12 w-full">{pending ? t.common.loading : type === "professional" ? a.submitPro : a.submitRegister}</button>
      <p className="text-center text-sm"><Link href="/login" className="text-ink/60 hover:text-ink">{a.haveAccount}</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const { t } = useApp();
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state?.ok) return <p role="status" className="rounded-2xl bg-paper p-4 text-sm">{t.auth.resetSent}</p>;
  return (
    <form action={action} className="space-y-4">
      <Field label={t.auth.email}><input name="email" type="email" required autoComplete="email" className="field" dir="ltr" /></Field>
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className="btn-ink h-12 w-full">{pending ? t.common.loading : t.auth.sendReset}</button>
    </form>
  );
}

export function ResetForm() {
  const { t } = useApp();
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-4">
      <Field label={t.auth.newPassword}><input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" dir="ltr" /></Field>
      <Field label={t.auth.confirmPassword}><input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="field" dir="ltr" /></Field>
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className="btn-ink h-12 w-full">{pending ? t.common.saving : t.auth.updatePassword}</button>
    </form>
  );
}

/** Side panel on the sign-up page: what each kind of account gets. */
export function RegisterAside() {
  const { t } = useApp();
  return (
    <aside className="grain tone-sand flex flex-col justify-between gap-8 rounded-[1.75rem] p-6 sm:p-10">
      <p className="text-3xl font-semibold leading-tight tracking-tight text-balance">{t.auth.asideTitle}</p>
      <div className="space-y-6 text-sm">
        {[{ title: t.auth.customer, items: t.auth.customerPerks }, { title: t.auth.professional, items: t.auth.proPerks }].map((g) => (
          <div key={g.title} className="space-y-2">
            <p className="label">{g.title}</p>
            <ul className="space-y-1.5">{g.items.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{x}</li>)}</ul>
          </div>
        ))}
        <Link href="/professionnels" className="inline-block font-medium underline underline-offset-4">{t.pro.learnMore}</Link>
      </div>
    </aside>
  );
}
