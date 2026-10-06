"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

export type FormState = { ok?: boolean; error?: boolean } | null;
const uuid = z.string().uuid();

export async function toggleFavourite(productId: string, on: boolean) {
  if (!uuid.safeParse(productId).success) return { ok: false };
  const viewer = await getViewer();
  if (!viewer) return { ok: false };
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("favourites").upsert({ profile_id: viewer.id, product_id: productId }, { ignoreDuplicates: true })
    : await supabase.from("favourites").delete().eq("profile_id", viewer.id).eq("product_id", productId);
  revalidatePath("/account/favourites");
  return { ok: !error };
}

/** Clients may cancel their own submitted/validated request (enforced again by the DB guard). */
export async function cancelRequest(requestId: string) {
  if (!uuid.safeParse(requestId).success) return;
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createClient();
  await supabase.from("rental_requests").update({ status: "cancelled" })
    .eq("id", requestId).eq("user_id", viewer.id).in("status", ["submitted", "validated"]);
  revalidatePath("/account");
}

const MessageInput = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  request_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
});

export async function sendMessage(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  const parsed = MessageInput.safeParse(Object.fromEntries(form));
  if (!viewer || !parsed.success) return { error: true };
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    channel: "site",
    profile_id: viewer.id,
    name: viewer.fullName,
    email: viewer.email,
    phone: viewer.phone,
    country: viewer.country,
    category: "other",
    ...parsed.data,
  });
  if (error) return { error: true };
  revalidatePath("/account/messages");
  return { ok: true };
}

export async function replyToMessage(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  const parsed = z.object({ message_id: z.string().uuid(), body: z.string().trim().min(1).max(5000) }).safeParse(Object.fromEntries(form));
  if (!viewer || !parsed.success) return { error: true };
  const supabase = await createClient();
  const { error } = await supabase.from("message_replies").insert({ ...parsed.data, author_id: viewer.id, internal: false });
  if (error) return { error: true };
  revalidatePath("/account/messages");
  return { ok: true };
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  const opt = (max: number) => z.string().trim().max(max).transform((v) => v || null);
  const parsed = z.object({
    full_name: z.string().trim().min(1).max(120),
    phone: opt(40),
    company_name: opt(120),
    vat_number: opt(40),
    country: z.enum(["FR", "TN"]).nullable().catch(null),
  }).safeParse(Object.fromEntries(form));
  if (!viewer || !parsed.success) return { error: true };
  const supabase = await createClient();
  // Only contact fields: role/status changes are rejected by the database guard anyway.
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", viewer.id);
  if (error) return { error: true };
  revalidatePath("/account", "layout");
  return { ok: true };
}
