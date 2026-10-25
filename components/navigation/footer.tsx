"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { BUSINESS_WHATSAPP_DISPLAY, waLink } from "@/lib/utils/whatsapp";
import { Logo } from "@/components/ui/kit";

export function Footer() {
  const { t } = useApp();
  const col = "space-y-3";
  const head = "font-mono text-[10.5px] uppercase tracking-label text-almondCream/45";
  const link = "block text-sm text-almondCream/80 hover:text-card";
  return (
    <footer className="shell mt-24 pb-3">
      <div className="rounded-[1.75rem] bg-ink px-6 py-12 text-almondCream sm:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <span className="text-card [&_.text-ink\/50]:text-almondCream/50"><Logo /></span>
            <p className="max-w-sm text-2xl font-semibold leading-tight tracking-tight text-card text-balance">{t.footer.statement}</p>
            <p className="max-w-sm text-sm text-almondCream/65">{t.footer.aboutText}</p>
          </div>
          <nav aria-label={t.footer.shop} className={col}>
            <h2 className={head}>{t.footer.shop}</h2>
            <Link href="/catalogue" className={link}>{t.nav.catalogue}</Link>
            <Link href="/professionnels" className={link}>{t.nav.pros}</Link>
            <Link href="/about" className={link}>{t.nav.about}</Link>
            <Link href="/contact" className={link}>{t.nav.contact}</Link>
          </nav>
          <nav aria-label={t.footer.account} className={col}>
            <h2 className={head}>{t.footer.account}</h2>
            <Link href="/login" className={link}>{t.nav.logIn}</Link>
            <Link href="/register" className={link}>{t.nav.signUp}</Link>
            <Link href="/register?type=professional" className={link}>{t.footer.proRegister}</Link>
            <Link href="/account" className={link}>{t.footer.myRequests}</Link>
          </nav>
          <div className={col}>
            <h2 className={head}>{t.footer.whatsapp}</h2>
            <p className="text-sm text-almondCream/80"><bdi dir="ltr">{BUSINESS_WHATSAPP_DISPLAY}</bdi></p>
            <a href={waLink(t.hero.whatsappGreeting)} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-card text-ink hover:bg-almondCream">
              <MessageCircle className="h-4 w-4" aria-hidden />{t.footer.whatsappCta}
            </a>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-almondCream/10 pt-6 text-xs text-almondCream/45 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Concorde Events · {t.footer.rights}</p>
          <p>{t.footer.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
