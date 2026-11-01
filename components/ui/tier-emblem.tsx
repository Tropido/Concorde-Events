import { useId } from "react";
import { cn } from "@/lib/utils/formatters";

// Programme tier emblems: a metal disc ringed with triangles, pure inline SVG on a 64 grid.
// The higher the tier, the finer the drawing: thinner strokes, more and slimmer triangles, more
// negative space. Metals are CSS variables (app/globals.css) with a value per theme.

export type EmblemSize = 16 | 24 | 40 | 64;

const C = 32;
const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(C + r * Math.sin(a)).toFixed(2)},${(C - r * Math.cos(a)).toFixed(2)}`;
};
const ring = (n: number, r: number, offset = 0) => Array.from({ length: n }, (_, i) => polar(r, offset + (i * 360) / n)).join(" ");
const star = (points: number, outer: number, inner: number) =>
  Array.from({ length: points * 2 }, (_, i) => polar(i % 2 ? inner : outer, (i * 180) / points)).join(" ");

/** Triangles pointing out from the disc, `from` to `to` on the radius. */
function Rays({ n, base, from, to, fill, offset = 0, soften = 0 }: { n: number; base: number; from: number; to: number; fill: string; offset?: number; soften?: number }) {
  const d = `M${C} ${C - to}L${C + base / 2} ${C - from}H${C - base / 2}Z`;
  return (
    <g fill={fill} stroke={soften ? fill : undefined} strokeWidth={soften || undefined} strokeLinejoin="round">
      {Array.from({ length: n }, (_, i) => <path key={i} d={d} transform={`rotate(${offset + (i * 360) / n} ${C} ${C})`} />)}
    </g>
  );
}

type Paint = { light: string; dark: string; fill: string; glow: string };

const EMBLEMS: Record<string, { metal: string; draw: (p: Paint) => React.ReactNode }> = {
  bronze: {
    metal: "bronze",
    draw: ({ fill, dark }) => (
      <>
        <Rays n={3} base={11} from={22} to={29} fill={dark} soften={2.5} />
        <circle cx={C} cy={C} r={20} fill="none" stroke={dark} strokeWidth={3.5} />
        <circle cx={C} cy={C} r={16.5} fill={fill} />
      </>
    ),
  },
  argent: {
    metal: "silver",
    draw: ({ fill, dark }) => (
      <>
        <Rays n={4} base={7} from={21} to={30} fill={dark} soften={1} />
        <circle cx={C} cy={C} r={20} fill="none" stroke={dark} strokeWidth={1.8} />
        <circle cx={C} cy={C} r={17} fill={fill} />
        <circle cx={C} cy={C} r={6} fill="none" stroke={dark} strokeWidth={1.2} />
      </>
    ),
  },
  or: {
    metal: "gold",
    draw: ({ fill, dark, glow }) => (
      <>
        <Rays n={6} base={4.6} from={22} to={31} fill={dark} />
        <circle cx={C} cy={C} r={20.6} fill="none" stroke={dark} strokeWidth={0.9} />
        <circle cx={C} cy={C} r={18.6} fill="none" stroke={dark} strokeWidth={0.9} />
        <circle cx={C} cy={C} r={16} fill={fill} />
        <circle cx={C} cy={C} r={16} fill={glow} />
      </>
    ),
  },
  platine: {
    metal: "platinum",
    draw: ({ fill, dark, light }) => (
      <>
        <Rays n={8} base={2.6} from={22} to={31} fill={dark} offset={22.5} />
        <polygon points={ring(8, 20.5, 22.5)} fill="none" stroke={dark} strokeWidth={0.8} strokeLinejoin="round" />
        <circle cx={C} cy={C} r={15.5} fill={fill} />
        <polygon points={star(8, 9.5, 4.4)} fill={light} stroke={dark} strokeWidth={0.5} strokeLinejoin="round" />
      </>
    ),
  },
  diamant: {
    metal: "diamond",
    draw: ({ fill, dark }) => (
      <>
        <Rays n={10} base={1.9} from={19.5} to={30.5} fill={dark} />
        <circle cx={C} cy={C} r={17} fill={fill} stroke={dark} strokeWidth={0.5} />
        <g stroke={dark} strokeWidth={0.5} fill="none" strokeLinejoin="round">
          <polygon points={ring(8, 9, 22.5)} />
          {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${C} ${C}L${polar(16.5, 22.5 + i * 45)}`} />)}
        </g>
        <path d="M40.8 2.6q.6 2.8 3.4 3.4q-2.8.6-3.4 3.4q-.6-2.8-3.4-3.4q2.8-.6 3.4-3.4Z" fill={dark} />
      </>
    ),
  },
  royal_elite: {
    metal: "royal",
    draw: ({ fill }) => (
      <>
        <Rays n={12} base={1.2} from={21} to={31.5} fill="var(--metal-royal-gold)" />
        <circle cx={C} cy={C} r={18} fill={fill} />
        <circle cx={C} cy={C} r={19.6} fill="none" stroke="var(--metal-royal-gold)" strokeWidth={0.5} />
        <circle cx={C} cy={C} r={16.4} fill="none" stroke="var(--metal-royal-gold)" strokeWidth={0.5} />
        <path d="M23 39.5 21.4 28l5.8 4.4L32 24.6l4.8 7.8 5.8-4.4L41 39.5Z" fill="var(--metal-royal-gold)" strokeLinejoin="round" />
      </>
    ),
  },
};

/** Tiers created by admins have no drawing: their rank decides how refined it is. */
function generated(rank: number, paint: Paint) {
  const stroke = Math.max(0.6, 3.6 - rank * 0.5);
  return (
    <>
      <Rays n={2 + rank} base={Math.max(1.4, 10 - rank * 1.4)} from={21.5} to={30} fill={paint.dark} />
      <circle cx={C} cy={C} r={20} fill="none" stroke={paint.dark} strokeWidth={stroke} />
      <circle cx={C} cy={C} r={16.5} fill={paint.fill} />
    </>
  );
}

export function TierEmblem({ code, size = 24, title, rank = 1, color = "#b08968", className }: {
  code: string; size?: EmblemSize; title?: string; rank?: number; color?: string; className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const known = EMBLEMS[code];
  const v = (n: 1 | 2) => `var(--metal-${known?.metal}-${n})`;
  const light = known ? v(1) : `color-mix(in srgb, ${color} 62%, white)`;
  const dark = known ? v(2) : color;
  const paint = { light, dark, fill: `url(#${id})`, glow: `url(#${id}g)` };
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn("emblem shrink-0", className)} data-tier={code}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}>
      <defs>
        <linearGradient id={id} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" style={{ stopColor: light }} />
          <stop offset="1" style={{ stopColor: dark }} />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="0.38" cy="0.32" r="0.62">
          <stop offset="0" stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}c`}><circle cx={C} cy={C} r={18} /></clipPath>
      </defs>
      {known ? known.draw(paint) : generated(rank, paint)}
      {code === "royal_elite" && <g clipPath={`url(#${id}c)`}><rect className="emblem-sheen" x="-16" y="0" width="10" height="64" fill="var(--metal-royal-gold)" opacity="0.35" transform="skewX(-18)" /></g>}
    </svg>
  );
}
