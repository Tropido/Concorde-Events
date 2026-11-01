"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context/app-context";
import { acceptQuoteByToken, acceptQuoteOnline, type AcceptResult } from "@/lib/actions/orders";
import { Dialog } from "@/components/ui/dialog";
import { CloseButton } from "@/components/ui/kit";
import { formatTND } from "@/lib/utils/formatters";

/** The client's agreement: total, deposit and deadline in front of them, the conditions ticked and
 *  their name typed. Signed-in owners pass requestId, guests their tracking token. */
export function AcceptQuote({ requestId, token, quoteId, total, deposit, deadlineHours, name, className = "btn-ink" }: {
  requestId?: string; token?: string; quoteId: string; total: number; deposit: number; deadlineHours: number; name?: string; className?: string;
}) {
  const { t, language } = useApp();
  const o = t.order;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [terms, setTerms] = useState(false);
  const [signer, setSigner] = useState(name ?? "");
  const [result, setResult] = useState<AcceptResult | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const input = { quoteId, signer, terms: true as const };
      const r = token ? await acceptQuoteByToken(token, input) : await acceptQuoteOnline(requestId!, input);
      setResult(r);
      if (r.ok) { setOpen(false); router.refresh(); }
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{o.acceptCta}</button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="accept-title" className="max-w-md">
        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id="accept-title" className="text-xl font-semibold tracking-tight">{o.acceptTitle}</h2>
            <CloseButton onClick={() => setOpen(false)} label={t.common.close} />
          </div>
          <p className="text-sm text-ink/70">{o.acceptIntro}</p>
          <dl className="space-y-2 rounded-2xl bg-paper p-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink/60">{o.acceptTotal}</dt><dd className="font-semibold tabular-nums">{formatTND(total, language)}</dd></div>
            {deposit > 0 ? (
              <>
                <div className="flex justify-between gap-3"><dt className="text-ink/60">{o.acceptDeposit}</dt><dd className="font-semibold tabular-nums">{formatTND(deposit, language)}</dd></div>
                <p className="text-xs text-ink/60">{o.acceptDeadline(deadlineHours)}</p>
              </>
            ) : <p className="text-xs text-ink/60">{o.acceptNoDeposit}</p>}
          </dl>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ink" />
            <span>{o.acceptTerms} <Link href="/conditions" target="_blank" className="underline underline-offset-2">{o.termsLink}</Link></span>
          </label>
          <label className="block"><span className="field-label">{o.signer}</span>
            <input required minLength={2} maxLength={120} value={signer} onChange={(e) => setSigner(e.target.value)} autoComplete="name" className="field" />
            <span className="mt-1 block text-xs text-ink/55">{o.signerHint}</span>
          </label>
          {result && !result.ok && <p role="alert" className="rounded-2xl bg-bad-soft p-3 text-sm text-bad">{o.errors[result.error]}</p>}
          <button type="submit" disabled={pending || !terms} className="btn-ink h-12 w-full">{pending ? t.common.loading : o.acceptSubmit}</button>
        </form>
      </Dialog>
    </>
  );
}
