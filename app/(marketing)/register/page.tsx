import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { AuthCard, RegisterAside, RegisterForm } from "@/components/auth/auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.auth.registerTitle };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ t }, sp] = await Promise.all([getT(), searchParams]);
  return (
    <AuthCard title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle} aside={<RegisterAside />}>
      <RegisterForm initialType={sp.type === "professional" ? "professional" : "customer"} />
    </AuthCard>
  );
}
