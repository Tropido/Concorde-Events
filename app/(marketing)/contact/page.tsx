import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth";
import { ContactForm } from "./contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.contact.title };
}

export default async function ContactPage() {
  const [{ t }, viewer] = await Promise.all([getT(), getViewer()]);
  return (
    <div className="shell space-y-2.5 pt-6">
      <header className="card space-y-4 p-6 sm:p-10">
        <h1 className="display max-w-[14ch] text-[clamp(2.5rem,6vw,5rem)] text-balance">{t.contact.title}</h1>
        <p className="max-w-xl text-[15px] text-ink/65">{t.contact.subtitle}</p>
      </header>
      <ContactForm defaults={{ name: viewer?.fullName ?? "", email: viewer?.email ?? "", phone: viewer?.phone ?? "" }} />
    </div>
  );
}
