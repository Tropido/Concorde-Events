import "server-only";
import { createHash, createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Guest tracking links. Every email to a guest needs the link again, and a stored hash can't give
// it back, so the 32-byte token is derived: HMAC of the request's private idempotency key with a
// server secret. The database only ever holds its sha256.

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function trackingToken(idempotencyKey: string) {
  const secret = process.env.TRACKING_TOKEN_SECRET;
  return secret ? createHmac("sha256", secret).update(idempotencyKey).digest("base64url") : null;
}

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

type LinkRow = { id: string; user_id: string | null; idempotency_key: string; access_token_hash: string | null };

/** Where a client follows this request. Registers the token's hash on first use. */
export async function requestPath(db: SupabaseClient, r: LinkRow) {
  if (r.user_id) return "/account";
  const token = trackingToken(r.idempotency_key);
  if (!token) return "/contact";
  if (!r.access_token_hash) await db.from("rental_requests").update({ access_token_hash: tokenHash(token) }).eq("id", r.id);
  return `/suivi/${token}`;
}
