"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { getPrefs } from "@/lib/i18n/server";
import { STAFF_ROLES, type AppRole } from "@/lib/types";
import type { Translations } from "@/lib/i18n/translations";

type AuthErrorKey = keyof Translations["auth"]["errors"] | "noStaffAccess";
export type AuthState = { error?: AuthErrorKey; ok?: boolean } | null;

async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

function authError(e: { code?: string; status?: number; message?: string }): AuthErrorKey {
  if (e.code === "invalid_credentials") return "invalidCredentials";
  if (e.code === "email_not_confirmed") return "emailNotConfirmed";
  if (e.code === "weak_password") return "weakPassword";
  if (e.status === 429 || e.code?.startsWith("over_")) return "rateLimited";
  console.error("auth error", e.status, e.code, e.message);
  return "generic";
}

const email = z.string().trim().toLowerCase().email().max(254);

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ email, password: z.string().min(1).max(200) }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: "invalidCredentials" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authError(error) };

  const admin = form.get("scope") === "admin";
  if (admin) {
    const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", data.user.id).single();
    if (!profile || profile.status !== "approved" || !STAFF_ROLES.includes(profile.role as AppRole)) {
      return { error: "noStaffAccess" };
    }
  }
  redirect(safeNext(form.get("next"), admin ? "/admin" : "/account"));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
  const parsed = z
    .object({
      email,
      password: z.string().min(8).max(200),
      full_name: z.string().trim().min(1).max(120),
      phone: z.string().trim().min(6).max(40),
      company_name: opt(120),
      vat_number: opt(40),
      account_type: z.enum(["customer", "customer_plus", "professional"]),
      event_type: z.enum(["wedding", "engagement", "birthday", "corporate", "gala", "private", "other"]).optional().or(z.literal("").transform(() => undefined)),
      activity: opt(80),
      city: opt(80),
      website: opt(200),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { error: parsed.error.issues.some((i) => i.path[0] === "password") ? "weakPassword" : "generic" };
  }
  const { email: e, password, ...profile } = parsed.data;
  if (profile.account_type === "professional" && (!profile.company_name || !profile.activity)) return { error: "proFields" };
  if (profile.account_type === "customer_plus" && !profile.city) return { error: "plusFields" };
  const supabase = await createClient();
  // Metadata only requests an account type; the database trigger decides the actual role.
  const { error } = await supabase.auth.signUp({
    email: e,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/account`, data: { ...profile, language: (await getPrefs()).lang } },
  });
  if (error) return { error: authError(error) };
  return { ok: true };
}

/** An email gets the usual link; a phone number becomes a ticket for staff, who check who is
 *  asking. Whatever happens, the answer is the same, so nothing reveals whether an account exists. */
export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const identifier = String(form.get("identifier") ?? "").trim().toLowerCase().slice(0, 254);
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const supabase = await createClient();
  const { data: mayEmail } = await supabase.rpc("request_password_help", { p_identifier: identifier, p_ip_hash: createHash("sha256").update(ip).digest("hex") });
  if (mayEmail && email.safeParse(identifier).success) {
    await supabase.auth.resetPasswordForEmail(identifier, { redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password` });
  }
  return { ok: true };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password !== form.get("confirm")) return { error: "mismatch" };
  if (password.length < 8 || password.length > 200) return { error: "weakPassword" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authError(error) };
  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
