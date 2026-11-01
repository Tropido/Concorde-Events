import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TIER_COLUMNS, type TierRow } from "@/lib/pro";
import { PageHeader, Panel } from "@/components/admin/ui";
import { BUSINESS_WHATSAPP_DISPLAY } from "@/lib/utils/whatsapp";
import { TierEditor } from "./tier-editor";
import { TagsPanel } from "./tags-panel";
import { CompanyForm } from "./company-form";
import type { CompanyInput } from "@/lib/actions/orders";
import type { ClientTag } from "../clients/tags";

export default async function AdminSettingsPage() {
  const [{ t }, viewer] = await Promise.all([getT(), requireStaff()]);
  const a = t.admin.settings;
  const db = await createClient();
  const [{ data, error }, { data: tags }, { data: company }] = await Promise.all([
    db.from("pro_tiers").select(TIER_COLUMNS).order("rank"),
    db.from("client_tags").select("id, slug, label_fr, label_en, label_ar, color, is_system, created_by, archived_at").order("is_system", { ascending: false }).order("label_fr"),
    db.from("company_settings").select("legal_name, legal_form, address, city, postal_code, tax_id, rne, phone, email, bank_name, rib, iban, logo_url, prices_include_vat, default_vat_rate, stamp_duty, deposit_rate, deposit_deadline_hours, invoice_due_days_deposit, invoice_due_days_balance, legal_mentions_fr, legal_mentions_en").single(),
  ]);
  if (error) throw error;
  const isAdmin = viewer.role === "admin";

  return (
    <>
      <PageHeader title={t.admin.nav.settings} subtitle={a.subtitle} />
      {company && <CompanyForm readOnly={!isAdmin} initial={{
        ...company, default_vat_rate: Number(company.default_vat_rate), stamp_duty: Number(company.stamp_duty), deposit_rate: Number(company.deposit_rate),
      } as CompanyInput} />}
      <Panel title={a.tiersTitle}>
        <p className="mb-4 max-w-2xl text-sm text-ink/60">{a.tiersHint}</p>
        <div className="grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
          {((data ?? []) as TierRow[]).map((tier) => <TierEditor key={tier.code} tier={tier} readOnly={!isAdmin} />)}
        </div>
        {!isAdmin && <p className="mt-3 text-xs text-ink/50">{a.adminOnly}</p>}
      </Panel>
      <Panel title={t.admin.clients.tagsTitle}>
        <p className="mb-2 max-w-2xl text-sm text-ink/60">{t.admin.clients.tagsHint}</p>
        <TagsPanel tags={(tags ?? []) as ClientTag[]} selfId={viewer.id} isAdmin={isAdmin} />
      </Panel>
      <div className="grid gap-2.5 lg:grid-cols-2">
        <Panel title={a.businessTitle}>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink/55">{a.currency}</dt><dd className="font-medium">TND · Dinar tunisien</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink/55">{a.whatsapp}</dt><dd className="font-medium"><bdi dir="ltr">{BUSINESS_WHATSAPP_DISPLAY}</bdi></dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink/55">{a.languages}</dt><dd className="font-medium">Français · English · العربية</dd></div>
          </dl>
          <p className="mt-4 text-xs text-ink/50">{a.businessHint}</p>
        </Panel>
        <Panel title={a.pointsTitle}>
          <p className="text-sm text-ink/60">{a.pointsText}</p>
        </Panel>
      </div>
    </>
  );
}
