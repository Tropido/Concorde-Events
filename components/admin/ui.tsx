"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Boxes, ExternalLink, FileText, LayoutDashboard, LogOut, Menu, MessagesSquare, PenSquare, Settings, Truck, Users } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { signOut } from "@/lib/actions/auth";
import { cn, initials } from "@/lib/utils/formatters";
import { LanguageSwitch } from "@/components/navigation/navbar";
import { CloseButton, Drawer, Logo } from "@/components/ui/kit";
import type { AdminResult } from "@/lib/actions/admin";
import type { AppRole } from "@/lib/types";

export const field = "field";
export const btn = "btn btn-sm";
export const btnPrimary = "btn-ink btn-sm";
export const btnGhost = "btn-light btn-sm";
export const btnDanger = "btn btn-sm bg-card text-bad ring-1 ring-bad/30 hover:bg-bad-soft";

export type AdminCounts = { requests: number; inbox: number; clients: number; late: number };

function Nav({ role, counts, onNavigate }: { role: AppRole; counts: AdminCounts; onNavigate?: () => void }) {
  const { t } = useApp();
  const path = usePathname();
  const ops = role === "manager" || role === "admin";
  const n = t.admin.nav;
  const groups = [
    ...(ops ? [{
      label: n.groupOps,
      items: [
        { href: "/admin", label: n.overview, icon: LayoutDashboard },
        { href: "/admin/requests", label: n.requests, icon: FileText, count: counts.requests },
        { href: "/admin/inbox", label: n.inbox, icon: MessagesSquare, count: counts.inbox },
        { href: "/admin/rentals", label: n.rentals, icon: Truck, count: counts.late, alert: counts.late > 0 },
      ],
    }, {
      label: n.groupCatalogue,
      items: [
        { href: "/admin/inventory", label: n.inventory, icon: Boxes },
        { href: "/admin/clients", label: n.clients, icon: Users, count: counts.clients },
        { href: "/admin/analytics", label: n.analytics, icon: BarChart3 },
      ],
    }] : []),
    {
      label: n.groupSite,
      items: [
        { href: "/admin/cms", label: n.cms, icon: PenSquare },
        ...(ops ? [{ href: "/admin/settings", label: n.settings, icon: Settings }] : []),
      ],
    },
  ];
  return (
    <nav aria-label={t.admin.title} className="space-y-5">
      {groups.map((g) => (
        <div key={g.label} className="space-y-1">
          <p className="px-3 font-mono text-[10px] uppercase tracking-label text-ink/40">{g.label}</p>
          {g.items.map(({ href, label, icon: Icon, ...rest }) => {
            const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
            const count = "count" in rest ? rest.count : undefined;
            const alert = "alert" in rest ? rest.alert : false;
            return (
              <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                className={cn("relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors", active ? "text-card" : "text-ink/70 hover:bg-paper hover:text-ink")}>
                {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                <Icon className="relative h-4 w-4 shrink-0" aria-hidden />
                <span className="relative flex-1">{label}</span>
                {!!count && (
                  <span className={cn("relative min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums",
                    alert ? "bg-bad text-card" : active ? "bg-card/15 text-card" : "bg-paper text-ink/70")}>{count}</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Footer({ name, role }: { name: string; role: AppRole }) {
  const { t } = useApp();
  return (
    <div className="space-y-3">
      <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink/60 hover:bg-paper"><ExternalLink className="h-4 w-4" aria-hidden />{t.admin.nav.backToSite}</Link>
      <LanguageSwitch className="mx-3 w-fit" />
      <div className="flex items-center gap-3 rounded-2xl bg-paper p-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tone-sand text-xs font-semibold">{initials(name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" dir="auto">{name}</p>
          <p className="text-[11px] text-ink/50">{t.admin.clients.roleLabels[role]}</p>
        </div>
        <form action={signOut}>
          <button type="submit" aria-label={t.common.signOut} title={t.common.signOut} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-card"><LogOut className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
}

export function AdminShell({ role, name, counts, children }: { role: AppRole; name: string; counts: AdminCounts; children: React.ReactNode }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen gap-2.5 p-2.5">
      <aside className="card sticky top-2.5 hidden h-[calc(100vh-1.25rem)] w-64 shrink-0 flex-col justify-between overflow-y-auto p-4 lg:flex">
        <div className="space-y-7">
          <div className="flex items-center justify-between px-1">
            <Logo />
            <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[10px] uppercase tracking-label text-ink/55">{t.admin.badge}</span>
          </div>
          <Nav role={role} counts={counts} />
        </div>
        <Footer name={name} role={role} />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="card mb-2.5 flex items-center justify-between p-2.5 lg:hidden">
          <Logo />
          <button type="button" onClick={() => setOpen(true)} aria-label={t.nav.menu} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper"><Menu className="h-5 w-5" /></button>
        </div>
        <main id="main" className="space-y-2.5">{children}</main>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} labelledBy="admin-menu" side="start">
        <div className="flex items-center justify-between p-5"><span id="admin-menu"><Logo /></span><CloseButton onClick={() => setOpen(false)} label={t.common.close} /></div>
        <div className="flex flex-1 flex-col justify-between gap-6 overflow-y-auto px-4 pb-5">
          <Nav role={role} counts={counts} onNavigate={() => setOpen(false)} />
          <Footer name={name} role={role} />
        </div>
      </Drawer>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="card flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
      <div className="min-w-0 space-y-1">
        <h1 className="display text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="text-sm text-ink/55">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
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
      {error && !error.ok && <span role="alert" className="max-w-xs text-[11px] text-bad">{t.admin.errors[error.error]}</span>}
    </span>
  );
}

export function ResultText({ state }: { state: AdminResult | null }) {
  const { t } = useApp();
  if (!state) return null;
  return state.ok
    ? <span role="status" className="text-xs text-ok">{t.admin.saved}</span>
    : <span role="alert" className="text-xs text-bad">{t.admin.errors[state.error]}</span>;
}

/** Filter pills that are plain links (server-rendered lists). */
export function FilterLinks({ items, label }: { items: { href: string; label: string; count?: number; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-card p-1 ring-1 ring-line">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.active ? "page" : undefined}
          className={cn("whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium", i.active ? "bg-ink text-card" : "text-ink/65 hover:text-ink")}>
          {i.label}{i.count !== undefined && <span className="ms-1.5 tabular-nums opacity-60">{i.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function Avatar({ name, className }: { name: string | null; className?: string }) {
  return <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tone-sand text-[11px] font-semibold", className)}>{initials(name)}</span>;
}
