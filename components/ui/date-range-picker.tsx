"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { addDays, dayNumber, fromDayNumber, todayIn, validateRange } from "@/lib/dates";
import { addMonths, dayBlock, keyStep, monthGrid, monthOf, selectDay, shiftMonth, visibleRange, type DayBlock, type Range } from "@/lib/date-range";
import { useAvailability } from "@/components/catalogue/use-availability";
import { fmt, Legend, MonthGrid } from "@/components/ui/availability-calendar";
import { CloseButton, ease } from "@/components/ui/kit";
import { cn, localeOf } from "@/lib/utils/formatters";
import type { Language, Translations } from "@/lib/i18n/translations";

const EMPTY: Range = { start: "", end: "" };

/** "14 → 16 nov. · 2 nuits" (the arrow follows the reading direction). */
export function rangeSummary(r: Range, lang: Language, t: Translations) {
  const s = dayNumber(r.start);
  if (s === null) return null;
  const locale = localeOf(lang);
  const e = dayNumber(r.end);
  const arrow = lang === "ar" ? "←" : "→";
  const sameMonth = e !== null && r.start.slice(0, 7) === r.end.slice(0, 7);
  const a = fmt(locale, s, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" });
  if (e === null) return `${a} ${arrow} …`;
  return `${a} ${arrow} ${fmt(locale, e, { day: "numeric", month: "short" })} · ${t.common.nights(e - s)}`;
}

function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return match;
}

function Calendar({ range, onPick, months, minimumNights = 1, productId, stock, single = false, restrictPast = true }: {
  range: Range; onPick: (iso: string) => void; months: number; minimumNights?: number; productId?: string; stock?: number; single?: boolean; restrictPast?: boolean;
}) {
  const { t, language } = useApp();
  const rtl = language === "ar";
  const locale = localeOf(language);
  const todayIso = todayIn("TN");
  const anchorIso = range.start || todayIso;
  const [view, setView] = useState(() => monthOf(anchorIso));
  const [focusDay, setFocusDay] = useState(anchorIso);
  const [hover, setHover] = useState<string | null>(null);
  const [dir, setDir] = useState(0);
  const moved = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const shown = Array.from({ length: months }, (_, i) => shiftMonth(view, i));
  const first = monthGrid(shown[0].y, shown[0].m).first;
  const last = monthGrid(shown[months - 1].y, shown[months - 1].m).last;
  const { days: available, error } = useAvailability(productId ?? null, fromDayNumber(first), fromDayNumber(last));
  const block = (iso: string): DayBlock | null =>
    dayBlock(iso, { range: single ? EMPTY : range, today: restrictPast ? todayIso : null, minimumNights, available });
  const hovered = hover ? block(hover) : null;
  const vis = single ? null : visibleRange(range, hovered ? null : hover);
  const viewKey = `${view.y}-${view.m}`;
  // Keep one day tabbable even after the arrows moved the view away from it.
  const fd = dayNumber(focusDay)!;
  const tabDay = fd >= first && fd <= last ? focusDay : fromDayNumber(first);

  const go = (delta: number) => {
    setDir(delta);
    setView((v) => shiftMonth(v, delta));
  };
  const moveFocus = (iso: string) => {
    const m = monthOf(iso);
    const idx = m.y * 12 + m.m - (view.y * 12 + view.m);
    if (idx < 0) { setDir(-1); setView(m); }
    else if (idx >= months) { setDir(1); setView(shiftMonth(m, -(months - 1))); }
    moved.current = true;
    setFocusDay(iso);
  };
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    box.current?.querySelector<HTMLElement>(`[data-view="${viewKey}"] [data-day="${focusDay}"]`)?.focus();
  }, [focusDay, viewKey]);

  const onKey = (e: React.KeyboardEvent, iso: string) => {
    const step = keyStep(e.key, rtl);
    let next: string | null = null;
    if (step !== null) next = addDays(iso, step);
    else if (e.key === "PageUp" || e.key === "PageDown") next = addMonths(iso, (e.key === "PageUp" ? -1 : 1) * (e.shiftKey ? 12 : 1));
    else if (e.key === "Home" || e.key === "End") {
      const weekday = (new Date(dayNumber(iso)! * 86_400_000).getUTCDay() + 6) % 7;
      next = addDays(iso, e.key === "Home" ? -weekday : 6 - weekday);
    }
    if (next) {
      e.preventDefault();
      moveFocus(next);
    }
  };

  const label = (iso: string, b: DayBlock | null, limited: boolean) => {
    const n = dayNumber(iso)!;
    const parts = [fmt(locale, n, { dateStyle: "full" })];
    if (iso === range.start) parts.push(single ? "" : t.picker.states.start);
    else if (iso === range.end) parts.push(t.picker.states.end);
    else if (vis && n > vis.from && n < vis.to) parts.push(t.picker.states.inRange);
    if (iso === todayIso) parts.push(t.picker.states.today);
    const a = available?.get(iso);
    if (b && b !== "same_day") parts.push(t.picker.blocked[b]);
    else if (a !== undefined) parts.push(limited ? `${t.picker.states.limited}, ${t.picker.states.available(a)}` : t.picker.states.available(a));
    return parts.filter(Boolean).join(", ");
  };
  const reason = (b: DayBlock) => (b === "full" || b === "unavailable" ? t.booking.soldOut : t.booking.rangeErrors[b]);
  const message = hovered ? reason(hovered) : !single && range.start && !range.end ? t.picker.pickEnd : null;
  const slide = (d: number) => ({ x: d * (rtl ? -1 : 1) * 28, opacity: 0 });

  return (
    <div ref={box} className="space-y-3"
      onPointerDown={(e) => { if (e.pointerType === "touch") touchX.current = e.clientX; }}
      onPointerUp={(e) => {
        if (touchX.current === null) return;
        const dx = e.clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go((dx < 0) === !rtl ? 1 : -1);
      }}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => go(-1)} aria-label={t.calendar.prev} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-paper">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <div className="grid flex-1 gap-6" style={{ gridTemplateColumns: `repeat(${months}, minmax(0, 1fr))` }} aria-live="polite">
          {shown.map((m) => (
            <p key={`${m.y}-${m.m}`} className="text-center text-sm font-semibold capitalize tracking-tight">
              {fmt(locale, monthGrid(m.y, m.m).first, { month: "long", year: "numeric" })}
            </p>
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label={t.calendar.next} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-paper">
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>

      <div className="overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.div key={viewKey} data-view={viewKey} custom={dir} initial={slide(dir)} animate={{ x: 0, opacity: 1 }} exit={slide(-dir)}
            transition={{ duration: 0.28, ease }} className="grid gap-6" style={{ gridTemplateColumns: `repeat(${months}, minmax(0, 1fr))` }}>
            {shown.map((m) => (
              <MonthGrid key={`${m.y}-${m.m}`} year={m.y} month={m.m} locale={locale} today={dayNumber(todayIso)} shown={vis}
                start={dayNumber(range.start)} end={dayNumber(range.end)} focusDay={tabDay} block={block} available={available} stock={stock}
                label={label} onPick={(iso) => { setFocusDay(iso); onPick(iso); }} onHover={setHover} onFocusDay={setFocusDay} onKey={onKey} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <p aria-live="polite" className="min-h-4 text-xs text-ink/65">{error ? <span className="text-bad">{t.common.errorGeneric}</span> : message}</p>
      {productId && (
        <div className="flex flex-wrap gap-3 text-[11px] text-ink/65">
          <Legend className="bg-card ring-1 ring-line" label={t.scheduling.legendAvailable} />
          <Legend className="bg-warn" label={t.scheduling.legendLimited} />
          <Legend className="bg-ink/20" label={t.scheduling.legendFull} />
          <Legend className="bg-ink" label={t.scheduling.legendSelected} />
        </div>
      )}
    </div>
  );
}

/** Popover anchored under the triggers on desktop, bottom sheet on phones. A native modal
 *  <dialog>: top layer (never clipped by a drawer), inert page behind, Escape closes. */
function Popup({ open, onClose, anchor, label, sheet, children }: {
  open: boolean; onClose: () => void; anchor: React.RefObject<HTMLElement | null>; label: string; sheet: boolean; children: React.ReactNode;
}) {
  const { t } = useApp();
  const ref = useRef<HTMLDialogElement>(null);

  // A surrounding drawer listens for Escape on document: this one belongs to the picker.
  useEffect(() => {
    const d = ref.current;
    const stop = (e: KeyboardEvent) => e.key === "Escape" && e.stopPropagation();
    d?.addEventListener("keydown", stop);
    return () => d?.removeEventListener("keydown", stop);
  }, []);

  // Open, place and focus in one pass before paint: the dialog must be open to be measured,
  // and placed before the focused day can scroll anything.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!open) {
      if (d.open) d.close();
      return;
    }
    if (!d.open) d.showModal();
    const place = () => {
      if (sheet) return d.style.removeProperty("top"), d.style.removeProperty("left");
      const a = anchor.current?.getBoundingClientRect();
      if (!a) return;
      const w = d.offsetWidth, h = d.offsetHeight;
      const rtl = document.documentElement.dir === "rtl";
      const left = Math.max(8, Math.min(rtl ? a.right - w : a.left, innerWidth - w - 8));
      let top = a.bottom + 8;
      if (top + h > innerHeight - 8 && a.top - h - 8 >= 8) top = a.top - h - 8;
      d.style.top = `${Math.max(8, Math.min(top, innerHeight - h - 8))}px`;
      d.style.left = `${left}px`;
    };
    place();
    d.querySelector<HTMLElement>('[data-day][tabindex="0"]')?.focus();
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => {
      removeEventListener("resize", place);
      removeEventListener("scroll", place, true);
    };
  }, [open, sheet, anchor]);

  return (
    <dialog ref={ref} aria-label={label} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}
      className={cn("m-0 max-w-none bg-transparent p-0 text-ink",
        sheet ? "fixed inset-x-0 bottom-0 top-auto w-full backdrop:bg-espresso/45" : "fixed inset-auto backdrop:bg-transparent")}
>
      {open && (
        <motion.div initial={sheet ? { y: 40, opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.28, ease }}
          className={cn("bg-raised p-4 shadow-float ring-1 ring-line sm:p-5", sheet ? "max-h-[92vh] overflow-y-auto rounded-t-[1.75rem] pb-6" : "rounded-[1.75rem]")}>
          {sheet && (
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold tracking-tight">{label}</p>
              <CloseButton onClick={onClose} label={t.common.close} />
            </div>
          )}
          {children}
        </motion.div>
      )}
    </dialog>
  );
}

type Surface = "paper" | "espresso";
const fieldTone: Record<Surface, string> = {
  paper: "bg-paper text-ink ring-1 ring-transparent hover:ring-ink/25",
  espresso: "bg-espresso-fg/[0.08] text-espresso-fg ring-1 ring-almondCream/15 hover:ring-almondCream/40",
};

function Field({ label, shown, placeholder, chip, size, surface, ...rest }: {
  label: string; shown: string | null; placeholder: string; chip?: string | null; size: "md" | "lg"; surface: Surface;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest}
      className={cn("flex min-w-0 flex-col items-start rounded-2xl text-start transition", fieldTone[surface], size === "lg" ? "px-5 py-3.5" : "px-4 py-2.5")}>
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-[11px] font-medium opacity-70">{label}</span>
        {chip && <span className={cn("-my-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", surface === "espresso" ? "bg-almondCream/15" : "bg-ink/10")}>{chip}</span>}
      </span>
      <span className={cn("mt-0.5 block w-full truncate font-semibold", size === "lg" ? "text-lg" : "text-sm", !shown && "font-normal opacity-60")}>{shown ?? placeholder}</span>
    </button>
  );
}

/** Start and return dates. Inline (booking panel) or behind two field-like triggers / a chip. */
export function DateRangePicker({ start, end, onChange, minimumNights = 1, productId, stock, inline = false, trigger = "fields", size = "md", surface = "paper", className, label }: {
  start: string; end: string; onChange: (start: string, end: string) => void; minimumNights?: number; productId?: string; stock?: number;
  inline?: boolean; trigger?: "fields" | "chip" | "segment"; size?: "md" | "lg"; surface?: Surface; className?: string; label?: string;
}) {
  const { t, language } = useApp();
  const locale = localeOf(language);
  const sheet = useMedia("(max-width: 639px)");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Range>({ start, end });
  const anchor = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const grid = useRef<HTMLDivElement>(null);

  const today = todayIn("TN");
  const show = (iso: string) => (dayNumber(iso) === null ? null : fmt(locale, dayNumber(iso)!, { weekday: "short", day: "numeric", month: "short" }));
  const n = dayNumber(start) !== null && dayNumber(end) !== null ? dayNumber(end)! - dayNumber(start)! : null;
  const openPicker = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (inline) return grid.current?.querySelector<HTMLElement>('[data-day][tabindex="0"]')?.focus();
    opener.current = e.currentTarget;
    setDraft({ start, end });
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };
  const draftOk = (!draft.start && !draft.end) || (!!draft.start && !!draft.end && !validateRange(draft.start, draft.end, { today, minimumNights }));

  const triggers = trigger === "chip" ? (
    <div ref={anchor} className={className}>
      <button type="button" onClick={openPicker} aria-haspopup="dialog" aria-expanded={open} className="pill gap-2 hover:ring-ink/30">
        <CalendarRange className="h-3.5 w-3.5" aria-hidden />
        {start && end ? (
          <><span>{t.picker.yourDates}{language === "fr" ? " : " : ": "}<bdi className="font-semibold">{rangeSummary({ start, end }, language, t)}</bdi></span><span className="underline underline-offset-2">{t.picker.edit}</span></>
        ) : t.picker.chooseDates}
      </button>
    </div>
  ) : trigger === "segment" ? (
    <div ref={anchor} className={className}>
      <button type="button" onClick={openPicker} aria-haspopup="dialog" aria-expanded={open} className="block w-full text-start focus:outline-none">
        <span className="block text-[11px] font-medium text-ink/60">{label}</span>
        <span className={cn("block truncate text-sm font-semibold", !start && "font-normal text-ink/60")}><bdi>{rangeSummary({ start, end }, language, t) ?? t.picker.choose}</bdi></span>
      </button>
    </div>
  ) : (
    <div ref={anchor} className={cn("grid grid-cols-2 gap-2", className)}>
      <Field label={t.booking.start} shown={show(start)} placeholder={t.picker.choose} size={size} surface={surface}
        onClick={openPicker} aria-haspopup={inline ? undefined : "dialog"} aria-expanded={inline ? undefined : open} />
      <Field label={t.booking.end} shown={show(end)} placeholder={t.picker.choose} chip={n && n > 0 ? t.common.nights(n) : null} size={size} surface={surface}
        onClick={openPicker} aria-haspopup={inline ? undefined : "dialog"} aria-expanded={inline ? undefined : open} />
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-4">
        {triggers}
        <div ref={grid} className="rounded-3xl bg-paper p-3 sm:p-4">
          <Calendar range={{ start, end }} months={1} minimumNights={minimumNights} productId={productId} stock={stock}
            onPick={(iso) => { const r = selectDay({ start, end }, iso); onChange(r.start, r.end); }} />
        </div>
      </div>
    );
  }

  const summary = rangeSummary(draft, language, t);
  return (
    <>
      {triggers}
      <Popup open={open} onClose={close} anchor={anchor} label={t.picker.dialog} sheet={sheet}>
        <div className={sheet ? "" : "w-[min(42rem,calc(100vw-2rem))]"}>
          <Calendar range={draft} months={sheet ? 1 : 2} minimumNights={minimumNights} productId={productId} stock={stock} onPick={(iso) => setDraft((r) => selectDay(r, iso))} />
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button type="button" onClick={() => setDraft(EMPTY)} disabled={!draft.start} className="btn-light btn-sm">{t.picker.clear}</button>
            <p className="min-w-0 flex-1 text-sm font-medium"><bdi>{summary ?? t.calendar.hint}</bdi></p>
            <button type="button" onClick={() => { onChange(draft.start, draft.end); close(); }} disabled={!draftOk} className="btn-ink btn-sm">{t.picker.apply}</button>
          </div>
        </div>
      </Popup>
    </>
  );
}

/** Single date (e.g. an asset's purchase date): any day, past included. */
export function DatePicker({ value, onChange, label, className }: { value: string; onChange: (iso: string) => void; label: string; className?: string }) {
  const { t, language } = useApp();
  const sheet = useMedia("(max-width: 639px)");
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };
  const n = dayNumber(value);
  return (
    <div ref={anchor} className={className}>
      <button ref={opener} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${n === null ? t.picker.choose : fmt(localeOf(language), n, { dateStyle: "long" })}`}
        onClick={() => setOpen(true)} className="field flex items-center justify-between gap-2 text-start">
        <span className={cn(n === null && "text-ink/50")}>{n === null ? t.picker.choose : fmt(localeOf(language), n, { day: "numeric", month: "short", year: "numeric" })}</span>
        <CalendarRange className="h-4 w-4 shrink-0 text-ink/50" aria-hidden />
      </button>
      <Popup open={open} onClose={close} anchor={anchor} label={t.picker.dialogSingle} sheet={sheet}>
        <div className={sheet ? "" : "w-[min(22rem,calc(100vw-2rem))]"}>
          <Calendar range={{ start: value, end: "" }} months={1} single restrictPast={false} onPick={(iso) => { onChange(iso); close(); }} />
          <div className="mt-3 flex justify-start border-t border-line pt-4">
            <button type="button" onClick={() => { onChange(""); close(); }} disabled={!value} className="btn-light btn-sm">{t.picker.clear}</button>
          </div>
        </div>
      </Popup>
    </div>
  );
}

/** "Vos dates : 14 → 16 nov. · 2 nuits · Modifier", the saved event dates; reopens the picker. */
export function EventDatesChip({ className, hideWhenEmpty = false }: { className?: string; hideWhenEmpty?: boolean }) {
  const { eventDates, setEventDates } = useApp();
  if (hideWhenEmpty && !(eventDates.start && eventDates.end)) return null;
  return <DateRangePicker trigger="chip" start={eventDates.start} end={eventDates.end} onChange={(start, end) => setEventDates({ start, end })} className={className} />;
}
