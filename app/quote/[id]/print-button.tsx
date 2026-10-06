"use client";

import { Printer } from "lucide-react";

/** Browser print dialog; "Save as PDF" is offered by the browser itself. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-toffeeBrown hover:bg-coffeeBean text-white text-xs font-bold">
      <Printer className="w-4 h-4" aria-hidden />{label}
    </button>
  );
}
