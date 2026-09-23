import { FurnitureItem, DailyAvailability } from "../types";
import { addDays, format, parseISO, isWithinInterval } from "date-fns";

export interface DateAvailabilityStatus {
  date: string; // YYYY-MM-DD
  quantityAvailable: number;
  status: "available" | "limited" | "fully_booked" | "unavailable";
}

/**
 * Calculates the exact available stock for a furniture item across a date range.
 */
export function calculateRangeAvailability(
  item: FurnitureItem,
  startDateStr: string,
  endDateStr: string,
  overrides: DailyAvailability[] = []
): {
  minAvailableInPeriod: number;
  dailyBreakdown: DateAvailabilityStatus[];
  isAvailableForRange: boolean;
} {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);

  const dailyBreakdown: DateAvailabilityStatus[] = [];
  let curr = start;

  let minAvailable = item.quantity_owned;

  while (curr <= end) {
    const dateStr = format(curr, "yyyy-MM-dd");
    const override = overrides.find(
      (o) => o.furniture_id === item.id && o.date === dateStr
    );

    const booked = override ? override.quantity_booked : 0;
    const blocked = override ? override.quantity_blocked : 0;
    const baseReserved = item.quantity_reserved;

    // Remaining stock = owned - (baseReserved + booked + blocked)
    const available = Math.max(
      0,
      item.quantity_owned - (baseReserved + booked + blocked)
    );

    if (available < minAvailable) {
      minAvailable = available;
    }

    let status: "available" | "limited" | "fully_booked" | "unavailable" =
      "available";
    if (available === 0) {
      status = "fully_booked";
    } else if (available <= Math.ceil(item.quantity_owned * 0.25)) {
      status = "limited";
    }

    if (item.status !== "active") {
      status = "unavailable";
    }

    dailyBreakdown.push({
      date: dateStr,
      quantityAvailable: available,
      status,
    });

    curr = addDays(curr, 1);
  }

  return {
    minAvailableInPeriod: minAvailable,
    dailyBreakdown,
    isAvailableForRange: minAvailable > 0 && item.status === "active",
  };
}
