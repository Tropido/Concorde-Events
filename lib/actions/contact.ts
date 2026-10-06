"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { SubmitErrorCode } from "@/lib/i18n/translations";

export type ContactState = { ok?: boolean; error?: SubmitErrorCode } | null;

const Contact = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  country: z.enum(["FR", "TN"]),
  website: z.string().max(0).optional(), // honeypot: never shown to people
});

/** Persists the enquiry into the staff inbox; success means the row exists. */
export async function submitContact(_: ContactState, form: FormData): Promise<ContactState> {
  const parsed = Contact.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid_contact" };
  const { name, email, phone, subject, body, country } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_contact", { payload: { name, email, phone, subject, body, country } });
  if (error) {
    if (error.message === "rate_limited" || error.message === "invalid_contact") return { error: error.message };
    console.error("submit_contact failed", error);
    return { error: "generic" };
  }
  return { ok: true };
}
