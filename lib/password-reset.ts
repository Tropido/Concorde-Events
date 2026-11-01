import { maskEmail, maskPhone, normalizePhone } from "@/lib/phone";
import { STAFF_ROLES, type AppRole } from "@/lib/types";
import type { AdminErrorCode } from "@/lib/i18n/admin-types";
import type { Language } from "@/lib/i18n/translations";

export type ResetChannel = "email" | "whatsapp";
export const RESETS_PER_HOUR = 3;
/** Supabase's email OTP expiry (Authentication settings); README says to keep it at one hour. */
export const RESET_LINK_MINUTES = 60;

export interface ResetTarget { id: string; email: string; phone: string | null; full_name: string | null; role: AppRole; language: Language }
export interface ResetInput { channel: ResetChannel; destination: string; reason: string | null }

const same = (channel: ResetChannel, a: string, b: string | null) =>
  !!b && (channel === "email" ? a.trim().toLowerCase() === b.trim().toLowerCase() : normalizePhone(a) === normalizePhone(b));

/** Who may send what, in one place. Sending somewhere other than the stored contact is how an
 *  account gets taken over, so it takes an admin and a written reason. */
export function checkReset(actor: { id: string; role: AppRole }, target: ResetTarget, input: ResetInput, recent: number): AdminErrorCode | null {
  if (actor.id === target.id) return "reset_self";
  if (STAFF_ROLES.includes(target.role) && actor.role !== "admin") return "reset_staff";
  const stored = input.channel === "email" ? target.email : target.phone;
  const to = input.destination.trim();
  if (!same(input.channel, to, stored) && (actor.role !== "admin" || !input.reason?.trim())) return "reset_destination";
  if (input.channel === "email" ? !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) : normalizePhone(to).length < 11) return "invalid";
  if (recent >= RESETS_PER_HOUR) return "reset_limit";
  return null;
}

export interface ResetDeps {
  recentCount: (targetId: string) => Promise<number>;
  /** The token's hash from auth.admin.generateLink. */
  generateToken: (email: string) => Promise<string>;
  audit: (row: { actor: string; action: string; target_profile: string; channel: ResetChannel; masked_destination: string; reason: string | null }) => Promise<void>;
  sendEmail: (to: string, link: string) => Promise<void>;
  siteUrl: string;
}

/** The link only exists in this function and in what it returns or sends: it is never stored and
 *  never logged. The audit row comes first, so nothing leaves without a trace. */
export async function performReset(actor: { id: string; role: AppRole }, target: ResetTarget, input: ResetInput, deps: ResetDeps): Promise<{ ok: true; link?: string } | { ok: false; error: AdminErrorCode }> {
  const error = checkReset(actor, target, input, await deps.recentCount(target.id));
  if (error) return { ok: false, error };
  const hash = await deps.generateToken(target.email);
  const link = `${deps.siteUrl}/auth/confirm?token_hash=${hash}&type=recovery&next=/reset-password`;
  await deps.audit({
    actor: actor.id, action: "password_reset_link", target_profile: target.id, channel: input.channel,
    masked_destination: input.channel === "email" ? maskEmail(input.destination) : maskPhone(input.destination), reason: input.reason?.trim() || null,
  });
  if (input.channel === "email") {
    await deps.sendEmail(input.destination.trim(), link);
    return { ok: true };
  }
  return { ok: true, link };
}
