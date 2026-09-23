import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/context/app-context";
import { Navbar } from "@/components/navigation/navbar";
import { FloatingDockNav } from "@/components/navigation/floating-dock";
import { Footer } from "@/components/navigation/footer";
import { QuickPreviewModal } from "@/components/catalogue/quick-preview-modal";

export const metadata: Metadata = {
  title: "Concorde Events | Ultra-Luxury Event Furniture Rental Catalogue",
  description: "Exclusive digital rental catalogue for luxury event furniture, scagliola tables, bouclé sofas, and alabaster architectural lighting. Manual quotation validation & live inventory availability.",
  keywords: ["Luxury Furniture Rental", "Event Furniture Catalogue", "Wedding Furniture Rental", "VIP Lounge Rental", "Architectural Lighting Rental"],
  openGraph: {
    title: "Concorde Events | Luxury Event Furniture Architecture",
    description: "Curated digital rental catalogue for ultra-luxury events, galas, and high-fashion galas.",
    images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80"],
  },
};

import { InitialLoadingScreen } from "@/components/ui/initial-loading-screen";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark font-sans">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,700;0,800;1,600&family=Tajawal:wght@400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#fcf8f4] dark:bg-[#120e0b] text-coffeeBean dark:text-almondCream antialiased selection:bg-toffeeBrown selection:text-white relative">
        <AppProvider>
          {/* Initial First-Visit Luxury Loading Screen */}
          <InitialLoadingScreen />

          {/* Background Ambient Animated Lighting Effects */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
            {/* Top-Right Warm Amber Light Orb */}
            <div className="absolute -top-32 -right-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-toffeeBrown/15 to-tan/10 blur-[130px] ambient-orb-1" />
            {/* Center-Left Golden Sand Light Orb */}
            <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-fadedCopper/15 to-desertSand/10 blur-[140px] ambient-orb-2" />
            {/* Bottom-Center Warm Glow */}
            <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] rounded-full bg-toffeeBrown/10 blur-[120px] ambient-orb-pulse" />
          </div>

          <Navbar />
          <main className="flex-1 relative z-10">{children}</main>
          <QuickPreviewModal />
          <FloatingDockNav />
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
