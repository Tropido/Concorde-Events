import { NextResponse } from "next/server";
import { assertStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadInvoices } from "../load";
import { invoicesCsv } from "../csv";

/** The accountant's export: one line per invoice, with HT and TVA per rate. */
export async function GET(request: Request) {
  try {
    await assertStaff();
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const db = await createClient();
  const rows = await loadInvoices(db, Object.fromEntries(new URL(request.url).searchParams));
  return new NextResponse(invoicesCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="factures.csv"`, "Cache-Control": "private, no-store" },
  });
}
