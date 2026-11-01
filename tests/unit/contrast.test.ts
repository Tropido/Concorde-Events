import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// WCAG AA (4.5:1 for body text) on the token pairs the UI actually uses, in both themes.
const css = readFileSync("app/globals.css", "utf8");

function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g)].map((m) => [m[1], [+m[2], +m[3], +m[4]]]));
}
const palette = block(":root");
const themes = { light: { ...palette, ...block(".theme-light") }, dark: { ...palette, ...block(".dark") } };

type RGB = number[];
const lum = (c: RGB) => {
  const [r, g, b] = c.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const mix = (fg: RGB, bg: RGB, alpha: number) => fg.map((v, i) => v * alpha + bg[i] * (1 - alpha));
const ratio = (a: RGB, b: RGB) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [text, background, text opacity]
const pairs: [string, string, number][] = [
  ...["paper", "card", "raised", "tone-almond", "tone-sand", "tone-tan", "tone-copper", "tone-cream", "tone-stone"].map((bg) => ["ink", bg, 1] as [string, string, number]),
  ["ink", "card", 0.65], ["ink", "paper", 0.65],
  ["ink-soft", "card", 1],
  ["card", "ink", 1], // inverted buttons and pills
  ["ok", "ok-soft", 1], ["warn", "warn-soft", 1], ["bad", "bad-soft", 1],
  ["ok", "card", 1], ["warn", "card", 1], ["bad", "card", 1],
  ["espresso-fg", "espresso", 1], ["almond-cream", "espresso", 0.65],
  ["espresso-fg", "toffee-brown", 1], // .btn-toffee
];
const tones = ["tone-almond", "tone-sand", "tone-tan", "tone-copper", "tone-cream", "tone-stone"];

describe.each(Object.entries(themes))("%s theme contrast", (_, vars) => {
  it.each(pairs)("%s on %s (opacity %s) passes AA", (fg, bg, alpha) => {
    expect(vars[fg], fg).toBeDefined();
    expect(vars[bg], bg).toBeDefined();
    expect(ratio(mix(vars[fg], vars[bg], alpha), vars[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(tones)("the hover overlay on %s keeps category text at AA", (tone) => {
    expect(ratio(vars["espresso-fg"], mix(vars.espresso, vars[tone], 0.75))).toBeGreaterThanOrEqual(4.5);
  });
});
