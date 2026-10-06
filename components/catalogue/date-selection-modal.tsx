"use client";

import { useState } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { nights, todayIn, validateRange } from "@/lib/dates";
import { formatMoney } from "@/lib/utils/formatters";
import { AvailabilityCalendar } from "@/components/ui/availability-calendar";
import { Dialog } from "@/components/ui/dialog";
import { minAvailable, useAvailability } from "./use-availability";
import type { CatalogueProduct, Price } from "@/lib/types";

export function PriceTag({ price, className }: { price: Price | null; className?: string }) {
  const { t, language } = useApp();
  if (!price) return <span className={className}>{t.common.priceOnRequest}</span>;
  const shown = price.amount ?? price.sourceAmount;
  const currency = price.amount === null ? price.sourceCurrency : price.currency;
  return (
    <span className={className} title={price.amount === null ? t.common.conversionUnavailable : undefined}>
      {formatMoney(shown, currency, language)} <span className="text-xs font-normal opacity-70">{t.common.perNight}</span>
    </span>
  );
}

/** Dates + quantity for one product, checked against real per-day availability. */
export function BookingPanel({ product, onAdded }: { product: CatalogueProduct; onAdded?: () => void }) {
  const { t, country, eventDates, addToDraft } = useApp();
  const today = todayIn(country);
  const [start, setStart] = useState(eventDates.start);
  const [end, setEnd] = useState(eventDates.end);
  const [quantity, setQuantity] = useState(1);

  const problem = validateRange(start, end, { today, minimumNights: product.minimumNights });
  // Units must be free on every day from start to end inclusive (the return day is occupied).
  const { days, error } = useAvailability(problem ? null : product.id, country, start, end);
  const max = problem ? null : minAvailable(days);
  const qty = Math.max(1, Math.min(quantity, max ?? 1));
  const canAdd = !problem && max !== null && max > 0;
  const n = nights(start, end);

  const add = () => {
    if (!canAdd) return;
    addToDraft({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: product.images[0] ?? null,
      quantity: qty,
      maxQuantity: max!,
      startDate: start,
      endDate: end,
    });
    onAdded?.();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-coffeeBean/80 dark:text-tan">
            {t.booking.start}
            <input type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full p-2.5 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-xs font-bold normal-case" />
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wider text-coffeeBean/80 dark:text-tan">
            {t.booking.end}
            <input type="date" min={start || today} value={end} onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full p-2.5 rounded-xl bg-white dark:bg-darkBg border border-tan/40 text-xs font-bold normal-case" />
          </label>
        </div>

        <p className="text-xs text-coffeeBean/70 dark:text-almondCream/70">
          {product.minimumNights > 1 && <>{t.booking.minNights(product.minimumNights)} · </>}
          {n !== null && n > 0 && <strong>{t.common.nights(n)}</strong>}
        </p>

        <div aria-live="polite" className="text-xs font-semibold min-h-[1.25rem]">
          {problem && (start || end) ? (
            <span className="text-rose-600 dark:text-rose-400">{t.booking.rangeErrors[problem]}</span>
          ) : error ? (
            <span className="text-rose-600 dark:text-rose-400">{t.common.errorGeneric}</span>
          ) : !problem && max === null ? (
            <span>{t.booking.checking}</span>
          ) : max === 0 ? (
            <span className="text-rose-600 dark:text-rose-400">{t.booking.soldOut}</span>
          ) : max !== null ? (
            <span className="text-emerald-700 dark:text-emerald-400">{t.booking.available(max)}</span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold">{t.booking.quantity}</span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label={t.booking.decrease} onClick={() => setQuantity(Math.max(1, qty - 1))}
              className="w-8 h-8 rounded-lg border border-tan/40 flex items-center justify-center hover:bg-tan/20">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input type="number" inputMode="numeric" min={1} max={max ?? undefined} step={1} value={qty}
              aria-label={t.booking.quantity}
              onChange={(e) => {
                const v = Math.floor(Number(e.target.value));
                setQuantity(Number.isFinite(v) && v >= 1 ? v : 1);
              }}
              className="w-14 p-1.5 rounded-lg bg-white dark:bg-darkBg border border-tan/40 text-center font-bold text-xs" />
            <button type="button" aria-label={t.booking.increase} disabled={max === null || qty >= max}
              onClick={() => setQuantity(qty + 1)}
              className="w-8 h-8 rounded-lg border border-tan/40 flex items-center justify-center hover:bg-tan/20 disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span>{t.booking.unitPrice}</span>
          <PriceTag price={product.price} className="font-bold text-toffeeBrown dark:text-tan" />
        </div>

        <button type="button" disabled={!canAdd} onClick={add}
          className="w-full py-3 rounded-xl bg-toffeeBrown hover:bg-coffeeBean text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed apple-press">
          <ShoppingBag className="w-4 h-4" />
          {t.booking.add}
        </button>
      </div>

      <div className="lg:col-span-7 rounded-2xl border border-tan/30 bg-white/70 dark:bg-darkSurface/80 p-3">
        <AvailabilityCalendar
          productId={product.id}
          stock={product.stock}
          startDate={start}
          endDate={end}
          onSelectDates={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />
      </div>
    </div>
  );
}

/** Global modal opened from any product card (rendered once in the marketing layout). */
export function BookingModal() {
  const { t, bookingProduct, setBookingProduct } = useApp();
  const close = () => setBookingProduct(null);
  return (
    <Dialog open={!!bookingProduct} onClose={close} labelledBy="booking-title" className="max-w-4xl">
      {bookingProduct && (
        <div className="flex flex-col max-h-[90vh]">
          <div className="px-5 py-3.5 border-b border-tan/30 flex items-center justify-between gap-3 bg-desertSand/20 dark:bg-darkSurface/60">
            <div className="flex items-center gap-3 min-w-0">
              {bookingProduct.images[0] && (
                <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-tan/40 shrink-0">
                  <Image src={bookingProduct.images[0]} alt="" fill sizes="44px" className="object-cover" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-toffeeBrown dark:text-tan">{t.booking.title}</p>
                <h2 id="booking-title" lang={bookingProduct.lang} className="text-base sm:text-lg font-bold font-serif truncate">
                  {bookingProduct.title}
                </h2>
              </div>
            </div>
            <button type="button" onClick={close} aria-label={t.common.close}
              className="p-1.5 rounded-full bg-desertSand/40 dark:bg-darkSurface hover:bg-desertSand/70 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 sm:p-5 overflow-y-auto">
            <BookingPanel product={bookingProduct} onAdded={close} />
          </div>
        </div>
      )}
    </Dialog>
  );
}
