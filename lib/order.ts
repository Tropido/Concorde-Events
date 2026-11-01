import type { InspectionCondition, InspectionLine } from "@/lib/types";

const ORDER: InspectionCondition[] = ["ok", "minor", "damaged", "broken", "missing"];

/** "118 OK · 2 endommagées", condition by condition, leaving out the empty ones. */
export const breakdownOf = (line: Pick<InspectionLine, InspectionCondition>, chips: Record<InspectionCondition, (n: number) => string>) =>
  ORDER.filter((c) => line[c] > 0).map((c) => chips[c](line[c]));
