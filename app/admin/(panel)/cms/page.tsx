import { getT } from "@/lib/i18n/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/formatters";
import { CmsForm } from "./cms-form";
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
      <h1 className="text-2xl font-serif font-bold">{t.admin.nav.cms}</h1>
      <nav className="flex gap-2" aria-label={t.admin.cms.locale}>
        {(["fr", "ar"] as const).map((l) => (
          <a key={l} href={`/admin/cms?locale=${l}`} aria-current={locale === l ? "page" : undefined}
            className="px-3 py-1.5 rounded-full border border-tan/40 text-xs font-bold aria-[current=page]:bg-toffeeBrown aria-[current=page]:text-white">
            {l === "fr" ? "Français" : "العربية"}
          </a>
        ))}
      </nav>
      <p className="text-xs opacity-70">
        {t.admin.cms.emptyFallback}
        {data?.updated_at && ` · ${t.admin.cms.publishedAt} ${formatDateTime(data.updated_at, prefs.lang)}`}
      </p>
      <CmsForm key={locale} locale={locale} initial={{
        hero: { badge: content.hero?.badge ?? "", title: content.hero?.title ?? "", titleAccent: content.hero?.titleAccent ?? "", subtitle: content.hero?.subtitle ?? "" },
        faqs: content.faqs ?? [],
        testimonials: (content.testimonials ?? []).map((x) => ({ quote: x.quote, author: x.author, role: x.role ?? "" })),
      }} />
    </>
  );
}
