import { getT } from "@/lib/i18n/server";
import { requireViewer } from "@/lib/auth";
import { AccountNav } from "@/components/account/account-nav";
import { BUSINESS_WHATSAPP_DISPLAY } from "@/lib/utils/whatsapp";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const [{ t }, viewer] = await Promise.all([getT(), requireViewer("/account")]);

  // Rejected and suspended accounts see an explanation, never their data or tools.
  if (viewer.status === "rejected" || viewer.status === "suspended") {
    const rejected = viewer.status === "rejected";
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-3">
        <h1 className="text-2xl font-serif font-bold">{rejected ? t.auth.rejectedTitle : t.auth.suspendedTitle}</h1>
        <p className="text-sm">{rejected ? t.auth.rejectedText : t.auth.suspendedText}</p>
        <p className="text-sm font-bold"><bdi dir="ltr">{BUSINESS_WHATSAPP_DISPLAY}</bdi></p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-toffeeBrown dark:text-tan">{t.account.title}</p>
        <h1 className="text-3xl font-extrabold font-serif">{t.account.welcome(viewer.fullName ?? viewer.email)}</h1>
      </header>
      {viewer.status === "pending" && (
        <p role="status" className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-sm text-amber-900 dark:text-amber-200">
          <strong>{t.auth.pendingTitle}.</strong> {t.account.pendingBanner}
        </p>
      )}
      <AccountNav showTools={viewer.role === "professional"} />
      {children}
    </div>
  );
}
