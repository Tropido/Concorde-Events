import net from "node:net";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

// Same local-network workaround as the dev server (see playwright.config.ts).
net.setDefaultAutoSelectFamilyAttemptTimeout(1500);

try {
  process.loadEnvFile(".env.test.local");
} catch {
  // handled by `enabled`
}
try {
  process.loadEnvFile(".env.local");
} catch {
  // handled by `enabled`
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";
const ref = process.env.TEST_PROJECT_REF ?? "";
/** Only ever runs against the declared test project. */
export const enabled = Boolean(url && secret && ref && new URL(url).hostname.startsWith(`${ref}.`));
export const run = Date.now().toString(36);

export const service: SupabaseClient = enabled
  ? createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  : (null as unknown as SupabaseClient);

export const createdUsers: string[] = [];

export async function makeUser(label: string, role?: "manager" | "admin") {
  const email = `${label}-${run}@it.concorde.test`;
  const password = `E2e-${crypto.randomUUID()}`;
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: `E2E ${label}`, phone: "+33600000000" },
  });
  if (error) throw error;
  createdUsers.push(data.user.id);
  if (role) await service.from("profiles").update({ role, status: "approved" }).eq("id", data.user.id);
  return { id: data.user.id, email, password };
}

export async function cleanupUsers() {
  for (const id of createdUsers.splice(0)) await service.auth.admin.deleteUser(id);
}

export async function login(page: Page, email: string, password: string, path = "/login") {
  await page.goto(path);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export function isoDate(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
