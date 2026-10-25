"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, FileText, Heart, LogOut, MessageSquare, UserRound } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { signOut } from "@/lib/actions/auth";
import { cn, initials } from "@/lib/utils/formatters";
import type { Viewer } from "@/lib/types";

export function AccountNav({ viewer }: { viewer: Viewer }) {
  const { t } = useApp();
  const path = usePathname();
  const isPro = viewer.role === "professional";
  const tabs = [
    { href: "/account", label: t.account.requests, icon: FileText },
    ...(isPro ? [{ href: "/account/pro", label: t.account.proSpace, icon: Crown }] : []),
    { href: "/account/favourites", label: t.account.favourites, icon: Heart },
    { href: "/account/messages", label: t.account.messages, icon: MessageSquare },
    { href: "/account/profile", label: t.account.profile, icon: UserRound },
  ];
  const pro = viewer.pro;
  return (
    <aside className="card flex flex-col gap-5 p-4 lg:sticky lg:top-20 lg:min-h-[calc(100vh-7rem)] lg:p-5">
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tone-sand text-sm font-semibold">{initials(viewer.fullName ?? viewer.email)}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{viewer.fullName ?? viewer.email}</p>
          {isPro && pro && viewer.status === "approved" ? (
            <p className="flex items-center gap-1.5 text-xs text-ink/60"><span className="h-2 w-2 rounded-full" style={{ background: pro.tier.color }} aria-hidden />{t.pro.memberOf(pro.tier.name)}</p>
          ) : (
            <p className="text-xs text-ink/55">{isPro ? t.auth.pendingTitle : t.account.particulier}</p>
          )}
        </div>
      </div>
      <nav aria-label={t.account.title} className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto lg:flex-col">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/account" ? path === "/account" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={cn("relative flex items-center gap-2.5 whitespace-nowrap rounded-full px-3.5 py-2.5 text-sm transition-colors", active ? "text-card" : "text-ink/70 hover:bg-paper")}>
              {active && <motion.span layoutId="account-nav" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
              <Icon className="relative h-4 w-4" aria-hidden /><span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>
      <form action={signOut} className="mt-auto hidden lg:block">
        <button type="submit" className="flex w-full items-center gap-2.5 rounded-full px-3.5 py-2.5 text-sm text-ink/60 hover:bg-paper"><LogOut className="h-4 w-4" aria-hidden />{t.common.signOut}</button>
      </form>
    </aside>
  );
}
