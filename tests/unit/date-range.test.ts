import { describe, expect, it } from "vitest";
import { addMonths, dayBlock, keyStep, monthGrid, selectDay, shiftMonth, visibleRange } from "@/lib/date-range";
import { dayNumber } from "@/lib/dates";

const empty = { start: "", end: "" };

describe("selectDay (range state machine)", () => {
  it("sets the start, then the end", () => {
    const a = selectDay(empty, "2026-11-14");
    expect(a).toEqual({ start: "2026-11-14", end: "" });
    expect(selectDay(a, "2026-11-16")).toEqual({ start: "2026-11-14", end: "2026-11-16" });
  });

  it("restarts on a day before the start and after a complete range", () => {
    expect(selectDay({ start: "2026-11-14", end: "" }, "2026-11-10")).toEqual({ start: "2026-11-10", end: "" });
    expect(selectDay({ start: "2026-11-14", end: "2026-11-16" }, "2026-11-20")).toEqual({ start: "2026-11-20", end: "" });
  });

  it("ignores invalid dates", () => {
    expect(selectDay(empty, "2026-02-30")).toEqual(empty);
  });
});

describe("dayBlock", () => {
  const today = "2026-11-10";

  it("blocks past days and full days", () => {
    expect(dayBlock("2026-11-09", { range: empty, today })).toBe("past");
    expect(dayBlock("2026-11-10", { range: empty, today })).toBeNull();
    expect(dayBlock("2026-11-12", { range: empty, today, available: new Map([["2026-11-12", 0]]) })).toBe("full");
  });

  it("allows any day without a today (single dates such as a purchase date)", () => {
    expect(dayBlock("2020-01-01", { range: empty, today: null })).toBeNull();
  });

  it("applies the end rules only while the end is being picked", () => {
    const range = { start: "2026-11-14", end: "" };
    expect(dayBlock("2026-11-14", { range, today })).toBe("same_day");
    expect(dayBlock("2026-11-15", { range, today, minimumNights: 3 })).toBe("too_short");
    expect(dayBlock("2026-11-17", { range, today, minimumNights: 3 })).toBeNull();
    expect(dayBlock("2027-11-15", { range, today })).toBe("too_long");
    // Earlier days restart the range, and a finished range blocks nothing.
    expect(dayBlock("2026-11-12", { range, today })).toBeNull();
    expect(dayBlock("2026-11-14", { range: { start: "2026-11-14", end: "2026-11-16" }, today })).toBeNull();
  });

  it("blocks an end whose range crosses a full day, return day included", () => {
    const range = { start: "2026-11-14", end: "" };
    const available = new Map([["2026-11-14", 3], ["2026-11-15", 3], ["2026-11-16", 0], ["2026-11-17", 2]]);
    expect(dayBlock("2026-11-15", { range, today, available })).toBeNull();
    expect(dayBlock("2026-11-16", { range, today, available })).toBe("full");
    expect(dayBlock("2026-11-17", { range, today, available })).toBe("unavailable");
  });
});

describe("visibleRange", () => {
  it("previews start..hover while picking the end", () => {
    const s = dayNumber("2026-11-14")!;
    expect(visibleRange({ start: "2026-11-14", end: "" }, "2026-11-17")).toEqual({ from: s, to: s + 3 });
    expect(visibleRange({ start: "2026-11-14", end: "" }, "2026-11-10")).toEqual({ from: s, to: s });
    expect(visibleRange({ start: "2026-11-14", end: "2026-11-16" }, "2026-11-30")).toEqual({ from: s, to: s + 2 });
    expect(visibleRange(empty, "2026-11-17")).toBeNull();
  });
});

describe("calendar helpers", () => {
  it("starts weeks on Monday", () => {
    // 1 November 2026 is a Sunday: six blank cells before it.
    expect(monthGrid(2026, 10).offset).toBe(6);
    expect(monthGrid(2026, 5).offset).toBe(0); // 1 June 2026 is a Monday
  });

  it("moves across years and clamps month ends", () => {
    expect(shiftMonth({ y: 2026, m: 11 }, 1)).toEqual({ y: 2027, m: 0 });
    expect(shiftMonth({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 });
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-03-15", -1)).toBe("2026-02-15");
  });

  it("gives the same logical result in LTR and RTL", () => {
    // The visual arrows swap, the moves through time do not.
    expect(keyStep("ArrowRight", false)).toBe(1);
    expect(keyStep("ArrowLeft", true)).toBe(1);
    expect(keyStep("ArrowLeft", false)).toBe(-1);
    expect(keyStep("ArrowRight", true)).toBe(-1);
    expect(keyStep("ArrowDown", true)).toBe(7);
    expect(keyStep("Enter", false)).toBeNull();
  });
});
