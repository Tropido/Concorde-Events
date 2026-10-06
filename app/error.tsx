"use client";

import { useApp } from "@/lib/context/app-context";
import { waLink } from "@/lib/utils/whatsapp";

// Honest failure state: no mock data, no fake success. Shown when Supabase is unreachable,
// unconfigured, or a query fails.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useApp();
  return (
    <div role="alert" className="flex-1 flex items-center justify-center px-4 py-24">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-serif font-bold">{t.common.unavailableTitle}</h1>
        <p className="text-sm text-coffeeBean/75 dark:text-almondCream/75">{t.common.unavailableText}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="px-6 py-3 rounded-full bg-toffeeBrown text-white text-xs font-bold uppercase tracking-wider hover:bg-coffeeBean">
            {t.common.retry}
          </button>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-tan/50 text-xs font-bold uppercase tracking-wider">
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
