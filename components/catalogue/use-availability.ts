"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayNumber } from "@/lib/dates";
import type { Country } from "@/lib/types";

/** Per-day units available (bookings, valid quotes and maintenance already deducted). */
export function useAvailability(productId: string | null, country: Country, from: string | null, to: string | null) {
  const [days, setDays] = useState<Map<string, number> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const f = dayNumber(from);
    const tt = dayNumber(to);
    setDays(null);
    setError(false);
    if (!productId || f === null || tt === null || tt < f) return;
    let cancelled = false;
    createClient()
      .rpc("product_availability", { p_product: productId, p_country: country, p_from: from, p_to: to })
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) setError(true);
        else setDays(new Map((data as { day: string; available: number }[]).map((r) => [r.day, r.available])));
      });
    return () => {
      cancelled = true;
    };
  }, [productId, country, from, to]);

  return { days, error };
}

/** Units available on every day of [start, end] (the return day is still occupied). */
export function minAvailable(days: Map<string, number> | null) {
  if (!days || days.size === 0) return null;
  return Math.min(...days.values());
}
