"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, ChevronDown, Globe, Lock, Mail, MapPin, Phone, Plus, Unlock, X } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { adjustPoints, saveClientNotes, saveProProgramme, setAccountStatus, setRole, type AdminResult } from "@/lib/actions/admin";
import { ActionButton, Avatar, ResultText, btnDanger, btnPrimary } from "@/components/admin/ui";
import { ease } from "@/components/ui/kit";
import { cn, formatDateTime, formatNumber, formatTND } from "@/lib/utils/formatters";
import type { AccountStatus, AppRole, ProTier } from "@/lib/types";

export type ClientRow = {
  id: string; email: string; full_name: string | null; company_name: string | null; phone: string | null; vat_number: string | null;
  activity: string | null; city: string | null; website: string | null; role: AppRole; status: AccountStatus; created_at: string;
  client_notes: { notes: string; flags: string[]; level: string | null } | null;
  pro_accounts: { tier_code: string; tier_locked: boolean; points: number; custom_discount_percent: number | null; extra_benefits: string[] } | null;
  stats: { requests: number; booked: number };
};

const ROLES: AppRole[] = ["customer", "professional", "editor", "manager", "admin"];
const FLAGS = ["vip", "big_account", "reliable_payer", "watch", "new_partner", "dispute_resolved"] as const;
const LEVELS = ["bronze", "argent", "or", "platine", "diamant", "royal_elite"] as const;
const statusTone: Record<AccountStatus, string> = { pending: "bg-warn-soft text-warn", approved: "bg-ok-soft text-ok", rejected: "bg-bad-soft text-bad", suspended: "bg-bad-soft text-bad" };

export function ClientCard({ client: c, tiers, isAdmin, selfId, defaultOpen }: { client: ClientRow; tiers: ProTier[]; isAdmin: boolean; selfId: string; defaultOpen: boolean }) {
  const { t, language } = useApp();
  const a = t.admin.clients;
  const [open, setOpen] = useState(defaultOpen);
  const isClient = c.role === "customer" || c.role === "professional";
  const tier = c.pro_accounts && tiers.find((x) => x.code === c.pro_accounts!.tier_code);
  const flags = c.client_notes?.flags ?? [];

  return (
    <article className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-start">
          <Avatar name={c.full_name ?? c.email} className="h-11 w-11 text-xs" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold tracking-tight">
              {c.full_name ?? c.email}
              {c.role === "professional" && tier && <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium"><span className="h-2 w-2 rounded-full" style={{ background: tier.color }} aria-hidden />{tier.name}</span>}
              {flags.slice(0, 3).map((f) => <span key={f} className="rounded-full bg-tone-sand px-2 py-0.5 text-[11px] font-normal">{a.flagLabels[f as keyof typeof a.flagLabels] ?? f}</span>)}
            </p>
            <p className="truncate text-xs text-ink/55">
              {[c.company_name, c.activity && (t.auth.activities[c.activity as keyof typeof t.auth.activities] ?? c.activity), c.city].filter(Boolean).join(" · ") || c.email}
            </p>
          </div>
          <ChevronDown className={cn("ms-auto h-4 w-4 shrink-0 text-ink/40 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-paper px-2.5 py-1 text-[11px]">{a.roleLabels[c.role]}</span>
          <span className={cn("rounded-full px-2.5 py-1 text-[11px]", statusTone[c.status])}>{a.statusLabels[c.status]}</span>
          {c.status !== "approved" && <ActionButton action={setAccountStatus.bind(null, c.id, "approved")} className={btnPrimary}>{c.status === "pending" ? a.approve : a.reactivate}</ActionButton>}
          {c.status === "pending" && <ActionButton action={setAccountStatus.bind(null, c.id, "rejected")} className={btnDanger} confirm>{a.reject}</ActionButton>}
          {c.status === "approved" && c.id !== selfId && <ActionButton action={setAccountStatus.bind(null, c.id, "suspended")} className={btnDanger} confirm>{a.suspend}</ActionButton>}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
            <div className="grid gap-2.5 border-t border-line bg-paper/50 p-4 sm:p-5 xl:grid-cols-3">
              <div className="space-y-4 rounded-2xl bg-card p-4">
                <p className="text-sm font-semibold">{a.identity}</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-ink/40" aria-hidden /><bdi dir="ltr">{c.email}</bdi></li>
                  {c.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-ink/40" aria-hidden /><a href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:underline"><bdi dir="ltr">{c.phone}</bdi></a></li>}
                  {c.company_name && <li className="flex items-center gap-2"><Building2 className="h-4 w-4 text-ink/40" aria-hidden />{c.company_name}{c.vat_number && <span className="font-mono text-xs text-ink/50">· {c.vat_number}</span>}</li>}
                  {c.city && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-ink/40" aria-hidden />{c.city}</li>}
                  {c.website && <li className="flex items-center gap-2"><Globe className="h-4 w-4 text-ink/40" aria-hidden /><bdi dir="ltr" className="truncate">{c.website}</bdi></li>}
                </ul>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-paper p-3"><dt className="text-[11px] text-ink/50">{a.requestsCount}</dt><dd className="text-lg font-semibold tabular-nums">{c.stats.requests}</dd></div>
                  <div className="rounded-xl bg-paper p-3"><dt className="text-[11px] text-ink/50">{a.bookedValue}</dt><dd className="text-lg font-semibold tabular-nums">{formatTND(c.stats.booked, language)}</dd></div>
                </dl>
                <p className="text-xs text-ink/45">{a.joined} {formatDateTime(c.created_at, language)}</p>
                {isAdmin && c.id !== selfId && <RoleSelect profileId={c.id} role={c.role} />}
              </div>

              {c.role === "professional" && c.pro_accounts
                ? <Programme profileId={c.id} account={c.pro_accounts} tiers={tiers} />
                : isClient ? <LevelOnly /> : <div className="hidden xl:block" />}

              {isClient && <Notes profileId={c.id} initial={c.client_notes} showLevel={c.role === "customer"} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function RoleSelect({ profileId, role }: { profileId: string; role: AppRole }) {
  const { t } = useApp();
  const a = t.admin.clients;
  const [value, setValue] = useState(role);
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <label className="sr-only" htmlFor={`role-${profileId}`}>{a.changeRole}</label>
      <select id={`role-${profileId}`} value={value} onChange={(e) => setValue(e.target.value as AppRole)} className="field w-auto py-2">
        {ROLES.map((r) => <option key={r} value={r}>{a.roleLabels[r]}</option>)}
      </select>
      <button type="button" disabled={pending || value === role} className="btn-light btn-sm"
        onClick={() => { if (confirm(t.admin.requests.confirmPrompt)) start(async () => setState(await setRole(profileId, value))); }}>{a.changeRole}</button>
      <ResultText state={state} />
    </div>
  );
}

function Programme({ profileId, account, tiers }: { profileId: string; account: NonNullable<ClientRow["pro_accounts"]>; tiers: ProTier[] }) {
  const { t, language } = useApp();
  const a = t.admin.clients;
  const [tier, setTier] = useState(account.tier_code);
  const [locked, setLocked] = useState(account.tier_locked);
  const [custom, setCustom] = useState<string>(account.custom_discount_percent === null ? "" : String(account.custom_discount_percent));
  const [benefits, setBenefits] = useState(account.extra_benefits);
  const [benefit, setBenefit] = useState("");
  const [pts, setPts] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<AdminResult | null>(null);
  const [ptsState, setPtsState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const current = tiers.find((x) => x.code === tier);
  const next = current && tiers.find((x) => x.rank > current.rank);

  return (
    <div className="space-y-4 rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{a.programme}</p>
        <p className="text-sm"><span className="font-semibold tabular-nums">{formatNumber(account.points, language)}</span> <span className="text-ink/50">{t.pro.points}</span></p>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {tiers.map((x) => (
          <button key={x.code} type="button" aria-pressed={tier === x.code} onClick={() => { setTier(x.code); setLocked(true); }}
            className={cn("rounded-xl px-2 py-2 text-xs ring-1 transition", tier === x.code ? "bg-ink text-card ring-ink" : "bg-paper ring-transparent hover:ring-line")}>
            <span className="block font-medium">{x.name}</span><span className="block opacity-60"><bdi dir="ltr">{x.discount ? `−${x.discount}%` : "0%"}</bdi></span>
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-ink/70">
        <button type="button" onClick={() => setLocked(!locked)} className="flex h-7 w-7 items-center justify-center rounded-full bg-paper" aria-pressed={locked} aria-label={a.lockTier}>
          {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
        </button>
        {locked ? a.tierLocked : a.tierAuto}{!locked && next && ` · ${a.nextAt(next.name, formatNumber(next.minPoints, language))}`}
      </label>
      <label className="block"><span className="field-label">{a.customDiscount}</span>
        <div className="relative"><input type="number" min={0} max={50} step={0.5} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={current ? String(current.discount) : ""} className="field pe-10" /><span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs text-ink/45">%</span></div>
      </label>
      <div>
        <span className="field-label">{a.extraBenefits}</span>
        <div className="flex flex-wrap gap-1.5">
          {benefits.map((b) => (
            <span key={b} className="inline-flex items-center gap-1 rounded-full bg-paper py-1 ps-3 pe-1 text-xs">{b}
              <button type="button" onClick={() => setBenefits(benefits.filter((x) => x !== b))} aria-label={`${t.common.delete}: ${b}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-card"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input value={benefit} onChange={(e) => setBenefit(e.target.value)} placeholder={a.benefitPlaceholder} maxLength={120} className="field py-2" />
          <button type="button" className="btn-light btn-sm" aria-label={a.addBenefit} onClick={() => { const b = benefit.trim(); if (b && !benefits.includes(b)) setBenefits([...benefits, b]); setBenefit(""); }}><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={pending} className="btn-ink btn-sm"
          onClick={() => start(async () => setState(await saveProProgramme(profileId, { tier, locked, customDiscount: custom === "" ? null : Number(custom), benefits })))}>{a.saveProgramme}</button>
        <ResultText state={state} />
      </div>
      <div className="space-y-2 border-t border-line pt-3">
        <span className="field-label">{a.adjustPoints}</span>
        <div className="flex gap-1.5">
          <input type="number" step={1} value={pts} onChange={(e) => setPts(e.target.value)} placeholder="+100" className="field w-24 py-2" aria-label={t.pro.points} />
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={a.reasonPlaceholder} className="field py-2" aria-label={a.reason} />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={pending || !pts || !reason.trim()} className="btn-light btn-sm"
            onClick={() => start(async () => { const r = await adjustPoints(profileId, Math.trunc(Number(pts)), reason); setPtsState(r); if (r.ok) { setPts(""); setReason(""); } })}>{a.applyPoints}</button>
          <ResultText state={ptsState} />
        </div>
      </div>
    </div>
  );
}

function LevelOnly() {
  const { t } = useApp();
  return (
    <div className="rounded-2xl bg-card p-4 text-sm">
      <p className="font-semibold">{t.admin.clients.particulierTitle}</p>
      <p className="mt-1 text-ink/55">{t.admin.clients.particulierText}</p>
    </div>
  );
}

function Notes({ profileId, initial, showLevel }: { profileId: string; initial: ClientRow["client_notes"]; showLevel: boolean }) {
  const { t } = useApp();
  const a = t.admin.clients;
  const [flags, setFlags] = useState<string[]>(initial?.flags ?? []);
  const [level, setLevel] = useState(initial?.level ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [state, setState] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4 rounded-2xl bg-card p-4">
      <p className="text-sm font-semibold">{a.notesTitle}</p>
      <fieldset>
        <legend className="field-label">{a.flags}</legend>
        <div className="flex flex-wrap gap-1.5">
          {FLAGS.map((f) => {
            const on = flags.includes(f);
            return (
              <button key={f} type="button" aria-pressed={on} onClick={() => setFlags(on ? flags.filter((x) => x !== f) : [...flags, f])}
                className={cn("rounded-full px-3 py-1.5 text-xs ring-1 transition", on ? "bg-ink text-card ring-ink" : "bg-paper ring-transparent hover:ring-line")}>{a.flagLabels[f]}</button>
            );
          })}
        </div>
      </fieldset>
      {showLevel && (
        <label className="block"><span className="field-label">{a.level}</span>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="field">
            <option value="">—</option>
            {LEVELS.map((l) => <option key={l} value={l}>{a.levelLabels[l]}</option>)}
          </select>
        </label>
      )}
      <label className="block"><span className="field-label">{a.notes}</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={5000} placeholder={a.notesPlaceholder} className="field resize-y" />
      </label>
      <p className="text-[11px] text-ink/45">{a.notesPrivate}</p>
      <div className="flex items-center gap-2">
        <button type="button" disabled={pending} className="btn-ink btn-sm" onClick={() => start(async () => setState(await saveClientNotes(profileId, { notes, flags, level: level || null })))}>{a.saveNotes}</button>
        <ResultText state={state} />
      </div>
    </div>
  );
}
