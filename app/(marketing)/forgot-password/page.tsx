import { getT } from "@/lib/i18n/server";
import { AuthCard, ForgotForm } from "@/components/auth/auth-forms";

export default async function ForgotPasswordPage() {
  const { t } = await getT();
  return (
    <AuthCard title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle}>
      <ForgotForm />
    </AuthCard>
  );
}
