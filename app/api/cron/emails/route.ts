import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { deliver, MAX_ATTEMPTS, type EmailRow } from "@/lib/email/send";
import { notifyRequest } from "@/lib/email/notify";

const HOUR = 3_600_000;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Daily on Vercel Hobby (vercel.json); the Pro plan allows every 10 minutes. Retries what
 *  failed, with exponential backoff, then sends the reminders that have come due. Safe to run
 *  twice: reminders are deduplicated by kind, request and deadline. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "service key missing" }, { status: 503 });

  const now = Date.now();
  const { data: pending } = await db.from("email_events")
    .select("id, request_id, kind, to_address, lang, attempts, payload, last_attempt_at")
    .in("status", ["queued", "failed"]).neq("kind", "password_reset").lt("attempts", MAX_ATTEMPTS).order("created_at").limit(100);
  let retried = 0;
  for (const row of pending ?? []) {
    const wait = 5 * 60_000 * 2 ** row.attempts;
    if (row.last_attempt_at && now - new Date(row.last_attempt_at).getTime() < wait) continue;
    await deliver(db, row as unknown as EmailRow);
    retried += 1;
  }

  const iso = (t: number) => new Date(t).toISOString();
  const [quotes, deposits] = await Promise.all([
    db.from("rental_requests").select("id, quote_valid_until").eq("status", "validated").lte("quote_valid_until", iso(now + 48 * HOUR).slice(0, 10)).gte("quote_valid_until", iso(now).slice(0, 10)),
    db.from("rental_requests").select("id, deposit_due_at").eq("status", "accepted").is("deposit_waived_at", null).not("deposit_due_at", "is", null).lte("deposit_due_at", iso(now + 24 * HOUR)),
  ]);
  for (const r of quotes.data ?? []) await notifyRequest("quote_reminder", r.id, { dedupe: r.quote_valid_until });
  for (const r of deposits.data ?? []) {
    const overdue = new Date(r.deposit_due_at).getTime() < now;
    await notifyRequest(overdue ? "deposit_overdue" : "deposit_reminder", r.id, {
      dedupe: r.deposit_due_at.slice(0, 10), withBank: true, staff: overdue ? "Acompte en retard" : undefined,
    });
  }
  return NextResponse.json({ retried, quoteReminders: quotes.data?.length ?? 0, depositReminders: deposits.data?.length ?? 0 });
}
