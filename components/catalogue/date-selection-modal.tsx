"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { nights, todayIn, validateRange } from "@/lib/dates";
import { formatTND } from "@/lib/utils/formatters";
import { AvailabilityCalendar } from "@/components/ui/availability-calendar";
import { Dialog } from "@/components/ui/dialog";
import { CloseButton, PriceTag, ProductTile, QuantityStepper, ease } from "@/components/ui/kit";
import { minAvailable, useAvailability } from "./use-availability";
import type { CatalogueProduct } from "@/lib/types";

export { PriceTag } from "@/components/ui/kit";

/** Dates + quantity for one product, checked against real per-day availability. */
export function BookingPanel({ product, onAdded, layout = "wide" }: { product: CatalogueProduct; onAdded?: () => void; layout?: "wide" | "stacked" }) {
  const { t, language, eventDates, setEventDates, addToDraft, toast, setBagOpen } = useApp();
  const today = todayIn("TN");
  const [start, setStart] = useState(eventDates.start);
  const [end, setEnd] = useState(eventDates.end);
  const [quantity, setQuantity] = useState(1);

  const problem = validateRange(start, end, { today, minimumNights: product.minimumNights });
  // Units must be free on every day from start to end inclusive (the return day is occupied).
  const { days, error } = useAvailability(problem ? null : product.id, start, end);
  const max = problem ? null : minAvailable(days);
  const qty = Math.max(1, Math.min(quantity, max ?? 1));
  const canAdd = !problem && max !== null && max > 0;
  const n = nights(start, end);
  const total = product.price && n && n > 0 ? product.price.amount * qty * n : null;

  const add = () => {
    if (!canAdd) return;
    addToDraft({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: product.images[0] ?? null,
      tone: product.tone,
      quantity: qty,
      maxQuantity: max!,
      startDate: start,
      endDate: end,
      unitPrice: product.price?.amount ?? null,
    });
    setEventDates({ start, end });
    toast({ title: t.bag.added(product.title), image: product.images[0], tone: product.tone, action: { label: t.bag.view, onClick: () => setBagOpen(true) } });
    onAdded?.();
  };

  const status = problem && (start || end) ? (
    <span className="text-bad">{t.booking.rangeErrors[problem]}</span>
  ) : error ? (
    <span className="text-bad">{t.common.errorGeneric}</span>
  ) : !problem && max === null ? (
    <span className="text-ink/55">{t.booking.checking}</span>
  ) : max === 0 ? (
    <span className="text-bad">{t.booking.soldOut}</span>
  ) : max !== null ? (
    <span className="text-ok">{t.booking.available(max)}</span>
  ) : <span className="text-ink/55">{t.calendar.hint}</span>;

  const controls = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="field-label">{t.booking.start}</span>
          <input type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} className="field" />
        </label>
        <label className="block">
          <span className="field-label">{t.booking.end}</span>
          <input type="date" min={start || today} value={end} onChange={(e) => setEnd(e.target.value)} className="field" />
        </label>
      </div>
      <p aria-live="polite" className="min-h-5 text-xs font-medium">{status}</p>
      <div className="flex items-center gap-3">
        <QuantityStepper value={qty} max={max} label={t.booking.quantity} onChange={setQuantity} />
        <button type="button" disabled={!canAdd} onClick={add} className="btn-ink h-12 flex-1">
          <ShoppingBag className="h-4 w-4" aria-hidden />
          {t.booking.add}{total !== null && canAdd ? ` · ${formatTND(total, language)}` : ""}
        </button>
      </div>
      <p className="text-xs text-ink/50">
        {n !== null && n > 0 ? t.booking.summary(qty, n) : product.minimumNights > 1 ? t.booking.minNights(product.minimumNights) : t.booking.nightsRule}
      </p>
    </div>
  );

  const calendar = (
    <AvailabilityCalendar productId={product.id} stock={product.stock} startDate={start} endDate={end}
      onSelectDates={(s, e) => { setStart(s); setEnd(e); }} />
  );

  return layout === "stacked" ? (
    <div className="space-y-6">{controls}<div className="rounded-3xl bg-paper p-4">{calendar}</div></div>
  ) : (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">{controls}<div className="rounded-3xl bg-paper p-4">{calendar}</div></div>
  );
}

/** Global "choose dates" sheet opened from any product card. */
export function BookingModal() {
  const { t, bookingProduct: p, setBookingProduct } = useApp();
  const close = () => setBookingProduct(null);
  return (
    <Dialog open={!!p} onClose={close} labelledBy="booking-title" className="max-w-4xl">
      <AnimatePresence>
        {p && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }} className="flex max-h-[90vh] flex-col">
            <div className="flex items-center gap-3 p-4 sm:p-5">
              <ProductTile src={p.images[0]} alt={p.title} tone={p.tone} sizes="56px" className="h-14 w-14 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1" lang={p.lang}>
                <p className="label">{p.category?.name ?? t.booking.title}</p>
                <h2 id="booking-title" className="truncate text-lg font-semibold tracking-tight">{p.title}</h2>
              </div>
              <PriceTag price={p.price} size="sm" className="hidden sm:inline-flex" />
              <CloseButton onClick={close} label={t.common.close} />
            </div>
            <div className="overflow-y-auto px-4 pb-5 sm:px-5">
              <BookingPanel product={p} onAdded={close} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
