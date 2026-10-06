"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, ExternalLink, FileText, Inbox, LayoutDashboard, LogOut, PenSquare, Settings, Truck, Users } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/formatters";
import type { AdminResult } from "@/lib/actions/admin";
import type { AppRole } from "@/lib/types";

export const field = "w-full p-2.5 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-toffeeBrown";
export const btn = "px-4 py-2 rounded-full text-xs font-bold disabled:opacity-50 apple-press";
export const btnPrimary = cn(btn, "bg-toffeeBrown hover:bg-coffeeBean text-white");
export const btnGhost = cn(btn, "border border-tan/50 hover:bg-tan/20");
export const btnDanger = cn(btn, "border border-rose-500/50 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10");

export function AdminSidebar({ role, name }: { role: AppRole; name: string }) {
  const { t } = useApp();
  const path = usePathname();
  const ops = role === "manager" || role === "admin";
  const items = [
    ...(ops ? [
      { href: "/admin", label: t.admin.nav.overview, icon: LayoutDashboard },
      { href: "/admin/requests", label: t.admin.nav.requests, icon: FileText },
      { href: "/admin/inbox", label: t.admin.nav.inbox, icon: Inbox },
      { href: "/admin/inventory", label: t.admin.nav.inventory, icon: Boxes },
      { href: "/admin/rentals", label: t.admin.nav.rentals, icon: Truck },
      { href: "/admin/clients", label: t.admin.nav.clients, icon: Users },
      { href: "/admin/analytics", label: t.admin.nav.analytics, icon: BarChart3 },
    ] : []),
    { href: "/admin/cms", label: t.admin.nav.cms, icon: PenSquare },
    ...(ops ? [{ href: "/admin/settings", label: t.admin.nav.settings, icon: Settings }] : []),
  ];
  return (
    <aside className="lg:w-64 shrink-0 bg-coffeeBean text-almondCream lg:min-h-screen lg:sticky lg:top-0 p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <span className="w-9 h-9 rounded-xl bg-toffeeBrown flex items-center justify-center font-black">C</span>
        <div className="min-w-0">
          <p className="font-serif font-bold tracking-widest text-sm">{t.admin.title}</p>
          <p className="text-[11px] text-tan truncate">{name}</p>
        </div>
      </div>
      <nav aria-label={t.admin.title} className="flex lg:flex-col gap-1 overflow-x-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm whitespace-nowrap", active ? "bg-toffeeBrown text-white font-bold" : "hover:bg-white/10")}>
              <Icon className="w-4 h-4 shrink-0" aria-hidden />{label}
            </Link>
          );
        })}
      </nav>
      <div className="lg:mt-auto flex lg:flex-col gap-2 text-sm">
        <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10"><ExternalLink className="w-4 h-4" aria-hidden />{t.admin.nav.backToSite}</Link>
        <form action={signOut}>
          <button type="submit" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 w-full"><LogOut className="w-4 h-4" aria-hidden />{t.common.signOut}</button>
        </form>
      </div>
    </aside>
  );
}

/** Calls a (bound) server action, optionally after confirmation, and shows its error. */
export function ActionButton({ action, children, className = btnGhost, confirm: ask }: {
  action: () => Promise<AdminResult>; children: React.ReactNode; className?: string; confirm?: boolean;
}) {
  const { t } = useApp();
  const [pending, start] = useTransition();
  const [error, setError] = useState<AdminResult | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={pending} className={className}
        onClick={() => {
          if (ask && !window.confirm(t.admin.requests.confirmPrompt)) return;
          start(async () => setError(await action()));
        }}>
        {children}
      </button>
      {error && !error.ok && <span role="alert" className="text-[11px] text-rose-700 dark:text-rose-300 max-w-xs">{t.admin.errors[error.error]}</span>}
    </span>
  );
}

export function ResultText({ state }: { state: AdminResult | null }) {
  const { t } = useApp();
  if (!state) return null;
  return state.ok
    ? <span role="status" className="text-xs text-emerald-800 dark:text-emerald-300">{t.admin.saved}</span>
    : <span role="alert" className="text-xs text-rose-700 dark:text-rose-300">{t.admin.errors[state.error]}</span>;
}
