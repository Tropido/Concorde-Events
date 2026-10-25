"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/formatters";

// Single-hue charts: ink line/area on the card surface, recessive grid, hover tooltip.
const INK = "#2b1d13";
const GRID = "#e9dccd";

export function Sparkline({ values, className, label }: { values: number[]; className?: string; label: string }) {
  const id = useId();
  const w = 120, h = 36;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [values.length < 2 ? w : (i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 8)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-9 w-28", className)} role="img" aria-label={label} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={INK} stopOpacity=".14" /><stop offset="1" stopColor={INK} stopOpacity="0" /></linearGradient>
      </defs>
      {pts.length > 1 && <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />}
      <motion.path d={d} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  );
}

/** Area chart over days with a crosshair + tooltip; one series at a time. */
export function AreaChart({ points, format, label, emptyLabel }: {
  points: { key: string; label: string; value: number; sub?: string }[]; format: (v: number) => string; label: string; emptyLabel: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();
  // The viewBox follows the rendered width so labels keep their size on a phone.
  const [w, setW] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [points]);
  const h = 240, pad = { l: 8, r: 8, t: 16, b: 26 };
  const every = w < 480 ? 14 : 7;
  const max = useMemo(() => niceMax(Math.max(0, ...points.map((p) => p.value))), [points]);
  const x = (i: number) => pad.l + (points.length < 2 ? 0 : (i / (points.length - 1)) * (w - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const total = points.reduce((s, p) => s + p.value, 0);

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || points.length === 0) return;
    let rel = (e.clientX - r.left) / r.width;
    if (document.dir === "rtl") rel = 1 - rel;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))));
  };

  if (total === 0) return <div className="flex h-60 items-center justify-center rounded-2xl bg-paper text-sm text-ink/50">{emptyLabel}</div>;
  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="relative" dir="ltr">
      <svg ref={ref} viewBox={`0 0 ${w} ${h}`} className="h-60 w-full touch-none" role="img" aria-label={label}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={INK} stopOpacity=".12" /><stop offset="1" stopColor={INK} stopOpacity="0" /></linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={w - pad.r} y1={y(max * f)} y2={y(max * f)} stroke={GRID} strokeDasharray={f ? "3 4" : undefined} />
          </g>
        ))}
        <path d={`${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${gid})`} />
        <motion.path d={line} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
        {[0.5, 1].map((f) => (
          <text key={f} x={pad.l} y={y(max * f) - 4} className="fill-ink/40 font-mono" fontSize="10" stroke="#fcf9f5" strokeWidth={4} paintOrder="stroke">{format(max * f)}</text>
        ))}
        {/* Weekly ticks anchored on the latest day, so the last two labels never collide. */}
        {points.map((p, i) => (points.length - 1 - i) % every === 0 && (
          <text key={p.key} x={x(i)} y={h - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-ink/45 font-mono" fontSize="10">{p.label}</text>
        ))}
        {hp && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke={INK} strokeOpacity=".25" />
            <circle cx={x(hover)} cy={y(hp.value)} r={5} fill="#fcf9f5" stroke={INK} strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && hover !== null && (
        <div className="pointer-events-none absolute top-2 rounded-2xl bg-ink px-3 py-2 text-card shadow-float"
          style={{ left: `clamp(0px, calc(${(x(hover) / w) * 100}% - 70px), calc(100% - 140px))` }}>
          <p className="font-mono text-[10px] text-almondCream/60">{hp.label}</p>
          <p className="text-base font-semibold tabular-nums">{format(hp.value)}</p>
          {hp.sub && <p className="text-[11px] text-almondCream/60">{hp.sub}</p>}
        </div>
      )}
    </div>
  );
}

/** Ranked horizontal bars with the value written beside each bar (no colour coding). */
export function RankedBars({ rows, format, emptyLabel }: { rows: { label: string; value: number; hint?: string }[]; format: (v: number) => string; emptyLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-ink/50">{emptyLabel}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label} className="space-y-1" title={r.hint}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 tabular-nums text-ink/70">{format(r.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-paper">
            <motion.div className="h-full rounded-full bg-ink" initial={{ width: 0 }} animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }} style={{ opacity: 1 - i * 0.08 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical month bars with hover value. */
export function ColumnChart({ cols, format, label, emptyLabel }: { cols: { label: string; value: number }[]; format: (v: number) => string; label: string; emptyLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...cols.map((c) => c.value)));
  if (cols.every((c) => c.value === 0)) return <div className="flex h-56 items-center justify-center rounded-2xl bg-paper text-sm text-ink/50">{emptyLabel}</div>;
  return (
    <div role="img" aria-label={label} className="flex h-56 items-end gap-1 sm:gap-2" onPointerLeave={() => setHover(null)}>
      {cols.map((c, i) => (
        <div key={c.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" onPointerEnter={() => setHover(i)}>
          {/* Zero-width anchor: the hover value may be wider than its column without widening the chart. */}
          <span className="relative h-4 w-0">
            <span className={cn("absolute start-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] tabular-nums text-card transition-opacity rtl:translate-x-1/2",
              hover === i ? "opacity-100" : "opacity-0")}>{format(c.value)}</span>
          </span>
          <motion.div className={cn("w-full max-w-10 rounded-t-md rounded-b-[2px]", hover === i ? "bg-toffeeBrown" : "bg-ink")}
            initial={{ height: 0 }} animate={{ height: `${(c.value / max) * 82}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }} />
          <span className="max-w-full truncate font-mono text-[10px] text-ink/45">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Ring gauge for a single share (e.g. stock in use today). */
export function Ring({ value, label, caption }: { value: number; label: string; caption: string }) {
  const r = 42, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90" role="img" aria-label={`${label}: ${Math.round(v * 100)}%`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={GRID} strokeWidth="9" />
        <motion.circle cx="50" cy="50" r={r} fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">{Math.round(v * 100)}%</p>
        <p className="text-xs text-ink/55">{caption}</p>
      </div>
    </div>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
