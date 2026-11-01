import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { serviceClient } from "@/lib/supabase/service";
import { requestPath, siteUrl } from "@/lib/tracking";
import type { Language } from "@/lib/i18n/translations";
import type { EmailData, EmailKind } from "./copy";
import { renderEmail } from "./template";

/** A document to attach, described rather than embedded, so a retry can fetch it again. */
export type Attachment =
  | { type: "invoice"; id: string }
  | { type: "quote"; id: string }
  | { type: "receipt"; id: string; method: string; remaining: number };

export interface SendInput {
  to: string;
  kind: EmailKind;
  lang: Language;
  data: EmailData;
  attachments?: Attachment[];
  requestId?: string | null;
  profileId?: string | null;
  dedupeKey: string;
  /** Sent once and never stored (a password reset link). */
  link?: string;
  /** Relative to the site, for staff notices. */
  path?: string;
}

export type EmailRow = {
  id: string; request_id: string | null; kind: EmailKind; to_address: string; lang: Language; attempts: number;
  payload: { data: EmailData; attachments?: Attachment[]; path?: string };
};

export const MAX_ATTEMPTS = 5;

async function resolve(db: SupabaseClient, a: Attachment, lang: string) {
  // Loaded on demand: nearly every server action reaches this file, so a top-level import puts
  // the PDF stack in every page that uses one, and a PDF failure takes those pages down.
  const { invoicePdf, quotePdf, receiptPdf } = await import("@/lib/invoicing/store");
  if (a.type === "invoice") return invoicePdf(db, a.id);
  if (a.type === "quote") return quotePdf(db, a.id, lang);
  return receiptPdf(db, a.id, lang, a.method, a.remaining);
}

async function linkFor(db: SupabaseClient, row: EmailRow) {
  if (row.payload.path) return `${siteUrl()}${row.payload.path}`;
  if (!row.request_id) return undefined;
  const { data } = await db.from("rental_requests").select("id, user_id, idempotency_key, access_token_hash").eq("id", row.request_id).single();
  return data ? `${siteUrl()}${await requestPath(db, data)}` : undefined;
}

/** Sends one stored email and records what happened. Without a Resend key it is `skipped`, so
 *  every environment runs the same path. */
export async function deliver(db: SupabaseClient, row: EmailRow, link?: string) {
  const attempts = row.attempts + 1;
  const stamp = { attempts, last_attempt_at: new Date().toISOString() };
  try {
    const url = link ?? (await linkFor(db, row));
    const { subject, html, text } = await renderEmail(row.kind, row.lang, row.payload.data, url);
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      if (process.env.NODE_ENV !== "production") console.info(`[email skipped] ${row.kind} ${row.to_address}: ${subject}`);
      await db.from("email_events").update({ ...stamp, status: "skipped", subject }).eq("id", row.id);
      return "skipped" as const;
    }
    const attachments = await Promise.all((row.payload.attachments ?? []).map((a) => resolve(db, a, row.lang)));
    const { data, error } = await new Resend(key).emails.send({
      from: process.env.EMAIL_FROM ?? "Rent for Events <onboarding@resend.dev>",
      replyTo: process.env.EMAIL_REPLY_TO,
      to: row.to_address,
      subject, html, text,
      attachments,
    });
    if (error) throw new Error(error.message);
    await db.from("email_events").update({ ...stamp, status: "sent", subject, provider_id: data?.id ?? null, sent_at: new Date().toISOString(), error: null }).eq("id", row.id);
    return "sent" as const;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`email ${row.kind} failed`, message);
    await db.from("email_events").update({ ...stamp, status: "failed", error: message.slice(0, 1000) }).eq("id", row.id);
    return "failed" as const;
  }
}

/** Runs after the database transaction has committed, and never throws: a mail problem must not
 *  undo a business action. It stays visible on the request and is retried. The same dedupe key
 *  is only ever sent once. */
export async function sendEmail(input: SendInput, db: SupabaseClient | null = serviceClient()) {
  if (!db) {
    console.info(`[email skipped: no SUPABASE_SECRET_KEY] ${input.kind} ${input.to}`);
    return "skipped" as const;
  }
  try {
    const { data, error } = await db.from("email_events").upsert({
      request_id: input.requestId ?? null, profile_id: input.profileId ?? null, kind: input.kind, to_address: input.to, lang: input.lang,
      dedupe_key: input.dedupeKey, payload: { data: input.data, attachments: input.attachments ?? [], path: input.path },
    }, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id, request_id, kind, to_address, lang, attempts, payload");
    if (error) throw error;
    if (!data?.length) return "duplicate" as const;
    return await deliver(db, data[0] as EmailRow, input.link);
  } catch (e) {
    console.error(`email ${input.kind} not recorded`, e);
    return "failed" as const;
  }
}
