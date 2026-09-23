"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/lib/context/app-context";
import { MessageCircle, ShieldCheck, Award, ArrowUpRight, Sparkles } from "lucide-react";

export function Footer() {
  const { t } = useApp();

  return (
    <footer className="bg-[#120e0b] text-almondCream border-t border-fadedCopper/25 pt-20 pb-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-tan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
        {/* Col 1: Brand Info */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-toffeeBrown flex items-center justify-center text-white font-black text-lg shadow-md border border-tan/30">
              C
            </div>
            <span className="font-black text-xl tracking-[0.2em] uppercase font-serif text-white">
              CONCORDE
            </span>
          </div>
          <p className="text-xs text-almondCream/70 leading-relaxed">
            {t.footer.aboutText}
          </p>
          <div className="pt-2 flex items-center gap-2 text-tan text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-fadedCopper" />
            <span>{t.footer.rights}</span>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-tan">
            {t.footer.quickLinks}
          </h4>
          <ul className="space-y-2 text-sm text-almondCream/70">
            <li>
              <Link href="/catalogue?cat=seating-lounges" className="hover:text-white transition-colors">
                Assises & Salons Bouclé
              </Link>
            </li>
            <li>
              <Link href="/catalogue?cat=tables-dining" className="hover:text-white transition-colors">
                Tables en Teck & Scagliola
              </Link>
            </li>
            <li>
              <Link href="/catalogue?cat=lighting" className="hover:text-white transition-colors">
                Luminaires Architecturaux
              </Link>
            </li>
            <li>
              <Link href="/catalogue?cat=bars-consoles" className="hover:text-white transition-colors">
                Comptoirs Bars & Consoles
              </Link>
            </li>
            <li>
              <Link href="/catalogue?cat=outdoor-luxury" className="hover:text-white transition-colors">
                Mobilier Extérieur de Prestige
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Professional Portal */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-tan">
            Espace Professionnel
          </h4>
          <ul className="space-y-2 text-sm text-almondCream/70">
            <li>
              <Link href="/login" className="hover:text-white transition-colors flex items-center gap-1">
                <span>Accès Partenaire B2B</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-tan" />
              </Link>
            </li>
            <li>
              <Link href="/register" className="hover:text-white transition-colors">
                Demande de Compte Grossiste
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Simulateur & Devis Pro
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-tan" />
                <span>Programme Récompenses & Niveaux</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: WhatsApp Concierge */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-tan">
            Conciergerie & Contact
          </h4>
          <p className="text-xs text-almondCream/70">
            {t.footer.address}
            <br />
            {t.footer.phone}
          </p>
          <a
            href="https://wa.me/33612345678?text=Bonjour,%20je%20souhaite%20un%20devis%20personnalise"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-600/90 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-500 transition-colors shadow-lg apple-press"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Concierge</span>
          </a>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto mt-12 pt-8 border-t border-fadedCopper/20 text-center text-xs text-almondCream/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © {new Date().getFullYear()} CONCORDE EVENTS ARCHITECTURE. {t.footer.rights}
        </div>
        <div className="flex gap-6 text-[11px]">
          <Link href="/about" className="hover:underline">{t.nav.about}</Link>
          <Link href="/contact" className="hover:underline">{t.nav.contact}</Link>
          <Link href="/catalogue" className="hover:underline">{t.nav.catalogue}</Link>
        </div>
      </div>
    </footer>
  );
}
