"use client";

import React from "react";
import Link from "next/link";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import { useApp } from "@/lib/context/app-context";
import { isStaff } from "@/lib/types";
import {
  HomeIcon,
  Package,
  CalendarCheck,
  LayoutDashboard,
  MessageCircle,
  SunMoon,
} from "lucide-react";

export function FloatingDockNav() {
  const { toggleTheme, draft, t, viewer } = useApp();
  const totalDraftCount = draft.reduce((acc, i) => acc + i.quantity, 0);

  const dockData = [
    {
      title: t.nav.home,
      icon: <HomeIcon className="h-5 w-5 text-coffeeBean dark:text-almondCream" />,
      href: "/",
    },
    {
      title: t.nav.catalogue,
      icon: <Package className="h-5 w-5 text-coffeeBean dark:text-almondCream" />,
      href: "/catalogue",
    },
    {
      title: t.nav.requestDraft,
      icon: (
        <div className="relative">
          <CalendarCheck className="h-5 w-5 text-coffeeBean dark:text-almondCream" />
          {totalDraftCount > 0 && (
            <span className="absolute -top-2 -end-2 bg-toffeeBrown text-white font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
              {totalDraftCount}
            </span>
          )}
        </div>
      ),
      href: "/catalogue#draft",
    },
    {
      title: isStaff(viewer) ? t.nav.admin : t.nav.account,
      icon: <LayoutDashboard className="h-5 w-5 text-toffeeBrown dark:text-tan" />,
      href: isStaff(viewer) ? "/admin" : "/account",
    },
    {
      title: t.nav.contact,
      icon: <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      href: "/contact",
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <Dock className="items-end pb-2.5 bg-[#fcf8f4]/85 dark:bg-[#120e0b]/85 backdrop-blur-2xl border border-tan/30 rounded-full px-4 shadow-xl">
        {dockData.map((item, idx) => (
          <Link key={idx} href={item.href} aria-label={item.title}>
            <DockItem className="aspect-square w-11 h-11 rounded-full bg-desertSand/30 dark:bg-darkSurface border border-tan/30 shadow-md hover:border-toffeeBrown transition-colors apple-press">
              <DockLabel>{item.title}</DockLabel>
              <DockIcon>{item.icon}</DockIcon>
            </DockItem>
          </Link>
        ))}

        {/* Theme Action Button */}
        <DockItem
          onClick={toggleTheme}
          aria-label={t.nav.theme}
          className="aspect-square w-11 h-11 rounded-full bg-desertSand/30 dark:bg-darkSurface border border-tan/30 shadow-md hover:border-toffeeBrown transition-colors apple-press cursor-pointer"
        >
          <DockLabel>{t.nav.theme}</DockLabel>
          <DockIcon>
            <SunMoon className="h-5 w-5 text-toffeeBrown dark:text-tan" />
          </DockIcon>
        </DockItem>
      </Dock>
    </div>
  );
}
