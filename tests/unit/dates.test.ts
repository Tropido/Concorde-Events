import { describe, expect, it } from "vitest";
import { addDays, nights, todayIn, validateRange } from "@/lib/dates";

describe("nights", () => {
  it("counts calendar nights (15 -> 18 is 3)", () => {
    expect(nights("2026-08-15", "2026-08-18")).toBe(3);
  });

  it("is unaffected by DST changes", () => {
    expect(nights("2026-03-28", "2026-03-30")).toBe(2); // EU spring forward 29 Mar
    expect(nights("2026-10-24", "2026-10-26")).toBe(2); // EU fall back 25 Oct
  });

  it("rejects impossible dates", () => {
    expect(nights("2026-02-30", "2026-03-02")).toBeNull();
    expect(nights("", "2026-03-02")).toBeNull();
  });
});

describe("validateRange", () => {
  const today = "2026-10-06";
  it.each([
    ["", "2026-10-10", "missing"],
    ["2026-10-10", "", "missing"],
    ["2026-13-01", "2026-10-10", "invalid"],
    ["2026-10-10", "2026-10-10", "same_day"],
    ["2026-10-12", "2026-10-10", "reversed"],
    ["2026-10-05", "2026-10-10", "past"],
    ["2026-10-10", "2027-10-11", "too_long"],
  ])("%s -> %s is %s", (s, e, problem) => {
    expect(validateRange(s, e, { today })).toBe(problem);
  });

  it("enforces minimum nights and accepts valid ranges", () => {
    expect(validateRange("2026-10-10", "2026-10-11", { today, minimumNights: 2 })).toBe("too_short");
    expect(validateRange("2026-10-10", "2026-10-12", { today, minimumNights: 2 })).toBeNull();
    expect(validateRange(today, addDays(today, 1), { today })).toBeNull();
  });
});

describe("todayIn", () => {
  it("uses the business time zone of each stock country", () => {
    const lateEvening = new Date("2026-10-06T22:30:00Z"); // 00:30 in Paris (CEST), 23:30 in Tunis (CET)
    expect(todayIn("FR", lateEvening)).toBe("2026-10-07");
    expect(todayIn("TN", lateEvening)).toBe("2026-10-06");
  });
});
