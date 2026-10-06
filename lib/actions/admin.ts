"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertStaff } from "@/lib/auth";
import { recordProviderRate } from "@/lib/fx";
import { supabaseEnv } from "@/lib/supabase/env";
import type { AdminErrorCode } from "@/lib/i18n/admin-types";
import type { AppRole } from "@/lib/types";

export type AdminResult = { ok: true } | { ok: false; error: AdminErrorCode };

const uuid = z.string().uuid();
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ok: AdminResult = { ok: true };

function dbError(e: { message: string; code?: string }): AdminResult {
  const m = e.message;
  const error: AdminErrorCode =
    m.startsWith("capacity_exceeded") ? "capacity_exceeded"
    : m === "fx_unavailable" ? "fx_unavailable"
    : m.startsWith("quote expired") ? "quote_expired"
    : m.startsWith("invalid status transition") || m.startsWith("use issue_quote") || m.startsWith("cannot quote") ? "invalid_transition"
    : m.includes("last approved admin") ? "last_admin"
    : e.code === "23505" ? "slug_taken"
    : e.code === "42501" ? "forbidden"
    : "generic";
  if (error === "generic") console.error("admin action failed", e);
  return { ok: false, error };
}

/** Runs a mutation as the signed-in staff member (RLS still applies) and revalidates admin pages. */
async function run(roles: AppRole[] | undefined, fn: (db: Awaited<ReturnType<typeof createClient>>, me: string) => PromiseLike<{ error: { message: string; code?: string } | null }>): Promise<AdminResult> {
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
  return ok;
}

// ---------- Requests ----------

export async function setRequestStatus(id: string, status: "confirmed" | "dispatched" | "rejected" | "cancelled") {
  if (!uuid.safeParse(id).success || !["confirmed", "dispatched", "rejected", "cancelled"].includes(status)) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db) => db.from("rental_requests").update({ status }).eq("id", id));
}

export async function issueQuote(id: string, currency: "EUR" | "TND", validDays: number) {
  const p = z.object({ id: uuid, currency: z.enum(["EUR", "TND"]), validDays: z.number().int().min(1).max(90) }).safeParse({ id, currency, validDays });
  if (!p.success) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db) => db.rpc("issue_quote", { p_request: id, p_currency: currency, p_valid_days: validDays }));
}

export async function rescheduleRequest(id: string, lines: { id: string; start_date: string; end_date: string }[]) {
  const p = z.array(z.object({ id: uuid, start_date: isoDay, end_date: isoDay })).min(1).max(50).safeParse(lines);
  if (!uuid.safeParse(id).success || !p.success) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db) => db.rpc("reschedule_request", { p_request: id, p_lines: p.data }));
}

export async function returnRequest(id: string, damaged: { line_id: string; quantity: number }[]) {
  const p = z.array(z.object({ line_id: uuid, quantity: z.number().int().min(0).max(10000) })).max(50).safeParse(damaged);
  if (!uuid.safeParse(id).success || !p.success) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db) => db.rpc("return_request", { p_request: id, p_damaged: p.data.filter((d) => d.quantity > 0) }));
}

export async function assignRequestToMe(id: string) {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db, me) => db.from("rental_requests").update({ assignee_id: me }).eq("id", id));
}

/** Staff confirm they actually reached the client (WhatsApp, phone…). */
export async function markContacted(id: string) {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db, me) =>
    db.from("rental_requests").update({ contact_confirmed_at: new Date().toISOString(), contact_confirmed_by: me }).eq("id", id));
}

// ---------- Inbox ----------

const Ticket = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(254).optional(),
  country: z.enum(["FR", "TN"]).optional().catch(undefined),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  reference: z.string().trim().max(40).optional(),
});

export async function createTicket(_: AdminResult | null, form: FormData): Promise<AdminResult> {
  const p = Ticket.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "invalid" };
  const { reference, ...t } = p.data;
  return run(undefined, async (db, me) => {
    let requestId: string | null = null;
    let profileId: string | null = null;
    if (reference) {
      const { data } = await db.from("rental_requests").select("id, user_id").eq("reference", reference).maybeSingle();
      requestId = data?.id ?? null;
      profileId = data?.user_id ?? null;
    }
    return db.from("messages").insert({
      channel: "whatsapp", ...t, phone: t.phone || null, email: t.email || null,
      request_id: requestId, profile_id: profileId, assignee_id: me, status: "in_progress",
    });
  });
}

export async function staffReply(_: AdminResult | null, form: FormData): Promise<AdminResult> {
  const p = z.object({ message_id: uuid, body: z.string().trim().min(1).max(5000), internal: z.string().optional() })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "invalid" };
  return run(undefined, (db, me) => db.from("message_replies").insert({
    message_id: p.data.message_id, body: p.data.body, internal: p.data.internal === "on", author_id: me,
  }));
}

export async function setMessageStatus(id: string, status: "open" | "in_progress" | "resolved") {
  if (!uuid.safeParse(id).success || !["open", "in_progress", "resolved"].includes(status)) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db) => db.from("messages").update({ status }).eq("id", id));
}

export async function assignMessageToMe(id: string) {
  if (!uuid.safeParse(id).success) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db, me) => db.from("messages").update({ assignee_id: me }).eq("id", id));
}

// ---------- Inventory ----------

const money = z.number().positive().max(1_000_000).nullable();
const ProductInput = z.object({
  id: uuid.optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120),
  title_fr: z.string().trim().min(1).max(200),
  title_ar: z.string().trim().max(200).nullable(),
  description_fr: z.string().trim().max(5000),
  description_ar: z.string().trim().max(5000).nullable(),
  category_id: uuid.nullable(),
  width: z.number().positive().max(100000).nullable(),
  height: z.number().positive().max(100000).nullable(),
  depth: z.number().positive().max(100000).nullable(),
  dimension_unit: z.enum(["cm", "m"]),
  color: z.string().trim().max(80).nullable(),
  material: z.string().trim().max(80).nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  minimum_nights: z.number().int().min(1).max(365),
  featured: z.boolean(),
  images: z.array(z.string().url().max(1000)).max(12),
  stock: z.record(z.enum(["FR", "TN"]), z.object({ owned: z.number().int().min(0).max(100000) })),
  prices: z.record(z.enum(["FR", "TN"]), z.object({ retail: money, pro: money })).optional(),
});
export type ProductInput = z.infer<typeof ProductInput>;

export async function saveProduct(input: ProductInput): Promise<AdminResult & { id?: string }> {
  const p = ProductInput.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  let viewer;
  try {
    viewer = await assertStaff();
  } catch {
    return { ok: false, error: "forbidden" };
  }
  const { id, stock, prices, ...fields } = p.data;
  const db = await createClient();

  // New photos must come from our own bucket; previously saved URLs (e.g. seed images) may stay.
  const bucket = `${supabaseEnv().url}/storage/v1/object/public/product-images/`;
  const existing = id ? ((await db.from("products").select("images").eq("id", id).single()).data?.images ?? []) as string[] : [];
  if (fields.images.some((u) => !u.startsWith(bucket) && !existing.includes(u))) return { ok: false, error: "upload_failed" };

  const saved = id
    ? await db.from("products").update(fields).eq("id", id).select("id").single()
    : await db.from("products").insert(fields).select("id").single();
  if (saved.error) return dbError(saved.error);
  const productId = saved.data.id as string;

  const { data: rows } = await db.from("product_stock").select("country").eq("product_id", productId);
  const stocked = new Set((rows ?? []).map((r) => r.country));
  for (const [country, s] of Object.entries(stock)) {
    if (!stocked.has(country) && s.owned === 0) continue;
    const { error } = await db.from("product_stock")
      .upsert({ product_id: productId, country, quantity_owned: s.owned }, { onConflict: "product_id,country" });
    if (error) return { ...dbError(error), id: productId };
  }

  if (prices && viewer.role === "admin") {
    for (const [country, tiers] of Object.entries(prices)) {
      for (const tier of ["retail", "pro"] as const) {
        const amount = tiers[tier];
        const q = amount === null
          ? db.from("product_prices").delete().eq("product_id", productId).eq("country", country).eq("tier", tier)
          : db.from("product_prices").upsert({ product_id: productId, country, tier, amount }, { onConflict: "product_id,country,tier" });
        const { error } = await q;
        if (error) return { ...dbError(error), id: productId };
      }
    }
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { ok: true, id: productId };
}

export async function setProductStatus(id: string, status: "active" | "retired") {
  if (!uuid.safeParse(id).success || !["active", "retired"].includes(status)) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db) => db.from("products").update({ status }).eq("id", id));
}

/** Repaired units return to service; written-off units leave the owned stock too. */
export async function resolveMaintenance(productId: string, country: "FR" | "TN", qty: number, outcome: "repaired" | "written_off") {
  const p = z.object({ productId: uuid, country: z.enum(["FR", "TN"]), qty: z.number().int().min(1).max(100000), outcome: z.enum(["repaired", "written_off"]) })
    .safeParse({ productId, country, qty, outcome });
  if (!p.success) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, async (db) => {
    const { data: s, error } = await db.from("product_stock").select("quantity_owned, quantity_maintenance")
      .eq("product_id", productId).eq("country", country).single();
    if (error) return { error };
    if (qty > s.quantity_maintenance) return { error: { message: "invalid", code: "22023" } };
    return db.from("product_stock").update({
      quantity_maintenance: s.quantity_maintenance - qty,
      quantity_owned: outcome === "written_off" ? s.quantity_owned - qty : s.quantity_owned,
    }).eq("product_id", productId).eq("country", country);
  });
}

// ---------- Clients ----------

export async function setAccountStatus(profileId: string, status: "approved" | "rejected" | "suspended") {
  if (!uuid.safeParse(profileId).success || !["approved", "rejected", "suspended"].includes(status)) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db) => db.from("profiles").update({ status }).eq("id", profileId));
}

export async function setRole(profileId: string, role: AppRole) {
  const p = z.enum(["customer", "professional", "editor", "manager", "admin"]).safeParse(role);
  if (!uuid.safeParse(profileId).success || !p.success) return { ok: false, error: "invalid" } as AdminResult;
  return run(["admin"], (db) => db.from("profiles").update({ role: p.data }).eq("id", profileId));
}

export async function saveClientNotes(_: AdminResult | null, form: FormData): Promise<AdminResult> {
  const p = z.object({
    profile_id: uuid,
    notes: z.string().max(5000),
    flags: z.string().max(500),
    level: z.string().trim().max(40),
  }).safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "invalid" };
  const flags = p.data.flags.split(",").map((f) => f.trim()).filter(Boolean).slice(0, 20);
  return run(undefined, (db, me) => db.from("client_notes").upsert({
    profile_id: p.data.profile_id, notes: p.data.notes, flags, level: p.data.level || null, updated_by: me,
  }));
}

// ---------- CMS ----------

const text = (max: number) => z.string().trim().max(max);
const CmsInput = z.object({
  hero: z.object({ badge: text(120), title: text(160), titleAccent: text(160), subtitle: text(600) }),
  faqs: z.array(z.object({ question: text(300).min(1), answer: text(2000).min(1) })).max(30),
  testimonials: z.array(z.object({ quote: text(1000).min(1), author: text(120).min(1), role: text(160) })).max(12),
});
export type CmsInput = z.infer<typeof CmsInput>;

export async function publishCms(locale: "fr" | "ar", content: CmsInput): Promise<AdminResult> {
  const p = CmsInput.safeParse(content);
  if (!["fr", "ar"].includes(locale) || !p.success) return { ok: false, error: "invalid" };
  const result = await run(["editor", "manager", "admin"], (db, me) =>
    db.from("cms_content").upsert({ locale, content: p.data, updated_by: me }));
  if (result.ok) revalidatePath("/");
  return result;
}

// ---------- FX ----------

export async function refreshFx(): Promise<AdminResult> {
  try {
    await assertStaff(["admin"]);
  } catch {
    return { ok: false, error: "forbidden" };
  }
  const res = await recordProviderRate(await createClient());
  if (!res.ok) return { ok: false, error: res.reason === "jump_too_large" ? "jump_too_large" : "provider" };
  revalidatePath("/", "layout");
  return ok;
}

export async function setFxOverride(_: AdminResult | null, form: FormData): Promise<AdminResult> {
  const p = z.object({
    rate: z.coerce.number().min(1).max(10),
    hours: z.coerce.number().int().min(1).max(24 * 30),
    note: z.string().trim().min(1).max(500),
  }).safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "invalid" };
  const result = await run(["admin"], (db, me) => db.from("fx_rates").insert({
    rate_eur_tnd: p.data.rate,
    source: "manual",
    provider_time: new Date().toISOString(),
    effective_until: new Date(Date.now() + p.data.hours * 3_600_000).toISOString(),
    note: p.data.note,
    created_by: me,
  }));
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
