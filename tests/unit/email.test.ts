import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emailContent, type EmailData, type EmailKind } from "@/lib/email/copy";
import { renderEmail } from "@/lib/email/template";
import { deliver, sendEmail, type EmailRow, type SendInput } from "@/lib/email/send";
import { LANGUAGES } from "@/lib/i18n/translations";

const KINDS: EmailKind[] = [
  "request_received", "quote_sent", "quote_reminder", "quote_accepted", "deposit_reminder", "deposit_overdue", "payment_received",
  "booking_confirmed", "dispatched", "return_received", "inspection_closed", "rental_settled", "cancelled", "password_reset", "staff_notice",
];
const data: EmailData = {
  reference: "CE-2026-00042", name: "Amira", total: 2300, deposit: 1150, dueAt: "2026-11-14T10:00:00Z", amount: 1150, method: "Virement", remaining: 1150,
  bank: { name: "BIAT", rib: "12345678901234567890", iban: null }, validUntil: "2026-11-30", dates: "14 nov. – 16 nov.",
};

describe("templates", () => {
  it.each(KINDS.flatMap((k) => LANGUAGES.map((l) => [k, l] as const)))("%s renders in %s", async (kind, lang) => {
    const { subject, html, text } = await renderEmail(kind, lang, data, "https://example.com/x");
    expect(subject.length).toBeGreaterThan(3);
    expect(html).toContain("Rent for Events");
    expect(html).toContain(`lang="${lang}"`);
    expect(text.length).toBeGreaterThan(20);
  });

  it("writes Arabic right to left, and the others left to right", async () => {
    expect((await renderEmail("quote_sent", "ar", data)).html).toContain('dir="rtl"');
    expect((await renderEmail("quote_sent", "fr", data)).html).toContain('dir="ltr"');
  });

  it("gives the deposit email its amount, deadline, RIB and reference", () => {
    const c = emailContent("quote_accepted", "fr", data);
    expect(c.subject).toBe("Devis accepté, acompte à régler · CE-2026-00042");
    expect(c.rows).toEqual(expect.arrayContaining([
      ["Acompte", expect.stringMatching(/^1\s150 DT$/)],
      ["RIB", "12345678901234567890"],
      ["À mentionner", "CE-2026-00042"],
    ]));
  });

  it("keeps English and Arabic subjects in their language", () => {
    expect(emailContent("payment_received", "en", data).subject).toBe("Payment received · CE-2026-00042");
    expect(emailContent("payment_received", "ar", data).subject).toBe("تم استلام الدفع · CE-2026-00042");
  });

  it("leaves out the button when there is no link", async () => {
    expect((await renderEmail("dispatched", "fr", data)).html).not.toContain("Voir ma réservation");
    expect((await renderEmail("dispatched", "fr", data, "https://example.com")).html).toContain("Voir ma réservation");
  });

  it("escapes what the client typed", async () => {
    expect((await renderEmail("dispatched", "fr", { ...data, name: "<img src=x onerror=alert(1)>" })).html).not.toContain("<img src=x");
  });
});

/** The bit of Supabase the email pipeline uses, over an array. */
function fakeDb() {
  const rows: (EmailRow & Record<string, unknown>)[] = [];
  const db = {
    from: () => ({
      upsert: (row: EmailRow & { dedupe_key: string }) => ({
        select: async () => {
          if (rows.some((r) => r.dedupe_key === row.dedupe_key)) return { data: [], error: null };
          const saved = { ...row, id: String(rows.length + 1), attempts: 0, status: "queued" };
          rows.push(saved);
          return { data: [saved], error: null };
        },
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: async (_: string, id: string) => {
          Object.assign(rows.find((r) => r.id === id)!, patch);
          return { error: null };
        },
      }),
    }),
  };
  return { db: db as unknown as SupabaseClient, rows };
}

const input: SendInput = { to: "client@example.com", kind: "dispatched", lang: "fr", data, dedupeKey: "dispatched:1" };

describe("sendEmail", () => {
  const key = process.env.RESEND_API_KEY;
  beforeEach(() => { delete process.env.RESEND_API_KEY; vi.spyOn(console, "info").mockImplementation(() => {}); });
  afterEach(() => { if (key) process.env.RESEND_API_KEY = key; vi.restoreAllMocks(); });

  it("records skipped without an API key, and sends nothing", async () => {
    const { db, rows } = fakeDb();
    expect(await sendEmail(input, db)).toBe("skipped");
    expect(rows[0]).toMatchObject({ status: "skipped", attempts: 1, subject: "Livraison effectuée · CE-2026-00042" });
  });

  it("sends the same step once", async () => {
    const { db, rows } = fakeDb();
    await sendEmail(input, db);
    expect(await sendEmail(input, db)).toBe("duplicate");
    expect(rows).toHaveLength(1);
  });

  it("never stores a one-time link", async () => {
    const { db, rows } = fakeDb();
    await sendEmail({ ...input, kind: "password_reset", dedupeKey: "reset:1", link: "https://example.com/secret-token" }, db);
    expect(JSON.stringify(rows)).not.toContain("secret-token");
  });

  it("records a failure instead of throwing, so the business action stands", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, rows } = fakeDb();
    await sendEmail(input, db);
    process.env.RESEND_API_KEY = "re_test";
    const failing = { from: db.from, storage: {} } as unknown as SupabaseClient;
    const row = { ...rows[0], payload: { data: undefined as unknown as EmailData } } as EmailRow;
    expect(await deliver(failing, row)).toBe("failed");
    expect(rows[0]).toMatchObject({ status: "failed", attempts: 2 });
    expect(String(rows[0].error).length).toBeGreaterThan(0);
  });

  it("swallows a database failure too", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { from: () => { throw new Error("down"); } } as unknown as SupabaseClient;
    expect(await sendEmail(input, broken)).toBe("failed");
  });
});
