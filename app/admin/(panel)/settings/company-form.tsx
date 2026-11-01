"use client";

import { useState, useTransition } from "react";
import { useApp } from "@/lib/context/app-context";
import { saveCompany, type CompanyInput } from "@/lib/actions/orders";
import type { AdminResult } from "@/lib/actions/run";
import { Panel, ResultText, btnPrimary } from "@/components/admin/ui";

type Text = { [K in keyof CompanyInput]: CompanyInput[K] extends string | null ? K : never }[keyof CompanyInput];
type Num = { [K in keyof CompanyInput]: CompanyInput[K] extends number ? K : never }[keyof CompanyInput];

export function CompanyForm({ initial, readOnly }: { initial: CompanyInput; readOnly: boolean }) {
  const { t } = useApp();
  const a = t.order.company;
  const [v, setV] = useState(initial);
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const text = (k: Text, label: string, ltr?: boolean) => (
    <label key={k} className="block"><span className="field-label">{label}</span>
      <input value={v[k] ?? ""} dir={ltr ? "ltr" : undefined} onChange={(e) => setV({ ...v, [k]: e.target.value || (k === "legal_name" || k === "tax_id" ? "" : null) })} className="field" /></label>
  );
  const num = (k: Num, label: string, step = "1") => (
    <label key={k} className="block"><span className="field-label">{label}</span>
      <input type="number" min={0} step={step} value={v[k]} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} className="field" /></label>
  );
  const incomplete = !initial.legal_name.trim() || !initial.tax_id.trim();

  return (
    <Panel title={a.title}>
      <p className="mb-4 max-w-2xl text-sm text-ink/60">{a.hint}</p>
      {incomplete && <p role="alert" className="mb-4 rounded-2xl bg-warn-soft p-3 text-sm text-warn">{a.incomplete}</p>}
      <form onSubmit={(e) => { e.preventDefault(); start(async () => setState(await saveCompany(v))); }}>
        <fieldset disabled={readOnly} className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{a.identity}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {text("legal_name", a.legalName)}{text("legal_form", a.legalForm)}{text("tax_id", a.taxId, true)}{text("rne", a.rne, true)}
              {text("address", a.address)}{text("city", a.city)}{text("postal_code", a.postalCode, true)}{text("phone", a.phone, true)}{text("email", a.email, true)}{text("logo_url", a.logo, true)}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{a.bank}</h3>
            <div className="grid gap-3 md:grid-cols-3">{text("bank_name", a.bankName)}{text("rib", a.rib, true)}{text("iban", a.iban, true)}</div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{a.money}</h3>
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={v.prices_include_vat} onChange={(e) => setV({ ...v, prices_include_vat: e.target.checked })} className="mt-0.5 h-4 w-4 accent-ink" />
              <span>{a.pricesIncludeVat}<span className="block text-xs text-ink/55">{a.pricesIncludeVatHint}</span></span>
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              {num("default_vat_rate", a.defaultVat, "0.01")}{num("stamp_duty", a.stamp, "0.001")}{num("deposit_rate", a.depositRate, "0.01")}
              {num("deposit_deadline_hours", a.depositDeadline)}{num("invoice_due_days_deposit", a.dueDeposit)}{num("invoice_due_days_balance", a.dueBalance)}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block"><span className="field-label">{a.mentionsFr}</span><textarea rows={3} maxLength={1000} value={v.legal_mentions_fr ?? ""} onChange={(e) => setV({ ...v, legal_mentions_fr: e.target.value || null })} className="field resize-y" /></label>
              <label className="block"><span className="field-label">{a.mentionsEn}</span><textarea rows={3} maxLength={1000} lang="en" value={v.legal_mentions_en ?? ""} onChange={(e) => setV({ ...v, legal_mentions_en: e.target.value || null })} className="field resize-y" /></label>
            </div>
          </div>
        </fieldset>
        {readOnly ? <p className="mt-3 text-xs text-ink/50">{a.adminOnly}</p> : (
          <div className="mt-5 flex items-center gap-3"><button type="submit" disabled={pending} className={btnPrimary}>{t.common.save}</button><ResultText state={state} /></div>
        )}
      </form>
    </Panel>
  );
}
