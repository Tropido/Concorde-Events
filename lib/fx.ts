import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Provider: ExchangeRate-API open access (daily update, includes TND, attribution required).
// https://www.exchangerate-api.com/docs/free
const PROVIDER_URL = "https://open.er-api.com/v6/latest/EUR";
export const MAX_JUMP = 0.1; // refuse a >10% move vs the last provider rate; use a manual override instead

export type FxResult = { ok: true; rate: number; providerTime: string } | { ok: false; reason: string };

/** Latest EUR->TND rate from the provider, with the provider's own publication time. */
export async function fetchProviderRate(): Promise<FxResult> {
  try {
    const res = await fetch(PROVIDER_URL, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, reason: `provider_http_${res.status}` };
    const body = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
    const rate = body.rates?.TND;
    if (body.result !== "success" || typeof rate !== "number" || !(rate >= 1 && rate <= 10) || !body.time_last_update_unix) {
      return { ok: false, reason: "provider_payload" };
    }
    return { ok: true, rate, providerTime: new Date(body.time_last_update_unix * 1000).toISOString() };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.name : "provider_error" };
  }
}

/** Fetches and stores a new provider rate unless it is a duplicate or an implausible jump. */
export async function recordProviderRate(db: SupabaseClient): Promise<FxResult & { stored?: boolean }> {
  const fx = await fetchProviderRate();
  if (!fx.ok) return fx;
  const { data: last } = await db.from("fx_rates").select("rate_eur_tnd, provider_time")
    .eq("source", "provider").order("provider_time", { ascending: false }).limit(1).maybeSingle();
  if (last && new Date(last.provider_time).getTime() >= new Date(fx.providerTime).getTime()) return { ...fx, stored: false };
  if (last && Math.abs(fx.rate / Number(last.rate_eur_tnd) - 1) > MAX_JUMP) return { ok: false, reason: "jump_too_large" };
  const { error } = await db.from("fx_rates").insert({ rate_eur_tnd: fx.rate, source: "provider", provider_time: fx.providerTime });
  return error ? { ok: false, reason: error.message } : { ...fx, stored: true };
}
