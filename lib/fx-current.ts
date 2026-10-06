import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FxInfo } from "@/lib/types";

export async function getCurrentFx(): Promise<FxInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("current_fx").select("rate, source, rate_time").maybeSingle();
  if (error) throw error;
  return data ? { rate: Number(data.rate), source: data.source, rateTime: data.rate_time } : null;
}
