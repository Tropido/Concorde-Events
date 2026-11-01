import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { invoicePdf } from "@/lib/invoicing/store";

/** Streams an invoice to whoever may read it: staff or the owner through RLS, a guest through their
 *  tracking token. Anything else gets the same 404. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notFound = new NextResponse("Not found", { status: 404 });
  if (!z.string().uuid().safeParse(id).success) return notFound;

  const token = new URL(request.url).searchParams.get("t");
  const supabase = await createClient();
  let allowed = false;
  if (token) {
    const { data } = await supabase.rpc("track_request", { p_token: token });
    allowed = !!(data as { invoices: { id: string }[] } | null)?.invoices.some((i) => i.id === id);
  } else {
    const { data } = await supabase.from("invoices").select("id").eq("id", id).maybeSingle();
    allowed = !!data;
  }
  const db = serviceClient();
  if (!allowed || !db) return notFound;

  const { filename, content } = await invoicePdf(db, id);
  return new NextResponse(new Uint8Array(content), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}
