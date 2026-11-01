import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OrderView } from "@/components/order/order-view";
import { withSignedPhotos } from "@/lib/order-photos";
import type { OrderView as Order } from "@/lib/types";

export default async function AccountRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [{ t, prefs }] = await Promise.all([getT(), requireViewer(`/account/requests/${id}`)]);
  const db = await createClient();
  const { data, error } = await db.rpc("my_request_view", { p_request: id });
  if (error) throw error;
  if (!data) notFound();
  return (
    <>
      <Link href="/account" className="inline-flex items-center gap-1 px-1 text-xs text-ink/60 hover:text-ink"><ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />{t.account.requests}</Link>
      <OrderView view={await withSignedPhotos(data as Order)} t={t} lang={prefs.lang} />
    </>
  );
}
