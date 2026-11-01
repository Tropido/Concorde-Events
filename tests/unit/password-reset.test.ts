import { afterEach, describe, expect, it, vi } from "vitest";
import { checkReset, performReset, RESETS_PER_HOUR, type ResetDeps, type ResetInput, type ResetTarget } from "@/lib/password-reset";
import { maskEmail, maskPhone, normalizePhone } from "@/lib/phone";

const client: ResetTarget = { id: "client", email: "fatma@gmail.com", phone: "+216 23 040 424", full_name: "Fatma", role: "customer", language: "fr" };
const manager = { id: "m", role: "manager" as const };
const admin = { id: "a", role: "admin" as const };
const byEmail: ResetInput = { channel: "email", destination: "fatma@gmail.com", reason: null };
const byPhone: ResetInput = { channel: "whatsapp", destination: "23 040 424", reason: null };

describe("contacts", () => {
  it.each([["+216 23 040 424"], ["0021623040424"], ["23040424"], ["216-23-040-424"]])("normalises %s", (p) => expect(normalizePhone(p)).toBe("21623040424"));

  it("masks destinations for the audit", () => {
    expect(maskPhone("+216 23 040 424")).toBe("+216 ** *** 424");
    expect(maskEmail("fatma@gmail.com")).toBe("f***@gmail.com");
  });
});

describe("who may send a reset link", () => {
  it("lets staff use a client's stored contacts", () => {
    expect(checkReset(manager, client, byEmail, 0)).toBeNull();
    expect(checkReset(manager, client, byPhone, 0)).toBeNull(); // same number, written differently
    expect(checkReset(admin, client, { ...byEmail, destination: "FATMA@gmail.com " }, 0)).toBeNull();
  });

  it("never lets anyone reset their own account from the admin", () => {
    expect(checkReset(admin, { ...client, id: "a", role: "admin" }, byEmail, 0)).toBe("reset_self");
  });

  it("keeps managers off staff accounts", () => {
    for (const role of ["editor", "manager", "admin"] as const) {
      expect(checkReset(manager, { ...client, role }, byEmail, 0), role).toBe("reset_staff");
      expect(checkReset(admin, { ...client, role }, byEmail, 0), role).toBeNull();
    }
  });

  it("reserves another destination for an admin with a reason", () => {
    const other: ResetInput = { channel: "email", destination: "pirate@example.com", reason: "Changement d'adresse" };
    expect(checkReset(manager, client, other, 0)).toBe("reset_destination");
    expect(checkReset(admin, client, { ...other, reason: " " }, 0)).toBe("reset_destination");
    expect(checkReset(admin, client, other, 0)).toBeNull();
  });

  it("refuses WhatsApp to a client with no phone unless an admin gives a reason", () => {
    expect(checkReset(manager, { ...client, phone: null }, byPhone, 0)).toBe("reset_destination");
  });

  it("stops after three per target per hour", () => {
    expect(checkReset(admin, client, byEmail, RESETS_PER_HOUR - 1)).toBeNull();
    expect(checkReset(admin, client, byEmail, RESETS_PER_HOUR)).toBe("reset_limit");
  });

  it("refuses a malformed destination", () => {
    expect(checkReset(admin, client, { channel: "email", destination: "nope", reason: "x" }, 0)).toBe("invalid");
    expect(checkReset(admin, client, { channel: "whatsapp", destination: "123", reason: "x" }, 0)).toBe("invalid");
  });
});

describe("sending it", () => {
  afterEach(() => vi.restoreAllMocks());
  const deps = (over: Partial<ResetDeps> = {}) => {
    const audits: Record<string, unknown>[] = [];
    const sent: [string, string][] = [];
    const d: ResetDeps = {
      siteUrl: "https://example.com", recentCount: async () => 0, generateToken: async () => "SECRETHASH",
      audit: async (row) => { audits.push(row); }, sendEmail: async (to, link) => { sent.push([to, link]); }, ...over,
    };
    return { d, audits, sent };
  };
  const consoleOutput = () => {
    const calls: unknown[][] = [];
    for (const m of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, m).mockImplementation((...a) => { calls.push(a); });
    return calls;
  };

  it("emails the link to the confirm route, and returns nothing to the browser", async () => {
    const { d, sent, audits } = deps();
    expect(await performReset(manager, client, byEmail, d)).toEqual({ ok: true });
    expect(sent).toEqual([["fatma@gmail.com", "https://example.com/auth/confirm?token_hash=SECRETHASH&type=recovery&next=/reset-password"]]);
    expect(audits).toEqual([{ actor: "m", action: "password_reset_link", target_profile: "client", channel: "email", masked_destination: "f***@gmail.com", reason: null }]);
  });

  it("hands the WhatsApp link back once and audits a masked number", async () => {
    const { d, sent, audits } = deps();
    expect(await performReset(admin, client, byPhone, d)).toEqual({ ok: true, link: expect.stringContaining("SECRETHASH") });
    expect(sent).toHaveLength(0);
    expect(audits[0]).toMatchObject({ channel: "whatsapp", masked_destination: "+216 ** *** 424" });
  });

  it("keeps the token out of the logs and the audit", async () => {
    const calls = consoleOutput();
    const { d, audits } = deps();
    await performReset(admin, client, byEmail, d);
    await performReset(admin, client, byPhone, d);
    expect(JSON.stringify(calls)).not.toContain("SECRETHASH");
    expect(JSON.stringify(audits)).not.toContain("SECRETHASH");
  });

  it("generates nothing when the rules say no", async () => {
    const generateToken = vi.fn(async () => "x");
    const { d } = deps({ generateToken, recentCount: async () => 3 });
    expect(await performReset(admin, client, byEmail, d)).toEqual({ ok: false, error: "reset_limit" });
    expect(generateToken).not.toHaveBeenCalled();
  });

  it("sends nothing if the audit can't be written", async () => {
    const { d, sent } = deps({ audit: async () => { throw new Error("db down"); } });
    await expect(performReset(admin, client, byEmail, d)).rejects.toThrow("db down");
    expect(sent).toHaveLength(0);
  });
});
