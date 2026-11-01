import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TierEmblem } from "@/components/ui/tier-emblem";

const triangles = (html: string) => (html.match(/<path d="M32 [^"]*Z" transform/g) ?? []).length;

describe("TierEmblem", () => {
  it.each([
    ["bronze", 3], ["argent", 4], ["or", 6], ["platine", 8], ["diamant", 10], ["royal_elite", 12],
  ])("draws %s with %i triangles", (code, n) => {
    const html = renderToStaticMarkup(<TierEmblem code={code} size={64} />);
    expect(html).toContain("<svg");
    expect(triangles(html)).toBe(n);
  });

  it("gives the finest tiers the finest triangles", () => {
    const base = (code: string) => Number(/M32 [\d.]+L([\d.]+)/.exec(renderToStaticMarkup(<TierEmblem code={code} />))![1]) - 32;
    const order = ["bronze", "argent", "or", "platine", "diamant", "royal_elite"].map(base);
    expect(order).toEqual([...order].sort((a, b) => b - a));
  });

  it("falls back to a generated emblem for an unknown tier: 2 + rank triangles", () => {
    const html = renderToStaticMarkup(<TierEmblem code="prestige" rank={4} color="#7f5539" />);
    expect(triangles(html)).toBe(6);
    expect(html).toContain("#7f5539");
    expect(html).not.toContain("--metal-");
  });

  it("thins the generated ring as the rank rises", () => {
    const stroke = (rank: number) => Number(/stroke-width="([\d.]+)"><\/circle>/.exec(renderToStaticMarkup(<TierEmblem code="x" rank={rank} />))![1]);
    expect(stroke(1)).toBeGreaterThan(stroke(5));
  });

  it("is hidden from assistive tech next to a visible name, and named on its own", () => {
    expect(renderToStaticMarkup(<TierEmblem code="or" />)).toContain('aria-hidden="true"');
    const named = renderToStaticMarkup(<TierEmblem code="or" title="Or" />);
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="Or"');
    expect(named).not.toContain("aria-hidden");
  });

  it("only sweeps a sheen across Royal Elite", () => {
    expect(renderToStaticMarkup(<TierEmblem code="royal_elite" />)).toContain("emblem-sheen");
    expect(renderToStaticMarkup(<TierEmblem code="diamant" />)).not.toContain("emblem-sheen");
  });
});
