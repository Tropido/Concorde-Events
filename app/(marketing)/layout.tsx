import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/navigation/footer";
import { BagDrawer } from "@/components/catalogue/bag-drawer";
import { BookingModal } from "@/components/catalogue/date-selection-modal";
import { Toaster } from "@/components/ui/kit";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      <BagDrawer />
      <BookingModal />
      <Toaster />
    </>
  );
}
