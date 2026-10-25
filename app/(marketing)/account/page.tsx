import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelRequest } from "@/lib/actions/account";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { StatusPill, StatusTrack } from "@/components/ui/status";
import { todayIn } from "@/lib/dates";
import { formatDateTime, formatDay, formatNumber, formatTND } from "@/lib/utils/formatters";
import type { RequestStatus } from "@/lib/types";

type Row = {
  id: string; reference: string; status: RequestStatus; created_at: string; quote_valid_until: string | null; event_type: string | null;
  request_lines: { id: string; quantity: number; start_date: string; end_date: string; nights: number; line_total: number; products: { title_fr: string; title_ar: string | null } | null }[];
  quotes: { id: string; revision: number; total: number }[];
};

export default async function AccountRequestsPage() {
  const [{ t, prefs }, viewer] = await Promise.all([getT(), requireViewer("/account")]);
  const supabase = await createClient();
  // RLS already limits rows to this user; the explicit filter keeps the intent obvious.
  const { data, error } = await supabase
    .from("rental_requests")
    .select("id, reference, status, created_at, quote_valid_until, event_type, request_lines(id, quantity, start_date, end_date, nights, line_total, products(title_fr, title_ar)), quotes(id, revision, total:snapshot->total)")
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];
  const a = t.account;
  const today = todayIn("TN");
  const open = rows.filter((r) => ["submitted", "validated", "confirmed", "dispatched"].includes(r.status));
  const next = open.flatMap((r) => r.request_lines.map((l) => l.start_date)).filter((d) => d >= today).sort()[0];

  return (
    <>
      <section className="card p-6 sm:p-8">
        <h1 className="display text-4xl sm:text-5xl">{a.welcome(viewer.fullName?.split(" ")[0] ?? "")}</h1>
        <dl className="mt-8 grid gap-2.5 sm:grid-cols-3">
          <Stat label={a.openRequests} value={formatNumber(open.length, prefs.lang)} />
          <Stat label={a.nextEvent} value={next ? formatDay(next, prefs.lang, { day: "numeric", month: "long" }) : "—"} />
          {viewer.pro && viewer.status === "approved"
            ? <Stat label={t.pro.points} value={formatNumber(viewer.pro.points, prefs.lang)} href="/account/pro" />
            : <Stat label={a.totalRequests} value={formatNumber(rows.length, prefs.lang)} />}
        </dl>
      </section>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-lg font-semibold tracking-tight">{a.noRequests}</p>
          <Link href="/catalogue" className="btn-ink">{t.bag.browse}</Link>
        </div>
      ) : rows.map((r) => {
        const quote = [...r.quotes].sort((x, y) => y.revision - x.revision)[0];
        const estimate = r.request_lines.reduce((s, l) => s + Number(l.line_total), 0);
        return (
          <article key={r.id} className="card space-y-5 p-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="label"><bdi>{r.reference}</bdi></p>
                <p className="mt-1 text-lg font-semibold tracking-tight">{r.event_type ? t.eventTypes[r.event_type as keyof typeof t.eventTypes] : a.request}</p>
                <p className="text-xs text-ink/50">{a.requestedOn} {formatDateTime(r.created_at, prefs.lang)}</p>
              </div>
              <StatusPill status={r.status} label={t.requestStatus[r.status]} />
            </header>
            <StatusTrack status={r.status} labels={t.requestStatus} />
            <ul className="divide-y divide-line rounded-2xl bg-paper px-4 text-sm">
              {r.request_lines.map((l) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                  <span>{l.quantity} × {(prefs.lang === "ar" && l.products?.title_ar) || l.products?.title_fr}</span>
                  <span className="text-xs text-ink/55"><bdi>{formatDay(l.start_date, prefs.lang)}</bdi> – <bdi>{formatDay(l.end_date, prefs.lang)}</bdi> · {t.common.nights(l.nights)}</span>
                </li>
              ))}
            </ul>
            <footer className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                {quote ? (
                  <>
                    <span className="text-xl font-semibold tabular-nums">{formatTND(Number(quote.total), prefs.lang)}</span>
                    <span className="ms-2 text-xs text-ink/50">{a.revision(quote.revision)}</span>
                    {r.status === "validated" && r.quote_valid_until && <span className="block text-xs text-ink/55">{a.quoteValidUntil(formatDay(r.quote_valid_until, prefs.lang))}</span>}
                  </>
                ) : (
                  <span className="text-ink/60">{a.estimate} <span className="font-semibold text-ink">{formatTND(estimate, prefs.lang)}</span> · {a.noQuote}</span>
                )}
              </div>
              <div className="flex gap-2">
                {quote && <Link href={`/quote/${quote.id}`} className="btn-ink btn-sm">{a.viewQuote}</Link>}
                {(r.status === "submitted" || r.status === "validated") && (
                  <form action={cancelRequest.bind(null, r.id)}>
                    <ConfirmButton message={a.cancelConfirm} className="btn-light btn-sm text-bad">{a.cancel}</ConfirmButton>
                  </form>
                )}
              </div>
            </footer>
          </article>
        );
      })}
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = <><dt className="text-xs text-ink/55">{label}</dt><dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</dd></>;
  return href
    ? <Link href={href} className="rounded-2xl bg-paper p-4 hover:ring-1 hover:ring-line">{body}</Link>
    : <div className="rounded-2xl bg-paper p-4">{body}</div>;
}
