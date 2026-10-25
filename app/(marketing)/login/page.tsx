import { getT } from "@/lib/i18n/server";
import { AuthCard, LoginForm } from "@/components/auth/auth-forms";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const [{ t }, sp] = await Promise.all([getT(), searchParams]);
  return (
    <AuthCard title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      <LoginForm scope="customer" next={sp.next} linkError={sp.error === "link"} />
    </AuthCard>
  );
}
