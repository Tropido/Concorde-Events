"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-neutral-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold font-serif text-neutral-900 dark:text-white">
            Reset Password
          </h1>
          <p className="text-xs text-neutral-500 dark:text-zinc-400">
            Enter your email address to receive password reset instructions.
          </p>
        </div>

        {sent ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            <div className="text-sm font-bold text-white">Reset Link Dispatched</div>
            <p className="text-xs text-zinc-300">
              Check your inbox at <strong>{email}</strong> for instructions.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-neutral-600 dark:text-zinc-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-luxury-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-full bg-luxury-500 text-neutral-950 font-extrabold text-xs uppercase tracking-wider hover:bg-luxury-400 transition-colors shadow-lg"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link href="/login" className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
