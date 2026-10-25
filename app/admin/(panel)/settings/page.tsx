import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TIER_COLUMNS, type TierRow } from "@/lib/pro";
import { PageHeader, Panel } from "@/components/admin/ui";
import { BUSINESS_WHATSAPP_DISPLAY } from "@/lib/utils/whatsapp";
import { TierEditor } from "./tier-editor";

export default async function AdminSettingsPage() {
  const [{ t }, viewer] = await Promise.all([getT(), requireStaff()]);
  const a = t.admin.settings;
  const db = await createClient();
  const { data, error } = await db.from("pro_tiers").select(TIER_COLUMNS).order("rank");
  if (error) throw error;
  const isAdmin = viewer.role === "admin";

  return (
    <>
      <PageHeader title={t.admin.nav.settings} subtitle={a.subtitle} />
      <Panel title={a.tiersTitle}>
        <p className="mb-4 max-w-2xl text-sm text-ink/60">{a.tiersHint}</p>
        <div className="grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
          {((data ?? []) as TierRow[]).map((tier) => <TierEditor key={tier.code} tier={tier} readOnly={!isAdmin} />)}
        </div>
        {!isAdmin && <p className="mt-3 text-xs text-ink/50">{a.adminOnly}</p>}
      </Panel>
      <div className="grid gap-2.5 lg:grid-cols-2">
        <Panel title={a.businessTitle}>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink/55">{a.currency}</dt><dd className="font-medium">TND · Dinar tunisien</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink/55">{a.whatsapp}</dt><dd className="font-medium"><bdi dir="ltr">{BUSINESS_WHATSAPP_DISPLAY}</bdi></dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink/55">{a.languages}</dt><dd className="font-medium">Français · العربية</dd></div>
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
