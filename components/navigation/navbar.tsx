"use client";

import { useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, Menu as MenuIcon, Moon, ShoppingBag, Sparkles, Sun, User, UserPlus, X } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { signOut } from "@/lib/actions/auth";
import { isStaff, type Country, type Currency } from "@/lib/types";
import type { Language } from "@/lib/i18n/translations";

const selectClass =
  "py-1.5 ps-2.5 pe-7 rounded-full bg-desertSand/40 dark:bg-darkSurface border border-tan/40 text-xs font-bold text-coffeeBean dark:text-almondCream focus:outline-none focus-visible:ring-2 focus-visible:ring-toffeeBrown";

function Preferences({ idPrefix }: { idPrefix: string }) {
  const { t, country, setCountry, currency, setCurrency, language, setLanguage } = useApp();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`${idPrefix}-country`} className="sr-only">{t.nav.stockCountry}</label>
      <select id={`${idPrefix}-country`} value={country} onChange={(e) => setCountry(e.target.value as Country)} className={selectClass} title={t.nav.stockCountry}>
        <option value="FR">🇫🇷 {t.common.france}</option>
        <option value="TN">🇹🇳 {t.common.tunisia}</option>
      </select>
      <label htmlFor={`${idPrefix}-currency`} className="sr-only">{t.nav.displayCurrency}</label>
      <select id={`${idPrefix}-currency`} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={selectClass} title={t.nav.displayCurrency}>
        <option value="EUR">EUR €</option>
        <option value="TND">TND DT</option>
      </select>
      <label htmlFor={`${idPrefix}-lang`} className="sr-only">{t.nav.language}</label>
      <select id={`${idPrefix}-lang`} value={language} onChange={(e) => setLanguage(e.target.value as Language)} className={selectClass} title={t.nav.language}>
        <option value="fr">Français</option>
        <option value="ar">العربية</option>
      </select>
    </div>
  );
}

export function Navbar() {
  const { t, viewer, draft, isDarkMode, toggleTheme, country } = useApp();
  const [open, setOpen] = useState(false);
  const draftCount = draft.reduce((n, l) => n + l.quantity, 0);
  const staff = isStaff(viewer);
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/catalogue", label: t.nav.catalogue },
    { href: "/about", label: t.nav.about },
    { href: "/contact", label: t.nav.contact },
  ];
  const accountHref = staff ? "/admin" : "/account";
  const accountLabel = staff ? t.nav.admin : t.nav.account;

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="w-full bg-gradient-to-r from-coffeeBean via-toffeeBrown to-coffeeBean text-almondCream text-[11px] sm:text-xs font-semibold py-2 px-4 text-center tracking-wider flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-tan shrink-0" aria-hidden />
        <span className="truncate">{t.announcement}</span>
        <span className="hidden md:inline text-tan/90">• {country === "TN" ? t.common.tunisia : t.common.france}</span>
      </div>

      <div className="w-full backdrop-blur-2xl bg-[#fcf8f4]/90 dark:bg-[#120e0b]/90 border-b border-tan/30 dark:border-fadedCopper/25 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 lg:h-20 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-coffeeBean to-toffeeBrown flex items-center justify-center text-almondCream font-black text-xl shadow-md border border-tan/40">C</span>
            <span className="flex flex-col leading-tight">
              <span className="font-black text-base tracking-[0.2em] uppercase font-serif">CONCORDE</span>
              <span className="hidden sm:block text-[9px] tracking-[0.3em] text-fadedCopper dark:text-tan uppercase font-semibold">EVENTS</span>
            </span>
          </Link>

          <nav aria-label={t.nav.menu} className="hidden lg:flex items-center gap-5 xl:gap-7 ms-4 text-sm font-semibold text-coffeeBean/80 dark:text-almondCream/80">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-toffeeBrown dark:hover:text-tan whitespace-nowrap">{l.label}</Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <div className="hidden lg:block"><Preferences idPrefix="nav" /></div>

            <button type="button" onClick={toggleTheme} aria-label={t.nav.theme}
              className="hidden sm:inline-flex p-2.5 rounded-2xl bg-desertSand/30 dark:bg-darkSurface border border-tan/25 apple-press">
              {isDarkMode ? <Sun className="w-4 h-4 text-tan" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link href="/catalogue#draft" aria-label={`${t.nav.requestDraft} (${draftCount})`}
              className="relative px-3 py-2.5 rounded-2xl bg-toffeeBrown text-white font-bold hover:bg-coffeeBean shadow-md flex items-center gap-2 apple-press">
              <ShoppingBag className="w-4 h-4" aria-hidden />
              <span className="hidden xl:inline text-xs font-extrabold uppercase tracking-wider">{t.nav.requestDraft}</span>
              {draftCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-coffeeBean text-[11px] font-black">{draftCount}</span>}
            </Link>

            <div className="hidden lg:flex items-center gap-2 border-s border-tan/30 ps-3">
              {viewer ? (
                <>
                  <Link href={accountHref} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tan/20 border border-tan/40 text-xs font-bold apple-press">
                    <User className="w-3.5 h-3.5 text-toffeeBrown" aria-hidden />
                    <span className="truncate max-w-[110px]">{viewer.fullName || accountLabel}</span>
                  </Link>
                  <form action={signOut}>
                    <button type="submit" aria-label={t.common.signOut} title={t.common.signOut}
                      className="p-2 rounded-full hover:bg-desertSand/40 dark:hover:bg-darkSurface">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-3 py-2 rounded-full bg-desertSand/30 dark:bg-darkSurface text-xs font-bold border border-tan/30 flex items-center gap-1.5 whitespace-nowrap apple-press">
                    <LogIn className="w-3.5 h-3.5 text-fadedCopper" aria-hidden />{t.nav.logIn}
                  </Link>
                  <Link href="/register" className="hidden xl:flex px-3 py-2 rounded-full bg-coffeeBean text-almondCream text-xs font-extrabold uppercase tracking-wider items-center gap-1.5 whitespace-nowrap apple-press">
                    <UserPlus className="w-3.5 h-3.5 text-tan" aria-hidden />{t.nav.signUp}
                  </Link>
                </>
              )}
            </div>

            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu" aria-label={t.nav.menu}
              className="lg:hidden p-2.5 rounded-2xl bg-desertSand/30 dark:bg-darkSurface border border-tan/30 apple-press">
              {open ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="lg:hidden bg-[#fcf8f4]/95 dark:bg-[#120e0b]/95 border-b border-tan/30 px-6 py-6 space-y-4 text-base font-semibold backdrop-blur-2xl">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block hover:text-toffeeBrown">{l.label}</Link>
          ))}
          <div className="pt-4 border-t border-tan/20 space-y-4">
            <Preferences idPrefix="mobile" />
            <button type="button" onClick={toggleTheme} className="sm:hidden flex items-center gap-2 text-sm">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}{t.nav.theme}
            </button>
            {viewer ? (
              <div className="flex items-center gap-4 text-sm">
                <Link href={accountHref} onClick={() => setOpen(false)} className="font-bold text-toffeeBrown">{accountLabel}</Link>
                <form action={signOut}><button type="submit" className="underline">{t.common.signOut}</button></form>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-sm">
                <Link href="/login" onClick={() => setOpen(false)} className="font-bold">{t.nav.logIn}</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="font-bold text-toffeeBrown">{t.nav.signUp}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
