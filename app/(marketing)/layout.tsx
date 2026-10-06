import { Navbar } from "@/components/navigation/navbar";
import { FloatingDockNav } from "@/components/navigation/floating-dock";
import { Footer } from "@/components/navigation/footer";
import { QuickPreviewModal } from "@/components/catalogue/quick-preview-modal";
import { BookingModal } from "@/components/catalogue/date-selection-modal";
import { InitialLoadingScreen } from "@/components/ui/initial-loading-screen";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InitialLoadingScreen />
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -end-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-toffeeBrown/15 to-tan/10 blur-[130px] ambient-orb-1" />
        <div className="absolute top-1/3 -start-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-fadedCopper/15 to-desertSand/10 blur-[140px] ambient-orb-2" />
        <div className="absolute bottom-10 start-1/3 w-[500px] h-[500px] rounded-full bg-toffeeBrown/10 blur-[120px] ambient-orb-pulse" />
      </div>
      <Navbar />
      <main id="main" className="flex-1 relative z-10">{children}</main>
      <QuickPreviewModal />
      <BookingModal />
      <FloatingDockNav />
      <Footer />
    </>
  );
}
