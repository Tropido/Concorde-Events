import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { QuoteDocument } from "@/components/quote/quote-document";
import { PrintButton } from "@/app/quote/[id]/print-button";
import type { OrderView as Order } from "@/lib/types";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function TrackQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t, prefs } = await getT();
  const db = await createClient();
  const { data } = await db.rpc("track_request", { p_token: token });
  const quote = (data as Order | null)?.quote;
  if (!quote) notFound();
  return (
    <div className="theme-light bg-paper px-3 py-6 text-ink print:p-0 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="flex items-center justify-between print:hidden">
          <Link href={`/suivi/${token}`} className="btn-light btn-sm">{t.common.back}</Link>
          <PrintButton label={t.quote.print} />
        </div>
        <QuoteDocument snapshot={quote.snapshot} lang={prefs.lang} t={t} />
      </div>
    </div>
  );
}
