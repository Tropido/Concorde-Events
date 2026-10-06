import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelRequest } from "@/lib/actions/account";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { formatDateTime, formatDay, formatMoney } from "@/lib/utils/formatters";
import type { Currency, RequestStatus } from "@/lib/types";

type Row = {
  id: string;
  reference: string;
  status: RequestStatus;
  created_at: string;
  quote_valid_until: string | null;
  request_lines: {
    id: string; quantity: number; start_date: string; end_date: string; nights: number;
    products: { title_fr: string; title_ar: string | null } | null;
  }[];
  quotes: { id: string; revision: number; issued_at: string; currency: Currency; total: number }[];
};

export default async function AccountRequestsPage() {
  const [{ t, prefs }, viewer] = await Promise.all([getT(), requireViewer("/account")]);
  const supabase = await createClient();
  // RLS already limits rows to this user; the explicit filter keeps the intent obvious.
  const { data, error } = await supabase
    .from("rental_requests")
    .select(
      "id, reference, status, created_at, quote_valid_until, " +
        "request_lines(id, quantity, start_date, end_date, nights, products(title_fr, title_ar)), " +
        "quotes(id, revision, issued_at, currency:snapshot->>currency, total:snapshot->total)",
    )
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];

  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm">
        {t.account.noRequests}{" "}
        <Link href="/catalogue" className="underline font-bold">{t.nav.catalogue}</Link>
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const quote = [...r.quotes].sort((a, b) => b.revision - a.revision)[0];
        return (
          <li key={r.id} className="apple-card rounded-3xl border border-tan/30 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-serif text-lg font-bold"><bdi>{r.reference}</bdi></p>
                <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70">
                  {t.account.requestedOn} {formatDateTime(r.created_at, prefs.lang)}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-tan/20 border border-tan/40">{t.requestStatus[r.status]}</span>
            </div>
            <ul className="text-sm space-y-1">
              {r.request_lines.map((l) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-2">
                  <span>{l.quantity} × {(prefs.lang === "ar" && l.products?.title_ar) || l.products?.title_fr}</span>
                  <span className="text-xs text-coffeeBean/70 dark:text-almondCream/70">
                    <bdi>{formatDay(l.start_date, prefs.lang)}</bdi> → <bdi>{formatDay(l.end_date, prefs.lang)}</bdi> · {t.common.nights(l.nights)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-tan/20">
              {quote ? (
                <div className="text-sm">
                  <span className="font-bold">{formatMoney(Number(quote.total), quote.currency, prefs.lang)}</span>
                  <span className="text-xs ms-2">{t.account.revision(quote.revision)}</span>
                  {r.status === "validated" && r.quote_valid_until && (
                    <span className="block text-xs">{t.account.quoteValidUntil(formatDay(r.quote_valid_until, prefs.lang))}</span>
                  )}
                </div>
              ) : (
                <span className="text-xs">{t.account.noQuote}</span>
              )}
              <div className="flex gap-2">
                {quote && (
                  <Link href={`/quote/${quote.id}`} className="px-4 py-2 rounded-full bg-toffeeBrown text-white text-xs font-bold">
                    {t.account.viewQuote}
                  </Link>
                )}
                {(r.status === "submitted" || r.status === "validated") && (
                  <form action={cancelRequest.bind(null, r.id)}>
                    <ConfirmButton
                      message={t.account.cancelConfirm}
                      className="px-4 py-2 rounded-full border border-rose-500/50 text-rose-700 dark:text-rose-300 text-xs font-bold"
                    >
                      {t.account.cancel}
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
