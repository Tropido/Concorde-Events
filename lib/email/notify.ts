import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/supabase/service";
import { formatDay } from "@/lib/utils/formatters";
import { parseLang } from "@/lib/prefs";
import { translations, type Language } from "@/lib/i18n/translations";
import type { PaymentMethod } from "@/lib/types";
import type { EmailData, EmailKind } from "./copy";
import { sendEmail, type Attachment } from "./send";

type Request = {
  id: string; reference: string; customer_name: string; customer_email: string; user_id: string | null; language: string;
  total_ttc: number | null; deposit_required: number | null; deposit_due_at: string | null; quote_valid_until: string | null;
  request_lines: { start_date: string; end_date: string }[]; profiles: { language: string } | null;
};
const COLUMNS = "id, reference, customer_name, customer_email, user_id, language, total_ttc, deposit_required, deposit_due_at, quote_valid_until, request_lines(start_date, end_date), profiles!rental_requests_user_id_fkey(language)";

function dates(r: Request, lang: Language) {
  const starts = r.request_lines.map((l) => l.start_date).sort();
  const ends = r.request_lines.map((l) => l.end_date).sort();
  return starts[0] ? `${formatDay(starts[0], lang)} – ${formatDay(ends[ends.length - 1], lang)}` : undefined;
}

async function bank(db: SupabaseClient) {
  const { data } = await db.from("company_settings").select("bank_name, rib, iban").single();
  return data && (data.rib || data.iban) ? { name: data.bank_name, rib: data.rib, iban: data.iban } : undefined;
}

/** Emails a client about their request, and staff when `staff` names the event. Never throws. */
export async function notifyRequest(kind: EmailKind, requestId: string, opts: {
  dedupe?: string; extra?: Partial<EmailData>; attachments?: Attachment[]; staff?: string; withBank?: boolean;
  receipt?: { id: string; method: PaymentMethod; remaining: number };
} = {}) {
  const db = serviceClient();
  if (!db) return;
  try {
    const { data, error } = await db.from("rental_requests").select(COLUMNS).eq("id", requestId).single();
    if (error) throw error;
    const r = data as unknown as Request;
    const lang = parseLang(r.profiles?.language ?? r.language);
    const method = opts.receipt && translations[lang].order.methods[opts.receipt.method];
    const base: EmailData = {
      reference: r.reference, name: r.customer_name, dates: dates(r, lang), validUntil: r.quote_valid_until ?? undefined,
      ...(r.total_ttc != null ? { total: Number(r.total_ttc) } : {}),
      ...(r.deposit_required != null ? { deposit: Number(r.deposit_required) } : {}),
      ...(r.deposit_due_at ? { dueAt: r.deposit_due_at } : {}),
      ...(opts.withBank ? { bank: await bank(db) } : {}),
      ...opts.extra,
      ...(method ? { method } : {}),
    };
    await sendEmail({
      to: r.customer_email, kind, lang, data: base,
      attachments: opts.receipt ? [{ type: "receipt", id: opts.receipt.id, method: method!, remaining: opts.receipt.remaining }] : opts.attachments,
      requestId, profileId: r.user_id,
      dedupeKey: `${kind}:${requestId}${opts.dedupe ? `:${opts.dedupe}` : ""}`,
    }, db);
    const staff = process.env.STAFF_NOTIFY_EMAIL;
    if (opts.staff && staff) {
      await sendEmail({
        to: staff, kind: "staff_notice", lang: "fr", data: { ...base, event: opts.staff, name: r.customer_name }, requestId, path: `/admin/requests/${requestId}`,
        dedupeKey: `staff:${kind}:${requestId}${opts.dedupe ? `:${opts.dedupe}` : ""}`,
      }, db);
    }
  } catch (e) {
    console.error(`notify ${kind} failed`, e);
  }
}
