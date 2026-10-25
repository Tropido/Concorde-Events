import { getT } from "@/lib/i18n/server";
import { requireViewer } from "@/lib/auth";
import { AccountNav } from "@/components/account/account-nav";
import { BUSINESS_WHATSAPP_DISPLAY, waLink } from "@/lib/utils/whatsapp";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const [{ t }, viewer] = await Promise.all([getT(), requireViewer("/account")]);

  // Rejected and suspended accounts see an explanation, never their data or tools.
  if (viewer.status === "rejected" || viewer.status === "suspended") {
    const rejected = viewer.status === "rejected";
    return (
      <div className="shell flex justify-center pt-16">
        <div className="card max-w-lg space-y-4 p-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{rejected ? t.auth.rejectedTitle : t.auth.suspendedTitle}</h1>
          <p className="text-sm text-ink/60">{rejected ? t.auth.rejectedText : t.auth.suspendedText}</p>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className="btn-ink"><bdi dir="ltr">{BUSINESS_WHATSAPP_DISPLAY}</bdi></a>
        </div>
      </div>
    );
  }

  return (
    <div className="shell grid items-start gap-2.5 pt-3 lg:grid-cols-[260px_minmax(0,1fr)]">
      <AccountNav viewer={viewer} />
      <div className="min-w-0 space-y-2.5">
        {viewer.status === "pending" && (
          <p role="status" className="rounded-[1.5rem] bg-warn-soft p-5 text-sm text-warn">
            <strong className="font-semibold">{t.auth.pendingTitle}.</strong> {t.account.pendingBanner}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
