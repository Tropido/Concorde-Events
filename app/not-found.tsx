import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="shell flex flex-1 items-center justify-center py-24">
      <div className="card max-w-md space-y-4 p-10 text-center">
        <p className="display text-7xl text-toffeeBrown">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t.common.notFoundTitle}</h1>
        <p className="text-sm text-ink/60">{t.common.notFoundText}</p>
        <Link href="/" className="btn-ink">{t.common.backHome}</Link>
      </div>
    </div>
  );
}
