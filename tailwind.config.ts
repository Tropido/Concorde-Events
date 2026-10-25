import type { Config } from "tailwindcss";

// Concorde design tokens. Every colour derives from the owner's six-colour palette
// (almond cream, desert sand, tan, faded copper, coffee bean, toffee brown).
const config: Config = {
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Owner palette (kept under its original names).
        almondCream: "#ede0d4",
        desertSand: "#e6ccb2",
        tan: "#ddb892",
        fadedCopper: "#b08968",
        coffeeBean: "#7f5539",
        toffeeBrown: "#9c6644",
        // Surfaces and ink derived from it.
        paper: "#f7f1ea",
        card: "#fcf9f5",
        ink: { DEFAULT: "#2b1d13", soft: "#5c3d28" },
        line: "#e9dccd",
        // Product tile tones (staff choose one per product).
        tone: {
          almond: "#ede0d4",
          sand: "#e9d3bd",
          tan: "#e5c9a8",
          copper: "#dcc2a9",
          cream: "#f3e9dc",
          stone: "#e4dcd3",
        },
        luxury: {
          50: "#faf6f0", 100: "#ede0d4", 200: "#e6ccb2", 300: "#ddb892", 400: "#c79e7c",
          500: "#b08968", 600: "#9c6644", 700: "#7f5539", 800: "#5c3d28", 900: "#3d281a", 950: "#24180f",
        },
        ok: { DEFAULT: "#4f6b4a", soft: "#e3eadd" },
        warn: { DEFAULT: "#9a6a1f", soft: "#f4e6c8" },
        bad: { DEFAULT: "#a24a3a", soft: "#f3dcd5" },
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
        lift: "0 1px 0 rgba(43,29,19,0.04), 0 12px 32px -18px rgba(43,29,19,0.35)",
        float: "0 18px 50px -20px rgba(43,29,19,0.45)",
        inset: "inset 0 0 0 1px rgba(43,29,19,0.06)",
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
