"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context/app-context";
import { ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const { setCurrentUserStatus, setCurrentUserRole } = useApp();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [accountType, setAccountType] = useState<"professional" | "customer">("professional");
  const [submitted, setSubmitted] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUserRole(accountType);
    setCurrentUserStatus("pending");
    setSubmitted(true);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-luxury-500 text-neutral-950 font-black text-2xl mx-auto flex items-center justify-center shadow-lg font-serif">
            C
          </div>
          <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-white">
            Register Account
          </h1>
          <p className="text-xs text-neutral-500 dark:text-zinc-400">
            Every new account is manually reviewed by Concorde administrators before unlocking wholesale rates.
          </p>
        </div>

        {submitted ? (
          <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-amber-500" />
            <h3 className="text-xl font-bold font-serif text-white">
              Application Submitted (Pending Approval)
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Thank you, <strong>{fullName}</strong>. Your account status is currently set to <strong>PENDING</strong>. An admin notification has been dispatched.
            </p>
            <div className="pt-4 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full py-3.5 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase tracking-wider block"
              >
                Go to Login Portal
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 text-xs font-semibold">
            {/* Account Type Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("professional")}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  accountType === "professional"
                    ? "bg-luxury-500 text-neutral-950 border-luxury-500 font-bold shadow-lg"
                    : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border-neutral-200 dark:border-zinc-700"
                }`}
              >
                <div>Professional</div>
                <div className="text-[10px] opacity-80 font-normal">Planner / Scenographer</div>
              </button>

              <button
                type="button"
                onClick={() => setAccountType("customer")}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  accountType === "customer"
                    ? "bg-luxury-500 text-neutral-950 border-luxury-500 font-bold shadow-lg"
                    : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border-neutral-200 dark:border-zinc-700"
                }`}
              >
                <div>Private Customer</div>
                <div className="text-[10px] opacity-80 font-normal">Private Event Host</div>
              </button>
            </div>

            <div>
              <label className="block text-neutral-600 dark:text-zinc-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-600 dark:text-zinc-300 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                />
              </div>
              <div>
                <label className="block text-neutral-600 dark:text-zinc-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                />
              </div>
            </div>

            {accountType === "professional" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-600 dark:text-zinc-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 dark:text-zinc-300 mb-1">VAT / Tax ID</label>
                  <input
                    type="text"
                    required
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase tracking-wider hover:bg-luxury-400 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <span>Submit Registration</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
