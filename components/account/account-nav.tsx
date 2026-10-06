"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/context/app-context";

export function AccountNav({ showTools }: { showTools: boolean }) {
  const { t } = useApp();
  const path = usePathname();
  const tabs = [
    { href: "/account", label: t.account.requests },
    { href: "/account/favourites", label: t.account.favourites },
    { href: "/account/messages", label: t.account.messages },
    ...(showTools ? [{ href: "/account/tools", label: t.account.tools }] : []),
    { href: "/account/profile", label: t.account.profile },
  ];
  return (
    <nav aria-label={t.account.title} className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const active = path === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border ${active ? "bg-toffeeBrown text-white border-toffeeBrown" : "border-tan/40 hover:bg-tan/20"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
