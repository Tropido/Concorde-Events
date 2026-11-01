import { describe, expect, it } from "vitest";
import { LANGUAGES, translations } from "@/lib/i18n/translations";
import { localized, localizedList } from "@/lib/i18n/localize";
import { parseLang } from "@/lib/prefs";
import { formatDateTime, formatDay, formatTND } from "@/lib/utils/formatters";

/** Every leaf path of a dictionary: functions and arrays count as leaves with their own shape. */
function leaves(value: unknown, path = ""): [string, unknown][] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [[path, value]];
}

describe("dictionaries", () => {
  const paths = LANGUAGES.map((l) => new Map(leaves(translations[l])));
  const fr = paths[0];

  it("have exactly the same keys in every language", () => {
    for (const other of paths.slice(1)) expect([...other.keys()].sort()).toEqual([...fr.keys()].sort());
  });

  it("have no empty string, except keys that are empty on purpose in French", () => {
    for (const [i, map] of paths.entries()) {
      for (const [k, v] of map) {
        if (typeof v === "string" && v.trim() === "") expect(fr.get(k), `${LANGUAGES[i]}: ${k}`).toBe("");
      }
    }
  });

  it("keep list lengths in step, so a screen never loses an item in one language", () => {
    for (const other of paths.slice(1)) {
      for (const [k, v] of fr) if (Array.isArray(v)) expect((other.get(k) as unknown[]).length, k).toBe(v.length);
    }
  });

  it("use simple one/other plurals in English", () => {
    const { common } = translations.en;
    expect(common.nights(1)).toBe("1 night");
    expect(common.nights(0)).toBe("0 nights");
    expect(common.units(3)).toBe("3 units");
  });
});

describe("parseLang", () => {
  it("accepts the three languages and falls back to French", () => {
    expect(parseLang("en")).toBe("en");
    expect(parseLang("ar")).toBe("ar");
    expect(parseLang("de")).toBe("fr");
    expect(parseLang(undefined)).toBe("fr");
  });
});

describe("English formats", () => {
  it("formats dinars with comma thousands and three millime digits", () => {
    expect(formatTND(1250, "en")).toBe("1,250 DT");
    expect(formatTND(7064.85, "en")).toBe("7,064.850 DT");
  });

  it("keeps Latin digits and the local currency label in Arabic", () => {
    expect(formatTND(1250, "ar")).toMatch(/^[\d.,]+ د\.ت$/);
  });

  it("reads dates the British way", () => {
    expect(formatDay("2026-11-14", "en", { weekday: "short", day: "numeric", month: "short" })).toBe("Sat 14 Nov");
    expect(formatDay("2026-11-14", "en")).toBe("14 Nov 2026");
  });

  it("uses the 24-hour clock in French, in Tunis time", () => {
    expect(formatDateTime("2026-11-14T16:30:00Z", "fr")).toContain("17:30");
  });
});

describe("staff-entered content", () => {
  const row = { title_fr: "Canapé", title_en: "Sofa", title_ar: null, tags_fr: ["a"], tags_en: [], tags_ar: ["b"] };

  it("shows the translation, or French when it is empty", () => {
    expect(localized(row, "title", "en")).toBe("Sofa");
    expect(localized(row, "title", "ar")).toBe("Canapé");
    expect(localized({ title_fr: null }, "title", "en")).toBeNull();
    expect(localizedList(row, "tags", "en")).toEqual(["a"]);
    expect(localizedList(row, "tags", "ar")).toEqual(["b"]);
  });
});
