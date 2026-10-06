import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth";
import { AuthCard, ResetForm } from "@/components/auth/auth-forms";

// Reached through /auth/confirm, which turns the recovery link into a session.
export default async function ResetPasswordPage() {
  const [{ t }, viewer] = await Promise.all([getT(), getViewer()]);
  return (
    <AuthCard title={t.auth.resetTitle}>
      {viewer ? <ResetForm /> : (
        <p className="text-sm text-center">
          {t.auth.linkInvalid} <Link href="/forgot-password" className="underline">{t.auth.forgotTitle}</Link>
        </p>
      )}
    </AuthCard>
  );
}
