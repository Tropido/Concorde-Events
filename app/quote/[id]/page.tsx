import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { getViewer, isStaffViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuoteDocument } from "@/components/quote/quote-document";
import { PrintButton } from "./print-button";
import { AcceptQuote } from "@/components/order/accept-quote";
import type { OrderView, QuoteSnapshot } from "@/lib/types";

// Readable by the request owner and operations staff only (RLS on quotes).
export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [{ t, prefs }, viewer] = await Promise.all([getT(), getViewer()]);
  if (!viewer) redirect(`/login?next=/quote/${id}`);

  const supabase = await createClient();
  const { data, error } = await supabase.from("quotes").select("snapshot, request_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const { data: view } = await supabase.rpc("my_request_view", { p_request: data.request_id });
  const order = view as OrderView | null;
  const acceptable = order?.can_accept && order.quote?.id === id && order.user_id === viewer.id;

  return (
    // theme-light: quotes always read and print on the light palette.
    <main id="main" className="theme-light min-h-screen flex-1 bg-paper px-3 py-6 text-ink print:p-0 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="flex items-center justify-between print:hidden">
          <Link href={isStaffViewer(viewer) ? `/admin/requests/${data.request_id}` : "/account"} className="btn-light btn-sm">{t.common.back}</Link>
          <div className="flex gap-2">
            {acceptable && <AcceptQuote requestId={order.id} quoteId={id} total={order.total_ttc ?? 0} deposit={Math.max(0, order.deposit.required - order.deposit.paid)} deadlineHours={order.deposit.deadline_hours} name={order.customer_name} className="btn-ink btn-sm" />}
            <PrintButton label={t.quote.print} />
          </div>
        </div>
        <QuoteDocument snapshot={data.snapshot as QuoteSnapshot} lang={prefs.lang} t={t} />
      </div>
    </main>
  );
}
