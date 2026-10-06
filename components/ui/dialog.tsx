"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/formatters";

// Native modal dialog: Escape closes it, the page behind is inert, focus moves into the
// dialog and returns to the trigger on close. Clicking the backdrop also closes it.
export function Dialog({
  open,
  onClose,
  labelledBy,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-1.5rem)] max-h-[90vh] p-0 rounded-3xl border border-tan/40 dark:border-fadedCopper/40",
        "bg-[#fcf8f4] dark:bg-[#1a1511] text-coffeeBean dark:text-almondCream shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      {open && children}
    </dialog>
  );
}
