"use client";

import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { BUSINESS_WHATSAPP_DISPLAY, waLink } from "@/lib/utils/whatsapp";

export function Footer() {
  const { t } = useApp();
  const linkClass = "hover:text-white transition-colors";

  return (
    <footer className="bg-[#120e0b] text-almondCream border-t border-fadedCopper/25 pt-16 pb-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-toffeeBrown flex items-center justify-center text-white font-black text-lg border border-tan/30">C</span>
            <span className="font-black text-xl tracking-[0.2em] uppercase font-serif text-white">CONCORDE</span>
          </div>
          <p className="text-xs text-almondCream/70 leading-relaxed">{t.footer.aboutText}</p>
        </div>

        <nav aria-label={t.footer.quickLinks} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-tan">{t.footer.quickLinks}</h2>
          <ul className="space-y-2 text-sm text-almondCream/70">
            <li><Link href="/catalogue" className={linkClass}>{t.nav.catalogue}</Link></li>
            <li><Link href="/about" className={linkClass}>{t.nav.about}</Link></li>
            <li><Link href="/contact" className={linkClass}>{t.nav.contact}</Link></li>
          </ul>
        </nav>

        <nav aria-label={t.footer.proSpace} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-tan">{t.footer.proSpace}</h2>
          <ul className="space-y-2 text-sm text-almondCream/70">
            <li>
              <Link href="/login" className={`${linkClass} flex items-center gap-1`}>
                {t.footer.proLogin}<ArrowUpRight className="w-3.5 h-3.5 text-tan rtl:-scale-x-100" aria-hidden />
              </Link>
            </li>
            <li><Link href="/register?type=professional" className={linkClass}>{t.footer.proRegister}</Link></li>
            <li><Link href="/account/tools" className={linkClass}>{t.footer.proTools}</Link></li>
          </ul>
        </nav>

        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-tan">{t.footer.whatsapp}</h2>
          <p className="text-sm text-almondCream/70"><bdi dir="ltr">{BUSINESS_WHATSAPP_DISPLAY}</bdi></p>
          <a href={waLink(t.hero.whatsappGreeting)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 apple-press">
            <MessageCircle className="w-4 h-4" aria-hidden />{t.footer.whatsapp}
          </a>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto mt-12 pt-8 border-t border-fadedCopper/20 text-xs text-almondCream/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} Concorde Events. {t.footer.rights}</p>
        <p>{t.footer.tagline}</p>
      </div>
    </footer>
  );
}
