import { getT } from "@/lib/i18n/server";
import { AuthCard, RegisterForm } from "@/components/auth/auth-forms";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ t }, sp] = await Promise.all([getT(), searchParams]);
  return (
    <AuthCard title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      <RegisterForm initialType={sp.type === "professional" ? "professional" : "customer"} />
    </AuthCard>
  );
}
