import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { OrderView } from "@/components/order/order-view";
import { withSignedPhotos } from "@/lib/order-photos";
import { waLink } from "@/lib/utils/whatsapp";
import type { OrderView as Order } from "@/lib/types";

// The link is the credential: keep it out of search engines and of the Referer header.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

/** A guest's order. Every read goes through a token RPC; a wrong token and a rate-limited one
 *  get the same page. */
export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t, prefs } = await getT();
  const db = await createClient();
  const { data } = await db.rpc("track_request", { p_token: token });
  if (!data) {
    return (
      <div className="shell flex justify-center pt-16">
        <div className="card max-w-lg space-y-4 p-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{t.order.notFoundTitle}</h1>
          <p className="text-sm text-ink/60">{t.order.notFoundText}</p>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className="btn-ink">{t.contact.whatsappButton}</a>
        </div>
      </div>
    );
  }
  return (
    <div className="shell space-y-2.5 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-ink/60">
        <p>{t.order.trackIntro}</p>
        <Link href="/register" className="underline underline-offset-2">{t.order.createAccount}</Link>
      </div>
      <OrderView view={await withSignedPhotos(data as Order)} t={t} lang={prefs.lang} token={token} />
    </div>
  );
}
