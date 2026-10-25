import type { Config } from "tailwindcss";

// Design tokens. Every colour derives from the owner's six-colour palette
// (almond cream, desert sand, tan, faded copper, coffee bean, toffee brown).
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Colours are CSS variables (RGB channels) so opacity modifiers keep working and
      // .dark swaps the palette; values live in app/globals.css.
      colors: {
        // Owner palette (kept under its original names; same in both themes).
        almondCream: v("almond-cream"),
        desertSand: v("desert-sand"),
        tan: v("tan"),
        fadedCopper: v("faded-copper"),
        coffeeBean: v("coffee-bean"),
        toffeeBrown: v("toffee-brown"),
        // Surfaces and ink derived from it.
        paper: v("paper"),
        card: v("card"),
        /** Floating surfaces (drawers, dialogs, popovers): lifted above cards in dark mode. */
        raised: v("raised"),
        ink: { DEFAULT: v("ink"), soft: v("ink-soft") },
        line: v("line"),
        /** Always-dark blocks (footer, pro teaser) and the light text on them. */
        espresso: { DEFAULT: v("espresso"), fg: v("espresso-fg") },
        // Product tile tones (staff choose one per product).
        tone: {
          almond: v("tone-almond"),
          sand: v("tone-sand"),
          tan: v("tone-tan"),
          copper: v("tone-copper"),
          cream: v("tone-cream"),
          stone: v("tone-stone"),
        },
        ok: { DEFAULT: v("ok"), soft: v("ok-soft") },
        warn: { DEFAULT: v("warn"), soft: v("warn-soft") },
        bad: { DEFAULT: v("bad"), soft: v("bad-soft") },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        // Legacy class name used across older screens now maps to the display face.
        serif: ["var(--font-display)"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        tightest: "-0.045em",
        display: "-0.035em",
        label: "0.12em",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        lift: "0 1px 0 rgb(var(--shadow) / 0.04), 0 12px 32px -18px rgb(var(--shadow) / 0.35)",
        float: "0 18px 50px -20px rgb(var(--shadow) / 0.45)",
        inset: "inset 0 0 0 1px rgb(var(--shadow) / 0.06)",
      },
      keyframes: {
        spinSlow: { to: { transform: "rotate(360deg)" } },
        bump: { "0%,100%": { transform: "scale(1)" }, "40%": { transform: "scale(1.25)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "spin-slow": "spinSlow 22s linear infinite",
        bump: "bump 380ms cubic-bezier(.3,1.6,.5,1)",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
