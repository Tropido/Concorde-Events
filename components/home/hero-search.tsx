"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { GOVERNORATES } from "@/lib/governorates";
import { CloseButton, Drawer, QuantityStepper } from "@/components/ui/kit";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils/formatters";
import { EVENT_TYPES, type EventType } from "@/lib/types";

const GUEST_STEP = 10;
const plainSelect = "w-full cursor-pointer appearance-none truncate bg-transparent text-sm font-semibold focus:outline-none";

/** Airbnb-style search: everything in one pill on desktop, a guided sheet on phones. It saves
 *  the dates and the event context, which prefill /demande, then opens the collection. */
export function HeroSearch() {
  const { t, language, eventDates, setEventDates, eventContext, setEventContext } = useApp();
  const s = t.home.search;
  const router = useRouter();
  const [type, setType] = useState<EventType | "">(eventContext.type ?? "");
  const [guests, setGuests] = useState(eventContext.guests ?? 0);
  const [city, setCity] = useState(eventContext.city ?? "");
  const [sheet, setSheet] = useState(false);
  const [step, setStep] = useState(0);

  const submit = () => {
    setEventContext({ type: type || null, guests: guests || null, city: city || null });
    setSheet(false);
    router.push("/catalogue");
  };

  const eventSelect = (
    <select value={type} onChange={(e) => setType(e.target.value as EventType | "")} aria-label={s.event} className={cn(plainSelect, !type && "font-normal text-ink/60")}>
      <option value="">{s.anyEvent}</option>
      {EVENT_TYPES.map((e) => <option key={e} value={e}>{t.eventTypes[e]}</option>)}
    </select>
  );
  const citySelect = (
    <select value={city} onChange={(e) => setCity(e.target.value)} aria-label={s.city} className={cn(plainSelect, !city && "font-normal text-ink/60")}>
      <option value="">{s.anyCity}</option>
      {GOVERNORATES.map((g) => <option key={g.fr} value={g.fr}>{g[language]}</option>)}
    </select>
  );
  const guestStepper = (size: "sm" | "md") => <QuantityStepper value={guests} onChange={(v) => setGuests(Math.max(0, v))} min={0} step={GUEST_STEP} label={s.guests} size={size} />;

  const steps = [
    { title: s.event, body: <div className="flex flex-wrap gap-2">{EVENT_TYPES.map((e) => (
      <button key={e} type="button" aria-pressed={type === e} onClick={() => setType(type === e ? "" : e)}
        className={cn("rounded-full px-4 py-2.5 text-sm ring-1 transition", type === e ? "bg-ink text-card ring-ink" : "bg-paper ring-transparent")}>{t.eventTypes[e]}</button>
    ))}</div> },
    { title: s.dates, body: <DateRangePicker inline start={eventDates.start} end={eventDates.end} onChange={(start, end) => setEventDates({ start, end })} /> },
    { title: s.guests, body: guestStepper("md") },
    { title: s.city, body: <div className="field">{citySelect}</div> },
  ];
  const last = step === steps.length - 1;

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} aria-label={s.label}
        className="hidden w-[min(92%,56rem)] items-center gap-1 rounded-full bg-raised p-2 shadow-float ring-1 ring-line lg:flex">
        <Segment label={s.event}>{eventSelect}</Segment>
        <div className="min-w-0 flex-[1.35] rounded-full px-5 py-2 transition-colors hover:bg-paper">
          <DateRangePicker trigger="segment" label={s.dates} start={eventDates.start} end={eventDates.end} onChange={(start, end) => setEventDates({ start, end })} />
        </div>
        <Segment label={s.guests} shrink>{guestStepper("sm")}</Segment>
        <Segment label={s.city}>{citySelect}</Segment>
        <button type="submit" aria-label={s.submit} title={s.submit} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-card transition hover:bg-ink-soft active:scale-95">
          <Search className="h-5 w-5" aria-hidden />
        </button>
      </form>

      <button type="button" onClick={() => { setStep(0); setSheet(true); }} className="flex h-14 w-[min(92%,24rem)] items-center gap-3 rounded-full bg-raised ps-5 pe-2 text-start shadow-float ring-1 ring-line lg:hidden">
        <MapPin className="h-4 w-4 shrink-0 text-ink/60" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.cta}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-card"><Search className="h-4 w-4" aria-hidden /></span>
      </button>

      <Drawer open={sheet} onClose={() => setSheet(false)} labelledBy="search-sheet">
        <div className="flex items-center justify-between p-5">
          <h2 id="search-sheet" className="text-xl font-semibold tracking-tight">{s.sheetTitle}</h2>
          <CloseButton onClick={() => setSheet(false)} label={t.common.close} />
        </div>
        <ol className="flex gap-1.5 px-5" aria-hidden>{steps.map((x, i) => <li key={x.title} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-ink" : "bg-line")} />)}</ol>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-lg font-semibold tracking-tight">{steps[step].title}</p>
          {steps[step].body}
        </div>
        <div className="flex gap-2 border-t border-line p-5">
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="btn-light">{t.common.back}</button>}
          <button type="button" onClick={() => (last ? submit() : setStep(step + 1))} className="btn-ink flex-1">{last ? s.show : s.next}</button>
        </div>
      </Drawer>
    </>
  );
}

function Segment({ label, shrink, children }: { label: string; shrink?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0 rounded-full px-5 py-2 transition-colors hover:bg-paper", shrink ? "shrink-0" : "flex-1")}>
      <p className="text-[11px] font-medium text-ink/60">{label}</p>
      {children}
    </div>
  );
}
