"use client";

import { useApp } from "@/lib/context/app-context";
import { waLink } from "@/lib/utils/whatsapp";

// Honest failure state: no mock data, no fake success. Shown when Supabase is unreachable,
// unconfigured, or a query fails.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useApp();
  return (
    <div role="alert" className="shell flex flex-1 items-center justify-center py-24">
      <div className="card max-w-md space-y-4 p-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t.common.unavailableTitle}</h1>
        <p className="text-sm text-ink/60">{t.common.unavailableText}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={reset} className="btn-ink">{t.common.retry}</button>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className="btn-light">WhatsApp</a>
        </div>
      </div>
    </div>
  );
}
