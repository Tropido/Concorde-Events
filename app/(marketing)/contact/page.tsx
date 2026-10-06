import { getT } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth";
import { ContactForm } from "./contact-form";

export default async function ContactPage() {
  const [{ t, prefs }, viewer] = await Promise.all([getT(), getViewer()]);
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      <header className="text-center space-y-3 max-w-2xl mx-auto">
        <p className="text-xs font-bold tracking-widest uppercase text-toffeeBrown dark:text-tan">{t.contact.badge}</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold font-serif">{t.contact.title}</h1>
        <p className="text-sm text-coffeeBean/75 dark:text-almondCream/75">{t.contact.subtitle}</p>
      </header>
      <ContactForm
        country={prefs.country}
        defaults={{ name: viewer?.fullName ?? "", email: viewer?.email ?? "", phone: viewer?.phone ?? "" }}
      />
    </div>
  );
}
