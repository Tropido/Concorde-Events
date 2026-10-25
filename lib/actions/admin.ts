"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertStaff } from "@/lib/auth";
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

/** Quotes are always issued in TND. */
export async function issueQuote(id: string, validDays: number) {
  const p = z.object({ id: uuid, validDays: z.number().int().min(1).max(90) }).safeParse({ id, validDays });
  if (!p.success) return { ok: false, error: "invalid" } as AdminResult;
  return run(undefined, (db) => db.rpc("issue_quote", { p_request: id, p_currency: "TND", p_valid_days: validDays }));
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
      channel: "whatsapp", ...t, country: "TN", phone: t.phone || null, email: t.email || null,
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
const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => text(max).nullable();
const ProductInput = z.object({
  id: uuid.optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120),
  sku: optText(40),
  title_fr: text(200).min(1),
  title_ar: optText(200),
  description_fr: text(5000),
  description_ar: optText(5000),
  category_id: uuid.nullable(),
  badge: z.enum(["new", "bestseller", "limited"]).nullable(),
  tone: z.enum(["almond", "sand", "tan", "copper", "cream", "stone"]),
  color: optText(80),
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  material: optText(80),
  finish: optText(80),
  style: optText(80),
  width: z.number().positive().max(100000).nullable(),
  height: z.number().positive().max(100000).nullable(),
  depth: z.number().positive().max(100000).nullable(),
  dimension_unit: z.enum(["cm", "m"]),
  weight_kg: z.number().positive().max(100000).nullable(),
  seating_capacity: z.number().int().min(1).max(1000).nullable(),
  setup_minutes: z.number().int().min(0).max(1440).nullable(),
  deposit_amount: z.number().min(0).max(1_000_000).nullable(),
  highlights_fr: z.array(text(60).min(1)).max(8),
  highlights_ar: z.array(text(60).min(1)).max(8),
  care_fr: optText(2000),
  care_ar: optText(2000),
  tags: z.array(text(40).min(1)).max(20),
  minimum_nights: z.number().int().min(1).max(365),
  featured: z.boolean(),
  status: z.enum(["active", "retired"]),
  images: z.array(z.string().url().max(1000)).max(12),
  owned: z.number().int().min(0).max(100000),
  prices: z.object({ retail: money, pro: money }).optional(),
  internal: z.object({
    purchase_cost: z.number().min(0).max(10_000_000).nullable(),
    purchase_date: isoDay.nullable(),
    supplier: optText(120),
    storage_location: optText(120),
    condition: z.enum(["new", "excellent", "good", "fair"]).nullable(),
    internal_notes: optText(2000),
  }),
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
  const { id, owned, prices, internal, ...fields } = p.data;
  const db = await createClient();

  // New photos must come from our own bucket; previously saved URLs may stay.
  const bucket = `${supabaseEnv().url}/storage/v1/object/public/product-images/`;
  const existing = id ? ((await db.from("products").select("images").eq("id", id).single()).data?.images ?? []) as string[] : [];
  if (fields.images.some((u) => !u.startsWith(bucket) && !existing.includes(u))) return { ok: false, error: "upload_failed" };

  const saved = id
    ? await db.from("products").update(fields).eq("id", id).select("id").single()
    : await db.from("products").insert(fields).select("id").single();
  if (saved.error) return dbError(saved.error);
  const productId = saved.data.id as string;

  const steps = [
    db.from("product_stock").upsert({ product_id: productId, country: "TN", quantity_owned: owned }, { onConflict: "product_id,country" }),
    db.from("product_internal").upsert({ product_id: productId, ...internal, updated_by: viewer.id }, { onConflict: "product_id" }),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) return { ...dbError(error), id: productId };
  }

  if (prices && viewer.role === "admin") {
    for (const tier of ["retail", "pro"] as const) {
      const amount = prices[tier];
      const { error } = amount === null
        ? await db.from("product_prices").delete().eq("product_id", productId).eq("country", "TN").eq("tier", tier)
        : await db.from("product_prices").upsert({ product_id: productId, country: "TN", tier, amount }, { onConflict: "product_id,country,tier" });
      if (error) return { ...dbError(error), id: productId };
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
export async function resolveMaintenance(productId: string, qty: number, outcome: "repaired" | "written_off") {
  const country = "TN";
  const p = z.object({ productId: uuid, country: z.literal("TN"), qty: z.number().int().min(1).max(100000), outcome: z.enum(["repaired", "written_off"]) })
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

export async function saveClientNotes(profileId: string, input: { notes: string; flags: string[]; level: string | null }): Promise<AdminResult> {
  const p = z.object({
    profileId: uuid,
    notes: z.string().max(5000),
    flags: z.array(z.string().trim().min(1).max(40)).max(20),
    level: z.string().trim().max(40).nullable(),
  }).safeParse({ profileId, ...input });
  if (!p.success) return { ok: false, error: "invalid" };
  return run(undefined, (db, me) => db.from("client_notes").upsert({
    profile_id: p.data.profileId, notes: p.data.notes, flags: p.data.flags, level: p.data.level || null, updated_by: me,
  }));
}

// ---------- Professional programme ----------

export async function saveProProgramme(profileId: string, input: { tier: string; locked: boolean; customDiscount: number | null; benefits: string[] }): Promise<AdminResult> {
  const p = z.object({
    profileId: uuid,
    tier: z.string().regex(/^[a-z0-9_]{2,30}$/),
    locked: z.boolean(),
    customDiscount: z.number().min(0).max(50).nullable(),
    benefits: z.array(z.string().trim().min(1).max(120)).max(12),
  }).safeParse({ profileId, ...input });
  if (!p.success) return { ok: false, error: "invalid" };
  return run(undefined, (db, me) => db.from("pro_accounts").update({
    tier_code: p.data.tier, tier_locked: p.data.locked, custom_discount_percent: p.data.customDiscount,
    extra_benefits: p.data.benefits, updated_by: me,
  }).eq("profile_id", p.data.profileId));
}

/** Manual points movement (gesture, correction). Audited in reward_events; the balance follows. */
export async function adjustPoints(profileId: string, points: number, reason: string): Promise<AdminResult> {
  const p = z.object({ profileId: uuid, points: z.number().int().min(-1_000_000).max(1_000_000).refine((v) => v !== 0), reason: z.string().trim().min(1).max(200) })
    .safeParse({ profileId, points, reason });
  if (!p.success) return { ok: false, error: "invalid" };
  return run(undefined, (db, me) => db.from("reward_events").insert({ profile_id: p.data.profileId, points: p.data.points, reason: p.data.reason, created_by: me }));
}

const TierInput = z.object({
  code: z.string().regex(/^[a-z0-9_]{2,30}$/),
  name_fr: z.string().trim().min(1).max(60),
  name_ar: z.string().trim().max(60).nullable(),
  min_points: z.number().int().min(0).max(10_000_000),
  discount_percent: z.number().min(0).max(50),
  benefits_fr: z.array(z.string().trim().min(1).max(120)).max(12),
  benefits_ar: z.array(z.string().trim().min(1).max(120)).max(12),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type TierInput = z.infer<typeof TierInput>;

export async function saveTier(input: TierInput): Promise<AdminResult> {
  const p = TierInput.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const { code, ...fields } = p.data;
  const result = await run(["admin"], (db) => db.from("pro_tiers").update(fields).eq("code", code));
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

// ---------- CMS ----------

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
