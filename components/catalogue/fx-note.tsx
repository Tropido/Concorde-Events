"use client";

import { useApp } from "@/lib/context/app-context";
import { currencyOf } from "@/lib/prefs";
import { formatDateTime } from "@/lib/utils/formatters";
import type { FxInfo } from "@/lib/types";

/** Shown whenever prices are converted: rate date + required provider attribution. */
export function FxNote({ fx }: { fx: FxInfo | null }) {
  const { t, language, country, currency } = useApp();
  if (currency === currencyOf(country)) return null;
  if (!fx) return <p className="text-[11px] text-amber-800 dark:text-amber-300">{t.common.conversionUnavailable}</p>;
  return (
    <p className="text-[11px] text-coffeeBean/70 dark:text-almondCream/70">
      1 EUR = {fx.rate} TND · {t.common.rateAsOf(formatDateTime(fx.rateTime, language))}
      {fx.source === "provider" && (
        <> · <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">{t.common.ratesBy}</a></>
      )}
    </p>
  );
}
