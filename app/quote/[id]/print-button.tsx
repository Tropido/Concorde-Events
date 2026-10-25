"use client";

import { Printer } from "lucide-react";

/** Browser print dialog; "Save as PDF" is offered by the browser itself. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()}
      className="btn-ink btn-sm">
      <Printer className="h-4 w-4" aria-hidden />{label}
    </button>
  );
}
