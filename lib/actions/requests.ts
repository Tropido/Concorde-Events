"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { SubmitErrorCode } from "@/lib/i18n/translations";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const KNOWN: SubmitErrorCode[] = [
  "invalid_contact", "invalid_lines", "invalid_quantity", "invalid_date", "invalid_range", "date_in_past",
  "range_too_long", "below_minimum_nights", "unknown_product", "price_missing", "rate_limited", "account_inactive",
];

const RequestInput = z.object({
  idempotencyKey: z.string().uuid(),
  country: z.enum(["FR", "TN"]),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().toLowerCase().email().max(254),
  company: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
  website: z.string().max(0).optional(), // honeypot: humans never see or fill it
  lines: z
    .array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(10000),
      startDate: z.string().regex(ISO_DAY),
      endDate: z.string().regex(ISO_DAY),
    }))
    .min(1)
    .max(50),
});

export type SubmitResult = { ok: true; reference: string } | { ok: false; error: SubmitErrorCode };

/** Saves the request through public.submit_request, which derives identity, tier and
 *  prices server-side. Success is only reported once the row is committed. */
export async function submitRequest(input: z.input<typeof RequestInput>): Promise<SubmitResult> {
  const parsed = RequestInput.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { ok: false, error: field === "lines" ? "invalid_lines" : "invalid_contact" };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_request", {
    idem_key: d.idempotencyKey,
    payload: {
      country: d.country,
      customer_name: d.name,
      customer_email: d.email,
      customer_phone: d.phone,
      company_name: d.company,
      notes: d.notes,
      lines: d.lines.map((l) => ({ product_id: l.productId, quantity: l.quantity, start_date: l.startDate, end_date: l.endDate })),
    },
  });
  if (error) {
    const code = KNOWN.find((k) => error.message === k);
    if (!code) console.error("submit_request failed", error);
    return { ok: false, error: code ?? "generic" };
  }
  return { ok: true, reference: data as string };
}

/** The client clicked the wa.me link. Recorded as "opened", never as "sent". */
export async function markWhatsappOpened(idempotencyKey: string) {
  if (!z.string().uuid().safeParse(idempotencyKey).success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_whatsapp_opened", { idem_key: idempotencyKey });
}
