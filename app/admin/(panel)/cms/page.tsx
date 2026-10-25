import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/formatters";
import { CmsForm } from "./cms-form";
import { FilterLinks, PageHeader } from "@/components/admin/ui";
import { STAFF_ROLES, type CMSContent } from "@/lib/types";

export default async function AdminCmsPage({ searchParams }: { searchParams: Promise<{ locale?: string }> }) {
  const [{ t, prefs }, , sp] = await Promise.all([getT(), requireStaff(STAFF_ROLES), searchParams]);
  const locale = sp.locale === "ar" ? "ar" : "fr";
  const db = await createClient();
  const { data, error } = await db.from("cms_content").select("content, updated_at").eq("locale", locale).maybeSingle();
  if (error) throw error;
  const content = (data?.content ?? {}) as CMSContent;

  return (
    <>
      <PageHeader title={t.admin.nav.cms}
        subtitle={<>{t.admin.cms.emptyFallback}{data?.updated_at && ` · ${t.admin.cms.publishedAt} ${formatDateTime(data.updated_at, prefs.lang)}`}</>}
        actions={<FilterLinks label={t.admin.cms.locale} items={(["fr", "ar"] as const).map((l) => ({ href: `/admin/cms?locale=${l}`, label: l === "fr" ? "Français" : "العربية", active: locale === l }))} />} />
      <CmsForm key={locale} locale={locale} initial={{
        hero: { badge: content.hero?.badge ?? "", title: content.hero?.title ?? "", titleAccent: content.hero?.titleAccent ?? "", subtitle: content.hero?.subtitle ?? "" },
        faqs: content.faqs ?? [],
        testimonials: (content.testimonials ?? []).map((x) => ({ quote: x.quote, author: x.author, role: x.role ?? "" })),
      }} />
    </>
  );
}
