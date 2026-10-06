"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { STAFF_ROLES, type AppRole } from "@/lib/types";
import type { Translations } from "@/lib/i18n/translations";

type AuthErrorKey = keyof Translations["auth"]["errors"] | "noStaffAccess";
export type AuthState = { error?: AuthErrorKey; ok?: boolean } | null;

async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

function authError(e: { code?: string; status?: number }): AuthErrorKey {
  if (e.code === "invalid_credentials") return "invalidCredentials";
  if (e.code === "email_not_confirmed") return "emailNotConfirmed";
  if (e.code === "weak_password") return "weakPassword";
  if (e.status === 429 || e.code?.startsWith("over_")) return "rateLimited";
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
      account_type: z.enum(["customer", "professional"]),
      country: z.enum(["FR", "TN"]),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { error: parsed.error.issues.some((i) => i.path[0] === "password") ? "weakPassword" : "generic" };
  }
  const { email: e, password, ...profile } = parsed.data;
  const supabase = await createClient();
  // Metadata only requests an account type; the database trigger decides the actual role.
  const { error } = await supabase.auth.signUp({
    email: e,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/account`, data: profile },
  });
  if (error) return { error: authError(error) };
  return { ok: true };
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = email.safeParse(form.get("email"));
  if (parsed.success) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${await siteOrigin()}/auth/confirm?next=/reset-password`,
    });
    if (error && authError(error) === "rateLimited") return { error: "rateLimited" };
  }
  // Same answer whether or not the account exists.
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
