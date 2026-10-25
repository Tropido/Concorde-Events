import type { Metadata } from "next";
import { getPrefs } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { CheckoutView } from "./checkout-view";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getPrefs();
  return { title: translations[lang].checkout.label, robots: { index: false } };
}

export default function CheckoutPage() {
  return <CheckoutView />;
}
