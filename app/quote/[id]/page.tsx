import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { getViewer, isStaffViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuoteDocument } from "@/components/quote/quote-document";
import { PrintButton } from "./print-button";
import type { QuoteSnapshot } from "@/lib/types";

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

  return (
    <main id="main" className="flex-1 px-3 py-6 print:p-0 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="flex items-center justify-between print:hidden">
          <Link href={isStaffViewer(viewer) ? `/admin/requests/${data.request_id}` : "/account"} className="btn-light btn-sm">{t.common.back}</Link>
          <PrintButton label={t.quote.print} />
        </div>
        <QuoteDocument snapshot={data.snapshot as QuoteSnapshot} lang={prefs.lang} t={t} />
      </div>
    </main>
  );
}
