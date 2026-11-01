import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/** Bypasses RLS. Only for work with no staff session behind it: the email pipeline (a guest
 *  accepting a quote, the cron), stored documents and password reset links. Null without the key. */
export function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createClient(supabaseEnv().url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
