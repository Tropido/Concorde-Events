import { getT } from "@/lib/i18n/server";
import { AuthCard, LoginForm } from "@/components/auth/auth-forms";

// Same Supabase identity as the public site; access is decided by the profile role.
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ t }, sp] = await Promise.all([getT(), searchParams]);
  return (
    <AuthCard title={t.auth.adminLoginTitle} subtitle={t.auth.adminLoginSubtitle}>
      <LoginForm scope="admin" next={sp.next ?? "/admin"} />
    </AuthCard>
  );
}
