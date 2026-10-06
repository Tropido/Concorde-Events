"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

export function InitialLoadingScreen() {
  // Starts hidden so returning visitors never see a flash; shown once per session otherwise.
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Only show on initial session load
    try {
      if (sessionStorage.getItem("concorde:initial_loaded") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    } catch {
      return;
    }
    setLoading(true);

    // Animate progress smoothly
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setLoading(false);
            try {
              sessionStorage.setItem("concorde:initial_loaded", "true");
            } catch {
              // ignore
            }
          }, 350);
          return 100;
        }
        return prev + Math.floor(Math.random() * 18 + 12);
      });
    }, 90);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#120e0b] text-almondCream overflow-hidden"
        >
          {/* Ambient background glow */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-toffeeBrown/20 blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute w-[350px] h-[350px] rounded-full bg-tan/15 blur-[100px] pointer-events-none translate-y-24" />

          {/* Center Luxury Emblem */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center text-center space-y-5 px-6 max-w-md"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tan via-toffeeBrown to-coffeeBean p-0.5 shadow-2xl shadow-toffeeBrown/30">
                <div className="w-full h-full bg-[#1a1511] rounded-[14px] flex items-center justify-center">
                  <span className="font-serif text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-almondCream via-tan to-white tracking-tighter">
                    C
                  </span>
                </div>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="absolute -top-1.5 -right-1.5"
              >
                <Sparkles className="w-4 h-4 text-tan" />
              </motion.div>
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-almondCream via-desertSand to-tan">
                CONCORDE EVENTS
              </h2>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-tan/80">
                Paris • Tunis • Haute Scénographie
              </p>
            </div>

            {/* Smooth Progress Indicator */}
            <div className="w-48 sm:w-56 space-y-2 pt-4">
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-tan via-toffeeBrown to-fadedCopper rounded-full"
                  style={{ width: `${Math.min(100, progress)}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-tan/60 uppercase tracking-wider">
                <span>Synchronisation</span>
                <span>{Math.min(100, progress)}%</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
