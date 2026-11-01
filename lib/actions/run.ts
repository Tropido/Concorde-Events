import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertStaff } from "@/lib/auth";
import type { AdminErrorCode } from "@/lib/i18n/admin-types";
import type { AppRole } from "@/lib/types";

export type AdminResult = { ok: true } | { ok: false; error: AdminErrorCode };
export type Db = Awaited<ReturnType<typeof createClient>>;

const MESSAGES: [string, AdminErrorCode][] = [
  ["capacity_exceeded", "capacity_exceeded"],
  ["quote expired", "quote_expired"],
  ["invalid status transition", "invalid_transition"],
  ["use the dedicated function", "invalid_transition"],
  ["use cancel_order", "invalid_transition"],
  ["cannot quote", "invalid_transition"],
  ["cannot accept", "invalid_transition"],
  ["reacceptance_required", "reacceptance_required"],
  ["company_settings_incomplete", "company_incomplete"],
  ["quote_superseded", "quote_superseded"],
  ["terms_required", "terms_required"],
  ["reason_required", "reason_required"],
  ["invalid_amount", "invalid_amount"],
  ["quote_not_accepted", "quote_not_accepted"],
  ["invalid_total", "invalid_amount"],
  ["inspection_sum_mismatch", "inspection_sum"],
  ["caution_unresolved", "caution_unresolved"],
];

export function dbError(e: { message: string; code?: string }): { ok: false; error: AdminErrorCode } {
  const m = e.message;
  const error: AdminErrorCode =
    MESSAGES.find(([prefix]) => m.startsWith(prefix))?.[1]
    ?? (m.includes("last approved admin") ? "last_admin"
    : /client_tags_(label|slug)_key/.test(m) ? "tag_exists"
    : e.code === "23505" ? "slug_taken"
    : e.code === "42501" ? "forbidden"
    : "generic");
  if (error === "generic") console.error("admin action failed", e);
  return { ok: false, error };
}

/** Runs a mutation as the signed-in staff member (RLS still applies) and revalidates admin pages. */
export async function run(roles: AppRole[] | undefined, fn: (db: Db, me: string) => PromiseLike<{ error: { message: string; code?: string } | null }>): Promise<AdminResult> {
  let me: string;
  try {
    me = (await assertStaff(roles)).id;
  } catch {
    return { ok: false, error: "forbidden" };
  }
  const db = await createClient();
  const { error } = await fn(db, me);
  if (error) return dbError(error);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
