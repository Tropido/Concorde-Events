"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context/app-context";
import { requestPasswordReset, signIn, signUp, updatePassword, type AuthState } from "@/lib/actions/auth";

const input = "w-full p-3 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-toffeeBrown";
const button = "w-full py-3.5 rounded-full bg-toffeeBrown hover:bg-coffeeBean text-white font-extrabold text-xs uppercase tracking-wider disabled:opacity-60";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md apple-card rounded-3xl border border-tan/40 p-6 sm:p-8 space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif">{title}</h1>
          {subtitle && <p className="text-sm text-coffeeBean/70 dark:text-almondCream/70">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorText({ state }: { state: AuthState }) {
  const { t } = useApp();
  if (!state?.error) return null;
  const msg = state.error === "noStaffAccess" ? t.auth.noStaffAccess : t.auth.errors[state.error];
  return <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">{msg}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold space-y-1"><span className="block">{label}</span>{children}</label>;
}

export function LoginForm({ next, scope, linkError }: { next?: string; scope: "customer" | "admin"; linkError?: boolean }) {
  const { t } = useApp();
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4">
      {linkError && <p role="alert" className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t.auth.linkInvalid}</p>}
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="scope" value={scope} />
      <Field label={t.auth.email}><input name="email" type="email" required autoComplete="email" className={input} /></Field>
      <Field label={t.auth.password}><input name="password" type="password" required autoComplete="current-password" className={input} /></Field>
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className={button}>{pending ? t.common.loading : t.auth.submitLogin}</button>
      <div className="flex justify-between text-xs">
        <Link href="/forgot-password" className="underline">{t.auth.forgot}</Link>
        {scope === "customer" && <Link href="/register" className="underline">{t.auth.noAccount}</Link>}
      </div>
    </form>
  );
}

export function RegisterForm({ initialType }: { initialType: "customer" | "professional" }) {
  const { t, country } = useApp();
  const [state, action, pending] = useActionState(signUp, null);
  const [type, setType] = useState(initialType);

  if (state?.ok) {
    return (
      <div role="status" className="space-y-2 text-center">
        <p className="font-bold">{t.auth.checkEmailTitle}</p>
        <p className="text-sm">{t.auth.checkEmailText}</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="country" value={country} />
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold mb-1">{t.auth.accountType}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["customer", "professional"] as const).map((v) => (
            <label key={v} className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer ${type === v ? "border-toffeeBrown bg-tan/20" : "border-tan/40"}`}>
              <input type="radio" name="account_type" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />
              {v === "customer" ? t.auth.customer : t.auth.professional}
            </label>
          ))}
        </div>
        {type === "professional" && <p className="text-[11px] text-coffeeBean/70 dark:text-almondCream/70">{t.auth.proNote}</p>}
      </fieldset>
      <Field label={t.auth.fullName}><input name="full_name" required maxLength={120} autoComplete="name" className={input} /></Field>
      <Field label={t.auth.email}><input name="email" type="email" required maxLength={254} autoComplete="email" className={input} /></Field>
      <Field label={t.auth.phone}><input name="phone" type="tel" required minLength={6} maxLength={40} autoComplete="tel" className={input} /></Field>
      {type === "professional" && (
        <>
          <Field label={t.auth.company}><input name="company_name" maxLength={120} autoComplete="organization" className={input} /></Field>
          <Field label={`${t.auth.vat} (${t.common.optional})`}><input name="vat_number" maxLength={40} className={input} /></Field>
        </>
      )}
      <Field label={t.auth.password}>
        <input name="password" type="password" required minLength={8} maxLength={200} autoComplete="new-password" aria-describedby="pw-hint" className={input} />
        <span id="pw-hint" className="block text-[11px] font-normal opacity-70">{t.auth.passwordHint}</span>
      </Field>
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className={button}>{pending ? t.common.loading : t.auth.submitRegister}</button>
      <p className="text-xs text-center"><Link href="/login" className="underline">{t.auth.haveAccount}</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const { t } = useApp();
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state?.ok) return <p role="status" className="text-sm text-center">{t.auth.resetSent}</p>;
  return (
    <form action={action} className="space-y-4">
      <Field label={t.auth.email}><input name="email" type="email" required autoComplete="email" className={input} /></Field>
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className={button}>{pending ? t.common.loading : t.auth.sendReset}</button>
    </form>
  );
}

export function ResetForm() {
  const { t } = useApp();
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-4">
      <Field label={t.auth.newPassword}><input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} /></Field>
      <Field label={t.auth.confirmPassword}><input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={input} /></Field>
      <ErrorText state={state} />
      <button type="submit" disabled={pending} className={button}>{pending ? t.common.saving : t.auth.updatePassword}</button>
    </form>
  );
}
