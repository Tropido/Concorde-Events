import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/** Bypasses RLS. Only for trusted server jobs (the FX cron); never for user requests. */
export function createServiceClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient(supabaseEnv().url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
