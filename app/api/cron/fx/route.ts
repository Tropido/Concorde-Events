import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { recordProviderRate } from "@/lib/fx";

// Daily (vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await recordProviderRate(createServiceClient());
  if (!result.ok) console.error("fx refresh failed", result.reason);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
