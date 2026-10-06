import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFx } from "@/lib/fx-current";
import { refreshFx } from "@/lib/actions/admin";
import { ActionButton, btnPrimary } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils/formatters";
import { OverrideForm } from "./override-form";

export default async function AdminSettingsPage() {
  const [{ t, prefs }, viewer] = await Promise.all([getT(), requireStaff()]);
  const a = t.admin.settings;
  const db = await createClient();
  const [fx, history] = await Promise.all([
    getCurrentFx(),
    db.from("fx_rates").select("id, rate_eur_tnd, source, provider_time, effective_until, note, created_at").order("created_at", { ascending: false }).limit(10),
  ]);
  if (history.error) throw history.error;
  const isAdmin = viewer.role === "admin";

  return (
    <>
      <h1 className="text-2xl font-serif font-bold">{t.admin.nav.settings}</h1>
      <section className="apple-card rounded-3xl border border-tan/30 p-5 space-y-3">
        <h2 className="font-serif text-lg font-bold">{a.fxTitle}</h2>
        {fx ? (
          <p className="text-sm">
            {a.fxCurrent}: <strong>1 EUR = {fx.rate} TND</strong> · {a.fxSource}: {fx.source === "manual" ? t.quote.manualRate : t.quote.providerRate} · {formatDateTime(fx.rateTime, prefs.lang)}
          </p>
        ) : (
          <p role="alert" className="text-sm text-amber-800 dark:text-amber-300">{a.fxNone}</p>
        )}
        {isAdmin ? (
          <>
            <ActionButton action={refreshFx} className={btnPrimary}>{a.refresh}</ActionButton>
            <div className="pt-3 border-t border-tan/20 space-y-2">
              <h3 className="font-bold text-sm">{a.overrideTitle}</h3>
              <p className="text-xs opacity-70">{a.overrideHint}</p>
              <OverrideForm />
            </div>
          </>
        ) : (
          <p className="text-xs opacity-70">{a.adminOnly}</p>
        )}
        <div className="pt-3 border-t border-tan/20">
          <h3 className="font-bold text-sm mb-2">{a.history}</h3>
          <ul className="text-xs space-y-1">
            {(history.data ?? []).map((h) => (
              <li key={h.id}>
                {formatDateTime(h.created_at, prefs.lang)} · {h.rate_eur_tnd} · {h.source}
                {h.effective_until && ` → ${formatDateTime(h.effective_until, prefs.lang)}`}{h.note && ` · ${h.note}`}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
