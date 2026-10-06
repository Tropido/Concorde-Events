import type { Metadata } from "next";
import { Inter, Playfair_Display, Tajawal } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context/app-context";
import { getPrefs } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { getViewer } from "@/lib/auth";

// Self-hosted by next/font (no third-party request at runtime).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "700", "800"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });
const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700", "800", "900"], variable: "--font-tajawal", display: "swap" });

export const metadata: Metadata = {
  title: "Concorde Events | Location de mobilier événementiel",
  description: "Catalogue de location de mobilier d'événement en France et en Tunisie : disponibilité par dates, demande de devis et suivi en ligne.",
  openGraph: {
    title: "Concorde Events",
    description: "Location de mobilier d'événement haut de gamme en France et en Tunisie.",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const prefs = await getPrefs();
  // Signed-out rendering when Supabase is unreachable or unconfigured; pages that need
  // data render the explicit "service unavailable" state through app/error.tsx.
  const viewer = await getViewer().catch(() => null);

  return (
    <html lang={prefs.lang} dir={prefs.dir} className={`dark font-sans ${inter.variable} ${playfair.variable} ${tajawal.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#fcf8f4] dark:bg-[#120e0b] text-coffeeBean dark:text-almondCream antialiased selection:bg-toffeeBrown selection:text-white relative">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[10000] focus:px-4 focus:py-2 focus:rounded-full focus:bg-toffeeBrown focus:text-white">
          {translations[prefs.lang].common.skipToContent}
        </a>
        <AppProvider prefs={prefs} viewer={viewer}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
