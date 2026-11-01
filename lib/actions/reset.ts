"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/tracking";
import { normalizePhone } from "@/lib/phone";
import { translations, type Language } from "@/lib/i18n/translations";
import { parseLang } from "@/lib/prefs";
import { performReset, RESET_LINK_MINUTES, type ResetTarget } from "@/lib/password-reset";
import type { AdminErrorCode } from "@/lib/i18n/admin-types";

const Input = z.object({
  profileId: z.string().uuid(),
  channel: z.enum(["email", "whatsapp"]),
  destination: z.string().trim().min(6).max(254),
  reason: z.string().trim().max(500).nullable(),
});

export type ResetResult = { ok: true; whatsappUrl?: string } | { ok: false; error: AdminErrorCode };

/** Staff send a client a password reset link. The WhatsApp link comes back to this one browser,
 *  once, and is not kept anywhere. */
export async function sendPasswordReset(input: z.input<typeof Input>): Promise<ResetResult> {
  const p = Input.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  let actor;
  try {
    actor = await assertStaff();
  } catch {
    return { ok: false, error: "forbidden" };
  }
  const service = serviceClient();
  if (!service) return { ok: false, error: "reset_unavailable" };
  const { data } = await (await createClient()).from("profiles").select("id, email, phone, full_name, role, language").eq("id", p.data.profileId).maybeSingle();
  if (!data) return { ok: false, error: "invalid" };
  const target = { ...data, language: parseLang(data.language) } as ResetTarget;

  try {
    const result = await performReset({ id: actor.id, role: actor.role }, target, p.data, {
      siteUrl: siteUrl(),
      recentCount: async (id) => {
        const { count, error } = await service.from("admin_audit").select("id", { count: "exact", head: true })
          .eq("target_profile", id).eq("action", "password_reset_link").gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
        if (error) throw error;
        return count ?? 0;
      },
      generateToken: async (email) => {
        const { data: link, error } = await service.auth.admin.generateLink({ type: "recovery", email });
        if (error) throw new Error(error.code ?? "generate_link_failed");
        return link.properties.hashed_token;
      },
      audit: async (row) => {
        const { error } = await service.from("admin_audit").insert(row);
        if (error) throw new Error(error.code);
      },
      sendEmail: async (to, link) => {
        await sendEmail({
          to, kind: "password_reset", lang: target.language, link, profileId: target.id, dedupeKey: `reset:${target.id}:${randomUUID()}`,
          data: { reference: "", name: target.full_name ?? target.email, expiresIn: RESET_LINK_MINUTES },
        }, service);
      },
    });
    revalidatePath("/admin/clients");
    if (!result.ok || !result.link) return result.ok ? { ok: true } : result;
    const lang: Language = target.language;
    const text = translations[lang].order.reset.waMessage(target.full_name ?? "", result.link, RESET_LINK_MINUTES);
    return { ok: true, whatsappUrl: `https://wa.me/${normalizePhone(p.data.destination)}?text=${encodeURIComponent(text)}` };
  } catch (e) {
    // Never the raw error object: it could carry the request, and so the link.
    console.error("password reset failed", e instanceof Error ? e.message.slice(0, 100) : "unknown");
    return { ok: false, error: "generic" };
  }
}
