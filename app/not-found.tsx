import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-24">
      <div className="max-w-md text-center space-y-4">
        <p className="text-6xl font-serif font-black text-toffeeBrown dark:text-tan">404</p>
        <h1 className="text-2xl font-serif font-bold">{t.common.notFoundTitle}</h1>
        <p className="text-sm text-coffeeBean/75 dark:text-almondCream/75">{t.common.notFoundText}</p>
        <Link href="/" className="inline-block px-6 py-3 rounded-full bg-toffeeBrown text-white text-xs font-bold uppercase tracking-wider hover:bg-coffeeBean">
          {t.common.backHome}
        </Link>
      </div>
    </div>
  );
}
