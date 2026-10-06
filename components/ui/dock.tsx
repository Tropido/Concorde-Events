"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/formatters";

export interface DockProps {
  className?: string;
  children: React.ReactNode;
}

export function Dock({ className, children }: DockProps) {
  return (
    <div
      className={cn(
        "flex h-16 items-end gap-3 rounded-full bg-white/40 dark:bg-black/50 p-2 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl shadow-black/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface DockItemProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
}

// Renders a real <button> when it has its own action, so it is reachable by keyboard.
export function DockItem({ className, children, onClick, "aria-label": label }: DockItemProps) {
  const [hovered, setHovered] = useState(false);
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className={cn("relative group cursor-pointer", className)}
    >
      <motion.div
        animate={{
          scale: hovered ? 1.25 : 1,
          y: hovered ? -8 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex items-center justify-center h-full w-full"
      >
        {children}
      </motion.div>
    </Tag>
  );
}

export function DockLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-neutral-900/90 text-white px-2 py-1 text-[10px] font-medium tracking-wide shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity pointer-events-none">
      {children}
    </div>
  );
}

export function DockIcon({ children }: { children: React.ReactNode }) {
  return <div className="h-6 w-6 flex items-center justify-center">{children}</div>;
}
