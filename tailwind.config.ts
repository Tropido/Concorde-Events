import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Exact user requested luxury palette:
        almondCream: "#ede0d4",
        desertSand: "#e6ccb2",
        tan: "#ddb892",
        fadedCopper: "#b08968",
        coffeeBean: "#7f5539",
        toffeeBrown: "#9c6644",
        // Harmonized luxury scale based on the 6 artisanal colors:
        luxury: {
          50: "#faf6f0",
          100: "#ede0d4", // Almond Cream
          200: "#e6ccb2", // Desert Sand
          300: "#ddb892", // Tan
          400: "#c79e7c",
          500: "#b08968", // Faded Copper
          600: "#9c6644", // Toffee Brown
          700: "#7f5539", // Coffee Bean
          800: "#5c3d28",
          900: "#3d281a",
          950: "#24180f",
        },
        darkBg: "#120e0b",
        darkSurface: "#1a1511",
        darkBorder: "#34261c",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Text'",
          "'SF Pro Display'",
          "'Inter'",
          "'Tajawal'",
          "'Cairo'",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "'Playfair Display'",
          "'New York'",
          "Georgia",
          "serif",
        ],
      },
      boxShadow: {
        luxury: "0 20px 40px -15px rgba(127, 85, 57, 0.08), 0 0 15px 0 rgba(176, 137, 104, 0.04)",
        "luxury-dark": "0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 20px 0 rgba(176, 137, 104, 0.15)",
        apple: "0 4px 24px -1px rgba(127, 85, 57, 0.1), 0 2px 8px -1px rgba(127, 85, 57, 0.06)",
        "apple-card": "0 12px 32px -4px rgba(61, 40, 26, 0.08), 0 4px 12px -2px rgba(61, 40, 26, 0.04)",
        glass: "0 8px 32px 0 rgba(127, 85, 57, 0.12)",
      },
      backdropBlur: {
        xs: "2px",
        "2xl": "40px",
        "3xl": "60px",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
