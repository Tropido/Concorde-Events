import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth";
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
  const { data, error } = await supabase.from("quotes").select("snapshot").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  return (
    <main id="main" className="flex-1 bg-[#ede0d4] dark:bg-[#120e0b] print:bg-white py-8 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-end print:hidden">
          <PrintButton label={t.quote.print} />
        </div>
        <QuoteDocument snapshot={data.snapshot as QuoteSnapshot} lang={prefs.lang} t={t} />
      </div>
    </main>
  );
}
