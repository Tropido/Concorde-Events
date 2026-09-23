"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ShieldCheck, Award, MessageCircle, ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-luxury-500/10 text-luxury-500 text-xs font-bold tracking-widest uppercase border border-luxury-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          The Concorde Manifesto
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold font-serif text-neutral-900 dark:text-white">
          Architectural Elegance for High-Profile Celebrations
        </h1>
        <p className="text-base text-neutral-600 dark:text-zinc-400 leading-relaxed">
          Founded in 2024, Concorde Events was established to bridge the gap between museum-grade furniture design and temporary event architecture.
        </p>
      </div>

      {/* Grid Story */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-zinc-800">
          <Image
            src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80"
            alt="Concorde Atelier"
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-extrabold font-serif text-neutral-900 dark:text-white">
            Beyond Standard Event Rental Tables
          </h2>
          <p className="text-sm text-neutral-600 dark:text-zinc-300 leading-relaxed">
            We believe that extraordinary gatherings require extraordinary tactile environments. Instead of standard folding chairs and generic polyester linens, we curate hand-carved teak dining tables, organic bouclé modular sofas, fluted travertine bar modules, and alabaster floor lights.
          </p>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-neutral-200 dark:border-zinc-800">
            <div>
              <div className="text-3xl font-black text-luxury-500 font-serif">100%</div>
              <div className="text-xs text-neutral-500 dark:text-zinc-400">Strictly Inspected Stock</div>
            </div>
            <div>
              <div className="text-3xl font-black text-luxury-500 font-serif">24/7</div>
              <div className="text-xs text-neutral-500 dark:text-zinc-400">Concierge & Scenography Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Values Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div className="p-8 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 space-y-3">
          <ShieldCheck className="w-8 h-8 text-luxury-500" />
          <h3 className="text-xl font-bold font-serif text-neutral-900 dark:text-white">
            Manual Stock Locking
          </h3>
          <p className="text-xs text-neutral-500 dark:text-zinc-400 leading-relaxed">
            Our daily availability inventory system prevents overbooking, guaranteeing every item is prepped and delivered in bespoke protective flight-cases.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 space-y-3">
          <Award className="w-8 h-8 text-luxury-500" />
          <h3 className="text-xl font-bold font-serif text-neutral-900 dark:text-white">
            Professional Wholesale Portal
          </h3>
          <p className="text-xs text-neutral-500 dark:text-zinc-400 leading-relaxed">
            Verified event planners receive tailored discount tiers, instant formal PDF quotations, and cumulative reward points for high-tier status.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 space-y-3">
          <MessageCircle className="w-8 h-8 text-emerald-500" />
          <h3 className="text-xl font-bold font-serif text-neutral-900 dark:text-white">
            Direct Concierge WhatsApp
          </h3>
          <p className="text-xs text-neutral-500 dark:text-zinc-400 leading-relaxed">
            No friction, no auto-billing surprises. Work directly with our scenerographers for bespoke venue setup plans.
          </p>
        </div>
      </div>
    </div>
  );
}
