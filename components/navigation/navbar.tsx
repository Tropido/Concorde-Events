"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Menu, ShoppingBag, UserRound } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { isStaff } from "@/lib/types";
import { cn, initials } from "@/lib/utils/formatters";
import { CloseButton, Drawer, Logo } from "@/components/ui/kit";
import type { Language } from "@/lib/i18n/translations";

export function LanguageSwitch({ className }: { className?: string }) {
  const { t, language, setLanguage } = useApp();
  return (
    <div role="group" aria-label={t.nav.language} className={cn("flex rounded-full bg-paper p-0.5 text-xs font-semibold", className)}>
      {(["fr", "ar"] as Language[]).map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={language === l} onClick={() => language !== l && setLanguage(l)}
          className={cn("h-7 min-w-8 rounded-full px-2 transition-colors", language === l ? "bg-card text-ink shadow-inset" : "text-ink/50 hover:text-ink")}>
          {l === "fr" ? "FR" : "ع"}
        </button>
      ))}
    </div>
  );
}

export function Navbar() {
  const { t, viewer, draft, setBagOpen, bagPulse } = useApp();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  // Distinct lines, not units: 120 chairs is one line in the selection.
  const count = draft.length;
  const staff = isStaff(viewer);
  const links = [
    { href: "/catalogue", label: t.nav.catalogue },
    { href: "/catalogue?cat=decoration", label: t.nav.decoration },
    { href: "/professionnels", label: t.nav.pros },
    { href: "/about", label: t.nav.about },
    { href: "/contact", label: t.nav.contact },
  ];
  const active = (href: string) => (href === "/catalogue" ? path === "/catalogue" : path === href.split("?")[0] && href.indexOf("?") < 0);

  return (
    <header className="sticky top-0 z-50 pt-2">
      <div className="shell">
        <div className="flex h-14 items-center gap-3 rounded-full bg-card/85 ps-3 pe-2 shadow-lift ring-1 ring-line backdrop-blur-xl">
          <Link href="/" aria-label="Concorde Events" className="shrink-0"><Logo /></Link>

          <nav aria-label={t.nav.menu} className="mx-auto hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}
                className="rounded-full px-3 py-1.5 text-[13px] text-ink/70 transition-colors hover:text-ink aria-[current=page]:bg-paper aria-[current=page]:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1.5 lg:ms-0">
            <LanguageSwitch className="hidden sm:flex" />
            {viewer ? (
              <Link href={staff ? "/admin" : "/account"} className="hidden items-center gap-2 rounded-full py-1 ps-1 pe-3 text-[13px] hover:bg-paper sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tone-sand text-[11px] font-semibold">{initials(viewer.fullName ?? viewer.email)}</span>
                {staff ? <><LayoutGrid className="h-3.5 w-3.5" aria-hidden />{t.nav.admin}</> : t.nav.account}
              </Link>
            ) : (
              <Link href="/login" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13px] hover:bg-paper sm:flex">
                <UserRound className="h-4 w-4" aria-hidden />{t.nav.logIn}
              </Link>
            )}
            <button type="button" onClick={() => setBagOpen(true)} aria-label={`${t.bag.title} (${count})`}
              className="flex h-10 items-center gap-2 rounded-full bg-ink ps-3.5 pe-1.5 text-[13px] font-medium text-card">
              <ShoppingBag className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t.bag.short}</span>
              <span key={bagPulse} className={cn("flex h-7 min-w-7 items-center justify-center rounded-full bg-card px-1.5 text-xs font-semibold text-ink tabular-nums", bagPulse > 0 && "animate-bump")}>{count}</span>
            </button>
            <button type="button" onClick={() => setMenu(true)} aria-label={t.nav.menu} aria-expanded={menu}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <Drawer open={menu} onClose={() => setMenu(false)} labelledBy="menu-title" side="start">
        <div className="flex items-center justify-between p-5">
          <span id="menu-title"><Logo /></span>
          <CloseButton onClick={() => setMenu(false)} label={t.common.close} />
        </div>
        <nav className="flex flex-col px-3">
          {[{ href: "/", label: t.nav.home }, ...links].map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenu(false)} className="rounded-2xl px-4 py-3 text-2xl font-semibold tracking-tight hover:bg-paper">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-4 p-5">
          <LanguageSwitch />
          {viewer ? (
            <Link href={staff ? "/admin" : "/account"} onClick={() => setMenu(false)} className="btn-light w-full">{staff ? t.nav.admin : t.nav.account}</Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/login" onClick={() => setMenu(false)} className="btn-light">{t.nav.logIn}</Link>
              <Link href="/register" onClick={() => setMenu(false)} className="btn-ink">{t.nav.signUp}</Link>
            </div>
          )}
        </div>
      </Drawer>
    </header>
  );
}
